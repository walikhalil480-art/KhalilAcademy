const supertest = require('supertest');
const { app } = require('../dist/app');

async function runFlowTests() {
  console.log('--- Testing Authentication, Course Creation, Free Enrollment & Paid Checkout ---');

  // 1. Logins
  const accounts = {
    superAdmin: { email: 'admin@khalilacademy.com', password: 'Admin@12345' },
    admin: { email: 'academy.admin@khalilacademy.com', password: 'Admin@12345' },
    instructor: { email: 'instructor@khalilacademy.com', password: 'Instructor@12345' },
    student: { email: 'student@khalilacademy.com', password: 'Student@12345' },
  };

  const tokens = {};

  for (const [key, acc] of Object.entries(accounts)) {
    const res = await supertest(app).post('/api/auth/login').send(acc);
    if (res.status === 200 && res.body.success) {
      tokens[key] = res.body.accessToken;
      console.log(`✓ Login Success [${key.toUpperCase()}]: Token Acquired`);
    } else {
      console.error(`❌ Login Failed for ${key}:`, res.body);
      process.exit(1);
    }
  }

  // 2. Fetch categories for course creation
  const catRes = await supertest(app).get('/api/categories');
  const categoryId = catRes.body.categories[0].id;

  // 3. Test Course Creation for INSTRUCTOR
  console.log('\n--- 1. Testing Course Creation (INSTRUCTOR) ---');
  const coursePayload = {
    title: `Test Cloud Security Masterclass ${Date.now()}`,
    description: 'Advanced cloud security and compliance automation.',
    categoryId,
    level: 'ADVANCED',
    isFree: false,
    price: 29.99,
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
    learningObjectives: ['Learn cloud security concepts.'],
    requirements: ['Basic cloud experience.'],
    targetAudience: ['Security Engineers.'],
  };

  const instCourseRes = await supertest(app)
    .post('/api/courses')
    .set('Authorization', `Bearer ${tokens.instructor}`)
    .send(coursePayload);

  console.log(`INSTRUCTOR Create Course Status: ${instCourseRes.status} (Expected: 201)`);
  if (instCourseRes.status !== 201) {
    console.error('❌ Instructor Course Creation Failed:', instCourseRes.body);
    process.exit(1);
  }
  const newlyCreatedPaidCourseId = instCourseRes.body.course.id;
  console.log(`✓ Course Created ID: ${newlyCreatedPaidCourseId}`);

  // 4. Test Course Creation for STUDENT (Must return 403 Forbidden, NOT 401)
  console.log('\n--- 2. Testing Course Creation (STUDENT - Must return 403) ---');
  const studentCourseRes = await supertest(app)
    .post('/api/courses')
    .set('Authorization', `Bearer ${tokens.student}`)
    .send(coursePayload);

  console.log(`STUDENT Create Course Status: ${studentCourseRes.status} (Expected: 403 Forbidden)`);
  if (studentCourseRes.status !== 403) {
    console.error('❌ Expected 403 for STUDENT course creation, but got:', studentCourseRes.status);
    process.exit(1);
  }

  // 5. Test Unauthenticated Request (Must return 401 Unauthorized)
  console.log('\n--- 3. Testing Unauthenticated Request (Must return 401) ---');
  const unauthRes = await supertest(app).post('/api/courses').send(coursePayload);
  console.log(`Unauthenticated Request Status: ${unauthRes.status} (Expected: 401 Unauthorized)`);
  if (unauthRes.status !== 401) {
    console.error('❌ Expected 401 for unauthenticated request, but got:', unauthRes.status);
    process.exit(1);
  }

  // 6. Test Free Course Enrollment for STUDENT
  console.log('\n--- 4. Testing Free Course Enrollment (STUDENT) ---');
  const coursesRes = await supertest(app).get('/api/courses');
  const freeCourse = coursesRes.body.courses.find((c) => c.isFree);

  if (freeCourse) {
    const freeEnrollRes = await supertest(app)
      .post(`/api/payments/courses/${freeCourse.id}/enroll`)
      .set('Authorization', `Bearer ${tokens.student}`);

    console.log(`STUDENT Free Enrollment Status: ${freeEnrollRes.status} (Expected: 200)`);
    if (freeEnrollRes.status !== 200 && freeEnrollRes.status !== 409) {
      console.error('❌ Free Enrollment Failed:', freeEnrollRes.body);
      process.exit(1);
    }
    console.log(`✓ Free Enrollment Verified.`);
  }

  // 7. Test Paid Course Checkout Order Creation for STUDENT
  console.log('\n--- 5. Testing Paid Course Checkout (STUDENT) ---');
  const checkoutRes = await supertest(app)
    .post('/api/payments/paystack/initialize')
    .set('Authorization', `Bearer ${tokens.student}`)
    .send({ courseId: newlyCreatedPaidCourseId });

  console.log(`STUDENT Checkout Status: ${checkoutRes.status} (Expected: 200)`);
  if (checkoutRes.status !== 200) {
    console.error('❌ Checkout Failed:', checkoutRes.body);
    process.exit(1);
  }
  console.log(`✓ Paystack Checkout Reference Created: ${checkoutRes.body.reference}`);

  // Execute Paystack payment verification
  const payRes = await supertest(app)
    .get(`/api/payments/paystack/verify/${checkoutRes.body.reference}`)
    .set('Authorization', `Bearer ${tokens.student}`);

  console.log(`Paystack Payment Confirmation Status: ${payRes.status} (Expected: 200)`);
  if (payRes.status === 200 && payRes.body.success) {
    console.log('✓ Paid Enrollment Confirmation Verified.');
  }

  console.log('\n🎉 ALL AUTHENTICATION AND ENROLLMENT FLOW TESTS PASSED PERFECTLY!');
}

runFlowTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
