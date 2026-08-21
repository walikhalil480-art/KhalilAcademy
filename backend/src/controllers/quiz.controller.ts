import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import * as quizService from '../services/quiz.service';
import { prisma } from '../config/database';

export const getQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const quiz = await quizService.getQuizDetails(req.params.id, req.user!.id);
    res.json({ success: true, quiz });
  } catch (error) {
    next(error);
  }
};

export const submitAttempt = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await quizService.submitQuizAttempt(req.user!.id, {
      quizId: req.params.id,
      answers: req.body.answers || [],
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const history = await quizService.getQuizResultsHistory(req.params.id, req.user!.id);
    res.json({ success: true, attempts: history });
  } catch (error) {
    next(error);
  }
};

export const createQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      description,
      passingScore,
      timeLimitMinutes,
      maxAttempts,
      moduleId,
      courseId,
      isRequired,
      isFinalAssessment,
      questions,
    } = req.body;

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        passingScore: passingScore !== undefined ? parseFloat(passingScore) : 70,
        timeLimitMinutes: timeLimitMinutes || 30,
        maxAttempts: maxAttempts || 3,
        isRequired: isRequired !== undefined ? !!isRequired : true,
        isFinalAssessment: isFinalAssessment !== undefined ? !!isFinalAssessment : false,
        moduleId,
        courseId,
        questions: {
          create: (questions || []).map((q: any, idx: number) => ({
            questionText: q.questionText,
            points: q.points || 1,
            order: idx + 1,
            options: {
              create: (q.options || []).map((opt: any) => ({
                optionText: opt.optionText,
                isCorrect: opt.isCorrect || false,
                explanation: opt.explanation,
              })),
            },
          })),
        },
      },
      include: {
        questions: { include: { options: true } },
      },
    });

    // If marked as final assessment, also update course's finalAssessmentQuizId
    if (isFinalAssessment) {
      await prisma.course.update({
        where: { id: courseId },
        data: {
          requireFinalAssessment: true,
          finalAssessmentQuizId: quiz.id,
          finalAssessmentPassingScore: quiz.passingScore,
        },
      });
    }

    res.status(201).json({ success: true, quiz });
  } catch (error) {
    next(error);
  }
};

export const updateQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, description, passingScore, timeLimitMinutes, maxAttempts, isRequired, isFinalAssessment } = req.body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (passingScore !== undefined) data.passingScore = parseFloat(passingScore);
    if (timeLimitMinutes !== undefined) data.timeLimitMinutes = parseInt(timeLimitMinutes, 10);
    if (maxAttempts !== undefined) data.maxAttempts = parseInt(maxAttempts, 10);
    if (isRequired !== undefined) data.isRequired = !!isRequired;
    if (isFinalAssessment !== undefined) data.isFinalAssessment = !!isFinalAssessment;

    const updated = await prisma.quiz.update({
      where: { id },
      data,
    });

    if (isFinalAssessment) {
      await prisma.course.update({
        where: { id: updated.courseId },
        data: {
          requireFinalAssessment: true,
          finalAssessmentQuizId: updated.id,
          finalAssessmentPassingScore: updated.passingScore,
        },
      });
    }

    res.json({ success: true, quiz: updated });
  } catch (error) {
    next(error);
  }
};
