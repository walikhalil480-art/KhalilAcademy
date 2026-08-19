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
    const { title, description, passingScore, timeLimitMinutes, maxAttempts, moduleId, courseId, questions } = req.body;

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        passingScore: passingScore || 70,
        timeLimitMinutes: timeLimitMinutes || 30,
        maxAttempts: maxAttempts || 3,
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

    res.status(201).json({ success: true, quiz });
  } catch (error) {
    next(error);
  }
};
