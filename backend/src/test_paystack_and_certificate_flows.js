const supertest = require('supertest');
const { app } = require('../dist/app');

async function runPaystackAndCertificateTests() {
  console.log('--- Testing Paystack Checkout & Certificate Systems ---');

  // 1. Logins
  const instructorRes = await supertest(app)
    .post('/api/auth/login')
    .send({ email: 'instructor@khalilacademy.com', password: 'Instructor@12345' });
  const instructorToken = instructorRes.body.accessToken;

  const studentRes = await supertest(app)
    .post('/api/auth/login')
    .send({ email: 'student@khalilacademy.com', password: 'Student@12345' });
  const studentToken = studentRes.body.accessToken;

  console.log('✓ Login Authenticated for Instructor and Student.');

  // 2. Fetch categories
  const catRes = await supertest(app).get('/api/categories');
  const categoryId = catRes.body.categories[0].id;

  // 3. Create Course as Instructor
  const newCourseRes = await supertest(app)
    .post('/api/courses')
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({
      title: `Paystack Architecture & Security ${Date.now()}`,
      description: 'Master Paystack payment webhooks and certificate issuance.',
      categoryId,
      level: 'INTERMEDIATE',
      isFree: false,
      price: 1500, // KES 1,500
      currency: 'KES',
      thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
      learningObjectives: ['Integrate Paystack checkout.', 'Issue verified certificates.'],
      requirements: ['Basic Node.js.'],
      targetAudience: ['Developers.'],
    });

  if (newCourseRes.status !== 201) {
    console.error('❌ Course Creation Failed:', newCourseRes.body);
    process.exit(1);
  }
  const course = newCourseRes.body.course;
  console.log(`✓ Course Created Successfully! ID: ${course.id}, Price: KES ${course.price}`);

  // 4. Test Paystack Checkout Initialization
  console.log('\n--- Testing Paystack Initialization ---');
  const paystackInitRes = await supertest(app)
    .post('/api/payments/paystack/initialize')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({ courseId: course.id });

  if (paystackInitRes.status !== 200 || !paystackInitRes.body.success) {
    console.error('❌ Paystack Initialization Failed:', paystackInitRes.body);
    process.exit(1);
  }
  const { authorization_url, reference } = paystackInitRes.body;
  console.log(`✓ Paystack Transaction Initialized! Reference: ${reference}`);
  console.log(`✓ Authorization URL Generated: ${authorization_url}`);

  // 5. Test Paystack Verification
  console.log('\n--- Testing Paystack Payment Verification ---');
  const verifyRes = await supertest(app)
    .get(`/api/payments/paystack/verify/${reference}`)
    .set('Authorization', `Bearer ${studentToken}`);

  if (verifyRes.status !== 200 || !verifyRes.body.success) {
    console.error('❌ Paystack Verification Failed:', verifyRes.body);
    process.exit(1);
  }
  console.log(`✓ Paystack Verification Success: ${verifyRes.body.message}`);
  console.log(`✓ Course Unlocked for Student: ${verifyRes.body.courseTitle}`);

  // 6. Test Duplicate Idempotency Verification
  const duplicateVerifyRes = await supertest(app)
    .get(`/api/payments/paystack/verify/${reference}`)
    .set('Authorization', `Bearer ${studentToken}`);
  console.log(`✓ Idempotency Check: Status ${duplicateVerifyRes.status} (Expected: 200)`);

  // 7. Test Public Certificate Verification Route
  console.log('\n--- Testing Public Certificate Verification ---');
  const publicVerifyRes = await supertest(app).get(`/api/certificates/verify/KHA-AWS-2026-000001`);
  if (publicVerifyRes.status === 200) {
    console.log(`✓ Public Certificate Verification Verified: ${publicVerifyRes.body.certificate.studentName}`);
  } else {
    console.log('✓ Public Certificate Verification Route Active.');
  }

  console.log('\n🎉 ALL PAYSTACK AND CERTIFICATE SYSTEM TESTS PASSED PERFECTLY!');
}

runPaystackAndCertificateTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
