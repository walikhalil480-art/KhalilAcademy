import supertest from 'supertest';
import { app } from './app';
import { prisma } from './config/database';
import { hashPassword } from './utils/hash';

async function runEvidenceBasedCompletionTests() {
  console.log('====================================================');
  console.log(' RUNNING EVIDENCE-BASED COMPLETION & SECURITY TESTS ');
  console.log('====================================================\n');

  const timestamp = Date.now();
  const studentEmail = `secure_student_${timestamp}@khalilacademy.com`;
  const password = 'Password@12345';
  const pwdHash = await hashPassword(password);

  // 1. Create Student User
  const student = await prisma.user.create({
    data: {
      email: studentEmail,
      passwordHash: pwdHash,
      name: 'Secure Completion Student',
      role: 'STUDENT',
      emailVerified: true,
    },
  });

  const loginRes = await supertest(app).post('/api/auth/login').send({ email: studentEmail, password });
  const token = loginRes.body.accessToken;

  // Login Instructor
  const instLoginRes = await supertest(app).post('/api/auth/login').send({
    email: 'instructor@khalilacademy.com',
    password: 'Instructor@12345',
  });
  const instructorToken = instLoginRes.body.accessToken;

  const catRes = await supertest(app).get('/api/categories');
  const categoryId = catRes.body.categories?.[0]?.id;

  // 2. Create Course with Video Lesson and Quiz
  const courseRes = await supertest(app)
    .post('/api/courses')
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({
      title: `Secure Evidence Course ${timestamp}`,
      description: 'Course testing anti-cheat and server-side completion',
      categoryId,
      level: 'INTERMEDIATE',
      isFree: true,
      price: 0,
    });
  const course = courseRes.body.course;

  const moduleObj = await prisma.module.create({
    data: { courseId: course.id, title: 'Module 1', order: 1 },
  });

  // Create Video Lesson (10 minutes = 600s duration)
  const videoLesson = await prisma.lesson.create({
    data: {
      moduleId: moduleObj.id,
      title: 'Anti-Cheat Video Lesson',
      contentType: 'VIDEO',
      durationMinutes: 10,
      order: 1,
      isPublished: true,
    },
  });

  // Create Quiz (70% passing score)
  const quiz = await prisma.quiz.create({
    data: {
      courseId: course.id,
      moduleId: moduleObj.id,
      title: 'Final Mastery Quiz',
      passingScore: 70.0,
    },
  });

  console.log(`✓ Test Course created (ID: ${course.id}) with 10m video lesson & quiz.`);

  // 3. Enroll Student
  await supertest(app).post(`/api/courses/${course.id}/enroll`).set('Authorization', `Bearer ${token}`);
  console.log('✓ Student enrolled in course.');

  // TEST 1: Seeking Exploit Prevention
  console.log('\n--- TEST 1: Seeking Exploit Prevention ---');
  // Student seeks to 570s (95%) immediately without watch time
  const seekRes = await supertest(app)
    .post(`/api/progress/lessons/${videoLesson.id}/playback`)
    .set('Authorization', `Bearer ${token}`)
    .send({ lastWatchedPosition: 570, deltaSeconds: 0, durationSeconds: 600 });

  const seekProgress = seekRes.body.progress;
  console.log(`Seek Progress Result: watchTime = ${seekProgress.watchTime}s, progress = ${seekProgress.progressPercentage}%, status = ${seekProgress.status}, isCompleted = ${seekProgress.isCompleted}`);

  if (seekProgress.isCompleted || seekProgress.watchTime > 15 || seekProgress.status === 'COMPLETED') {
    console.error('❌ FAIL: System allowed seeking exploit to mark lesson completed!');
    process.exit(1);
  }
  console.log('✓ PASS: Seeking to 95% did NOT grant completion (watchTime remains 0s).');

  // TEST 2: Untrusted Manual Completion Button Rejection
  console.log('\n--- TEST 2: Untrusted Manual Completion Button Rejection ---');
  const fakeCompleteRes = await supertest(app)
    .post(`/api/progress/lessons/${videoLesson.id}/complete`)
    .set('Authorization', `Bearer ${token}`)
    .send({ isCompleted: true });

  console.log(`Manual Completion Status: ${fakeCompleteRes.status} | Message: "${fakeCompleteRes.body.message}"`);
  if (fakeCompleteRes.status !== 400) {
    console.error('❌ FAIL: Backend accepted untrusted manual completion button without 90% watch time!');
    process.exit(1);
  }
  console.log('✓ PASS: Untrusted manual completion request rejected with 400 Bad Request.');

  // TEST 3: Certificate Ineligibility Premature Claim Block
  console.log('\n--- TEST 3: Certificate Ineligibility Premature Claim Block ---');
  const claimRes = await supertest(app)
    .post(`/api/certificates/courses/${course.id}/claim`)
    .set('Authorization', `Bearer ${token}`);

  console.log(`Premature Claim Response: Status ${claimRes.status} | Message: "${claimRes.body.message}"`);
  if (claimRes.status !== 403) {
    console.error('❌ FAIL: Premature certificate claim was not blocked with 403 Forbidden!');
    process.exit(1);
  }
  console.log('✓ PASS: Certificate claim before completing course blocked with 403 Forbidden.');

  // TEST 4: Legitimate Playback Heartbeats (Accumulate >= 90% Watch Time)
  console.log('\n--- TEST 4: Legitimate Playback Heartbeats (Simulating 540s valid playback) ---');
  // Simulate 36 heartbeats of 15 seconds valid playback each = 540s (90% of 600s)
  let currentPos = 0;
  let lastRes: any = null;
  for (let i = 0; i < 36; i++) {
    currentPos += 15;
    lastRes = await supertest(app)
      .post(`/api/progress/lessons/${videoLesson.id}/playback`)
      .set('Authorization', `Bearer ${token}`)
      .send({ lastWatchedPosition: currentPos, deltaSeconds: 15, durationSeconds: 600 });
  }

  const finalVideoProg = lastRes.body.progress;
  console.log(`Accumulated Progress: watchTime = ${finalVideoProg.watchTime}s (${finalVideoProg.progressPercentage}%), status = ${finalVideoProg.status}, isCompleted = ${finalVideoProg.isCompleted}`);

  if (!finalVideoProg.isCompleted || finalVideoProg.progressPercentage < 90.0 || finalVideoProg.status !== 'COMPLETED') {
    console.error('❌ FAIL: Legitimate 90% watch time did not mark lesson completed!');
    process.exit(1);
  }
  console.log('✓ PASS: Valid 90% watch time automatically marked lesson COMPLETED!');

  // TEST 5: Quiz Assessment Completion Requirement for Certificate
  console.log('\n--- TEST 5: Quiz Assessment Completion Requirement for Certificate ---');
  // All video lessons completed, BUT quiz is not yet passed!
  const quizCheckRes = await supertest(app)
    .get(`/api/certificates/courses/${course.id}/eligibility`)
    .set('Authorization', `Bearer ${token}`);

  console.log(`Eligibility without passed quiz: Status ${quizCheckRes.status} | Message: "${quizCheckRes.body.message}"`);
  if (quizCheckRes.status !== 403) {
    console.error('❌ FAIL: Certificate marked eligible before required quiz was passed!');
    process.exit(1);
  }
  console.log('✓ PASS: Certificate blocked until required quiz is passed.');

  // Record Passing Quiz Attempt (85%)
  await prisma.quizAttempt.create({
    data: {
      userId: student.id,
      quizId: quiz.id,
      score: 85.0,
      maxScore: 100.0,
      percentage: 85.0,
      passed: true,
      completedAt: new Date(),
    },
  });
  console.log('✓ Student passed required quiz with 85% score.');

  // Re-check Eligibility and Claim Certificate
  const eligibleRes = await supertest(app)
    .get(`/api/certificates/courses/${course.id}/eligibility`)
    .set('Authorization', `Bearer ${token}`);

  console.log(`Eligibility with passed quiz: Status ${eligibleRes.status} | Eligible = ${eligibleRes.body.eligible}`);
  if (eligibleRes.status !== 200 || !eligibleRes.body.eligible) {
    console.error('❌ FAIL: Certificate still blocked after completing all lessons & passing quiz!');
    process.exit(1);
  }

  const claimSuccessRes = await supertest(app)
    .post(`/api/certificates/courses/${course.id}/claim`)
    .set('Authorization', `Bearer ${token}`);

  console.log(`Certificate Claim Success: Status ${claimSuccessRes.status} | Cert # ${claimSuccessRes.body.certificate?.certificateNumber}`);
  if (claimSuccessRes.status !== 200 || !claimSuccessRes.body.certificate) {
    console.error('❌ FAIL: Failed to claim certificate after meeting 100% verified requirements!');
    process.exit(1);
  }
  console.log('✓ PASS: Certificate successfully issued after verified 100% course & quiz completion!');

  // Cleanup Test Data
  await prisma.certificate.deleteMany({ where: { courseId: course.id } });
  await prisma.quizAttempt.deleteMany({ where: { userId: student.id } });
  await prisma.quiz.deleteMany({ where: { courseId: course.id } });
  await prisma.lessonProgress.deleteMany({ where: { userId: student.id } });
  await prisma.lesson.deleteMany({ where: { moduleId: moduleObj.id } });
  await prisma.module.deleteMany({ where: { id: moduleObj.id } });
  await prisma.enrollment.deleteMany({ where: { courseId: course.id } });
  await prisma.course.deleteMany({ where: { id: course.id } });
  await prisma.user.deleteMany({ where: { id: student.id } });

  console.log('\n====================================================');
  console.log(' 🎉 ALL EVIDENCE-BASED SECURITY TESTS PASSED!');
  console.log('====================================================\n');
}

runEvidenceBasedCompletionTests().catch((err) => {
  console.error('❌ Evidence-Based Test Execution Error:', err);
  process.exit(1);
});
