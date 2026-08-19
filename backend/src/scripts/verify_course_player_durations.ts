import { getCourseBySlug } from '../services/course.service';
import { prisma } from '../config/database';

async function main() {
  console.log('======================================================');
  console.log('VERIFYING ACTUAL LESSON DURATIONS FOR ALL COURSES');
  console.log('======================================================\n');

  const courses = await prisma.course.findMany({
    select: { id: true, title: true, slug: true },
  });

  for (const c of courses) {
    try {
      const course = await getCourseBySlug(c.slug);
      console.log(`Course: "${course.title}" (Slug: ${course.slug})`);
      console.log(`  Total Lessons: ${course.stats.lessonCount}`);
      console.log(`  Total Course Duration: ${course.stats.totalDurationMinutes} min (${Math.floor(course.stats.totalDurationMinutes / 60)}h ${course.stats.totalDurationMinutes % 60}m)`);
      console.log('  Curriculum Lessons:');

      for (const m of course.modules) {
        console.log(`    📁 Module "${m.title}" (${m.durationMinutes} min):`);
        for (const l of m.lessons) {
          console.log(`       ▶ Lesson: "${l.title}" — ${l.durationMinutes} min (Source: ${l.videoSource}, File: ${l.fileName || 'N/A'})`);
        }
      }
      console.log('------------------------------------------------------');
    } catch (e: any) {
      console.error(`Error loading course ${c.slug}:`, e.message);
    }
  }
}

main().catch(console.error);
