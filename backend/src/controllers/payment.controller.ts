import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middlewares/auth';
import * as enrollmentService from '../services/enrollment.service';
import * as paystackService from '../services/paystack.service';
import { prisma } from '../config/database';
import { PaymentProvider, OrderStatus, PaymentStatus, EnrollmentStatus } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import { createNotification } from '../services/notification.service';
import { recordAuditLog } from '../services/auditLog.service';
import { enrollmentsCounter } from '../utils/metrics';
import { logger } from '../config/logger';

export const validateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, price } = req.body;
    const result = await enrollmentService.validateCouponCode(code, parseFloat(price));
    res.json({ success: true, coupon: result });
  } catch (error) {
    next(error);
  }
};

export const enrollFree = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const enrollment = await enrollmentService.enrollFreeCourse(req.user!.id, req.params.id);
    res.json({ success: true, message: 'Enrolled successfully!', enrollment });
  } catch (error) {
    next(error);
  }
};

/**
 * Initialize a Paystack checkout transaction for paid course enrollment
 */
export const initializePaystackCheckout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, couponCode } = req.body;
    const userId = req.user!.id;
    const userEmail = req.user!.email;

    if (!courseId) {
      throw new AppError('Course ID is required.', 400);
    }

    // 1. Fetch course authoritatively from PostgreSQL (Never trust frontend price)
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { instructor: { select: { id: true, name: true, email: true } } },
    });

    if (!course) {
      throw new AppError('Course not found.', 404);
    }

    if (course.status !== 'PUBLISHED' && req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN' && course.instructorId !== userId) {
      throw new AppError('This course is not available for purchase.', 400);
    }

    if (course.isFree || course.price <= 0) {
      throw new AppError('This is a free course. Please use free enrollment.', 400);
    }

    // 2. Prevent duplicate active enrollments
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (existingEnrollment && (existingEnrollment.status === EnrollmentStatus.ACTIVE || existingEnrollment.status === EnrollmentStatus.COMPLETED)) {
      return res.status(200).json({
        success: true,
        alreadyEnrolled: true,
        courseSlug: course.slug,
        message: 'You already have access to this course.',
      });
    }

    // 3. Create Checkout Order & calculate coupon discounts against authoritative price
    const checkout = await enrollmentService.createCheckoutOrder(userId, courseId, couponCode);

    if (checkout.finalPrice <= 0) {
      // 100% coupon discount -> enroll directly
      const enrollment = await prisma.enrollment.upsert({
        where: { userId_courseId: { userId, courseId } },
        update: { status: EnrollmentStatus.ACTIVE },
        create: { userId, courseId, status: EnrollmentStatus.ACTIVE },
      });

      await prisma.order.update({
        where: { id: checkout.orderId },
        data: { status: OrderStatus.PAID },
      });

      return res.json({
        success: true,
        alreadyEnrolled: false,
        freeWithCoupon: true,
        courseSlug: course.slug,
        enrollmentId: enrollment.id,
        message: 'Course unlocked with 100% discount coupon!',
      });
    }

    // 4. Generate unique payment reference and normalize currency (KES / KSH)
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const reference = `PSK_${Date.now()}_${randomHex}`;
    const rawCurrency = (course.currency || process.env.DEFAULT_CURRENCY || 'KES').trim().toUpperCase();
    const currency = rawCurrency === 'USD' || rawCurrency === 'KSH' ? 'KES' : rawCurrency;

    // 5. Create PENDING Payment entry in DB
    await prisma.payment.create({
      data: {
        orderId: checkout.orderId,
        paymentProvider: PaymentProvider.PAYSTACK,
        providerTransactionId: reference,
        transactionId: reference,
        status: PaymentStatus.PENDING,
        amount: checkout.finalPrice,
        currency,
      },
    });

    // 6. Initialize Paystack Transaction via official API
    const paystackResult = await paystackService.initializePaystackTransaction({
      email: userEmail,
      amount: checkout.finalPrice,
      currency,
      reference,
      metadata: {
        orderId: checkout.orderId,
        courseId: course.id,
        courseTitle: course.title,
        userId,
        customerEmail: userEmail,
      },
    });

    res.json({
      success: true,
      authorization_url: paystackResult.authorization_url,
      access_code: paystackResult.access_code,
      reference: paystackResult.reference,
      orderNumber: checkout.orderNumber,
      amount: checkout.finalPrice,
      currency,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify a Paystack checkout transaction directly from Paystack API
 */
export const verifyPaystackCheckout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const reference = req.params.reference || req.query.reference as string;
    if (!reference) {
      throw new AppError('Transaction reference is required.', 400);
    }

    const cleanRef = String(reference).trim();

    // 1. Find local payment record
    const payment = await prisma.payment.findFirst({
      where: { transactionId: cleanRef },
      include: {
        order: {
          include: {
            course: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new AppError('Payment record for this reference was not found.', 404);
    }

    // 2. Idempotency check: if already completed, return verified state
    if (payment.status === PaymentStatus.COMPLETED) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: payment.order.userId, courseId: payment.order.courseId } },
      });

      return res.json({
        success: true,
        status: 'COMPLETED',
        message: 'Payment already verified and course access is active.',
        reference: cleanRef,
        courseTitle: payment.order.course.title,
        courseSlug: payment.order.course.slug,
        enrollmentId: enrollment?.id,
      });
    }

    // 3. Verify transaction directly with Paystack API
    const verification = await paystackService.verifyPaystackTransaction(cleanRef);

    if (verification.status !== 'success') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });

      throw new AppError(
        verification.gatewayResponse || 'Payment was not completed. Please try again.',
        400
      );
    }

    // 4. Server-Side Price & Currency Validation
    const expectedAmount = payment.amount;
    const paidAmount = verification.amount;

    // Validate that the paid amount matches the authoritative price (tolerance of 0.01 for rounding)
    if (Math.abs(paidAmount - expectedAmount) > 0.01) {
      logger.error('[PAYSTACK_AMOUNT_MISMATCH]', {
        reference: cleanRef,
        expectedAmount,
        paidAmount,
      });
      throw new AppError('Payment amount verification mismatch.', 400);
    }

    // 5. Execute atomic database transaction
    const [updatedPayment, updatedOrder, enrollment] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          paidAt: verification.paidAt ? new Date(verification.paidAt) : new Date(),
          metadata: JSON.stringify(verification.metadata || {}),
        },
      }),
      prisma.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.PAID },
      }),
      prisma.enrollment.upsert({
        where: { userId_courseId: { userId: payment.order.userId, courseId: payment.order.courseId } },
        update: { status: EnrollmentStatus.ACTIVE },
        create: {
          userId: payment.order.userId,
          courseId: payment.order.courseId,
          status: EnrollmentStatus.ACTIVE,
        },
      }),
    ]);

    enrollmentsCounter.inc();

    // 6. Asynchronous Notification & Audit Logging
    createNotification({
      userId: payment.order.userId,
      title: 'Course Access Unlocked',
      message: `Your payment of ${payment.currency} ${payment.amount} for "${payment.order.course.title}" was verified successfully!`,
      type: 'PAYMENT_SUCCESS',
      linkUrl: `/courses/${payment.order.course.slug}/learn`,
    }).catch((err) => logger.error('[NOTIFICATION_ERROR]', err));

    recordAuditLog({
      userId: payment.order.userId,
      action: 'PAYSTACK_PAYMENT_VERIFIED',
      entity: 'Enrollment',
      entityId: enrollment.id,
      details: {
        reference: cleanRef,
        amount: payment.amount,
        currency: payment.currency,
        courseId: payment.order.courseId,
      },
    }).catch((err) => logger.error('[AUDIT_LOG_ERROR]', err));

    res.json({
      success: true,
      status: 'COMPLETED',
      message: 'Payment verified successfully! Course unlocked.',
      reference: cleanRef,
      courseTitle: payment.order.course.title,
      courseSlug: payment.order.course.slug,
      enrollmentId: enrollment.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle incoming Paystack webhooks securely with HMAC SHA512 signature validation
 */
export const handlePaystackWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signatureHeader = req.headers['x-paystack-signature'] as string | undefined;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    const isValidSignature = paystackService.verifyPaystackWebhookSignature(signatureHeader, rawBody);

    if (!isValidSignature) {
      logger.warn('[PAYSTACK_WEBHOOK_UNAUTHORIZED] Invalid webhook signature received.');
      throw new AppError('Invalid Paystack webhook signature.', 400);
    }

    const event = req.body;
    logger.info(`[PAYSTACK_WEBHOOK_RECEIVED] Event: ${event?.event}`, { reference: event?.data?.reference });

    if (event?.event === 'charge.success') {
      const data = event.data;
      const reference = data?.reference;

      if (reference) {
        const payment = await prisma.payment.findFirst({
          where: { transactionId: reference },
          include: { order: true },
        });

        if (payment && payment.status !== PaymentStatus.COMPLETED) {
          // Verify paid amount matches expected order price
          const paidMajor = data.amount ? data.amount / 100 : 0;
          if (Math.abs(paidMajor - payment.amount) <= 0.01) {
            await prisma.$transaction([
              prisma.payment.update({
                where: { id: payment.id },
                data: {
                  status: PaymentStatus.COMPLETED,
                  paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
                  rawWebhookPayload: JSON.stringify(event),
                },
              }),
              prisma.order.update({
                where: { id: payment.orderId },
                data: { status: OrderStatus.PAID },
              }),
              prisma.enrollment.upsert({
                where: { userId_courseId: { userId: payment.order.userId, courseId: payment.order.courseId } },
                update: { status: EnrollmentStatus.ACTIVE },
                create: {
                  userId: payment.order.userId,
                  courseId: payment.order.courseId,
                  status: EnrollmentStatus.ACTIVE,
                },
              }),
            ]);

            logger.info(`[PAYSTACK_WEBHOOK_SUCCESS] Enrollment activated for order ${payment.orderId}, reference: ${reference}`);
          } else {
            logger.error('[PAYSTACK_WEBHOOK_AMOUNT_MISMATCH]', {
              reference,
              expected: payment.amount,
              paid: paidMajor,
            });
          }
        }
      }
    }

    // Always respond with 200 OK to acknowledge receipt to Paystack
    res.status(200).json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user order and payment history
 */
export const getUserPaymentHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, title: true, slug: true, thumbnail: true } },
        payments: {
          select: {
            id: true,
            transactionId: true,
            paymentProvider: true,
            status: true,
            amount: true,
            currency: true,
            paidAt: true,
            createdAt: true,
          },
        },
      },
    });
    res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};
