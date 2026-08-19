import { prisma } from '../config/database';

async function cleanup() {
  const c = await prisma.course.findFirst({
    where: { title: { contains: 'Secure Evidence' } },
  });
  if (c) {
    await prisma.certificate.deleteMany({ where: { courseId: c.id } });
    await prisma.quizAttempt.deleteMany({ where: { quiz: { courseId: c.id } } });
    await prisma.quiz.deleteMany({ where: { courseId: c.id } });
    await prisma.lessonProgress.deleteMany({ where: { lesson: { module: { courseId: c.id } } } });
    await prisma.lesson.deleteMany({ where: { module: { courseId: c.id } } });
    await prisma.module.deleteMany({ where: { courseId: c.id } });
    await prisma.enrollment.deleteMany({ where: { courseId: c.id } });
    await prisma.course.delete({ where: { id: c.id } });
    console.log('Cleaned up test course:', c.title);
  }
}

cleanup().catch(console.error);
