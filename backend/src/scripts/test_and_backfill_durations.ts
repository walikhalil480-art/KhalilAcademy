import fs from 'fs';
import path from 'path';
import { prisma } from '../config/database';
import { extractVideoDurationSeconds } from '../utils/videoDuration';

async function main() {
  console.log('==================================================');
  console.log('1. INSPECTING ALL VIDEO FILES IN UPLOADS/VIDEOS');
  console.log('==================================================');

  const uploadDir = path.resolve(process.cwd(), './uploads/videos');
  const files = fs.readdirSync(uploadDir);
  const fileDurations: Record<string, number> = {};

  for (const file of files) {
    if (!file.endsWith('.mp4') && !file.endsWith('.webm') && !file.endsWith('.mkv')) continue;
    const fullPath = path.join(uploadDir, file);
    const dur = extractVideoDurationSeconds(fullPath);
    if (dur !== null) {
      fileDurations[file] = dur;
      const mins = Math.floor(dur / 60);
      const secs = Math.floor(dur % 60);
      console.log(`📹 ${file}: ${dur.toFixed(1)}s (${mins}m ${secs}s)`);
    } else {
      console.log(`⚠️ ${file}: Could not parse duration`);
    }
  }

  console.log('\n==================================================');
  console.log('2. BACKFILLING DATABASE LESSONS WITH REAL DURATIONS');
  console.log('==================================================');

  const lessons = await prisma.lesson.findMany({
    where: { contentType: 'VIDEO' },
    select: {
      id: true,
      title: true,
      durationMinutes: true,
      videoUrl: true,
      storageKey: true,
      videoSource: true,
    },
  });

  let updatedCount = 0;

  for (const lesson of lessons) {
    let videoFilename: string | null = null;
    if (lesson.videoUrl && lesson.videoUrl.includes('/videos/')) {
      videoFilename = path.basename(lesson.videoUrl);
    } else if (lesson.storageKey && lesson.storageKey.includes('/videos/')) {
      videoFilename = path.basename(lesson.storageKey);
    }

    if (videoFilename && fileDurations[videoFilename]) {
      const exactSeconds = fileDurations[videoFilename];
      // Convert to whole minutes (e.g. 336s = 6 mins, 142s = 2 mins, 45s = 1 min)
      const realMinutes = Math.max(1, Math.round(exactSeconds / 60));
      
      console.log(`\nLesson "${lesson.title}" (ID: ${lesson.id}):`);
      console.log(`  Old stored durationMinutes: ${lesson.durationMinutes}`);
      console.log(`  Actual Video File: ${videoFilename}`);
      console.log(`  Exact Duration: ${exactSeconds.toFixed(1)}s`);
      console.log(`  New Real Duration: ${realMinutes} min (${Math.floor(exactSeconds / 60)}m ${Math.floor(exactSeconds % 60)}s)`);

      await prisma.lesson.update({
        where: { id: lesson.id },
        data: {
          durationMinutes: realMinutes,
        },
      });
      updatedCount++;
    } else {
      console.log(`\nLesson "${lesson.title}" (ID: ${lesson.id}): No local file match (Source: ${lesson.videoSource}, URL: ${lesson.videoUrl})`);
    }
  }

  console.log(`\n==================================================`);
  console.log(`🎉 Successfully updated ${updatedCount} lesson records with REAL video durations in PostgreSQL!`);
  console.log(`==================================================`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
