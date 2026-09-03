import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { checkAndProcessCourseCompletion } from './certificate.service';
import { appEventBus, AcademyEvent } from '../events/eventBus';
import { StudentRiskStatus, StudentRiskLevel, StudentRiskReason } from '@prisma/client';
import { createNotification } from './notification.service';

export interface QuizSubmissionData {
  quizId: string;
  answers: { questionId: string; selectedOptionId: string }[];
}

export const getQuizDetails = async (quizId: string, userId: string) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: {
          options: {
            select: { id: true, optionText: true },
          },
        },
      },
      attempts: {
        where: { userId },
        orderBy: { completedAt: 'desc' },
      },
    },
  });

  if (!quiz) throw new AppError('Quiz not found.', 404);

  // Check if student has active re-certification requirement for this course
  const activeRecertReq = await prisma.recertificationRequirement.findFirst({
    where: {
      userId,
      courseId: quiz.courseId,
      isCompleted: false,
    },
  });

  // Check active anti-cheating risk
  const cheatingRisk = await prisma.studentRiskRecord.findFirst({
    where: {
      userId,
      quizId,
      status: StudentRiskStatus.ACTIVE,
      title: { contains: 'Anti-Cheating' },
    },
  });

  // If active re-certification is underway, attempts before revocation do not count against fresh attempts
  const relevantAttempts = activeRecertReq
    ? quiz.attempts.filter((a) => a.completedAt >= activeRecertReq.createdAt)
    : quiz.attempts;

  const attemptsCount = relevantAttempts.length;
  const hasPassed = relevantAttempts.some((a) => a.passed);

  // If student has an active re-certification requirement, anti-cheating lock is unlocked for the retake
  const isCheatingLocked = !activeRecertReq && !!cheatingRisk;
  const hasActiveRecertification = !!activeRecertReq;

  // Check lesson completion requirement if final assessment
  let allLessonsCompleted = true;
  let totalLessonsCount = 0;
  let completedLessonsCount = 0;

  if (quiz.isFinalAssessment) {
    totalLessonsCount = await prisma.lesson.count({
      where: { module: { courseId: quiz.courseId }, isPublished: true },
    });

    completedLessonsCount = await prisma.lessonProgress.count({
      where: {
        userId,
        lesson: { module: { courseId: quiz.courseId }, isPublished: true },
        isCompleted: true,
      },
    });

    if (totalLessonsCount > 0 && completedLessonsCount < totalLessonsCount) {
      allLessonsCompleted = false;
    }
  }

  return {
    ...quiz,
    userAttemptsCount: attemptsCount,
    remainingAttempts: Math.max(0, quiz.maxAttempts - attemptsCount),
    hasPassed,
    allLessonsCompleted,
    totalLessonsCount,
    completedLessonsCount,
    isCheatingLocked,
    hasActiveRecertification,
    isUnlocked: !isCheatingLocked,
  };
};

export const submitQuizAttempt = async (userId: string, data: QuizSubmissionData) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: data.quizId },
    include: {
      course: true,
      questions: {
        include: { options: true },
      },
    },
  });

  if (!quiz) throw new AppError('Quiz not found.', 404);

  // Check prerequisite: All lessons must be completed before taking final assessment
  if (quiz.isFinalAssessment) {
    const totalLessonsCount = await prisma.lesson.count({
      where: { module: { courseId: quiz.courseId }, isPublished: true },
    });

    const completedLessonsCount = await prisma.lessonProgress.count({
      where: {
        userId,
        lesson: { module: { courseId: quiz.courseId }, isPublished: true },
        isCompleted: true,
      },
    });

    if (totalLessonsCount > 0 && completedLessonsCount < totalLessonsCount) {
      throw new AppError(
        `You must complete all lessons in this course before taking the final assessment. (${completedLessonsCount}/${totalLessonsCount} lessons completed)`,
        403
      );
    }
  }

  // Check if student has active re-certification requirement
  const activeRecertReq = await prisma.recertificationRequirement.findFirst({
    where: {
      userId,
      courseId: quiz.courseId,
      isCompleted: false,
    },
  });

  if (!activeRecertReq) {
    const cheatingRisk = await prisma.studentRiskRecord.findFirst({
      where: {
        userId,
        quizId: data.quizId,
        status: StudentRiskStatus.ACTIVE,
        title: { contains: 'Anti-Cheating' },
      },
    });
    if (cheatingRisk) {
      throw new AppError('Your quiz attempt cannot be accepted because you have been disqualified for academic dishonesty.', 403);
    }
  }

  // Check attempt limits (attempts before re-certification do not block)
  const attemptWhere: any = { quizId: data.quizId, userId };
  if (activeRecertReq) {
    attemptWhere.completedAt = { gte: activeRecertReq.createdAt };
  }
  const userAttemptsCount = await prisma.quizAttempt.count({
    where: attemptWhere,
  });

  if (userAttemptsCount >= quiz.maxAttempts) {
    throw new AppError(`You have reached the maximum allowed attempts (${quiz.maxAttempts}) for this quiz.`, 400);
  }

  let earnedPoints = 0;
  let totalMaxPoints = 0;
  const answerRecords: any[] = [];
  const questionResults: any[] = [];

  for (const question of quiz.questions) {
    totalMaxPoints += question.points;
    const submittedAnswer = data.answers.find((a) => a.questionId === question.id);
    const selectedOption = question.options.find((o) => o.id === submittedAnswer?.selectedOptionId);

    const isCorrect = selectedOption ? selectedOption.isCorrect : false;
    if (isCorrect) {
      earnedPoints += question.points;
    }

    const correctOption = question.options.find((o) => o.isCorrect);

    questionResults.push({
      questionId: question.id,
      questionText: question.questionText,
      selectedOptionId: selectedOption?.id || null,
      selectedOptionText: selectedOption?.optionText || 'No answer selected',
      isCorrect,
      correctOptionId: correctOption?.id,
      correctOptionText: correctOption?.optionText,
      explanation: correctOption?.explanation || 'No explanation provided.',
    });

    answerRecords.push({
      questionId: question.id,
      selectedOptionId: selectedOption?.id || null,
      isCorrect,
    });
  }

  const percentage = totalMaxPoints > 0 ? parseFloat(((earnedPoints / totalMaxPoints) * 100).toFixed(1)) : 100;
  const passed = percentage >= quiz.passingScore;

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      userId,
      score: earnedPoints,
      maxScore: totalMaxPoints,
      percentage,
      passed,
      answers: {
        create: answerRecords,
      },
    },
  });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  if (user) {
    appEventBus.emitEvent(AcademyEvent.QUIZ_COMPLETED, {
      userId,
      email: user.email,
      name: user.name,
      quizId: quiz.id,
      quizTitle: quiz.title,
      courseId: quiz.courseId,
      courseTitle: quiz.course.title,
      score: percentage,
      passingScore: quiz.passingScore,
      passed,
      attemptNumber: userAttemptsCount + 1,
      maxAttempts: quiz.maxAttempts,
    });
  }

  // Check course completion if passed
  await checkAndProcessCourseCompletion(userId, quiz.courseId);

  return {
    attemptId: attempt.id,
    score: earnedPoints,
    maxScore: totalMaxPoints,
    percentage,
    passingScore: quiz.passingScore,
    passed,
    results: questionResults,
  };
};

export const getQuizResultsHistory = async (quizId: string, userId: string) => {
  return prisma.quizAttempt.findMany({
    where: { quizId, userId },
    orderBy: { completedAt: 'desc' },
    include: {
      answers: {
        include: {
          question: true,
          selectedOption: true,
        },
      },
    },
  });
};

export const getInstructorQuizSubmissions = async (quizId: string, instructorId: string, role: string) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      course: true,
      questions: {
        include: { options: true },
      },
    },
  });

  if (!quiz) throw new AppError('Quiz not found.', 404);

  if (role === 'INSTRUCTOR' && quiz.course.instructorId !== instructorId) {
    throw new AppError('Unauthorized access to course quiz submissions.', 403);
  }

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId },
    orderBy: { completedAt: 'desc' },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true },
      },
      answers: {
        include: {
          question: { select: { id: true, questionText: true, points: true } },
          selectedOption: { select: { id: true, optionText: true, isCorrect: true } },
        },
      },
    },
  });

  return {
    quizTitle: quiz.title,
    courseTitle: quiz.course.title,
    passingScore: quiz.passingScore,
    totalQuestions: quiz.questions.length,
    totalSubmissions: attempts.length,
    attempts,
  };
};

export const resetQuizAttemptsForStudent = async (quizId: string, targetUserId?: string) => {
  const whereClause: any = { quizId };
  if (targetUserId) {
    whereClause.userId = targetUserId;
  }
  await prisma.quizAttempt.deleteMany({
    where: whereClause,
  });

  // Also resolve active anti-cheating risk records for this quiz
  const riskWhere: any = { quizId, status: StudentRiskStatus.ACTIVE };
  if (targetUserId) {
    riskWhere.userId = targetUserId;
  }
  await prisma.studentRiskRecord.updateMany({
    where: riskWhere,
    data: {
      status: StudentRiskStatus.RESOLVED,
      resolvedAt: new Date(),
      resolutionReason: 'Instructor or administrator reset quiz attempts and cleared anti-cheating lockout.',
    },
  });

  return { success: true, message: 'Quiz attempts successfully reset and anti-cheating lockout cleared.' };
};

export const disqualifyQuizForCheating = async (userId: string, quizId: string) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { course: true },
  });

  if (!quiz) throw new AppError('Quiz not found.', 404);

  // Record a high-priority risk record
  const existingRisk = await prisma.studentRiskRecord.findFirst({
    where: {
      userId,
      quizId,
      status: StudentRiskStatus.ACTIVE,
    },
  });

  if (!existingRisk) {
    await prisma.studentRiskRecord.create({
      data: {
        userId,
        courseId: quiz.courseId,
        quizId,
        riskLevel: StudentRiskLevel.HIGH,
        riskReason: StudentRiskReason.MULTIPLE_RISK_FACTORS,
        title: 'Anti-Cheating Disqualification: Tab Switching (3/3)',
        details: `Student was disqualified and locked out after 3 repeated tab-switching / focus loss violations on quiz: "${quiz.title}".`,
        status: StudentRiskStatus.ACTIVE,
        recommendedAction: 'Review proctoring logs and conduct an integrity review before resetting attempts.',
      },
    });
  }

  try {
    await createNotification({
      userId,
      title: `🚫 Quiz Disqualified: ${quiz.title}`,
      message: `Your access to "${quiz.title}" has been revoked due to exceeding 3 allowed tab switches during the proctored quiz.`,
      type: 'ASSIGNMENT_GRADED' as any,
      linkUrl: `/courses/${quiz.course.slug}/learn`,
    });
  } catch (err) {
    console.error('Failed to create quiz cheating notification:', err);
  }

  return { isCheatingLocked: true };
};

