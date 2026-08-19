import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import * as enrollmentService from '../services/enrollment.service';
import * as paystackService from '../services/paystack.service';
import { prisma } from '../config/database';
import { PaymentProvider, OrderStatus, PaymentStatus, EnrollmentStatus } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import { createNotification } from '../services/notification.service';
import { recordAuditLog } from '../services/auditLog.service';
import { enrollmentsCounter } from '../utils/metrics';

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

// 1. Paystack Transaction Initialization
export const initializePaystackCheckout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, couponCode } = req.body;
    const userId = req.user!.id;

    // 1. Fetch course from PostgreSQL (Never trust frontend price)
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError('Course not found.', 404);

    if (course.isFree || course.price === 0) {
      throw new AppError('This is a free course. Please use the free enrollment option.', 400);
    }

    // 2. Check existing enrollment
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existingEnrollment && (existingEnrollment.status === EnrollmentStatus.ACTIVE || existingEnrollment.status === EnrollmentStatus.COMPLETED)) {
      return res.json({
        success: true,
        alreadyEnrolled: true,
        courseSlug: course.slug,
        message: 'You are already enrolled in this course.',
      });
    }

    // 3. Create Checkout Order & Coupon discount calculation
    const checkout = await enrollmentService.createCheckoutOrder(userId, courseId, couponCode);
    const reference = `PSK_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // 4. Record Payment Entry in DB
    await prisma.payment.create({
      data: {
        orderId: checkout.orderId,
        paymentProvider: PaymentProvider.PAYSTACK,
        providerTransactionId: reference,
        transactionId: reference,
        status: PaymentStatus.PENDING,
        amount: checkout.finalPrice,
        currency: course.currency || 'KES',
      },
    });

    // 5. Initialize Paystack Transaction
    const paystackResult = await paystackService.initializePaystackTransaction({
      email: req.user!.email,
      amount: checkout.finalPrice,
      currency: course.currency || 'KES',
      reference,
      metadata: {
        orderId: checkout.orderId,
        courseId: course.id,
        userId,
      },
    });

    res.json({
      success: true,
      authorization_url: paystackResult.authorization_url,
      reference: paystackResult.reference,
      orderNumber: checkout.orderNumber,
      amount: checkout.finalPrice,
      currency: course.currency || 'KES',
    });
  } catch (error) {
    next(error);
  }
};

// 2. Paystack Payment Verification
export const verifyPaystackCheckout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const reference = req.params.reference;
    if (!reference) throw new AppError('Transaction reference required.', 400);

    const verification = await paystackService.verifyPaystackTransaction(reference);

    if (verification.status !== 'success') {
      throw new AppError('Paystack payment verification failed or is not completed.', 400);
    }

    // Find payment & order record
    const payment = await prisma.payment.findFirst({
      where: { transactionId: reference },
      include: { order: { include: { course: true, user: true } } },
    });

    if (!payment) {
      throw new AppError('Payment record for this reference not found.', 404);
    }

    // Idempotency check: if already completed, return success
    if (payment.status === PaymentStatus.COMPLETED) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: payment.order.userId, courseId: payment.order.courseId } },
      });
      return res.json({
        success: true,
        status: 'COMPLETED',
        message: 'Payment already verified and course unlocked.',
        courseSlug: payment.order.course.slug,
        enrollmentId: enrollment?.id,
      });
    }

    // Update Payment & Order
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.COMPLETED },
    });

    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: OrderStatus.PAID },
    });

    // Create Active Enrollment
    const enrollment = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: payment.order.userId, courseId: payment.order.courseId } },
      update: { status: EnrollmentStatus.ACTIVE },
      create: {
        userId: payment.order.userId,
        courseId: payment.order.courseId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    enrollmentsCounter.inc();

    await createNotification({
      userId: payment.order.userId,
      title: 'Payment Confirmed (Paystack)',
      message: `Your payment of ${payment.order.course.currency || 'KES'} ${payment.amount} for "${payment.order.course.title}" has been verified!`,
      type: 'PAYMENT_SUCCESS',
      linkUrl: `/courses/${payment.order.course.slug}/learn`,
    });

    await recordAuditLog({
      userId: payment.order.userId,
      action: 'PAYSTACK_PAYMENT_VERIFIED',
      entity: 'Enrollment',
      entityId: enrollment.id,
      details: { reference, amount: payment.amount },
    });

    res.json({
      success: true,
      status: 'COMPLETED',
      message: 'Payment verified successfully! Course unlocked.',
      reference,
      courseTitle: payment.order.course.title,
      courseSlug: payment.order.course.slug,
      enrollmentId: enrollment.id,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Paystack Webhook Handler
export const handlePaystackWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawBody = JSON.stringify(req.body);
    const isValid = paystackService.verifyPaystackWebhookSignature(req.headers, rawBody);
    if (!isValid) {
      throw new AppError('Invalid Paystack webhook signature.', 400);
    }

    const event = req.body;
    if (event.event === 'charge.success') {
      const reference = event.data?.reference;
      if (reference) {
        const payment = await prisma.payment.findFirst({ where: { transactionId: reference } });
        if (payment && payment.status !== PaymentStatus.COMPLETED) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.COMPLETED },
          });

          await prisma.order.update({
            where: { id: payment.orderId },
            data: { status: OrderStatus.PAID },
          });

          const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
          if (order) {
            await prisma.enrollment.upsert({
              where: { userId_courseId: { userId: order.userId, courseId: order.courseId } },
              update: { status: EnrollmentStatus.ACTIVE },
              create: { userId: order.userId, courseId: order.courseId, status: EnrollmentStatus.ACTIVE },
            });
          }
        }
      }
    }

    res.json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};

export const getUserPaymentHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, title: true, slug: true, thumbnail: true } },
        payments: { select: { id: true, transactionId: true, paymentProvider: true, status: true, createdAt: true } },
      },
    });
    res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

// 4. Stripe Checkout Initialization
export const initializeStripeCheckout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, couponCode } = req.body;
    const userId = req.user!.id;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError('Course not found.', 404);

    if (course.isFree || course.price === 0) {
      throw new AppError('This is a free course. Please use free enrollment.', 400);
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existingEnrollment && (existingEnrollment.status === EnrollmentStatus.ACTIVE || existingEnrollment.status === EnrollmentStatus.COMPLETED)) {
      return res.json({
        success: true,
        alreadyEnrolled: true,
        courseSlug: course.slug,
        message: 'You are already enrolled in this course.',
      });
    }

    const checkout = await enrollmentService.createCheckoutOrder(userId, courseId, couponCode);
    const stripeService = await import('../services/stripe.service');

    const stripeResult = await stripeService.initializeStripeTransaction({
      email: req.user!.email,
      amount: checkout.finalPrice,
      currency: course.currency || 'USD',
      courseTitle: course.title,
      courseId: course.id,
      orderId: checkout.orderId,
      userId,
    });

    await prisma.payment.create({
      data: {
        orderId: checkout.orderId,
        paymentProvider: PaymentProvider.CARD,
        providerTransactionId: stripeResult.reference,
        transactionId: stripeResult.reference,
        status: PaymentStatus.PENDING,
        amount: checkout.finalPrice,
        currency: course.currency || 'USD',
      },
    });

    res.json({
      success: true,
      checkoutUrl: stripeResult.checkoutUrl,
      reference: stripeResult.reference,
      orderNumber: checkout.orderNumber,
      amount: checkout.finalPrice,
      currency: course.currency || 'USD',
    });
  } catch (error) {
    next(error);
  }
};

// 5. Stripe Checkout Verification
export const verifyStripeCheckout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const reference = req.params.reference;
    if (!reference) throw new AppError('Stripe transaction reference required.', 400);

    const stripeService = await import('../services/stripe.service');
    const verification = await stripeService.verifyStripeTransaction(reference);

    if (verification.status !== 'success') {
      throw new AppError('Stripe payment verification failed.', 400);
    }

    const payment = await prisma.payment.findFirst({
      where: { transactionId: reference },
      include: { order: { include: { course: true, user: true } } },
    });

    if (!payment) {
      throw new AppError('Payment record not found.', 404);
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: payment.order.userId, courseId: payment.order.courseId } },
      });
      return res.json({
        success: true,
        status: 'COMPLETED',
        message: 'Stripe payment verified and course unlocked.',
        courseTitle: payment.order.course.title,
        courseSlug: payment.order.course.slug,
        reference,
        enrollmentId: enrollment?.id,
      });
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.COMPLETED },
    });

    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: OrderStatus.PAID },
    });

    const enrollment = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: payment.order.userId, courseId: payment.order.courseId } },
      update: { status: EnrollmentStatus.ACTIVE },
      create: {
        userId: payment.order.userId,
        courseId: payment.order.courseId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    enrollmentsCounter.inc();

    await createNotification({
      userId: payment.order.userId,
      title: 'Payment Confirmed (Stripe)',
      message: `Your Stripe payment of $${payment.amount} for "${payment.order.course.title}" was verified!`,
      type: 'PAYMENT_SUCCESS',
      linkUrl: `/courses/${payment.order.course.slug}/learn`,
    });

    await recordAuditLog({
      userId: payment.order.userId,
      action: 'STRIPE_PAYMENT_VERIFIED',
      entity: 'Enrollment',
      entityId: enrollment.id,
      details: { reference, amount: payment.amount },
    });

    res.json({
      success: true,
      status: 'COMPLETED',
      message: 'Stripe payment completed! Course unlocked.',
      reference,
      courseTitle: payment.order.course.title,
      courseSlug: payment.order.course.slug,
      enrollmentId: enrollment.id,
    });
  } catch (error) {
    next(error);
  }
};

