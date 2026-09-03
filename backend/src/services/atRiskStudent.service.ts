import { prisma } from '../config/database';
import {
  StudentRiskLevel,
  StudentRiskStatus,
  StudentRiskReason,
  NotificationType,
} from '@prisma/client';
import { RiskConfig } from '../config/risk.config';
import { createNotification } from './notification.service';
import { sendEmail } from './email.service';
import { recordAuditLog } from './auditLog.service';
import { logger } from '../config/logger';
import { appEventBus, AcademyEvent } from '../events/eventBus';

export interface StudentRiskSignal {
  riskReason: StudentRiskReason;
  riskLevel: StudentRiskLevel;
  title: string;
  details: string;
  metricValue?: number;
  courseId?: string;
  quizId?: string;
  assignmentId?: string;
  recommendedAction?: string;
}

export class AtRiskStudentService {
  private static schedulerInterval: NodeJS.Timeout | null = null;

  /**
   * Determine the student's most recent activity timestamp across all platform channels.
   */
  public static async getStudentLastActivity(userId: string): Promise<Date> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    const defaultDate = user?.createdAt || new Date(0);

    const [
      lastLoginAudit,
      lastToken,
      lastProgress,
      lastQuizAttempt,
      lastSubmission,
      lastEnrollment,
    ] = await Promise.all([
      // 1. Audit logs (login or any platform action)
      prisma.auditLog.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      // 2. Refresh tokens
      prisma.refreshToken.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      // 3. Lesson progresses (updatedAt or lastHeartbeatAt)
      prisma.lessonProgress.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true, lastHeartbeatAt: true },
      }),
      // 4. Quiz attempts
      prisma.quizAttempt.findFirst({
        where: { userId },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true },
      }),
      // 5. Assignment submissions
      prisma.assignmentSubmission.findFirst({
        where: { userId },
        orderBy: { submittedAt: 'desc' },
        select: { submittedAt: true },
      }),
      // 6. Course enrollments
      prisma.enrollment.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true, createdAt: true },
      }),
    ]);

    const timestamps: number[] = [defaultDate.getTime()];

    if (lastLoginAudit) timestamps.push(lastLoginAudit.createdAt.getTime());
    if (lastToken) timestamps.push(lastToken.createdAt.getTime());
    if (lastProgress) {
      timestamps.push(lastProgress.updatedAt.getTime());
      if (lastProgress.lastHeartbeatAt) timestamps.push(lastProgress.lastHeartbeatAt.getTime());
    }
    if (lastQuizAttempt) timestamps.push(lastQuizAttempt.completedAt.getTime());
    if (lastSubmission) timestamps.push(lastSubmission.submittedAt.getTime());
    if (lastEnrollment) {
      timestamps.push(lastEnrollment.updatedAt.getTime());
      timestamps.push(lastEnrollment.createdAt.getTime());
    }

    return new Date(Math.max(...timestamps));
  }

  /**
   * Evaluates a single student across all 5 risk dimensions and synchronizes risk records.
   */
  public static async analyzeStudent(studentId: string): Promise<{
    studentId: string;
    activeSignals: StudentRiskSignal[];
    overallRiskLevel: StudentRiskLevel | null;
    resolvedCount: number;
  }> {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { course: true },
        },
      },
    });

    if (!student || student.role !== 'STUDENT') {
      return { studentId, activeSignals: [], overallRiskLevel: null, resolvedCount: 0 };
    }

    const now = new Date();
    const activeSignals: StudentRiskSignal[] = [];
    const reasonsToResolve: { reason: StudentRiskReason; courseId?: string; quizId?: string; assignmentId?: string; resolutionReason: string }[] = [];

    // -------------------------------------------------------------
    // 1. INACTIVITY RISK (>= 10 days since last platform action)
    // -------------------------------------------------------------
    const lastActivity = await this.getStudentLastActivity(studentId);
    const inactivityMs = now.getTime() - lastActivity.getTime();
    const inactivityDays = Math.max(0, Math.floor(inactivityMs / (24 * 3600 * 1000)));

    if (inactivityDays >= RiskConfig.INACTIVITY_THRESHOLD_DAYS) {
      const isHigh = inactivityDays >= RiskConfig.HIGH_INACTIVITY_THRESHOLD_DAYS;
      activeSignals.push({
        riskReason: StudentRiskReason.INACTIVE_10_DAYS,
        riskLevel: isHigh ? StudentRiskLevel.HIGH : StudentRiskLevel.MEDIUM,
        title: `Student has not logged in for ${inactivityDays} consecutive days.`,
        details: `No platform activity, lesson progress, or login recorded since ${lastActivity.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}.`,
        metricValue: inactivityDays,
        recommendedAction: 'Send platform re-engagement reminder & learning encouragement.',
      });
    } else {
      reasonsToResolve.push({
        reason: StudentRiskReason.INACTIVE_10_DAYS,
        resolutionReason: `Student resumed activity on platform (${inactivityDays} days since last activity).`,
      });
    }

    // -------------------------------------------------------------
    // 2. COURSE PROGRESS STAGNATION RISK (Progress stalled >= 10 days)
    // -------------------------------------------------------------
    for (const enrollment of student.enrollments) {
      if (enrollment.progressPercentage > 0 && enrollment.progressPercentage < 100) {
        // Find latest lesson progress update in this course
        const latestLessonProgress = await prisma.lessonProgress.findFirst({
          where: {
            userId: studentId,
            lesson: { moduleId: { in: (await prisma.module.findMany({ where: { courseId: enrollment.courseId }, select: { id: true } })).map((m) => m.id) } },
          },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        });

        const courseLastActive = latestLessonProgress?.updatedAt || enrollment.updatedAt || enrollment.createdAt;
        const courseStagnationDays = Math.max(0, Math.floor((now.getTime() - courseLastActive.getTime()) / (24 * 3600 * 1000)));

        if (courseStagnationDays >= RiskConfig.COURSE_STAGNATION_THRESHOLD_DAYS) {
          activeSignals.push({
            riskReason: StudentRiskReason.COURSE_PROGRESS_STALLED,
            riskLevel: courseStagnationDays >= 20 ? StudentRiskLevel.HIGH : StudentRiskLevel.MEDIUM,
            courseId: enrollment.courseId,
            title: `${enrollment.course.title} — ${Math.round(enrollment.progressPercentage)}% completed — no progress for ${courseStagnationDays} days.`,
            details: `Enrolled in "${enrollment.course.title}" and reached ${Math.round(enrollment.progressPercentage)}% progress, but has made no lesson advancements in ${courseStagnationDays} days.`,
            metricValue: enrollment.progressPercentage,
            recommendedAction: `Send course continuation reminder with remaining lesson highlights for ${enrollment.course.title}.`,
          });
        } else {
          reasonsToResolve.push({
            reason: StudentRiskReason.COURSE_PROGRESS_STALLED,
            courseId: enrollment.courseId,
            resolutionReason: `Student advanced lesson progress in "${enrollment.course.title}" (${courseStagnationDays} days since last progress).`,
          });
        }
      } else if (enrollment.progressPercentage >= 100) {
        reasonsToResolve.push({
          reason: StudentRiskReason.COURSE_PROGRESS_STALLED,
          courseId: enrollment.courseId,
          resolutionReason: `Student completed "${enrollment.course.title}".`,
        });
      }
    }

    // -------------------------------------------------------------
    // 3. QUIZ FAILURE RISK (Failed same quiz >= 3 times without passing)
    // -------------------------------------------------------------
    const enrolledCourseIds = student.enrollments.map((e) => e.courseId);
    if (enrolledCourseIds.length > 0) {
      const courseQuizzes = await prisma.quiz.findMany({
        where: { courseId: { in: enrolledCourseIds } },
        include: {
          attempts: {
            where: { userId: studentId },
            orderBy: { completedAt: 'asc' },
          },
        },
      });

      for (const quiz of courseQuizzes) {
        const hasPassed = quiz.attempts.some((a) => a.passed);
        const failedAttempts = quiz.attempts.filter((a) => !a.passed);

        if (!hasPassed && failedAttempts.length >= RiskConfig.QUIZ_FAILURE_THRESHOLD) {
          const maxFailScore = failedAttempts.length > 0 ? Math.max(...failedAttempts.map((a) => a.percentage)) : 0;
          activeSignals.push({
            riskReason: StudentRiskReason.QUIZ_FAILED_3_TIMES,
            riskLevel: StudentRiskLevel.MEDIUM,
            courseId: quiz.courseId,
            quizId: quiz.id,
            title: `${quiz.title} — failed ${failedAttempts.length} times.`,
            details: `Attempted quiz "${quiz.title}" ${failedAttempts.length} times without passing (highest score: ${Math.round(maxFailScore)}%, passing threshold: ${quiz.passingScore}%).`,
            metricValue: failedAttempts.length,
            recommendedAction: `Suggest reviewing lesson module material before retrying "${quiz.title}".`,
          });
        } else if (hasPassed) {
          const passAttempt = quiz.attempts.find((a) => a.passed);
          reasonsToResolve.push({
            reason: StudentRiskReason.QUIZ_FAILED_3_TIMES,
            courseId: quiz.courseId,
            quizId: quiz.id,
            resolutionReason: `Student successfully passed "${quiz.title}" with score ${Math.round(passAttempt?.percentage || 100)}%.`,
          });
        }
      }
    }

    // -------------------------------------------------------------
    // 4. ASSIGNMENT OVERDUE RISK (Past deadline without submission)
    // -------------------------------------------------------------
    if (enrolledCourseIds.length > 0) {
      const courseAssignments = await prisma.assignment.findMany({
        where: {
          courseId: { in: enrolledCourseIds },
          dueDate: { not: null, lt: now },
        },
        include: {
          submissions: {
            where: { userId: studentId },
          },
        },
      });

      for (const assignment of courseAssignments) {
        const hasValidSubmission = assignment.submissions.some(
          (s) => s.status === 'SUBMITTED' || s.status === 'UNDER_REVIEW' || s.status === 'GRADED' || s.status === 'PASSED'
        );

        if (!hasValidSubmission && assignment.dueDate) {
          const overdueDays = Math.max(0, Math.floor((now.getTime() - assignment.dueDate.getTime()) / (24 * 3600 * 1000)));
          activeSignals.push({
            riskReason: StudentRiskReason.ASSIGNMENT_OVERDUE,
            riskLevel: overdueDays >= 7 ? StudentRiskLevel.HIGH : StudentRiskLevel.MEDIUM,
            courseId: assignment.courseId,
            assignmentId: assignment.id,
            title: `${assignment.title} — overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}.`,
            details: `Assignment deadline was ${assignment.dueDate.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}. Student has not submitted their work.`,
            metricValue: overdueDays,
            recommendedAction: `Send assignment deadline reminder for "${assignment.title}".`,
          });
        } else if (hasValidSubmission) {
          reasonsToResolve.push({
            reason: StudentRiskReason.ASSIGNMENT_OVERDUE,
            courseId: assignment.courseId,
            assignmentId: assignment.id,
            resolutionReason: `Student submitted assignment "${assignment.title}".`,
          });
        }
      }
    }

    // -------------------------------------------------------------
    // 5. LOW PERFORMANCE RISK (Recent assessment average < 50%)
    // -------------------------------------------------------------
    const recentQuizAttempts = await prisma.quizAttempt.findMany({
      where: { userId: studentId },
      orderBy: { completedAt: 'desc' },
      take: RiskConfig.RECENT_ACTIVITIES_WINDOW,
      select: { percentage: true },
    });

    const recentGradedSubmissions = await prisma.assignmentSubmission.findMany({
      where: { userId: studentId, status: 'GRADED', score: { not: null } },
      orderBy: { submittedAt: 'desc' },
      take: RiskConfig.RECENT_ACTIVITIES_WINDOW,
      include: { assignment: { select: { maxScore: true } } },
    });

    const combinedScores: number[] = [
      ...recentQuizAttempts.map((q) => q.percentage),
      ...recentGradedSubmissions.map((s) => ((s.score || 0) / (s.assignment.maxScore || 100)) * 100),
    ];

    if (combinedScores.length >= 3) {
      const avgScore = combinedScores.reduce((acc, v) => acc + v, 0) / combinedScores.length;
      if (avgScore < RiskConfig.LOW_SCORE_THRESHOLD) {
        activeSignals.push({
          riskReason: StudentRiskReason.LOW_RECENT_PERFORMANCE,
          riskLevel: avgScore < 35 ? StudentRiskLevel.HIGH : StudentRiskLevel.MEDIUM,
          title: `Recent assessment performance averaging ${Math.round(avgScore)}% (below ${RiskConfig.LOW_SCORE_THRESHOLD}%).`,
          details: `Across the last ${combinedScores.length} graded assessments, student scored an average of ${Math.round(avgScore)}%.`,
          metricValue: avgScore,
          recommendedAction: 'Suggest foundational lesson review and practice questions.',
        });
      } else {
        reasonsToResolve.push({
          reason: StudentRiskReason.LOW_RECENT_PERFORMANCE,
          resolutionReason: `Recent assessment performance improved to average of ${Math.round(avgScore)}%.`,
        });
      }
    }

    // -------------------------------------------------------------
    // SEVERITY COMPUTATION & SYNCHRONIZATION
    // -------------------------------------------------------------
    // If student has multiple active risk conditions, upgrade severity to HIGH
    let overallRiskLevel: StudentRiskLevel | null = null;
    if (activeSignals.length > 0) {
      const hasExplicitHigh = activeSignals.some((s) => s.riskLevel === StudentRiskLevel.HIGH);
      if (hasExplicitHigh || activeSignals.length >= 2) {
        overallRiskLevel = StudentRiskLevel.HIGH;
      } else if (activeSignals.some((s) => s.riskLevel === StudentRiskLevel.MEDIUM)) {
        overallRiskLevel = StudentRiskLevel.MEDIUM;
      } else {
        overallRiskLevel = StudentRiskLevel.LOW;
      }

      // Propagate overall HIGH if multi-condition
      if (overallRiskLevel === StudentRiskLevel.HIGH) {
        activeSignals.forEach((s) => {
          if (activeSignals.length >= 2) s.riskLevel = StudentRiskLevel.HIGH;
        });
      }
    }

    // 1. Synchronize Active Risk Signals to Database
    for (const signal of activeSignals) {
      const existing = await prisma.studentRiskRecord.findFirst({
        where: {
          userId: studentId,
          riskReason: signal.riskReason,
          courseId: signal.courseId || null,
          quizId: signal.quizId || null,
          assignmentId: signal.assignmentId || null,
          status: StudentRiskStatus.ACTIVE,
        },
      });

      if (existing) {
        await prisma.studentRiskRecord.update({
          where: { id: existing.id },
          data: {
            riskLevel: signal.riskLevel,
            title: signal.title,
            details: signal.details,
            metricValue: signal.metricValue,
            recommendedAction: signal.recommendedAction,
            updatedAt: now,
          },
        });
      } else {
        await prisma.studentRiskRecord.create({
          data: {
            userId: studentId,
            courseId: signal.courseId || null,
            quizId: signal.quizId || null,
            assignmentId: signal.assignmentId || null,
            riskReason: signal.riskReason,
            riskLevel: signal.riskLevel,
            title: signal.title,
            details: signal.details,
            metricValue: signal.metricValue,
            recommendedAction: signal.recommendedAction,
            status: StudentRiskStatus.ACTIVE,
            detectedAt: now,
          },
        });
      }
    }

    // 2. Auto-Resolve Cleared Risks
    let resolvedCount = 0;
    for (const res of reasonsToResolve) {
      const activeRecord = await prisma.studentRiskRecord.findFirst({
        where: {
          userId: studentId,
          riskReason: res.reason,
          courseId: res.courseId || null,
          quizId: res.quizId || null,
          assignmentId: res.assignmentId || null,
          status: StudentRiskStatus.ACTIVE,
        },
      });

      if (activeRecord) {
        await prisma.studentRiskRecord.update({
          where: { id: activeRecord.id },
          data: {
            status: StudentRiskStatus.RESOLVED,
            resolvedAt: now,
            resolutionReason: res.resolutionReason,
          },
        });
        resolvedCount++;
      }
    }

    // 3. Automated Supportive Notification (with 7-day cooldown)
    if (activeSignals.length > 0) {
      await this.dispatchSupportiveNotificationIfEligible(student, activeSignals[0]);
    }

    return {
      studentId,
      activeSignals,
      overallRiskLevel,
      resolvedCount,
    };
  }

  /**
   * Safely dispatches a friendly, supportive notification to the student if cooldown elapsed.
   */
  private static async dispatchSupportiveNotificationIfEligible(
    student: any,
    primarySignal: StudentRiskSignal
  ): Promise<void> {
    try {
      const activeRecord = await prisma.studentRiskRecord.findFirst({
        where: {
          userId: student.id,
          riskReason: primarySignal.riskReason,
          status: StudentRiskStatus.ACTIVE,
        },
      });

      if (!activeRecord) return;

      const cooldownMs = RiskConfig.NOTIFICATION_COOLDOWN_DAYS * 24 * 3600 * 1000;
      if (activeRecord.lastNotifiedAt && Date.now() - activeRecord.lastNotifiedAt.getTime() < cooldownMs) {
        return; // In cooldown
      }

      // Generate supportive, friendly message
      let message = `Hi ${student.name.split(' ')[0]}, keep going! You're making progress on Khalil Academy — check your dashboard to continue.`;
      let title = `We're cheering you on! 🌟`;

      if (primarySignal.riskReason === StudentRiskReason.INACTIVE_10_DAYS) {
        title = `Pick up where you left off! 🚀`;
        message = `Hi ${student.name.split(' ')[0]}, we noticed you haven't visited your courses lately. Your next lesson is waiting for you!`;
      } else if (primarySignal.riskReason === StudentRiskReason.COURSE_PROGRESS_STALLED) {
        title = `Keep up the great momentum! 💡`;
        message = `You're partway through your course. Complete your next lesson today to keep your streak alive!`;
      } else if (primarySignal.riskReason === StudentRiskReason.QUIZ_FAILED_3_TIMES) {
        title = `Practice makes perfect! 📚`;
        message = `Quizzes can be challenging — take a quick review of the lesson notes and you'll master it on your next try!`;
      } else if (primarySignal.riskReason === StudentRiskReason.ASSIGNMENT_OVERDUE) {
        title = `Assignment reminder 📝`;
        message = `Don't forget to submit your assignment to receive personalized instructor feedback.`;
      }

      // Create supportive notification
      await createNotification({
        userId: student.id,
        title,
        message,
        type: NotificationType.STUDENT_SUPPORT_REMINDER,
        linkUrl: '/dashboard',
      });

      // Emit friendly inactive reminder event
      if (student.email) {
        appEventBus.emitEvent(AcademyEvent.INACTIVE_STUDENT_REMINDER, {
          userId: student.id,
          email: student.email,
          name: student.name,
          courseId: activeRecord.courseId || '',
          courseTitle: activeRecord.title || 'Your Course',
          lastActiveDays: 7,
          progressPercentage: 25,
        });
      }

      // Update notification timestamp and counter
      await prisma.studentRiskRecord.update({
        where: { id: activeRecord.id },
        data: {
          lastNotifiedAt: new Date(),
          notificationCount: { increment: 1 },
        },
      });
    } catch (err: any) {
      logger.error(`[AT-RISK NOTIFICATION ERROR] Failed to notify student ${student.id}: ${err.message}`);
    }
  }

  /**
   * Analyzes all active students across the academy.
   */
  public static async analyzeAllStudents(): Promise<{
    totalAnalyzed: number;
    atRiskStudentsCount: number;
    resolvedCount: number;
  }> {
    logger.info('[AT-RISK ANALYSIS] Starting whole-platform student risk detection scan...');
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', status: 'ACTIVE' },
      select: { id: true },
    });

    let atRiskCount = 0;
    let totalResolved = 0;

    for (const student of students) {
      try {
        const res = await this.analyzeStudent(student.id);
        if (res.activeSignals.length > 0) atRiskCount++;
        totalResolved += res.resolvedCount;
      } catch (err: any) {
        logger.error(`[AT-RISK ANALYSIS ERROR] Failed to analyze student ${student.id}: ${err.message}`);
      }
    }

    logger.info(`[AT-RISK ANALYSIS COMPLETE] Analyzed ${students.length} students. At-risk: ${atRiskCount}. Resolved: ${totalResolved}.`);
    return {
      totalAnalyzed: students.length,
      atRiskStudentsCount: atRiskCount,
      resolvedCount: totalResolved,
    };
  }

  /**
   * Retrieves summary statistics and paginated student risk list for Admin / Instructor dashboard.
   */
  public static async getAtRiskSummary(params: {
    page?: number;
    limit?: number;
    search?: string;
    riskLevel?: string;
    riskReason?: string;
    status?: string;
    courseId?: string;
    instructorId?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (params.status && params.status !== 'ALL') {
      whereClause.status = params.status as StudentRiskStatus;
    } else if (!params.status) {
      // Default to ACTIVE risks
      whereClause.status = StudentRiskStatus.ACTIVE;
    }

    if (params.riskLevel && params.riskLevel !== 'ALL') {
      whereClause.riskLevel = params.riskLevel as StudentRiskLevel;
    }

    if (params.riskReason && params.riskReason !== 'ALL') {
      whereClause.riskReason = params.riskReason as StudentRiskReason;
    }

    if (params.courseId) {
      whereClause.courseId = params.courseId;
    }

    if (params.instructorId) {
      // Limit to courses instructed by this user
      whereClause.course = { instructorId: params.instructorId };
    }

    if (params.search) {
      const q = params.search.trim();
      whereClause.user = {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    // Summary Counts across database
    const [
      totalActiveRecords,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      recoveredCount,
      reasonCounts,
      records,
      totalMatching,
    ] = await Promise.all([
      prisma.studentRiskRecord.count({ where: { status: StudentRiskStatus.ACTIVE } }),
      prisma.studentRiskRecord.count({
        where: { status: StudentRiskStatus.ACTIVE, riskLevel: StudentRiskLevel.HIGH },
      }),
      prisma.studentRiskRecord.count({
        where: { status: StudentRiskStatus.ACTIVE, riskLevel: StudentRiskLevel.MEDIUM },
      }),
      prisma.studentRiskRecord.count({
        where: { status: StudentRiskStatus.ACTIVE, riskLevel: StudentRiskLevel.LOW },
      }),
      prisma.studentRiskRecord.count({
        where: {
          status: StudentRiskStatus.RESOLVED,
          resolvedAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
        },
      }),
      prisma.studentRiskRecord.groupBy({
        by: ['riskReason'],
        where: { status: StudentRiskStatus.ACTIVE },
        _count: { _all: true },
      }),
      prisma.studentRiskRecord.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [{ riskLevel: 'desc' }, { detectedAt: 'desc' }],
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true, createdAt: true },
          },
          course: {
            select: { id: true, title: true, slug: true },
          },
          quiz: {
            select: { id: true, title: true },
          },
          assignment: {
            select: { id: true, title: true, dueDate: true },
          },
        },
      }),
      prisma.studentRiskRecord.count({ where: whereClause }),
    ]);

    // Format reason breakdown
    const reasonBreakdown = reasonCounts.map((r) => ({
      reason: r.riskReason,
      count: r._count._all,
    }));

    return {
      stats: {
        totalAtRisk: totalActiveRecords,
        highRisk: highRiskCount,
        mediumRisk: mediumRiskCount,
        lowRisk: lowRiskCount,
        recovered: recoveredCount,
        reasonBreakdown,
      },
      records,
      pagination: {
        total: totalMatching,
        page,
        limit,
        totalPages: Math.ceil(totalMatching / limit),
      },
    };
  }

  /**
   * Retrieves comprehensive student profile, all active/historical risks, and learning progress.
   */
  public static async getStudentRiskDetails(studentId: string) {
    const [student, lastActivity, riskRecords, recentQuizAttempts, recentSubmissions] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: studentId },
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            createdAt: true,
            enrollments: {
              include: {
                course: {
                  select: { id: true, title: true, slug: true, durationHours: true },
                },
              },
            },
          },
        }),
        this.getStudentLastActivity(studentId),
        prisma.studentRiskRecord.findMany({
          where: { userId: studentId },
          orderBy: { detectedAt: 'desc' },
          include: {
            course: { select: { id: true, title: true } },
            quiz: { select: { id: true, title: true } },
            assignment: { select: { id: true, title: true } },
          },
        }),
        prisma.quizAttempt.findMany({
          where: { userId: studentId },
          orderBy: { completedAt: 'desc' },
          take: 5,
          include: { quiz: { select: { id: true, title: true, passingScore: true } } },
        }),
        prisma.assignmentSubmission.findMany({
          where: { userId: studentId },
          orderBy: { submittedAt: 'desc' },
          take: 5,
          include: { assignment: { select: { id: true, title: true, maxScore: true } } },
        }),
      ]);

    if (!student) {
      throw new Error('Student not found.');
    }

    const activeRisks = riskRecords.filter((r) => r.status === StudentRiskStatus.ACTIVE);
    const resolvedRisks = riskRecords.filter((r) => r.status === StudentRiskStatus.RESOLVED);
    const dismissedRisks = riskRecords.filter((r) => r.status === StudentRiskStatus.DISMISSED);

    // Compute highest current risk level
    let currentRiskLevel: StudentRiskLevel | null = null;
    if (activeRisks.length > 0) {
      if (activeRisks.some((r) => r.riskLevel === StudentRiskLevel.HIGH) || activeRisks.length >= 2) {
        currentRiskLevel = StudentRiskLevel.HIGH;
      } else if (activeRisks.some((r) => r.riskLevel === StudentRiskLevel.MEDIUM)) {
        currentRiskLevel = StudentRiskLevel.MEDIUM;
      } else {
        currentRiskLevel = StudentRiskLevel.LOW;
      }
    }

    const inactivityDays = Math.max(0, Math.floor((Date.now() - lastActivity.getTime()) / (24 * 3600 * 1000)));

    return {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        avatar: student.avatar,
        registeredAt: student.createdAt,
        lastActivity,
        inactivityDays,
        currentRiskLevel,
        enrollments: student.enrollments.map((e) => ({
          courseId: e.courseId,
          courseTitle: e.course.title,
          progressPercentage: e.progressPercentage,
          status: e.status,
          enrolledAt: e.createdAt,
          lastActivityAt: e.updatedAt,
        })),
      },
      activeRisks,
      resolvedRisks,
      dismissedRisks,
      recentAssessments: {
        quizzes: recentQuizAttempts,
        assignments: recentSubmissions,
      },
    };
  }

  /**
   * Allows an instructor or admin to send an intervention message directly to the student.
   */
  public static async sendIntervention(
    studentId: string,
    data: { title?: string; message: string; linkUrl?: string },
    authorId: string
  ) {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new Error('Student not found.');

    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: { name: true, role: true },
    });

    const title = data.title || `Message from your instructor (${author?.name || 'Khalil Academy'})`;

    // 1. Create In-App Notification
    const notif = await createNotification({
      userId: studentId,
      title,
      message: data.message,
      type: NotificationType.STUDENT_SUPPORT_REMINDER,
      linkUrl: data.linkUrl || '/dashboard',
    });

    // 2. Send transactional email
    if (student.email) {
      sendEmail({
        to: student.email,
        subject: title,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #071326; color: #F8FAFC; padding: 24px; border-radius: 12px; border: 1px solid #23426A;">
            <h2 style="color: #4FD1C5; margin-bottom: 12px;">${title}</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #CBD5E1; white-space: pre-line;">${data.message}</p>
            <div style="margin: 24px 0;">
              <a href="${process.env.APP_URL || 'https://khalilacademy.com'}${data.linkUrl || '/dashboard'}" style="background: #0284C7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
                Open Learning Dashboard
              </a>
            </div>
            <p style="font-size: 12px; color: #64748B; border-top: 1px solid #23426A; pt: 12px;">
              Sent by ${author?.name} (${author?.role}) • Khalil Academy
            </p>
          </div>
        `,
      }).catch(() => {});
    }

    // 3. Update notification count on active risk records
    await prisma.studentRiskRecord.updateMany({
      where: { userId: studentId, status: StudentRiskStatus.ACTIVE },
      data: {
        lastNotifiedAt: new Date(),
        notificationCount: { increment: 1 },
      },
    });

    // 4. Audit Log
    await recordAuditLog({
      userId: authorId,
      action: 'STUDENT_INTERVENTION_SENT',
      entity: 'StudentRiskRecord',
      entityId: studentId,
      details: { message: data.message, title },
    });

    return { success: true, notification: notif };
  }

  /**
   * Manually dismisses or resolves a risk record with notes.
   */
  public static async dismissRiskRecord(recordId: string, reason: string, authorId: string) {
    const record = await prisma.studentRiskRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) throw new Error('Risk record not found.');

    const updated = await prisma.studentRiskRecord.update({
      where: { id: recordId },
      data: {
        status: StudentRiskStatus.DISMISSED,
        resolvedAt: new Date(),
        resolutionReason: reason || 'Manually dismissed by instructor/administrator.',
      },
    });

    await recordAuditLog({
      userId: authorId,
      action: 'STUDENT_RISK_DISMISSED',
      entity: 'StudentRiskRecord',
      entityId: recordId,
      details: { reason },
    });

    return updated;
  }

  /**
   * Starts background interval scheduler to run risk analysis periodically.
   */
  public static startScheduler(): void {
    if (this.schedulerInterval) return;

    const intervalMs = RiskConfig.SCHEDULER_INTERVAL_HOURS * 3600 * 1000;
    this.schedulerInterval = setInterval(() => {
      this.analyzeAllStudents().catch((err) => {
        logger.error(`[AT-RISK SCHEDULER ERROR] Background analysis failed: ${err.message}`);
      });
    }, intervalMs);

    logger.info(`[AT-RISK SCHEDULER] Background worker initialized (Interval: every ${RiskConfig.SCHEDULER_INTERVAL_HOURS} hours).`);
  }
}
