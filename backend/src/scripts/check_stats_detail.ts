import { getPublicAcademyStats } from '../services/stats.service';
import { prisma } from '../config/database';

async function main() {
  const stats = await getPublicAcademyStats();
  console.log('PUBLIC STATS RESULT:', stats);

  const students = await prisma.user.findMany({ where: { role: 'STUDENT' } });
  console.log('Students count:', students.length);

  const courses = await prisma.course.findMany({ where: { status: 'PUBLISHED' } });
  console.log('Courses count:', courses.length);

  const completed = await prisma.lessonProgress.findMany({ where: { isCompleted: true } });
  console.log('Completed lessons count:', completed.length);
}

main().catch(console.error);
