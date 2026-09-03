import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../config/database';
import { hashPassword, comparePassword } from '../utils/hash';
import { AppError } from '../middlewares/errorHandler';
import { syncUserCertificates } from '../services/certificate.service';

export const getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        avatar: true,
        bio: true,
        createdAt: true,
      },
    });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, bio, avatar } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, bio, avatar },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        bio: true,
      },
    });
    res.json({ success: true, message: 'Profile updated successfully.', user: updated });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new AppError('User not found.', 404);

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400);
    }

    if (newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters long.', 400);
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { passwordHash },
    });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

export const getStudentDashboardData = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const rawEnrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            instructor: { select: { name: true } },
            category: { select: { name: true } },
            _count: { select: { modules: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const enrollments = await Promise.all(
      rawEnrollments.map(async (e) => {
        const totalLessons = await prisma.lesson.count({
          where: { module: { courseId: e.courseId }, isPublished: true },
        });

        const completedLessons = await prisma.lessonProgress.count({
          where: {
            userId,
            isCompleted: true,
            lesson: { module: { courseId: e.courseId }, isPublished: true },
          },
        });

        const is100Percent = totalLessons > 0 && completedLessons === totalLessons;
        const progressPercentage = totalLessons > 0 ? (is100Percent ? 100.0 : parseFloat(((completedLessons / totalLessons) * 100).toFixed(1))) : 0.0;

        if (e.progressPercentage !== progressPercentage) {
          await prisma.enrollment.update({
            where: { id: e.id },
            data: { progressPercentage },
          });
          e.progressPercentage = progressPercentage;
        }

        return e;
      })
    );

    await syncUserCertificates(userId);

    const completedEnrollments = enrollments.filter((e) => e.status === 'COMPLETED' || (e.progressPercentage || 0) >= 100);
    const activeEnrollments = enrollments.filter((e) => e.status !== 'COMPLETED' && (e.progressPercentage || 0) < 100);

    const certificates = await prisma.certificate.findMany({
      where: { userId, isRevoked: false },
      orderBy: { createdAt: 'desc' },
    });

    const recentQuizAttempts = await prisma.quizAttempt.findMany({
      where: { userId },
      take: 5,
      orderBy: { completedAt: 'desc' },
      include: { quiz: { select: { title: true } } },
    });

    const recentSubmissions = await prisma.assignmentSubmission.findMany({
      where: { userId },
      take: 5,
      orderBy: { submittedAt: 'desc' },
      include: { assignment: { select: { title: true, maxScore: true } } },
    });

    res.json({
      success: true,
      dashboard: {
        enrolledCount: enrollments.length,
        activeCount: activeEnrollments.length,
        completedCount: completedEnrollments.length,
        certificatesCount: certificates.length,
        enrollments,
        certificates,
        recentQuizAttempts,
        recentSubmissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getInstructorDashboardData = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const isSuperOrAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'SUPER_ADMIN';
    const filterInstructorId = req.query.instructorId as string;

    const where: any = {};
    if (!isSuperOrAdmin) {
      // Instructors strictly view only their own courses
      where.instructorId = req.user!.id;
    } else if (filterInstructorId) {
      where.instructorId = filterInstructorId;
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        category: true,
        _count: { select: { enrollments: true, modules: true, quizzes: true, assignments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const publishedCourses = courses.filter((c) => c.status === 'PUBLISHED');
    const totalStudents = courses.reduce((sum, c) => sum + c._count.enrollments, 0);

    const submissionsPending = await prisma.assignmentSubmission.count({
      where: {
        assignment: { course: where },
        status: 'SUBMITTED',
      },
    });

    res.json({
      success: true,
      dashboard: {
        totalCoursesCount: courses.length,
        publishedCoursesCount: publishedCourses.length,
        totalStudents,
        submissionsPending,
        courses,
      },
    });
  } catch (error) {
    next(error);
  }
};
