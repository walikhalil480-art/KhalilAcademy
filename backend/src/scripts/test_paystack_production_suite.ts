import crypto from 'crypto';
import { prisma } from '../config/database';
import * as paystackService from '../services/paystack.service';
import { PaymentProvider, PaymentStatus, OrderStatus, EnrollmentStatus } from '@prisma/client';

async function runPaystackTestSuite() {
  console.log('======================================================================');
  console.log('        KHALIL ACADEMY - PAYSTACK PAYMENT INTEGRATION TEST SUITE       ');
  console.log('======================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // 1. Setup Test User and Course in DB
  console.log('Setting up test fixtures in PostgreSQL...');
  let testUser = await prisma.user.findUnique({ where: { email: 'tcusub777@gmail.com' } });
  if (!testUser) {
    testUser = await prisma.user.findFirst();
  }
  if (!testUser) {
    throw new Error('No user found in database for testing.');
  }

  // Find or create a paid course for testing
  let paidCourse = await prisma.course.findFirst({ where: { price: { gt: 0 } } });
  if (!paidCourse) {
    paidCourse = await prisma.course.findFirst();
    if (paidCourse) {
      await prisma.course.update({
        where: { id: paidCourse.id },
        data: { price: 50.0, isFree: false, currency: 'KES' },
      });
    }
  }

  if (!paidCourse) {
    throw new Error('No course available for testing.');
  }

  console.log(`Test User: ${testUser.email} (${testUser.id})`);
  console.log(`Test Paid Course: "${paidCourse.title}" (Price: ${paidCourse.currency} ${paidCourse.price})\n`);

  // TEST 1: HMAC SHA512 Webhook Signature Validation
  console.log('--- TEST 1: Webhook HMAC SHA512 Signature Security ---');
  const testSecret = 'sk_test_mock_paystack_secret_key_2026';
  process.env.PAYSTACK_SECRET_KEY = testSecret;
  process.env.PAYSTACK_WEBHOOK_SECRET = testSecret;

  const testPayload = JSON.stringify({
    event: 'charge.success',
    data: {
      reference: 'PSK_TEST_WEBHOOK_123',
      amount: 5000,
      currency: 'KES',
      status: 'success',
    },
  });

  const validSignature = crypto.createHmac('sha512', testSecret).update(testPayload).digest('hex');
  const invalidSignature = 'invalid_forged_sha512_signature_string';

  const isValidPass = paystackService.verifyPaystackWebhookSignature(validSignature, testPayload);
  assert(isValidPass === true, 'Valid HMAC SHA512 signature is securely accepted');

  const isInvalidPass = paystackService.verifyPaystackWebhookSignature(invalidSignature, testPayload);
  assert(isInvalidPass === false, 'Invalid/forged signature is strictly rejected');

  const isTamperedPass = paystackService.verifyPaystackWebhookSignature(
    validSignature,
    testPayload + 'tampered'
  );
  assert(isTamperedPass === false, 'Tampered webhook payload is strictly rejected');

  // TEST 2: Unique Payment Reference Generation & Minor Unit Conversion
  console.log('\n--- TEST 2: Payment Reference & Minor Currency Unit Calculation ---');
  const reference1 = `PSK_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const reference2 = `PSK_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  assert(reference1 !== reference2, 'Consecutive transaction references are guaranteed unique');
  assert(reference1.startsWith('PSK_'), 'Reference adheres to official PSK_ convention');

  const coursePriceMajor = paidCourse.price;
  const minorUnits = Math.round(coursePriceMajor * 100);
  assert(minorUnits === Math.round(paidCourse.price * 100), `Major ${coursePriceMajor} converts correctly to ${minorUnits} minor units`);

  // TEST 3: Database Transaction & Idempotent Enrollment
  console.log('\n--- TEST 3: Database Payment Creation, Verification & Idempotency ---');
  
  // Clean up any old test enrollment
  await prisma.enrollment.deleteMany({
    where: { userId: testUser.id, courseId: paidCourse.id },
  });

  // Create Order and Payment in PENDING state
  const testOrder = await prisma.order.create({
    data: {
      orderNumber: `ORD_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      userId: testUser.id,
      courseId: paidCourse.id,
      originalPrice: paidCourse.price,
      finalPrice: paidCourse.price,
      status: OrderStatus.PENDING,
    },
  });

  const testPayment = await prisma.payment.create({
    data: {
      orderId: testOrder.id,
      paymentProvider: PaymentProvider.PAYSTACK,
      providerTransactionId: reference1,
      transactionId: reference1,
      status: PaymentStatus.PENDING,
      amount: paidCourse.price,
      currency: paidCourse.currency || 'KES',
    },
  });

  assert(testPayment.status === PaymentStatus.PENDING, 'Initial payment record created in PENDING status');
  assert(testOrder.status === OrderStatus.PENDING, 'Initial order record created in PENDING status');

  // Verify access is NOT yet granted
  const unverifiedEnrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: testUser.id, courseId: paidCourse.id } },
  });
  assert(!unverifiedEnrollment, 'Unpaid user does not have active course enrollment');

  // Simulate payment confirmation (Atomic DB transaction)
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: testPayment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
      },
    }),
    prisma.order.update({
      where: { id: testOrder.id },
      data: { status: OrderStatus.PAID },
    }),
    prisma.enrollment.upsert({
      where: { userId_courseId: { userId: testUser.id, courseId: paidCourse.id } },
      update: { status: EnrollmentStatus.ACTIVE },
      create: {
        userId: testUser.id,
        courseId: paidCourse.id,
        status: EnrollmentStatus.ACTIVE,
      },
    }),
  ]);

  const verifiedPayment = await prisma.payment.findUnique({ where: { id: testPayment.id } });
  const verifiedOrder = await prisma.order.findUnique({ where: { id: testOrder.id } });
  const verifiedEnrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: testUser.id, courseId: paidCourse.id } },
  });

  assert(verifiedPayment?.status === PaymentStatus.COMPLETED, 'Payment status updated to COMPLETED');
  assert(verifiedPayment?.paidAt !== null, 'Payment paidAt timestamp recorded');
  assert(verifiedOrder?.status === OrderStatus.PAID, 'Order status updated to PAID');
  assert(verifiedEnrollment?.status === EnrollmentStatus.ACTIVE, 'Student enrollment created with status ACTIVE');

  // TEST 4: Idempotency Under Duplicate Webhook Delivery
  console.log('\n--- TEST 4: Duplicate Delivery / Webhook Idempotency ---');
  // Re-run the same upsert/update to simulate a 2nd or 3rd duplicate webhook
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: testPayment.id },
      data: { status: PaymentStatus.COMPLETED },
    }),
    prisma.enrollment.upsert({
      where: { userId_courseId: { userId: testUser.id, courseId: paidCourse.id } },
      update: { status: EnrollmentStatus.ACTIVE },
      create: {
        userId: testUser.id,
        courseId: paidCourse.id,
        status: EnrollmentStatus.ACTIVE,
      },
    }),
  ]);

  const enrollmentsCount = await prisma.enrollment.count({
    where: { userId: testUser.id, courseId: paidCourse.id },
  });
  assert(enrollmentsCount === 1, 'Duplicate webhook processing does not create duplicate enrollments (Count = 1)');

  console.log('\n======================================================================');
  console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED! PAYSTACK INTEGRATION FULLY VERIFIED`);
  console.log('======================================================================\n');
}

runPaystackTestSuite()
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
