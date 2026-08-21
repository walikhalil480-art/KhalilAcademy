import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AIService } from '../services/ai/ai.service';
import { z } from 'zod';

const chatSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1, 'Message cannot be empty').max(4000, 'Message exceeds 4000 characters limit'),
  courseId: z.string().uuid().optional(),
  lessonId: z.string().uuid().optional(),
  actionType: z.enum(['EXPLAIN', 'SIMPLIFY', 'SUMMARY', 'QUIZ', 'CODE_HELP', 'STUDY_PLAN', 'RECOMMENDATION', 'GENERAL']).optional(),
  contextMeta: z.any().optional(),
});

const summarizeSchema = z.object({
  lessonId: z.string().uuid(),
  summaryType: z.enum(['quick', 'detailed', 'key_concepts', 'terminology', 'beginner', 'takeaways']).optional(),
});

const practiceGenerateSchema = z.object({
  lessonId: z.string().uuid(),
  questionType: z.enum(['multiple_choice', 'true_false', 'short_answer', 'scenario', 'coding', 'conceptual']).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

const practiceEvaluateSchema = z.object({
  lessonId: z.string().uuid(),
  question: z.string().min(1),
  studentAnswer: z.string().min(1, 'Answer cannot be empty'),
  questionType: z.string().optional(),
});

const codeHelpSchema = z.object({
  lessonId: z.string().uuid().optional(),
  code: z.string().max(10000).optional(),
  errorMessage: z.string().max(5000).optional(),
  language: z.string().optional(),
  studentGoal: z.string().max(1000).optional(),
});

const studyPlanSchema = z.object({
  goal: z.string().max(300).optional(),
  availableHoursPerWeek: z.number().min(1).max(80).optional(),
  currentLevel: z.string().optional(),
});

export const sendMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validated = chatSchema.parse(req.body);
    const result = await AIService.chat({
      userId: req.user!.id,
      ...validated,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const summarizeLesson = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validated = summarizeSchema.parse(req.body);
    const result = await AIService.summarizeLesson({
      userId: req.user!.id,
      ...validated,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const generatePractice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validated = practiceGenerateSchema.parse(req.body);
    const result = await AIService.generatePracticeQuestion({
      userId: req.user!.id,
      ...validated,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const evaluatePractice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validated = practiceEvaluateSchema.parse(req.body);
    const result = await AIService.evaluatePracticeAnswer({
      userId: req.user!.id,
      ...validated,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const explainCode = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validated = codeHelpSchema.parse(req.body);
    const result = await AIService.explainCodeOrError({
      userId: req.user!.id,
      ...validated,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const createStudyPlan = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validated = studyPlanSchema.parse(req.body);
    const result = await AIService.createStudyPlan({
      userId: req.user!.id,
      ...validated,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getRecommendations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = req.query.courseId as string | undefined;
    const result = await AIService.getRecommendations(req.user!.id, courseId);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getConversations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = req.query.courseId as string | undefined;
    const conversations = await AIService.getConversations(req.user!.id, courseId);
    res.json({ success: true, conversations });
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const conversation = await AIService.getConversationById(req.user!.id, req.params.id);
    res.json({ success: true, conversation });
  } catch (error) {
    next(error);
  }
};

export const deleteConversation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await AIService.deleteConversation(req.user!.id, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const clearConversation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await AIService.clearConversationMessages(req.user!.id, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
