import { prisma } from '../config/database';

async function main() {
  console.log('==================================================');
  console.log('1. USERS IN DATABASE');
  console.log('==================================================');
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, emailVerified: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Total Users: ${users.length}`);
  users.forEach((u, i) => {
    console.log(`  ${i + 1}. [${u.role}] ${u.name} (${u.email}) - Verified: ${u.emailVerified} - Created: ${u.createdAt.toISOString()}`);
  });

  console.log('\n==================================================');
  console.log('2. COURSES IN DATABASE');
  console.log('==================================================');
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      instructor: { select: { email: true, name: true } },
      _count: { select: { modules: true, enrollments: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Total Courses: ${courses.length}`);
  courses.forEach((c, i) => {
    console.log(`  ${i + 1}. "${c.title}" (Status: ${c.status}, Instructor: ${c.instructor?.name || 'N/A'}, Modules: ${c._count.modules}, Enrollments: ${c._count.enrollments})`);
  });

  console.log('\n==================================================');
  console.log('3. LESSONS IN DATABASE');
  console.log('==================================================');
  const lessons = await prisma.lesson.findMany({
    select: {
      id: true,
      title: true,
      durationMinutes: true,
      videoUrl: true,
      fileName: true,
      module: { select: { title: true, course: { select: { title: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Total Lessons: ${lessons.length}`);
  lessons.forEach((l, i) => {
    console.log(`  ${i + 1}. Course: "${l.module.course.title}" | Module: "${l.module.title}" | Lesson: "${l.title}" (${l.durationMinutes} min)`);
  });

  console.log('\n==================================================');
  console.log('4. ENROLLMENTS & PROGRESS');
  console.log('==================================================');
  const enrollments = await prisma.enrollment.findMany({
    select: {
      id: true,
      user: { select: { email: true, name: true } },
      course: { select: { title: true } },
      status: true,
      progressPercentage: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Total Enrollments: ${enrollments.length}`);
  enrollments.forEach((e, i) => {
    console.log(`  ${i + 1}. Student: ${e.user.name} (${e.user.email}) -> Course: "${e.course.title}" | Progress: ${e.progressPercentage}% | Status: ${e.status}`);
  });

  console.log('\n==================================================');
  console.log('5. CERTIFICATES');
  console.log('==================================================');
  const certificates = await prisma.certificate.findMany({
    select: {
      id: true,
      certificateNumber: true,
      studentName: true,
      courseTitle: true,
      issueDate: true,
    },
  });
  console.log(`Total Certificates: ${certificates.length}`);
  certificates.forEach((cert, i) => {
    console.log(`  ${i + 1}. Cert #${cert.certificateNumber} for ${cert.studentName} ("${cert.courseTitle}")`);
  });
}

main().catch(console.error);
