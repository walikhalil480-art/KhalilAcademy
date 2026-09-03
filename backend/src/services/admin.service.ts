import { prisma } from '../config/database';
import { Role, UserStatus } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import { recordAuditLog } from './auditLog.service';
import { hashPassword } from '../utils/hash';

export const getAdminDashboardMetrics = async () => {
  const [
    totalUsers,
    totalStudents,
    totalInstructors,
    totalCourses,
    publishedCourses,
    totalEnrollments,
    completedCourses,
    certificatesIssued,
    paidOrders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: Role.STUDENT } }),
    prisma.user.count({ where: { role: Role.INSTRUCTOR } }),
    prisma.course.count(),
    prisma.course.count({ where: { status: 'PUBLISHED' } }),
    prisma.enrollment.count(),
    prisma.enrollment.count({ where: { status: 'COMPLETED' } }),
    prisma.certificate.count({ where: { isRevoked: false } }),
    prisma.order.findMany({ where: { status: 'PAID' } }),
  ]);

  const totalRevenue = paidOrders.reduce((sum, order) => sum + order.finalPrice, 0);

  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });

  const recentPayments = await prisma.order.findMany({
    where: { status: 'PAID' },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true } },
    },
  });

  const recentCertificates = await prisma.certificate.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  return {
    metrics: {
      totalUsers,
      totalStudents,
      totalInstructors,
      totalCourses,
      publishedCourses,
      totalEnrollments,
      completedCourses,
      certificatesIssued,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    },
    recentUsers,
    recentPayments,
    recentCertificates,
  };
};

export const getUsersAdmin = async (filters: { search?: string; role?: Role; status?: UserStatus; page?: number; limit?: number }) => {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 15));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (filters.role) where.role = filters.role;
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        _count: { select: { enrollments: true, createdCourses: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const updateUserRoleOrStatusAdmin = async (
  adminUserId: string,
  adminRole: Role,
  targetUserId: string,
  data: { role?: Role; status?: UserStatus }
) => {
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) throw new AppError('Target user not found.', 404);

  // Rule: ADMIN cannot modify SUPER_ADMIN accounts
  if (targetUser.role === Role.SUPER_ADMIN && adminRole !== Role.SUPER_ADMIN) {
    throw new AppError('Only SUPER_ADMIN can modify a SUPER_ADMIN account.', 403);
  }

  if (data.role === Role.SUPER_ADMIN && adminRole !== Role.SUPER_ADMIN) {
    throw new AppError('Only SUPER_ADMIN can promote a user to SUPER_ADMIN.', 403);
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      role: data.role || undefined,
      status: data.status || undefined,
    },
  });

  await recordAuditLog({
    userId: adminUserId,
    action: 'ADMIN_USER_UPDATED',
    entity: 'User',
    entityId: targetUserId,
    details: { updatedFields: data },
  });

  return updated;
};

export const adminResetUserPassword = async (adminUserId: string, adminRole: Role, targetUserId: string, newPass: string) => {
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) throw new AppError('Target user not found.', 404);

  if (targetUser.role === Role.SUPER_ADMIN && adminRole !== Role.SUPER_ADMIN) {
    throw new AppError('Cannot reset password of SUPER_ADMIN account.', 403);
  }

  const passwordHash = await hashPassword(newPass);

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      passwordHash,
      failedLoginAttempts: 0,
      lockUntil: null,
    },
  });

  await recordAuditLog({
    userId: adminUserId,
    action: 'ADMIN_RESET_PASSWORD',
    entity: 'User',
    entityId: targetUserId,
  });

  return true;
};

export const getAuditLogsAdmin = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.auditLog.count(),
  ]);

  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const deleteUserAdmin = async (adminUserId: string, adminRole: Role, targetUserId: string) => {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: {
      createdCourses: {
        select: { id: true },
      },
    },
  });

  if (!targetUser) throw new AppError('Target user not found.', 404);

  if (adminUserId === targetUserId) {
    throw new AppError('You cannot delete your own account.', 400);
  }

  if (targetUser.role === Role.SUPER_ADMIN && adminRole !== Role.SUPER_ADMIN) {
    throw new AppError('Cannot delete a SUPER_ADMIN account.', 403);
  }

  await prisma.$transaction(async (tx) => {
    // 1. Refresh Tokens
    await tx.refreshToken.deleteMany({ where: { userId: targetUserId } });

    // 2. Notifications
    await tx.notification.deleteMany({ where: { userId: targetUserId } });

    // 3. Reviews
    await tx.review.deleteMany({ where: { userId: targetUserId } });

    // 4. Certificates
    await tx.certificate.deleteMany({ where: { userId: targetUserId } });

    // 5. Payments for orders by this user
    await tx.payment.deleteMany({ where: { order: { userId: targetUserId } } });

    // 6. Orders by this user
    await tx.order.deleteMany({ where: { userId: targetUserId } });

    // 7. Lesson Progress
    await tx.lessonProgress.deleteMany({ where: { userId: targetUserId } });

    // 8. Quiz Answers & Attempts
    await tx.quizAnswer.deleteMany({ where: { attempt: { userId: targetUserId } } });
    await tx.quizAttempt.deleteMany({ where: { userId: targetUserId } });

    // 9. Assignment Submissions
    await tx.assignmentSubmission.deleteMany({
      where: {
        OR: [{ userId: targetUserId }, { gradedByUserId: targetUserId }],
      },
    });

    // 10. Enrollments
    await tx.enrollment.deleteMany({ where: { userId: targetUserId } });

    // 11. Authored courses & their entire hierarchy
    if (targetUser.createdCourses && targetUser.createdCourses.length > 0) {
      const courseIds = targetUser.createdCourses.map((c) => c.id);

      await tx.payment.deleteMany({ where: { order: { courseId: { in: courseIds } } } });
      await tx.order.deleteMany({ where: { courseId: { in: courseIds } } });
      await tx.certificate.deleteMany({ where: { courseId: { in: courseIds } } });
      await tx.review.deleteMany({ where: { courseId: { in: courseIds } } });
      await tx.enrollment.deleteMany({ where: { courseId: { in: courseIds } } });

      await tx.quizAnswer.deleteMany({ where: { attempt: { quiz: { courseId: { in: courseIds } } } } });
      await tx.quizAttempt.deleteMany({ where: { quiz: { courseId: { in: courseIds } } } });
      await tx.quizOption.deleteMany({ where: { question: { quiz: { courseId: { in: courseIds } } } } });
      await tx.quizQuestion.deleteMany({ where: { quiz: { courseId: { in: courseIds } } } });
      await tx.quiz.deleteMany({ where: { courseId: { in: courseIds } } });

      await tx.assignmentSubmission.deleteMany({ where: { assignment: { courseId: { in: courseIds } } } });
      await tx.assignment.deleteMany({ where: { courseId: { in: courseIds } } });

      await tx.lessonResource.deleteMany({ where: { lesson: { module: { courseId: { in: courseIds } } } } });
      await tx.lessonProgress.deleteMany({ where: { lesson: { module: { courseId: { in: courseIds } } } } });
      await tx.lesson.deleteMany({ where: { module: { courseId: { in: courseIds } } } });
      await tx.module.deleteMany({ where: { courseId: { in: courseIds } } });
      await tx.course.deleteMany({ where: { id: { in: courseIds } } });
    }

    // 12. Audit logs
    await tx.auditLog.deleteMany({ where: { userId: targetUserId } });

    // 13. Delete User
    await tx.user.delete({ where: { id: targetUserId } });
  });

  // Record audit log for deletion
  await recordAuditLog({
    userId: adminUserId,
    action: 'ADMIN_DELETE_USER',
    entity: 'User',
    entityId: targetUserId,
    details: {
      deletedUserEmail: targetUser.email,
      deletedUserName: targetUser.name,
      deletedUserRole: targetUser.role,
    },
  });

  return true;
};

