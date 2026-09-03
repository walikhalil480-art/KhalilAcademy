import { prisma } from '../config/database';
import { Role } from '@prisma/client';

export const getPublicAcademyStats = async () => {
  const [
    activeStudents,
    publishedCourses,
    lessonsCompleted,
    reviewAgg,
    completedLessonDurations,
  ] = await Promise.all([
    // Active students: distinct active users who have role STUDENT
    prisma.user.count({
      where: {
        role: Role.STUDENT,
        status: 'ACTIVE',
      },
    }),
    // Published courses: publicly available courses
    prisma.course.count({
      where: { status: 'PUBLISHED' },
    }),
    // Lessons completed: actual valid completed lesson records for published content
    prisma.lessonProgress.count({
      where: {
        isCompleted: true,
        lesson: { isPublished: true, module: { course: { status: 'PUBLISHED' } } },
      },
    }),
    // Academy-wide rating average from all reviews
    prisma.review.aggregate({
      where: { course: { status: 'PUBLISHED' } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    // Completed learning minutes
    prisma.lessonProgress.findMany({
      where: { isCompleted: true },
      select: { lesson: { select: { durationMinutes: true } } },
    }),
  ]);

  const ratingCount = reviewAgg._count._all || 0;
  const averageRating = ratingCount > 0 ? parseFloat((reviewAgg._avg.rating || 0).toFixed(1)) : 0;
  const totalLearningMinutes = completedLessonDurations.reduce((sum, p) => sum + (p.lesson?.durationMinutes || 0), 0);
  const totalLearningHours = Math.round(totalLearningMinutes / 60);

  return {
    activeStudents,
    publishedCourses,
    lessonsCompleted,
    averageRating,
    ratingCount,
    totalLearningMinutes,
    totalLearningHours,
  };
};

export const getAdminDetailedStats = async () => {
  const [
    publicStats,
    totalUsers,
    totalInstructors,
    totalModules,
    totalLessons,
    totalEnrollments,
    activeEnrollments,
    completedEnrollments,
    certificatesIssued,
  ] = await Promise.all([
    getPublicAcademyStats(),
    prisma.user.count(),
    prisma.user.count({ where: { role: Role.INSTRUCTOR } }),
    prisma.module.count({ where: { course: { status: 'PUBLISHED' } } }),
    prisma.lesson.count({ where: { isPublished: true, module: { course: { status: 'PUBLISHED' } } } }),
    prisma.enrollment.count(),
    prisma.enrollment.count({ where: { status: 'ACTIVE' } }),
    prisma.enrollment.count({ where: { status: 'COMPLETED' } }),
    prisma.certificate.count({ where: { isRevoked: false } }),
  ]);

  return {
    ...publicStats,
    totalUsers,
    totalInstructors,
    totalModules,
    totalLessons,
    totalEnrollments,
    activeEnrollments,
    completedEnrollments,
    certificatesIssued,
  };
};
