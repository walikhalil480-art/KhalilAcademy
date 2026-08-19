import supertest from 'supertest';
import { app } from './app';
import { prisma } from './config/database';
import { hashPassword } from './utils/hash';

async function runProgressSystemTests() {
  console.log('====================================================');
  console.log('   RUNNING COURSE PROGRESS SYSTEM ACCEPTANCE TESTS  ');
  console.log('====================================================\n');

  const timestamp = Date.now();
  const studentEmail = `prog_student_${timestamp}@khalilacademy.com`;
  const password = 'Password@12345';
  const pwdHash = await hashPassword(password);

  // 1. Create Student User
  const student = await prisma.user.create({
    data: {
      email: studentEmail,
      passwordHash: pwdHash,
      name: 'Progress Test Student',
      role: 'STUDENT',
    },
  });

  // Login Student
  const loginRes = await supertest(app).post('/api/auth/login').send({ email: studentEmail, password });
  const token = loginRes.body.accessToken;

  // Login Instructor
  const instLoginRes = await supertest(app).post('/api/auth/login').send({
    email: 'instructor@khalilacademy.com',
    password: 'Instructor@12345',
  });
  const instructorToken = instLoginRes.body.accessToken;

  // Fetch Category
  const catRes = await supertest(app).get('/api/categories');
  const categoryId = catRes.body.categories?.[0]?.id;

  // Create Test Course with 4 Published Lessons
  const courseRes = await supertest(app)
    .post('/api/courses')
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({
      title: `Progress Test Course ${timestamp}`,
      description: 'Course to verify real-time progress system',
      categoryId,
      level: 'BEGINNER',
      isFree: true,
      price: 0,
    });
  const course = courseRes.body.course;

  const moduleObj = await prisma.module.create({
    data: { courseId: course.id, title: 'Module 1', order: 1 },
  });

  const l1 = await prisma.lesson.create({ data: { moduleId: moduleObj.id, title: 'Lesson 1', order: 1, isPublished: true } });
  const l2 = await prisma.lesson.create({ data: { moduleId: moduleObj.id, title: 'Lesson 2', order: 2, isPublished: true } });
  const l3 = await prisma.lesson.create({ data: { moduleId: moduleObj.id, title: 'Lesson 3', order: 3, isPublished: true } });
  const l4 = await prisma.lesson.create({ data: { moduleId: moduleObj.id, title: 'Lesson 4', order: 4, isPublished: true } });

  console.log(`✓ Test Course created with 4 published lessons (ID: ${course.id})`);

  // 2. Enroll Student in Course
  const enrollRes = await supertest(app)
    .post(`/api/courses/${course.id}/enroll`)
    .set('Authorization', `Bearer ${token}`);
  
  if (enrollRes.status !== 200 && enrollRes.status !== 201) {
    console.error('❌ Enrollment failed:', enrollRes.body);
    process.exit(1);
  }
  console.log('✓ Student enrolled in course.');

  // 3. Verify Newly Enrolled Course shows 0% Progress
  const initialProgRes = await supertest(app)
    .get(`/api/progress/courses/${course.id}/progress`)
    .set('Authorization', `Bearer ${token}`);

  const initProg = initialProgRes.body.progress;
  console.log(`Initial Progress: ${initProg.progressPercentage}% (${initProg.completedLessonsCount}/${initProg.totalLessonsCount})`);

  if (initProg.progressPercentage !== 0 || initProg.completedLessonsCount !== 0 || initProg.status !== 'ACTIVE') {
    console.error('❌ Expected newly enrolled course to have 0% progress and ACTIVE status!');
    process.exit(1);
  }
  console.log('✓ Newly enrolled course correctly shows 0% progress & ACTIVE status.');

  // Verify Student Dashboard Data for Newly Enrolled Course
  const initDashRes = await supertest(app)
    .get('/api/users/student-dashboard')
    .set('Authorization', `Bearer ${token}`);
  
  const initDashEnrollment = initDashRes.body.dashboard?.enrollments?.find((e: any) => e.courseId === course.id);
  if (!initDashEnrollment || initDashEnrollment.progressPercentage !== 0) {
    console.error('❌ Student Dashboard did not report 0% progress for newly enrolled course!');
    process.exit(1);
  }
  console.log('✓ Student Dashboard correctly reports 0% progress for newly enrolled course.');

  // 4. Complete Lesson 1 (1/4 -> 25%)
  const resL1 = await supertest(app)
    .post(`/api/progress/lessons/${l1.id}/complete`)
    .set('Authorization', `Bearer ${token}`)
    .send({ isCompleted: true });
  
  console.log(`Lesson 1 Progress: ${resL1.body.courseProgress.progressPercentage}% (Completed: ${resL1.body.courseProgress.completedLessons}/${resL1.body.courseProgress.totalLessons})`);
  if (resL1.body.courseProgress.progressPercentage !== 25) {
    console.error(`❌ Expected 25% after Lesson 1, got ${resL1.body.courseProgress.progressPercentage}%`);
    process.exit(1);
  }

  // 5. Complete Lesson 2 (2/4 -> 50%)
  const resL2 = await supertest(app)
    .post(`/api/progress/lessons/${l2.id}/complete`)
    .set('Authorization', `Bearer ${token}`)
    .send({ isCompleted: true });
  
  console.log(`Lesson 2 Progress: ${resL2.body.courseProgress.progressPercentage}%`);
  if (resL2.body.courseProgress.progressPercentage !== 50) {
    console.error(`❌ Expected 50% after Lesson 2, got ${resL2.body.courseProgress.progressPercentage}%`);
    process.exit(1);
  }

  // 6. Complete Lesson 3 (3/4 -> 75%)
  const resL3 = await supertest(app)
    .post(`/api/progress/lessons/${l3.id}/complete`)
    .set('Authorization', `Bearer ${token}`)
    .send({ isCompleted: true });

  console.log(`Lesson 3 Progress: ${resL3.body.courseProgress.progressPercentage}%`);
  if (resL3.body.courseProgress.progressPercentage !== 75) {
    console.error(`❌ Expected 75% after Lesson 3, got ${resL3.body.courseProgress.progressPercentage}%`);
    process.exit(1);
  }

  // 7. Complete Lesson 4 (4/4 -> 100% COMPLETED)
  const resL4 = await supertest(app)
    .post(`/api/progress/lessons/${l4.id}/complete`)
    .set('Authorization', `Bearer ${token}`)
    .send({ isCompleted: true });

  console.log(`Lesson 4 Progress: ${resL4.body.courseProgress.progressPercentage}% | Course Completed: ${resL4.body.courseCompleted}`);
  if (resL4.body.courseProgress.progressPercentage !== 100 || !resL4.body.courseCompleted) {
    console.error(`❌ Expected 100% progress and courseCompleted = true, got ${resL4.body.courseProgress.progressPercentage}%`);
    process.exit(1);
  }
  console.log('✓ Completing final lesson produced exactly 100% progress and marked course COMPLETED.');

  // Verify Dashboard reflects COMPLETED status
  const compDashRes = await supertest(app)
    .get('/api/users/student-dashboard')
    .set('Authorization', `Bearer ${token}`);
  
  if (compDashRes.body.dashboard.completedCount !== 1 || compDashRes.body.dashboard.certificatesCount !== 1) {
    console.error('❌ Student Dashboard stats out of sync after 100% completion!');
    process.exit(1);
  }
  console.log('✓ Student Dashboard stats correctly updated: Completed = 1, Certificates = 1.');

  // 8. Uncomplete Lesson 4 (3/4 -> Reverts to 75% ACTIVE)
  const uncompL4Res = await supertest(app)
    .post(`/api/progress/lessons/${l4.id}/complete`)
    .set('Authorization', `Bearer ${token}`)
    .send({ isCompleted: false });

  console.log(`Uncompleted Lesson 4 Progress: ${uncompL4Res.body.courseProgress.progressPercentage}% | Completed: ${uncompL4Res.body.courseCompleted}`);
  if (uncompL4Res.body.courseProgress.progressPercentage !== 75 || uncompL4Res.body.courseCompleted) {
    console.error(`❌ Expected 75% and courseCompleted = false after uncompleting lesson!`);
    process.exit(1);
  }
  console.log('✓ Uncompleting lesson correctly reverted progress to 75% & status to ACTIVE.');

  // 9. Cleanup Test Data
  await prisma.certificate.deleteMany({ where: { courseId: course.id } });
  await prisma.lessonProgress.deleteMany({ where: { userId: student.id } });
  await prisma.lesson.deleteMany({ where: { moduleId: moduleObj.id } });
  await prisma.module.deleteMany({ where: { id: moduleObj.id } });
  await prisma.enrollment.deleteMany({ where: { courseId: course.id } });
  await prisma.course.deleteMany({ where: { id: course.id } });
  await prisma.user.deleteMany({ where: { id: student.id } });

  console.log('\n====================================================');
  console.log(' 🎉 ALL COURSE PROGRESS SYSTEM TESTS PASSED!');
  console.log('====================================================\n');
}

runProgressSystemTests().catch((err) => {
  console.error('❌ Course Progress Test Execution Error:', err);
  process.exit(1);
});
