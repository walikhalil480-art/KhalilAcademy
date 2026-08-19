import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { checkAndProcessCourseCompletion } from './certificate.service';

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

  return {
    ...quiz,
    userAttemptsCount: attemptsCount,
    remainingAttempts: Math.max(0, quiz.maxAttempts - attemptsCount),
    hasPassed,
  };
};

export const submitQuizAttempt = async (userId: string, data: QuizSubmissionData) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: data.quizId },
    include: {
      questions: {
        include: { options: true },
      },
    },
  });

  if (!quiz) throw new AppError('Quiz not found.', 404);

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
