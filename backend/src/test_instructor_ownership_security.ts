import supertest from 'supertest';
import { app } from './app';
import { prisma } from './config/database';
import { hashPassword } from './utils/hash';

async function runSecurityTests() {
  console.log('====================================================');
  console.log('   RUNNING INSTRUCTOR OWNERSHIP SECURITY TESTS     ');
  console.log('====================================================\n');

  const timestamp = Date.now();
  const emailA = `instructor_a_${timestamp}@khalilacademy.com`;
  const emailB = `instructor_b_${timestamp}@khalilacademy.com`;
  const password = 'Password@12345';
  const pwdHash = await hashPassword(password);

  // 1. Create Instructor A and Instructor B
  const userA = await prisma.user.create({
    data: {
      email: emailA,
      passwordHash: pwdHash,
      name: 'Instructor A',
      role: 'INSTRUCTOR',
      emailVerified: true,
    },
  });

  const userB = await prisma.user.create({
    data: {
      email: emailB,
      passwordHash: pwdHash,
      name: 'Instructor B',
      role: 'INSTRUCTOR',
      emailVerified: true,
    },
  });

  // Login Instructor A
  const loginARes = await supertest(app).post('/api/auth/login').send({ email: emailA, password });
  const tokenA = loginARes.body.accessToken;

  // Login Instructor B
  const loginBRes = await supertest(app).post('/api/auth/login').send({ email: emailB, password });
  const tokenB = loginBRes.body.accessToken;

  // Login Admin
  const adminRes = await supertest(app).post('/api/auth/login').send({
    email: 'admin@khalilacademy.com',
    password: 'Admin@12345',
  });
  const adminToken = adminRes.body.accessToken;

  console.log('✓ Instructor A, Instructor B, and Admin Authenticated.');

  // Fetch Category
  const catRes = await supertest(app).get('/api/categories');
  const categoryId = catRes.body.categories?.[0]?.id;

  // 2. Instructor A creates Course A
  const courseARes = await supertest(app)
    .post('/api/courses')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({
      title: `Security Course A ${timestamp}`,
      description: 'Course owned by Instructor A',
      categoryId,
      level: 'BEGINNER',
      isFree: true,
      price: 0,
    });
  const courseA = courseARes.body.course;

  // 3. Instructor B creates Course B
  const courseBRes = await supertest(app)
    .post('/api/courses')
    .set('Authorization', `Bearer ${tokenB}`)
    .send({
      title: `Security Course B ${timestamp}`,
      description: 'Course owned by Instructor B',
      categoryId,
      level: 'BEGINNER',
      isFree: true,
      price: 0,
    });
  const courseB = courseBRes.body.course;

  console.log(`✓ Course A created by Instructor A (ID: ${courseA.id})`);
  console.log(`✓ Course B created by Instructor B (ID: ${courseB.id})`);

  // 4. Test Course List Isolation
  const listARes = await supertest(app)
    .get('/api/courses/instructor/my-courses')
    .set('Authorization', `Bearer ${tokenA}`);
  const coursesA = listARes.body.courses || [];
  const containsBInA = coursesA.some((c: any) => c.id === courseB.id);

  if (containsBInA) {
    console.error('❌ SECURITY FAILURE: Instructor A can see Instructor B\'s course in my-courses list!');
    process.exit(1);
  }
  console.log('✓ Course list security: Instructor A sees ONLY Course A, NOT Course B.');

  // 5. Test Dashboard Isolation
  const dashARes = await supertest(app)
    .get('/api/users/instructor-dashboard')
    .set('Authorization', `Bearer ${tokenA}`);
  const dashCoursesA = dashARes.body.dashboard?.courses || [];
  const dashContainsB = dashCoursesA.some((c: any) => c.id === courseB.id);

  if (dashContainsB) {
    console.error('❌ SECURITY FAILURE: Instructor A dashboard contains Course B!');
    process.exit(1);
  }
  console.log('✓ Dashboard security: Instructor A dashboard excludes Course B.');

  // 6. Test Unauthorized Publish of Course B by Instructor A
  const pubRes = await supertest(app)
    .patch(`/api/courses/${courseB.id}/publish`)
    .set('Authorization', `Bearer ${tokenA}`);

  if (pubRes.status !== 403) {
    console.error(`❌ SECURITY FAILURE: Expected 403 on publish attempt, got HTTP ${pubRes.status}`);
    process.exit(1);
  }
  console.log('✓ Unauthorized publish rejected: HTTP 403 Forbidden.');

  // 7. Test Unauthorized Unpublish of Course B by Instructor A
  const unpubRes = await supertest(app)
    .patch(`/api/courses/${courseB.id}/unpublish`)
    .set('Authorization', `Bearer ${tokenA}`);

  if (unpubRes.status !== 403) {
    console.error(`❌ SECURITY FAILURE: Expected 403 on unpublish attempt, got HTTP ${unpubRes.status}`);
    process.exit(1);
  }
  console.log('✓ Unauthorized unpublish rejected: HTTP 403 Forbidden.');

  // 8. Test Unauthorized Course Edit of Course B by Instructor A
  const editRes = await supertest(app)
    .patch(`/api/courses/${courseB.id}`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ title: 'Hacked Title' });

  if (editRes.status !== 403) {
    console.error(`❌ SECURITY FAILURE: Expected 403 on edit attempt, got HTTP ${editRes.status}`);
    process.exit(1);
  }
  console.log('✓ Unauthorized course edit rejected: HTTP 403 Forbidden.');

  // 9. Test Unauthorized Course Delete of Course B by Instructor A
  const deleteRes = await supertest(app)
    .delete(`/api/courses/${courseB.id}`)
    .set('Authorization', `Bearer ${tokenA}`);

  if (deleteRes.status !== 403) {
    console.error(`❌ SECURITY FAILURE: Expected 403 on delete attempt, got HTTP ${deleteRes.status}`);
    process.exit(1);
  }
  console.log('✓ Unauthorized course delete rejected: HTTP 403 Forbidden.');

  // 10. Create Module & Lesson for Course B owned by Instructor B
  const modB = await prisma.module.create({
    data: { courseId: courseB.id, title: 'Module B1', order: 1 },
  });
  const lesB = await prisma.lesson.create({
    data: { moduleId: modB.id, title: 'Lesson B1', order: 1 },
  });

  // 11. Test Unauthorized Module Creation in Course B by Instructor A
  const addModRes = await supertest(app)
    .post('/api/modules')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ courseId: courseB.id, title: 'Attacker Module' });

  if (addModRes.status !== 403) {
    console.error(`❌ SECURITY FAILURE: Expected 403 on module creation in Course B, got HTTP ${addModRes.status}`);
    process.exit(1);
  }
  console.log('✓ Unauthorized module creation in Course B rejected: HTTP 403 Forbidden.');

  // 12. Test Unauthorized Module Edit/Delete by Instructor A
  const editModRes = await supertest(app)
    .patch(`/api/modules/${modB.id}`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ title: 'Hacked Module' });

  const delModRes = await supertest(app)
    .delete(`/api/modules/${modB.id}`)
    .set('Authorization', `Bearer ${tokenA}`);

  if (editModRes.status !== 403 || delModRes.status !== 403) {
    console.error(`❌ SECURITY FAILURE: Expected 403 on module edit/delete, got HTTP ${editModRes.status} / ${delModRes.status}`);
    process.exit(1);
  }
  console.log('✓ Unauthorized module edit/delete rejected: HTTP 403 Forbidden.');

  // 13. Test Unauthorized Lesson Creation/Edit/Delete by Instructor A
  const addLesRes = await supertest(app)
    .post('/api/lessons')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ moduleId: modB.id, title: 'Attacker Lesson' });

  const editLesRes = await supertest(app)
    .patch(`/api/lessons/${lesB.id}`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ title: 'Hacked Lesson' });

  const delLesRes = await supertest(app)
    .delete(`/api/lessons/${lesB.id}`)
    .set('Authorization', `Bearer ${tokenA}`);

  if (addLesRes.status !== 403 || editLesRes.status !== 403 || delLesRes.status !== 403) {
    console.error('❌ SECURITY FAILURE: Expected 403 on lesson operations!');
    process.exit(1);
  }
  console.log('✓ Unauthorized lesson creation/edit/delete rejected: HTTP 403 Forbidden.');

  // 14. Test Ownership Spoofing during Course Creation by Instructor A
  const spoofRes = await supertest(app)
    .post('/api/courses')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({
      title: `Spoof Attempt ${timestamp}`,
      description: 'Spoofing instructorId',
      categoryId,
      instructorId: userB.id,
    });
  
  if (spoofRes.body.course.instructorId === userB.id) {
    console.error('❌ SECURITY FAILURE: Instructor A managed to assign course to Instructor B during creation!');
    process.exit(1);
  }
  console.log('✓ Ownership spoofing prevented: Course created by Instructor A is bound to Instructor A.');

  // 15. Test Admin Privileges (Admin can manage both Course A and Course B)
  const adminPubRes = await supertest(app)
    .patch(`/api/courses/${courseB.id}/publish`)
    .set('Authorization', `Bearer ${adminToken}`);

  if (adminPubRes.status !== 200) {
    console.error(`❌ ADMIN FAILURE: Expected 200 for Admin publishing Course B, got HTTP ${adminPubRes.status}`);
    process.exit(1);
  }
  console.log('✓ Admin authorization verified: Admin can publish Course B.');

  // 16. Cleanup Test Data
  await prisma.lesson.deleteMany({ where: { id: lesB.id } });
  await prisma.module.deleteMany({ where: { id: modB.id } });
  await prisma.course.deleteMany({ where: { OR: [{ id: courseA.id }, { id: courseB.id }, { id: spoofRes.body.course.id }] } });
  await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });

  console.log('\n====================================================');
  console.log(' 🎉 ALL INSTRUCTOR OWNERSHIP SECURITY TESTS PASSED!');
  console.log('====================================================\n');
}

runSecurityTests().catch((err) => {
  console.error('❌ Security Test Execution Error:', err);
  process.exit(1);
});
