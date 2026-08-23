import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { checkAndProcessCourseCompletion } from './certificate.service';
import { appEventBus, AcademyEvent } from '../events/eventBus';

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

  const attemptsCount = quiz.attempts.length;
  const hasPassed = quiz.attempts.some((a) => a.passed);

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

  // Check attempt limits
  const userAttemptsCount = await prisma.quizAttempt.count({
    where: { quizId: data.quizId, userId },
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
  return { success: true, message: 'Quiz attempts successfully reset.' };
};

