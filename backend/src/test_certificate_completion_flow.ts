import supertest from 'supertest';
import { app } from './app';
import { prisma } from './config/database';

async function runAcceptanceTests() {
  console.log('====================================================');
  console.log('   RUNNING CERTIFICATE & COMPLETION SYSTEM TESTS    ');
  console.log('====================================================\n');

  // 1. Setup Test Users: Instructor, Student A, Student B
  const timestamp = Date.now();
  const studentAEmail = `cert_student_a_${timestamp}@khalilacademy.org`;
  const studentBEmail = `cert_student_b_${timestamp}@khalilacademy.org`;
  const password = 'Password@12345';

  // Register & Login Student A
  await supertest(app).post('/api/auth/register').send({
    name: 'Khalil Abdi Wali',
    email: studentAEmail,
    password,
  });
  await prisma.user.update({ where: { email: studentAEmail }, data: { emailVerified: true } });
  const loginARes = await supertest(app).post('/api/auth/login').send({
    email: studentAEmail,
    password,
  });
  const tokenA = loginARes.body.accessToken;
  const userA = loginARes.body.user;

  // Register & Login Student B
  await supertest(app).post('/api/auth/register').send({
    name: 'Test Student B',
    email: studentBEmail,
    password,
  });
  await prisma.user.update({ where: { email: studentBEmail }, data: { emailVerified: true } });
  const loginBRes = await supertest(app).post('/api/auth/login').send({
    email: studentBEmail,
    password,
  });
  const tokenB = loginBRes.body.accessToken;

  // Login Instructor
  const instructorRes = await supertest(app).post('/api/auth/login').send({
    email: 'instructor@khalilacademy.com',
    password: 'Instructor@12345',
  });
  const instructorToken = instructorRes.body.accessToken;

  console.log('✓ Test Users Authenticated.');

  // 2. Fetch or Create Category
  const catRes = await supertest(app).get('/api/categories');
  let categoryId = catRes.body.categories?.[0]?.id;
  if (!categoryId) {
    const newCat = await prisma.category.create({
      data: { name: `DevOps ${timestamp}`, slug: `devops-${timestamp}` },
    });
    categoryId = newCat.id;
  }

  // 3. Create a Free Test Course with 2 Lessons
  const courseTitle = `Docker & Kubernetes Test Course ${timestamp}`;
  const courseRes = await supertest(app)
    .post('/api/courses')
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({
      title: courseTitle,
      description: 'Master containerization and cluster orchestration.',
      categoryId,
      level: 'BEGINNER',
      isFree: true,
      price: 0,
      thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
      learningObjectives: ['Deploy Docker containers.', 'Orchestrate with Kubernetes.'],
      requirements: ['Basic Linux terminal.'],
      targetAudience: ['Software Engineers.'],
    });

  if (courseRes.status !== 201) {
    console.error('❌ Failed to create test course:', courseRes.body);
    process.exit(1);
  }
  const course = courseRes.body.course;
  console.log(`✓ Test Free Course Created: "${course.title}" (${course.id})`);

  // Publish Course
  await prisma.course.update({
    where: { id: course.id },
    data: { status: 'PUBLISHED' },
  });

  // Create Module
  const moduleRes = await supertest(app)
    .post(`/api/modules`)
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({
      courseId: course.id,
      title: 'Module 1: Docker Basics',
      order: 1,
    });
  const moduleObj = moduleRes.body.module;

  // Create Lesson 1
  const lesson1Res = await supertest(app)
    .post('/api/lessons')
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({
      moduleId: moduleObj.id,
      title: 'Lesson 1: Introduction to Containers',
      contentType: 'TEXT',
      textContent: 'Docker containerization fundamentals.',
      durationMinutes: 10,
      order: 1,
      isPublished: true,
    });
  const lesson1 = lesson1Res.body.lesson;

  // Create Lesson 2
  const lesson2Res = await supertest(app)
    .post('/api/lessons')
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({
      moduleId: moduleObj.id,
      title: 'Lesson 2: Kubernetes Orchestration',
      contentType: 'TEXT',
      textContent: 'Kubernetes pods, services and deployments.',
      durationMinutes: 15,
      order: 2,
      isPublished: true,
    });
  const lesson2 = lesson2Res.body.lesson;

  console.log('✓ 2 Published Lessons Created.');

  // 4. Enroll Student A in FREE course
  const enrollRes = await supertest(app)
    .post(`/api/courses/${course.id}/enroll`)
    .set('Authorization', `Bearer ${tokenA}`);

  if (enrollRes.status !== 201 && enrollRes.status !== 200) {
    console.error('❌ Free Course Enrollment Failed:', enrollRes.body);
    process.exit(1);
  }
  console.log('✓ Student A Enrolled in Free Course Successfully.');

  // 5. Initial My Learning & Dashboard Stats Check
  const initialDashboard = await supertest(app)
    .get('/api/users/student-dashboard')
    .set('Authorization', `Bearer ${tokenA}`);

  const dashStats0 = initialDashboard.body.dashboard;
  console.log('Initial Stats check:');
  console.log(`  Courses Enrolled: ${dashStats0.enrolledCount} (Expected: 1)`);
  console.log(`  In Progress: ${dashStats0.activeCount} (Expected: 1)`);
  console.log(`  Completed: ${dashStats0.completedCount} (Expected: 0)`);
  console.log(`  Certificates: ${dashStats0.certificatesCount} (Expected: 0)`);

  if (dashStats0.enrolledCount !== 1 || dashStats0.activeCount !== 1 || dashStats0.completedCount !== 0 || dashStats0.certificatesCount !== 0) {
    console.error('❌ Initial stats mismatch!');
    process.exit(1);
  }

  // Verify missing certificate does NOT break My Learning or throw error
  const myLearning0 = await supertest(app)
    .get('/api/progress/my-learning')
    .set('Authorization', `Bearer ${tokenA}`);
  
  if (myLearning0.status !== 200 || !myLearning0.body.success) {
    console.error('❌ My Learning failed before certificate issuance:', myLearning0.body);
    process.exit(1);
  }
  console.log('✓ My Learning loaded cleanly with 0 certificates (No broken certificate error).');

  // 6. Complete Lesson 1 (50% progress)
  const l1Progress = await supertest(app)
    .post(`/api/progress/lessons/${lesson1.id}/complete`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ isCompleted: true });

  console.log(`✓ Lesson 1 completed. Course Progress: ${l1Progress.body.courseProgress.progressPercentage}%`);
  if (l1Progress.body.courseProgress.progressPercentage !== 50) {
    console.error('❌ Expected 50% progress!');
    process.exit(1);
  }

  // 7. Complete Lesson 2 (Final Lesson -> 100% completion)
  const l2Progress = await supertest(app)
    .post(`/api/progress/lessons/${lesson2.id}/complete`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ isCompleted: true });

  console.log('✓ Lesson 2 completed. Final completion response:');
  console.log(`  Progress: ${l2Progress.body.courseProgress.progressPercentage}%`);
  console.log(`  Course Completed: ${l2Progress.body.courseCompleted}`);
  console.log(`  Certificate Number: ${l2Progress.body.certificate?.certificateNumber}`);

  if (l2Progress.body.courseProgress.progressPercentage !== 100 || !l2Progress.body.courseCompleted || !l2Progress.body.certificate) {
    console.error('❌ Automatic course completion or certificate generation failed!');
    process.exit(1);
  }

  const certNumber = l2Progress.body.certificate.certificateNumber;

  // 8. Verify Enrollment DB record updated to COMPLETED with completedAt
  const dbEnrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: userA.id, courseId: course.id } },
  });

  if (dbEnrollment?.status !== 'COMPLETED' || !dbEnrollment.completedAt) {
    console.error('❌ Enrollment DB record status or completedAt timestamp missing:', dbEnrollment);
    process.exit(1);
  }
  console.log(`✓ DB Enrollment verified: Status = ${dbEnrollment.status}, CompletedAt = ${dbEnrollment.completedAt.toISOString()}`);

  // 9. Verify Idempotency (calling completion again does NOT create duplicate certificate)
  const duplicateL2Call = await supertest(app)
    .post(`/api/progress/lessons/${lesson2.id}/complete`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ isCompleted: true });

  const certCountInDb = await prisma.certificate.count({
    where: { userId: userA.id, courseId: course.id },
  });
  console.log(`✓ Idempotency Check: Certificate count in DB for (Student, Course) = ${certCountInDb} (Expected: 1)`);
  if (certCountInDb !== 1) {
    console.error('❌ Duplicate certificate created!');
    process.exit(1);
  }

  // 10. Verify Post-Completion Dashboard Statistics
  const postDashboard = await supertest(app)
    .get('/api/users/student-dashboard')
    .set('Authorization', `Bearer ${tokenA}`);

  const dashStats1 = postDashboard.body.dashboard;
  console.log('Post-Completion Stats check:');
  console.log(`  Courses Enrolled: ${dashStats1.enrolledCount} (Expected: 1)`);
  console.log(`  In Progress: ${dashStats1.activeCount} (Expected: 0)`);
  console.log(`  Completed: ${dashStats1.completedCount} (Expected: 1)`);
  console.log(`  Certificates: ${dashStats1.certificatesCount} (Expected: 1)`);

  if (dashStats1.enrolledCount !== 1 || dashStats1.activeCount !== 0 || dashStats1.completedCount !== 1 || dashStats1.certificatesCount !== 1) {
    console.error('❌ Post-completion stats mismatch!');
    process.exit(1);
  }

  // 11. Test Public Certificate Verification Endpoint
  console.log('\n--- Testing Public Verification Endpoint ---');
  const pubVerify1 = await supertest(app).get(`/api/certificates/verify/${certNumber}`);
  const pubVerify2 = await supertest(app).get(`/api/verify/certificate/${certNumber}`);

  if (pubVerify1.status !== 200 || !pubVerify1.body.isValid || pubVerify2.status !== 200) {
    console.error('❌ Public verification endpoint failed:', pubVerify1.body);
    process.exit(1);
  }

  const pubCert = pubVerify1.body.certificate;
  console.log(`✓ Public Verification Success: Status = ${pubCert.status}, Student = ${pubCert.studentName}, Course = ${pubCert.courseTitle}`);
  console.log(`✓ Verification URL: ${pubCert.verificationUrl}`);
  console.log(`✓ QR Code Data URL Generated: ${pubCert.qrCodeUrl ? pubCert.qrCodeUrl.substring(0, 30) + '...' : 'NONE'}`);

  // Check no sensitive fields exposed in public verification
  if (pubCert.userId || pubCert.email || pubCert.password || pubCert.id) {
    console.error('❌ Sensitive data exposed in public verification!', pubCert);
    process.exit(1);
  }
  console.log('✓ Security Check Passed: No sensitive user fields exposed in public verification payload.');

  // 12. Test Private Authenticated Certificate Endpoints
  console.log('\n--- Testing Private Certificate Access & PDF Download ---');
  
  // Student A (Owner) views private certificate
  const certViewRes = await supertest(app)
    .get(`/api/certificates/${certNumber}`)
    .set('Authorization', `Bearer ${tokenA}`);

  if (certViewRes.status !== 200 || !certViewRes.body.success) {
    console.error('❌ Student A private certificate view failed:', certViewRes.body);
    process.exit(1);
  }
  console.log('✓ Student A successfully viewed private certificate record.');

  // Student B (Non-Owner) attempts to view Student A's private certificate
  const forbiddenViewRes = await supertest(app)
    .get(`/api/certificates/${certNumber}`)
    .set('Authorization', `Bearer ${tokenB}`);

  if (forbiddenViewRes.status !== 403) {
    console.error(`❌ Security Violation! Student B should get 403 Forbidden, but got ${forbiddenViewRes.status}`);
    process.exit(1);
  }
  console.log('✓ Security Check Passed: Student B received 403 Forbidden when accessing Student A\'s private certificate.');

  // Student A downloads PDF
  const pdfRes = await supertest(app)
    .get(`/api/certificates/${certNumber}/download`)
    .set('Authorization', `Bearer ${tokenA}`);

  if (pdfRes.status !== 200 || pdfRes.header['content-type'] !== 'application/pdf') {
    console.error('❌ Certificate PDF download failed:', pdfRes.status, pdfRes.header);
    process.exit(1);
  }
  console.log(`✓ Certificate PDF generated and downloaded successfully (${pdfRes.body.length} bytes).`);

  // Student Certificates list endpoint
  const certsListRes = await supertest(app)
    .get('/api/certificates/my-certificates')
    .set('Authorization', `Bearer ${tokenA}`);

  if (certsListRes.status !== 200 || certsListRes.body.certificates.length !== 1) {
    console.error('❌ My Certificates endpoint failed:', certsListRes.body);
    process.exit(1);
  }
  console.log(`✓ Student Certificates API returns 1 active certificate record.`);

  // 13. Test Course-level certificateEnabled = false
  console.log('\n--- Testing Course certificateEnabled = false ---');
  const disabledCourseRes = await supertest(app)
    .post('/api/courses')
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({
      title: `Internal Uncertificated Seminar ${timestamp}`,
      description: 'No certificate issued for this course.',
      categoryId,
      level: 'BEGINNER',
      isFree: true,
      price: 0,
      learningObjectives: ['Learn without cert.'],
      requirements: ['None.'],
      targetAudience: ['Anyone.'],
    });

  const disabledCourse = disabledCourseRes.body.course;
  await prisma.course.update({
    where: { id: disabledCourse.id },
    data: { status: 'PUBLISHED', certificateEnabled: false },
  });

  const dModule = await prisma.module.create({
    data: { courseId: disabledCourse.id, title: 'Mod 1', order: 1 },
  });
  const dLesson = await prisma.lesson.create({
    data: { moduleId: dModule.id, title: 'Lesson 1', order: 1, isPublished: true, contentType: 'TEXT', textContent: 'Reading lesson.' },
  });

  // Enroll Student B
  await supertest(app).post(`/api/courses/${disabledCourse.id}/enroll`).set('Authorization', `Bearer ${tokenB}`);

  // Complete lesson
  const dCompletionRes = await supertest(app)
    .post(`/api/progress/lessons/${dLesson.id}/complete`)
    .set('Authorization', `Bearer ${tokenB}`)
    .send({ isCompleted: true });

  console.log(`✓ certificateEnabled = false test: Course Completed = ${dCompletionRes.body.courseCompleted}, Certificate Issued = ${dCompletionRes.body.certificate}`);

  if (!dCompletionRes.body.courseCompleted || dCompletionRes.body.certificate !== null) {
    console.error('❌ Expected course completed = true and certificate = null when certificateEnabled = false!');
    process.exit(1);
  }

  // 14. Cleanup Test Data
  console.log('\n--- Cleaning Up Test Data ---');
  await prisma.certificate.deleteMany({ where: { OR: [{ courseId: course.id }, { courseId: disabledCourse.id }] } });
  await prisma.lessonProgress.deleteMany({ where: { OR: [{ userId: userA.id }, { userId: loginBRes.body.user.id }] } });
  await prisma.lesson.deleteMany({ where: { OR: [{ moduleId: moduleObj.id }, { moduleId: dModule.id }] } });
  await prisma.module.deleteMany({ where: { OR: [{ id: moduleObj.id }, { id: dModule.id }] } });
  await prisma.enrollment.deleteMany({ where: { OR: [{ courseId: course.id }, { courseId: disabledCourse.id }] } });
  await prisma.course.deleteMany({ where: { OR: [{ id: course.id }, { id: disabledCourse.id }] } });
  await prisma.user.deleteMany({ where: { email: { in: [studentAEmail, studentBEmail] } } });
  console.log('✓ Test courses and test users cleaned up from database.');

  console.log('\n====================================================');
  console.log(' 🎉 ALL CERTIFICATE & COMPLETION ACCEPTANCE TESTS PASSED!');
  console.log('====================================================\n');
}

runAcceptanceTests().catch((err) => {
  console.error('❌ Acceptance Test Error:', err);
  process.exit(1);
});
