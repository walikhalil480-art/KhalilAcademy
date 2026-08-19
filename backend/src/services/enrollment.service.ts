import crypto from 'crypto';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { getPaymentProviderInstance } from './payment.service';
import { createNotification } from './notification.service';
import { recordAuditLog } from './auditLog.service';
import { enrollmentsCounter, paymentFailuresCounter } from '../utils/metrics';
import { OrderStatus, PaymentStatus, EnrollmentStatus, PaymentProvider } from '@prisma/client';

export const validateCouponCode = async (code: string, originalPrice: number) => {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!coupon || !coupon.isActive) {
    throw new AppError('Invalid or inactive coupon code.', 400);
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new AppError('This coupon code has expired.', 400);
  }

  if (coupon.currentUses >= coupon.maxUses) {
    throw new AppError('Coupon maximum usage limit reached.', 400);
  }

  if (originalPrice < coupon.minPurchaseAmount) {
    throw new AppError(`Minimum purchase amount for this coupon is $${coupon.minPurchaseAmount}.`, 400);
  }

  let discountAmount = 0;
  if (coupon.discountType === 'PERCENTAGE') {
    discountAmount = (originalPrice * coupon.discountValue) / 100;
  } else {
    discountAmount = coupon.discountValue;
  }

  discountAmount = Math.min(discountAmount, originalPrice);
  const finalPrice = Math.max(0, originalPrice - discountAmount);

  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    finalPrice: parseFloat(finalPrice.toFixed(2)),
  };
};

export const enrollFreeCourse = async (userId: string, courseIdOrSlug: string) => {
  const course = await prisma.course.findFirst({
    where: { OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }] },
  });
  if (!course) throw new AppError('Course not found.', 404);

  if (!course.isFree && course.price > 0) {
    throw new AppError('This course is a paid course. Please complete checkout.', 400);
  }

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  });

  if (existing) {
    return existing;
  }

  const enrollment = await prisma.enrollment.create({
    data: {
      userId,
      courseId: course.id,
      status: EnrollmentStatus.ACTIVE,
    },
  });

  enrollmentsCounter.inc();

  await createNotification({
    userId,
    title: `Enrolled in ${course.title}`,
    message: `You have successfully enrolled in "${course.title}". Start learning today!`,
    type: 'ENROLLMENT',
    linkUrl: `/courses/${course.slug}/learn`,
  });

  await recordAuditLog({
    userId,
    action: 'FREE_ENROLLMENT_CREATED',
    entity: 'Enrollment',
    entityId: enrollment.id,
    details: { courseId: course.id },
  });

  return enrollment;
};

export const verifyLessonAccessPermission = async (userId?: string, userRole?: string, lessonId?: string) => {
  if (!lessonId) return true;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseId: true } } },
  });

  if (!lesson) throw new AppError('Lesson not found.', 404);

  // If lesson is marked as Free Preview, allow access to everyone
  if (lesson.isPreview) {
    return true;
  }

  // Admins & Instructors always have access
  if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'INSTRUCTOR') {
    return true;
  }

  if (!userId) {
    throw new AppError('Authentication required to access this lesson.', 401);
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: lesson.module.courseId } },
  });

  if (!enrollment || enrollment.status === EnrollmentStatus.CANCELLED) {
    throw new AppError('Course locked. Please enroll or purchase this course to continue learning.', 403);
  }

  return true;
};

export const createCheckoutOrder = async (userId: string, courseId: string, couponCode?: string) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { instructor: true },
  });

  if (!course) throw new AppError('Course not found.', 404);

  const existingEnrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (existingEnrollment) {
    throw new AppError('You are already enrolled in this course.', 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found.', 404);

  let discountAmount = 0;
  let finalPrice = course.discountPrice !== null ? course.discountPrice : course.price;
  let validCouponCode: string | undefined = undefined;

  if (couponCode) {
    const couponResult = await validateCouponCode(couponCode, finalPrice);
    discountAmount += couponResult.discountAmount;
    finalPrice = couponResult.finalPrice;
    validCouponCode = couponResult.code;
  }

  const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId,
      courseId,
      originalPrice: course.price,
      discountAmount,
      finalPrice,
      couponCode: validCouponCode,
      status: OrderStatus.PENDING,
    },
  });

  const paymentProvider = getPaymentProviderInstance(PaymentProvider.CARD);
  const checkoutIntent = await (paymentProvider as any).createPaymentIntent?.({
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: finalPrice,
    currency: 'USD',
    courseTitle: course.title,
    studentEmail: user.email,
  }) || { paymentProvider: PaymentProvider.CARD, transactionId: `TXN_${Date.now()}`, checkoutUrl: '' };

  await prisma.payment.create({
    data: {
      orderId: order.id,
      paymentProvider: checkoutIntent.paymentProvider,
      transactionId: checkoutIntent.transactionId,
      status: PaymentStatus.PENDING,
      amount: finalPrice,
    },
  });

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    originalPrice: course.price,
    discountAmount,
    finalPrice,
    checkoutUrl: checkoutIntent.checkoutUrl,
    transactionId: checkoutIntent.transactionId,
  };
};

export const handlePaymentWebhook = async (headers: Record<string, any>, body: any) => {
  const paymentProvider = getPaymentProviderInstance(PaymentProvider.CARD);
  const verification = await (paymentProvider as any).verifyWebhook?.(headers, body) || { isValid: true, orderId: body.orderId };

  if (!verification.isValid || !verification.orderId) {
    paymentFailuresCounter.inc();
    throw new AppError('Invalid payment webhook signature.', 400);
  }

  const order = await prisma.order.findUnique({
    where: { id: verification.orderId },
    include: { course: true, user: true },
  });

  if (!order) {
    throw new AppError('Order associated with webhook not found.', 404);
  }

  if (verification.status === 'COMPLETED' || verification.status === 'PAID' as any) {
    // 1. Update Order & Payment status
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PAID },
    });

    await prisma.payment.updateMany({
      where: { orderId: order.id },
      data: {
        status: PaymentStatus.COMPLETED,
        rawWebhookPayload: verification.rawPayload,
      },
    });

    // 2. Increment coupon if used
    if (order.couponCode) {
      await prisma.coupon.updateMany({
        where: { code: order.couponCode },
        data: { currentUses: { increment: 1 } },
      });
    }

    // 3. Create Enrollment
    const enrollment = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: order.userId, courseId: order.courseId } },
      update: { status: EnrollmentStatus.ACTIVE },
      create: {
        userId: order.userId,
        courseId: order.courseId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    enrollmentsCounter.inc();

    // 4. Notifications & Audit Logs
    await createNotification({
      userId: order.userId,
      title: `Payment Successful & Enrolled!`,
      message: `Your payment of $${order.finalPrice} for "${order.course.title}" has been confirmed. Order ${order.orderNumber}.`,
      type: 'PAYMENT_SUCCESS',
      linkUrl: `/courses/${order.course.slug}/learn`,
    });

    await recordAuditLog({
      userId: order.userId,
      action: 'PAYMENT_SUCCESS_ENROLLED',
      entity: 'Order',
      entityId: order.id,
      details: { orderNumber: order.orderNumber, amount: order.finalPrice },
    });

    return { success: true, enrollmentId: enrollment.id };
  } else {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.FAILED },
    });

    await prisma.payment.updateMany({
      where: { orderId: order.id },
      data: { status: PaymentStatus.FAILED, rawWebhookPayload: verification.rawPayload },
    });

    paymentFailuresCounter.inc();

    await createNotification({
      userId: order.userId,
      title: `Payment Failed`,
      message: `Your payment for order ${order.orderNumber} could not be processed. Please try again.`,
      type: 'PAYMENT_FAILED',
    });

    return { success: false, message: 'Payment marked as failed.' };
  }
};
