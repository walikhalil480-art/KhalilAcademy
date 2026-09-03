import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { SubmissionStatus, CertificateStatus, RecertificationScope } from '@prisma/client';

export interface EligibilityRequirementSummary {
  lessons: {
    required: boolean;
    satisfied: boolean;
    completed: number;
    total: number;
    requiredCompleted: number;
    requiredTotal: number;
  };
  quizzes: {
    required: boolean;
    satisfied: boolean;
    passed: number;
    total: number;
    requiredPassed: number;
    requiredTotal: number;
    items: Array<{
      id: string;
      title: string;
      isRequired: boolean;
      passingScore: number;
      passed: boolean;
      bestScore: number | null;
      attemptsCount: number;
      remainingAttempts: number;
    }>;
  };
  assignments: {
    required: boolean;
    satisfied: boolean;
    passed: number;
    total: number;
    requiredPassed: number;
    requiredTotal: number;
    items: Array<{
      id: string;
      title: string;
      isRequired: boolean;
      passingScore: number;
      status: string;
      score: number | null;
      maxScore: number;
      feedback: string | null;
      passed: boolean;
    }>;
  };
  finalAssessment: {
    required: boolean;
    satisfied: boolean;
    quizId: string | null;
    quizTitle: string | null;
    passingScore: number;
    passed: boolean;
    bestScore: number | null;
    attemptsCount: number;
    remainingAttempts: number;
  };
  minimumProgress: {
    required: number;
    current: number;
    satisfied: boolean;
  };
}

export interface CourseEligibilityResult {
  eligible: boolean;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  certificateEnabled: boolean;
  learningProgressPercentage: number;
  certificationProgressPercentage: number;
  requirements: EligibilityRequirementSummary;
  missingRequirements: string[];
  pendingAssignmentId?: string | null;
  pendingAssignmentTitle?: string | null;
  pendingQuizId?: string | null;
  pendingQuizTitle?: string | null;
  certificate: {
    id: string;
    certificateNumber: string;
    issueDate: Date;
    status?: string;
    verificationUrl: string;
  } | null;
  isRecertification?: boolean;
  recertificationRequirement?: {
    id: string;
    scope: string;
    notes?: string | null;
    createdAt: Date;
  } | null;
}

export class CertificateEligibilityService {
  /**
   * Authoritative server-side evaluation of course completion and certificate eligibility.
   */
  public static async evaluateEligibility(
    userId: string,
    courseIdOrSlug: string
  ): Promise<CourseEligibilityResult> {
    const course = await prisma.course.findFirst({
      where: { OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }] },
      include: {
        instructor: { select: { id: true, name: true } },
      },
    });

    if (!course) {
      throw new AppError('Course not found.', 404);
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    });

    if (!enrollment) {
      throw new AppError('You are not enrolled in this course.', 403);
    }

    const missingRequirements: string[] = [];

    // Check if the student has an active re-certification requirement for this course
    const activeRecertReq = await prisma.recertificationRequirement.findFirst({
      where: {
        userId,
        courseId: course.id,
        isCompleted: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    // -------------------------------------------------------------
    // 1. EVALUATE PUBLISHED LESSONS (Required vs Optional)
    // -------------------------------------------------------------
    const publishedLessons = await prisma.lesson.findMany({
      where: {
        module: { courseId: course.id },
        isPublished: true,
      },
      select: { id: true, title: true, isRequired: true, durationMinutes: true },
      orderBy: { order: 'asc' },
    });

    const lessonProgresses = await prisma.lessonProgress.findMany({
      where: {
        userId,
        lesson: { module: { courseId: course.id }, isPublished: true },
      },
    });

    const progressMap = new Map(lessonProgresses.map((p) => [p.lessonId, p]));

    const totalLessons = publishedLessons.length;
    const completedLessons = publishedLessons.filter((l) => {
      const p = progressMap.get(l.id);
      if (!p?.isCompleted) return false;
      if (activeRecertReq && (activeRecertReq.scope === RecertificationScope.FULL_COURSE || activeRecertReq.requiredLessonIds.includes(l.id))) {
        return p.updatedAt >= activeRecertReq.createdAt;
      }
      return true;
    }).length;

    const requiredLessons = publishedLessons.filter((l) => l.isRequired !== false);
    const requiredTotal = requiredLessons.length;
    const requiredCompleted = requiredLessons.filter((l) => {
      const p = progressMap.get(l.id);
      if (!p?.isCompleted) return false;
      if (activeRecertReq && (activeRecertReq.scope === RecertificationScope.FULL_COURSE || activeRecertReq.requiredLessonIds.includes(l.id))) {
        return p.updatedAt >= activeRecertReq.createdAt;
      }
      return true;
    }).length;

    const lessonsSatisfied = requiredTotal === 0 || requiredCompleted >= requiredTotal;
    if (!lessonsSatisfied && course.requireAllLessons !== false) {
      const incompleteCount = requiredTotal - requiredCompleted;
      missingRequirements.push(
        activeRecertReq
          ? `Re-certification: Complete required lessons (${requiredCompleted}/${requiredTotal} completed, ${incompleteCount} remaining).`
          : `Complete all required lessons (${requiredCompleted}/${requiredTotal} completed, ${incompleteCount} remaining).`
      );
    }

    // -------------------------------------------------------------
    // 2. EVALUATE QUIZZES (Required vs Optional & Final Assessment)
    // -------------------------------------------------------------
    const allQuizzes = await prisma.quiz.findMany({
      where: { courseId: course.id },
      include: {
        attempts: {
          where: { userId },
          orderBy: { percentage: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Determine final assessment quiz (if configured)
    const finalAssessmentQuiz = allQuizzes.find(
      (q) => q.isFinalAssessment || (course.finalAssessmentQuizId && q.id === course.finalAssessmentQuizId)
    );

    const standardQuizzes = allQuizzes.filter((q) => q.id !== finalAssessmentQuiz?.id);

    const quizItems = standardQuizzes.map((q) => {
      const requiredScore = course.quizPassingScore || q.passingScore || 70.0;
      const bestAttempt = q.attempts[0] || null;
      const passed = q.attempts.some((a) => {
        if (!a.passed || a.percentage < requiredScore) return false;
        if (
          activeRecertReq &&
          (activeRecertReq.scope === RecertificationScope.FULL_COURSE ||
            activeRecertReq.requiredQuizIds.includes(q.id))
        ) {
          return a.completedAt >= activeRecertReq.createdAt;
        }
        return true;
      });
      const isRequired = course.requireQuizzes ? true : q.isRequired !== false;
      const attemptsCount = q.attempts.length;

      return {
        id: q.id,
        title: q.title,
        isRequired,
        passingScore: requiredScore,
        passed,
        bestScore: bestAttempt ? bestAttempt.percentage : null,
        attemptsCount,
        remainingAttempts: Math.max(0, q.maxAttempts - attemptsCount),
      };
    });

    const requiredQuizItems = quizItems.filter((q) => q.isRequired);
    const requiredQuizzesPassed = requiredQuizItems.filter((q) => q.passed).length;
    const quizzesSatisfied = requiredQuizItems.length === 0 || requiredQuizzesPassed >= requiredQuizItems.length;

    if (!quizzesSatisfied) {
      const failedQuizzes = requiredQuizItems.filter((q) => !q.passed);
      failedQuizzes.forEach((fq) => {
        missingRequirements.push(
          activeRecertReq
            ? `Re-certification: Pass required quiz "${fq.title}" (Score: ${fq.bestScore !== null ? Math.round(fq.bestScore) : 0}%, Required: ${fq.passingScore}%).`
            : `Pass quiz "${fq.title}" (Score: ${fq.bestScore !== null ? Math.round(fq.bestScore) : 0}%, Required: ${fq.passingScore}%).`
        );
      });
    }

    // -------------------------------------------------------------
    // 3. EVALUATE ASSIGNMENTS (Required vs Optional & Workflow)
    // -------------------------------------------------------------
    const allAssignments = await prisma.assignment.findMany({
      where: { courseId: course.id },
      include: {
        submissions: {
          where: { userId },
          orderBy: { submittedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const assignmentItems = allAssignments.map((a) => {
      const isRequired = course.requireAssignments ? true : a.isRequired !== false;
      const requiredScore = course.assignmentPassingScore || a.passingScore || 80.0;
      const latestSubmission = a.submissions[0] || null;

      let passed = false;
      let status = 'NOT_SUBMITTED';

      if (latestSubmission) {
        status = latestSubmission.status;
        const percentage =
          latestSubmission.score !== null && latestSubmission.score !== undefined && a.maxScore > 0
            ? (latestSubmission.score / a.maxScore) * 100
            : 0;

        const isPostRevocation =
          !activeRecertReq ||
          (activeRecertReq.scope !== RecertificationScope.FULL_COURSE &&
            activeRecertReq.scope !== RecertificationScope.FINAL_ASSIGNMENT &&
            !activeRecertReq.requiredAssignmentIds.includes(a.id)) ||
          (latestSubmission.submittedAt && latestSubmission.submittedAt >= activeRecertReq.createdAt);

        if (latestSubmission.status === SubmissionStatus.PASSED && isPostRevocation) {
          passed = true;
        } else if (latestSubmission.status === SubmissionStatus.GRADED && percentage >= requiredScore && isPostRevocation) {
          passed = true;
        }
      }

      return {
        id: a.id,
        title: a.title,
        isRequired,
        passingScore: requiredScore,
        status,
        score: latestSubmission?.score ?? null,
        maxScore: a.maxScore,
        feedback: latestSubmission?.feedback ?? null,
        passed,
      };
    });

    const requiredAssignmentItems = assignmentItems.filter((a) => a.isRequired);
    const requiredAssignmentsPassed = requiredAssignmentItems.filter((a) => a.passed).length;
    const assignmentsSatisfied =
      requiredAssignmentItems.length === 0 || requiredAssignmentsPassed >= requiredAssignmentItems.length;

    if (!assignmentsSatisfied) {
      const incompleteAssignments = requiredAssignmentItems.filter((a) => !a.passed);
      incompleteAssignments.forEach((ia) => {
        if (ia.status === 'NOT_SUBMITTED') {
          missingRequirements.push(`Submit required assignment "${ia.title}".`);
        } else if (ia.status === SubmissionStatus.SUBMITTED || ia.status === SubmissionStatus.UNDER_REVIEW) {
          missingRequirements.push(`Assignment "${ia.title}" is currently under instructor review.`);
        } else if (ia.status === SubmissionStatus.NEEDS_REVISION) {
          missingRequirements.push(
            `Assignment "${ia.title}" needs revision based on instructor feedback: "${ia.feedback || 'Please update your work'}".`
          );
        } else if (ia.status === SubmissionStatus.GRADED) {
          const scorePercent = ia.score !== null && ia.maxScore > 0 ? Math.round((ia.score / ia.maxScore) * 100) : 0;
          missingRequirements.push(
            `Assignment "${ia.title}" requires passing score (Current: ${scorePercent}%, Required: ${ia.passingScore}%).`
          );
        }
      });
    }

    // -------------------------------------------------------------
    // 4. EVALUATE FINAL ASSESSMENT (If configured)
    // -------------------------------------------------------------
    const finalAssessmentRequired = course.requireFinalAssessment || !!finalAssessmentQuiz;
    let finalAssessmentSatisfied = true;
    let finalAssessmentSummary: any = {
      required: false,
      satisfied: true,
      quizId: null,
      quizTitle: null,
      passingScore: course.finalAssessmentPassingScore || 70.0,
      passed: true,
      bestScore: null,
      attemptsCount: 0,
      remainingAttempts: 0,
    };

    if (finalAssessmentRequired) {
      const passingScore = course.finalAssessmentPassingScore || finalAssessmentQuiz?.passingScore || 70.0;
      const bestAttempt = finalAssessmentQuiz?.attempts[0] || null;
      const passed =
        finalAssessmentQuiz?.attempts.some((a) => {
          if (!a.passed || a.percentage < passingScore) return false;
          if (
            activeRecertReq &&
            (activeRecertReq.scope === RecertificationScope.FULL_COURSE ||
              activeRecertReq.requireFinalAssignment)
          ) {
            return a.completedAt >= activeRecertReq.createdAt;
          }
          return true;
        }) || false;
      const attemptsCount = finalAssessmentQuiz?.attempts.length || 0;
      const maxAttempts = finalAssessmentQuiz?.maxAttempts || 3;

      finalAssessmentSatisfied = passed;
      finalAssessmentSummary = {
        required: true,
        satisfied: passed,
        quizId: finalAssessmentQuiz?.id || null,
        quizTitle: finalAssessmentQuiz?.title || 'Course Final Assessment',
        passingScore,
        passed,
        bestScore: bestAttempt ? bestAttempt.percentage : null,
        attemptsCount,
        remainingAttempts: Math.max(0, maxAttempts - attemptsCount),
      };

      if (!passed) {
        missingRequirements.push(
          activeRecertReq
            ? `Re-certification: Pass Final Assessment "${finalAssessmentQuiz?.title || 'Comprehensive Final Exam'}" (Score: ${
                bestAttempt ? Math.round(bestAttempt.percentage) : 0
              }%, Required: ${passingScore}%).`
            : `Pass Final Assessment "${finalAssessmentQuiz?.title || 'Comprehensive Final Exam'}" (Score: ${
                bestAttempt ? Math.round(bestAttempt.percentage) : 0
              }%, Required: ${passingScore}%).`
        );
      }
    }

    // -------------------------------------------------------------
    // 5. EVALUATE MINIMUM COURSE PROGRESS
    // -------------------------------------------------------------
    const learningProgressPercentage =
      totalLessons > 0 ? parseFloat(((completedLessons / totalLessons) * 100).toFixed(1)) : 100.0;

    const requiredProgressPercentage =
      requiredTotal > 0 ? parseFloat(((requiredCompleted / requiredTotal) * 100).toFixed(1)) : 100.0;

    const minProgressRequired = course.minimumProgressPercentage || 100.0;
    const minProgressSatisfied = requiredProgressPercentage >= minProgressRequired;

    if (!minProgressSatisfied) {
      missingRequirements.push(
        `Achieve minimum required course progress of ${minProgressRequired}% (Current: ${requiredProgressPercentage}%).`
      );
    }

    // -------------------------------------------------------------
    // 6. OVERALL ELIGIBILITY & CERTIFICATION PERCENTAGE
    // -------------------------------------------------------------
    const isEligible =
      course.certificateEnabled !== false &&
      lessonsSatisfied &&
      quizzesSatisfied &&
      assignmentsSatisfied &&
      finalAssessmentSatisfied &&
      minProgressSatisfied;

    // Calculate certification progress percentage across total requirements
    let totalCriteria = 0;
    let satisfiedCriteria = 0;

    // Criteria: Lessons
    if (requiredTotal > 0) {
      totalCriteria += 1;
      if (lessonsSatisfied) satisfiedCriteria += 1;
    }
    // Criteria: Quizzes
    if (requiredQuizItems.length > 0) {
      totalCriteria += 1;
      if (quizzesSatisfied) satisfiedCriteria += 1;
    }
    // Criteria: Assignments
    if (requiredAssignmentItems.length > 0) {
      totalCriteria += 1;
      if (assignmentsSatisfied) satisfiedCriteria += 1;
    }
    // Criteria: Final Assessment
    if (finalAssessmentRequired) {
      totalCriteria += 1;
      if (finalAssessmentSatisfied) satisfiedCriteria += 1;
    }

    const certificationProgressPercentage =
      totalCriteria > 0 ? parseFloat(((satisfiedCriteria / totalCriteria) * 100).toFixed(1)) : isEligible ? 100.0 : 0.0;

    // Look up existing certificate (prioritize ACTIVE, then latest)
    const activeCert = await prisma.certificate.findFirst({
      where: { userId, courseId: course.id, status: CertificateStatus.ACTIVE },
    });

    const existingCert =
      activeCert ||
      (await prisma.certificate.findFirst({
        where: { userId, courseId: course.id, status: { not: CertificateStatus.DELETED } },
        orderBy: { createdAt: 'desc' },
      }));

    const certData = existingCert
      ? {
          id: existingCert.id,
          certificateNumber: existingCert.certificateNumber,
          issueDate: existingCert.issueDate,
          status: existingCert.status,
          verificationUrl: `https://khalilacademy.com/verify/${existingCert.certificateNumber}`,
        }
      : null;

    const firstIncompleteAssignment = requiredAssignmentItems.find((a) => !a.passed);
    const firstIncompleteQuiz = requiredQuizItems.find((q) => !q.passed);

    return {
      eligible: isEligible,
      courseId: course.id,
      courseTitle: course.title,
      courseSlug: course.slug,
      certificateEnabled: course.certificateEnabled !== false,
      learningProgressPercentage,
      certificationProgressPercentage,
      pendingAssignmentId: firstIncompleteAssignment?.id || null,
      pendingAssignmentTitle: firstIncompleteAssignment?.title || null,
      pendingQuizId: firstIncompleteQuiz?.id || finalAssessmentSummary.quizId || null,
      pendingQuizTitle: firstIncompleteQuiz?.title || finalAssessmentSummary.quizTitle || null,
      requirements: {
        lessons: {
          required: course.requireAllLessons !== false,
          satisfied: lessonsSatisfied,
          completed: completedLessons,
          total: totalLessons,
          requiredCompleted,
          requiredTotal,
        },
        quizzes: {
          required: requiredQuizItems.length > 0,
          satisfied: quizzesSatisfied,
          passed: quizItems.filter((q) => q.passed).length,
          total: quizItems.length,
          requiredPassed: requiredQuizzesPassed,
          requiredTotal: requiredQuizItems.length,
          items: quizItems,
        },
        assignments: {
          required: requiredAssignmentItems.length > 0,
          satisfied: assignmentsSatisfied,
          passed: assignmentItems.filter((a) => a.passed).length,
          total: assignmentItems.length,
          requiredPassed: requiredAssignmentsPassed,
          requiredTotal: requiredAssignmentItems.length,
          items: assignmentItems,
        },
        finalAssessment: finalAssessmentSummary,
        minimumProgress: {
          required: minProgressRequired,
          current: learningProgressPercentage,
          satisfied: minProgressSatisfied,
        },
      },
      missingRequirements,
      certificate: certData,
      isRecertification: !!activeRecertReq,
      recertificationRequirement: activeRecertReq
        ? {
            id: activeRecertReq.id,
            scope: activeRecertReq.scope,
            notes: activeRecertReq.notes,
            createdAt: activeRecertReq.createdAt,
          }
        : null,
    };
  }
}

/**
 * Centralized certification eligibility service function.
 * Verifies all course enrollment and coursework requirements server-side.
 */
export const canIssueCertificate = async (studentId: string, courseId: string) => {
  return CertificateEligibilityService.evaluateEligibility(studentId, courseId);
};
