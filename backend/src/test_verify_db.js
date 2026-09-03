const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyDb() {
  try {
    console.log('--- Database Direct Inspection ---');

    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, status: true, emailVerified: true }
    });
    console.log('Users Count:', users.length);
    console.table(users);

    const categories = await prisma.category.findMany({ select: { id: true, name: true, slug: true } });
    console.log('Categories Count:', categories.length);

    const courses = await prisma.course.findMany({
      select: { id: true, title: true, slug: true, price: true, status: true }
    });
    console.log('Courses Count:', courses.length);
    console.table(courses);

    const modules = await prisma.module.count();
    const lessons = await prisma.lesson.count();
    const quizzes = await prisma.quiz.count();
    const assignments = await prisma.assignment.count();

    console.log(`Modules: ${modules}, Lessons: ${lessons}, Quizzes: ${quizzes}, Assignments: ${assignments}`);
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDb();
