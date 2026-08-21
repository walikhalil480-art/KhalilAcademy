import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { checkAndProcessCourseCompletion } from './certificate.service';
import { EnrollmentStatus } from '@prisma/client';

export interface PlaybackData {
  lastWatchedPosition: number;
  deltaSeconds?: number;
  playbackRate?: number;
  durationSeconds?: number;
}

export const recordLessonPlayback = async (userId: string, lessonId: string, data: PlaybackData) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseId: true } } },
  });

  if (!lesson) throw new AppError('Lesson not found.', 404);
  const courseId = lesson.module.courseId;

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (!enrollment) {
    throw new AppError('You are not enrolled in this course.', 403);
  }

  const existingProgress = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });

  // Calculate target video duration in seconds (prioritize actual player duration if provided)
  const targetDuration = Math.max(
    1,
    data.durationSeconds && data.durationSeconds > 0
      ? Math.round(data.durationSeconds)
      : lesson.durationMinutes
      ? lesson.durationMinutes * 60
      : 300
  );
  const now = new Date();

  const currentWatchTime = existingProgress?.watchTime || 0;

  // Anti-cheating: Validate client delta against elapsed real server time
  let validDelta = 0;
  if (data.deltaSeconds && data.deltaSeconds > 0) {
    const elapsedServerSeconds = existingProgress?.lastHeartbeatAt
      ? Math.max(0, Math.floor((now.getTime() - existingProgress.lastHeartbeatAt.getTime()) / 1000))
      : 30;

    validDelta = Math.max(0, Math.min(data.deltaSeconds, Math.max(30, elapsedServerSeconds + 15)));
  } else if (existingProgress?.lastHeartbeatAt) {
    const elapsedServerSeconds = Math.max(0, Math.floor((now.getTime() - existingProgress.lastHeartbeatAt.getTime()) / 1000));
    const posDiff = data.lastWatchedPosition - (existingProgress.lastWatchedPosition || 0);
    if (posDiff > 0 && posDiff <= 30) {
      validDelta = Math.min(posDiff, 30);
    }
  } else {
    validDelta = 5;
  }

  const newWatchTime = Math.min(targetDuration, currentWatchTime + Math.round(validDelta));
  const watchPercentage = Math.min(100, parseFloat(((newWatchTime / targetDuration) * 100).toFixed(1)));

  // Automatic completion upon reaching 60% actual watch time
  const is60Percent = watchPercentage >= 60.0 || newWatchTime >= targetDuration * 0.6;
  const isCompleted = is60Percent || (existingProgress?.isCompleted || false);

  let status = 'NOT_STARTED';
  if (isCompleted) {
    status = 'COMPLETED';
  } else if (newWatchTime > 0 || data.lastWatchedPosition > 0) {
    status = 'IN_PROGRESS';
  }

  const progress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: {
      lastWatchedPosition: Math.floor(Math.max(0, data.lastWatchedPosition)),
      watchTime: newWatchTime,
      progressPercentage: isCompleted ? 100.0 : watchPercentage,
      status,
      isCompleted,
      completedAt: isCompleted ? (existingProgress?.completedAt || now) : null,
      lastHeartbeatAt: now,
    },
    create: {
      userId,
      lessonId,
      lastWatchedPosition: Math.floor(Math.max(0, data.lastWatchedPosition)),
      watchTime: newWatchTime,
      progressPercentage: isCompleted ? 100.0 : watchPercentage,
      status,
      isCompleted,
      completedAt: isCompleted ? now : null,
      lastHeartbeatAt: now,
    },
  });

  // Recalculate overall course progress
  const totalLessons = await prisma.lesson.count({
    where: { module: { courseId }, isPublished: true },
  });

  const completedLessons = await prisma.lessonProgress.count({
    where: {
      userId,
      isCompleted: true,
      lesson: { module: { courseId }, isPublished: true },
    },
  });

  const is100Percent = totalLessons > 0 && completedLessons === totalLessons;
  const courseProgressPercentage = totalLessons > 0 ? (is100Percent ? 100.0 : parseFloat(((completedLessons / totalLessons) * 100).toFixed(1))) : 0.0;

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      progressPercentage: courseProgressPercentage,
    },
  });

  let completionResult = null;
  if (is100Percent) {
    completionResult = await checkAndProcessCourseCompletion(userId, courseId);
  }

  return {
    progress,
    courseProgress: {
      completedLessons,
      totalLessons,
      progressPercentage: courseProgressPercentage,
    },
    courseCompleted: completionResult?.completed || false,
    certificate: completionResult?.certificate || null,
  };
};

export const updateLessonProgress = async (userId: string, lessonId: string, data: { isCompleted?: boolean; lastWatchedPosition?: number }) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseId: true } } },
  });

  if (!lesson) throw new AppError('Lesson not found.', 404);

  const courseId = lesson.module.courseId;

  // Check enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (!enrollment) {
    throw new AppError('You are not enrolled in this course.', 403);
  }

  const existingProgress = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });

  const targetDuration = Math.max(1, lesson.durationMinutes ? lesson.durationMinutes * 60 : 300);

  // Content-Type Specific Completion Verification (Authoritative Anti-Cheating: 60% requirement)
  if (lesson.contentType === 'VIDEO') {
    const currentWatchTime = existingProgress?.watchTime || 0;
    const currentPercent = existingProgress?.progressPercentage || 0;
    const isWatchSufficient = currentPercent >= 60.0 || currentWatchTime >= targetDuration * 0.6 || existingProgress?.isCompleted;

    if (!isWatchSufficient) {
      const watchedPercent = Math.min(100, Math.round((currentWatchTime / targetDuration) * 100));
      throw new AppError(
        `Video completion requirement not met. You must watch at least 60% of this video lesson before completing it. (Current watch progress: ${watchedPercent}%)`,
        400
      );
    }
  }

  const isCompleted = true;
  const status = 'COMPLETED';
  const now = new Date();

  // Upsert progress with verified completion
  const progress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: {
      isCompleted,
      status,
      completedAt: existingProgress?.completedAt || now,
      lastWatchedPosition: targetDuration,
      progressPercentage: 100.0,
      watchTime: targetDuration,
    },
    create: {
      userId,
      lessonId,
      isCompleted,
      status,
      completedAt: now,
      lastWatchedPosition: targetDuration,
      watchTime: targetDuration,
      progressPercentage: 100.0,
    },
  });

  // Calculate overall course progress from published lessons
  const totalLessons = await prisma.lesson.count({
    where: { module: { courseId }, isPublished: true },
  });

  const completedLessons = await prisma.lessonProgress.count({
    where: {
      userId,
      isCompleted: true,
      lesson: { module: { courseId }, isPublished: true },
    },
  });

  const is100Percent = totalLessons > 0 && completedLessons === totalLessons;
  const progressPercentage = totalLessons > 0 ? (is100Percent ? 100.0 : parseFloat(((completedLessons / totalLessons) * 100).toFixed(1))) : 0.0;

  // If progress drops below 100%, revert status to ACTIVE
  let newStatus = enrollment.status;
  let newCompletedAt = enrollment.completedAt;

  if (!is100Percent) {
    if (enrollment.status === EnrollmentStatus.COMPLETED) {
      newStatus = EnrollmentStatus.ACTIVE;
      newCompletedAt = null;
    }
  }

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      progressPercentage,
      status: newStatus,
      completedAt: newCompletedAt,
    },
  });

  // Check course completion status & certificate issuance if 100% completed
  let completionResult = null;
  if (is100Percent) {
    completionResult = await checkAndProcessCourseCompletion(userId, courseId);
  }

  return {
    progress,
    courseProgress: {
      completedLessons,
      totalLessons,
      progressPercentage,
    },
    courseCompleted: completionResult?.completed || false,
    certificate: completionResult?.certificate || null,
  };
};

export const getCourseProgress = async (userId: string, courseIdOrSlug: string) => {
  // Resolve courseId if slug is passed
  let courseId = courseIdOrSlug;
  const course = await prisma.course.findFirst({
    where: { OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }] },
    select: { id: true, title: true, slug: true },
  });

  if (course) {
    courseId = course.id;
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    include: { course: true },
  });

  if (!enrollment) {
    throw new AppError('Enrollment not found.', 404);
  }

  const lessons = await prisma.lesson.findMany({
    where: { module: { courseId }, isPublished: true },
    select: { id: true, title: true, moduleId: true, durationMinutes: true, order: true },
    orderBy: { order: 'asc' },
  });

  const progressList = await prisma.lessonProgress.findMany({
    where: {
      userId,
      lesson: { module: { courseId }, isPublished: true },
    },
  });

  const progressMap = new Map(progressList.map((p) => [p.lessonId, p]));

  const lessonsWithProgress = lessons.map((l) => ({
    ...l,
    isCompleted: progressMap.get(l.id)?.isCompleted || false,
    lastWatchedPosition: progressMap.get(l.id)?.lastWatchedPosition || 0,
  }));

  const completedCount = progressList.filter((p) => p.isCompleted).length;
  const totalCount = lessons.length;
  const is100Percent = totalCount > 0 && completedCount === totalCount;
  const calculatedPercentage = totalCount > 0 ? (is100Percent ? 100.0 : parseFloat(((completedCount / totalCount) * 100).toFixed(1))) : 0.0;

  // Sync database enrollment if out of sync
  if (enrollment.progressPercentage !== calculatedPercentage) {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { progressPercentage: calculatedPercentage },
    });
  }

  const lastAccessed = progressList.sort((a, b) => (b.updatedAt ? b.updatedAt.getTime() : 0) - (a.updatedAt ? a.updatedAt.getTime() : 0))[0];

  return {
    courseId,
    courseSlug: enrollment.course.slug,
    courseTitle: enrollment.course.title,
    status: is100Percent ? 'COMPLETED' : enrollment.status,
    progressPercentage: calculatedPercentage,
    progressPercent: calculatedPercentage,
    completedLessonsCount: completedCount,
    totalLessonsCount: totalCount,
    lessons: lessonsWithProgress,
    lessonsProgress: progressList.map((p) => ({
      lessonId: p.lessonId,
      isCompleted: p.isCompleted,
      status: p.status,
      progressPercentage: p.progressPercentage,
      lastWatchedPosition: p.lastWatchedPosition,
    })),
    lastAccessedLessonId: lastAccessed ? lastAccessed.lessonId : lessons[0]?.id,
  };
};

export const getUserLearningCourses = async (userId: string) => {
  const rawEnrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        include: {
          instructor: { select: { name: true, avatar: true } },
          category: { select: { name: true, slug: true } },
          modules: {
            include: {
              lessons: { where: { isPublished: true }, select: { id: true } },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Deduplicate enrollments by courseId (keep the latest active/completed record per course)
  const uniqueEnrollmentMap = new Map<string, typeof rawEnrollments[0]>();
  for (const e of rawEnrollments) {
    if (e.course && !uniqueEnrollmentMap.has(e.courseId)) {
      uniqueEnrollmentMap.set(e.courseId, e);
    }
  }
  const enrollments = Array.from(uniqueEnrollmentMap.values());

  const coursesWithDetails = await Promise.all(
    enrollments.map(async (e) => {
      const allLessons = e.course.modules.flatMap((m) => m.lessons);
      const totalLessons = allLessons.length;

      const completedCount = await prisma.lessonProgress.count({
        where: {
          userId,
          isCompleted: true,
          lesson: { module: { courseId: e.courseId }, isPublished: true },
        },
      });

      const lastProgress = await prisma.lessonProgress.findFirst({
        where: { userId, lesson: { module: { courseId: e.courseId }, isPublished: true } },
        orderBy: { updatedAt: 'desc' },
        select: { lessonId: true, updatedAt: true },
      });

      const is100Percent = totalLessons > 0 && completedCount === totalLessons;
      const progressPercent = totalLessons > 0 ? (is100Percent ? 100.0 : parseFloat(((completedCount / totalLessons) * 100).toFixed(1))) : 0.0;

      // Auto-issue certificate & complete enrollment if course reached 100%
      if (is100Percent) {
        await checkAndProcessCourseCompletion(userId, e.courseId);
        if (e.status !== EnrollmentStatus.COMPLETED || e.progressPercentage !== 100.0) {
          await prisma.enrollment.update({
            where: { id: e.id },
            data: { status: EnrollmentStatus.COMPLETED, progressPercentage: 100.0, completedAt: e.completedAt || new Date() },
          });
        }
      } else if (e.progressPercentage !== progressPercent) {
        // Sync enrollment progress in DB if needed
        await prisma.enrollment.update({
          where: { id: e.id },
          data: { progressPercentage: progressPercent },
        });
      }

      let learningStatus = 'NOT_STARTED';
      if (is100Percent || e.status === 'COMPLETED' || progressPercent >= 100) {
        learningStatus = 'COMPLETED';
      } else if (progressPercent > 0 || completedCount > 0 || lastProgress) {
        learningStatus = 'IN_PROGRESS';
      }

      return {
        enrollmentId: e.id,
        courseId: e.course.id,
        title: e.course.title,
        slug: e.course.slug,
        thumbnail: e.course.thumbnail,
        description: e.course.description,
        instructorName: e.course.instructor?.name || 'Instructor',
        progressPercent,
        completedLessons: completedCount,
        totalLessons,
        lastLessonId: lastProgress ? lastProgress.lessonId : (allLessons[0]?.id || null),
        lastAccessedAt: lastProgress ? lastProgress.updatedAt : e.updatedAt,
        status: learningStatus,
        enrolledAt: e.createdAt,
      };
    })
  );

  return coursesWithDetails;
};

