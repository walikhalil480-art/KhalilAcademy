import { prisma } from '../config/database';

async function updateAll() {
  const lessons = await prisma.lesson.findMany({
    select: { id: true, title: true, durationMinutes: true, videoUrl: true },
  });
  console.log('All Lessons:', lessons);

  for (const l of lessons) {
    if (!l.videoUrl && l.durationMinutes === 15) {
      await prisma.lesson.update({
        where: { id: l.id },
        data: { durationMinutes: 0 },
      });
      console.log(`Updated lesson "${l.title}" from 15 to 0 duration.`);
    }
  }
}

updateAll().catch(console.error);
