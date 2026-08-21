import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LiveSessionService } from '../services/liveSession.service';
import { AuthenticatedRequest } from '../middlewares/auth';
import { LiveMeetingProvider, LiveSessionStatus, LiveAttendanceStatus } from '@prisma/client';

const createSessionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  courseId: z.string().uuid(),
  instructorId: z.string().uuid().optional(),
  startTime: z.string().datetime({ offset: true }).or(z.string()),
  endTime: z.string().datetime({ offset: true }).or(z.string()),
  timezone: z.string().default('UTC'),
  maxParticipants: z.number().int().min(1).max(500).default(50),
  meetingProvider: z.nativeEnum(LiveMeetingProvider).default(LiveMeetingProvider.EXTERNAL),
  meetingUrl: z.string().url().or(z.string()).optional(),
  meetingId: z.string().optional(),
  meetingPasscode: z.string().optional(),
  attendanceThresholdPercent: z.number().int().min(1).max(100).default(70),
  joinBufferMinutes: z.number().int().min(0).max(60).default(15),
});

const updateSessionSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  startTime: z.string().datetime({ offset: true }).or(z.string()).optional(),
  endTime: z.string().datetime({ offset: true }).or(z.string()).optional(),
  timezone: z.string().optional(),
  maxParticipants: z.number().int().min(1).max(500).optional(),
  meetingProvider: z.nativeEnum(LiveMeetingProvider).optional(),
  meetingUrl: z.string().url().or(z.string()).optional(),
  meetingId: z.string().optional(),
  meetingPasscode: z.string().optional(),
  status: z.nativeEnum(LiveSessionStatus).optional(),
  attendanceThresholdPercent: z.number().int().min(1).max(100).optional(),
  joinBufferMinutes: z.number().int().min(0).max(60).optional(),
  recordingUrl: z.string().url().or(z.string()).optional(),
  recordingTitle: z.string().optional(),
  recordingDurationMinutes: z.number().int().optional(),
});

const askQuestionSchema = z.object({
  question: z.string().min(3).max(1000),
});

const answerQuestionSchema = z.object({
  answer: z.string().min(1).max(2000),
});

const updateAttendanceSchema = z.object({
  status: z.nativeEnum(LiveAttendanceStatus),
  durationMinutes: z.number().int().min(0).optional(),
});

const attachRecordingSchema = z.object({
  recordingUrl: z.string().url().or(z.string().min(5)),
  recordingTitle: z.string().optional(),
  durationMinutes: z.number().int().optional(),
});

export const createSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createSessionSchema.parse(req.body);
    const session = await LiveSessionService.createSession(
      validated as any,
      req.user!.id,
      req.user!.role
    );
    res.status(201).json({ success: true, session });
  } catch (error) {
    next(error);
  }
};

export const getSessions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await LiveSessionService.getSessions(
      req.query as any,
      req.user?.id,
      req.user?.role
    );
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getSessionById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await LiveSessionService.getSessionById(
      req.params.id,
      req.user?.id,
      req.user?.role
    );
    res.json({ success: true, session });
  } catch (error) {
    next(error);
  }
};

export const getMySessions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await LiveSessionService.getMySessions(req.user!.id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const updateSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validated = updateSessionSchema.parse(req.body);
    const session = await LiveSessionService.updateSession(
      req.params.id,
      validated as any,
      req.user!.id,
      req.user!.role
    );
    res.json({ success: true, session });
  } catch (error) {
    next(error);
  }
};

export const cancelSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const session = await LiveSessionService.cancelSession(
      req.params.id,
      req.user!.id,
      req.user!.role
    );
    res.json({ success: true, message: 'Live class cancelled successfully.', session });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await LiveSessionService.deleteSession(
      req.params.id,
      req.user!.id,
      req.user!.role
    );
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const registerForSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await LiveSessionService.registerForSession(req.params.id, req.user!.id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const unregisterFromSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await LiveSessionService.unregisterFromSession(req.params.id, req.user!.id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const joinSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await LiveSessionService.joinSession(
      req.params.id,
      req.user!.id,
      req.user!.role
    );
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const leaveSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await LiveSessionService.leaveSession(req.params.id, req.user!.id);
    res.json({ success: true, attendance: result });
  } catch (error) {
    next(error);
  }
};

export const getParticipants = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const participants = await LiveSessionService.getParticipants(
      req.params.id,
      req.user!.id,
      req.user!.role
    );
    res.json({ success: true, participants });
  } catch (error) {
    next(error);
  }
};

export const getAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const attendances = await LiveSessionService.getAttendance(
      req.params.id,
      req.user!.id,
      req.user!.role
    );
    res.json({ success: true, attendances });
  } catch (error) {
    next(error);
  }
};

export const updateAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validated = updateAttendanceSchema.parse(req.body);
    const attendance = await LiveSessionService.updateAttendance(
      req.params.id,
      req.params.userId,
      validated.status,
      validated.durationMinutes,
      req.user!.id,
      req.user!.role
    );
    res.json({ success: true, attendance });
  } catch (error) {
    next(error);
  }
};

export const getQuestions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const questions = await LiveSessionService.getQuestions(req.params.id, req.user?.id);
    res.json({ success: true, questions });
  } catch (error) {
    next(error);
  }
};

export const askQuestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validated = askQuestionSchema.parse(req.body);
    const question = await LiveSessionService.askQuestion(
      req.params.id,
      req.user!.id,
      validated.question
    );
    res.status(201).json({ success: true, question });
  } catch (error) {
    next(error);
  }
};

export const answerQuestion = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validated = answerQuestionSchema.parse(req.body);
    const question = await LiveSessionService.answerQuestion(
      req.params.id,
      req.params.questionId,
      validated.answer,
      req.user!.id,
      req.user!.role
    );
    res.json({ success: true, question });
  } catch (error) {
    next(error);
  }
};

export const upvoteQuestion = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const question = await LiveSessionService.upvoteQuestion(
      req.params.id,
      req.params.questionId,
      req.user!.id
    );
    res.json({ success: true, question });
  } catch (error) {
    next(error);
  }
};

export const pinQuestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const question = await LiveSessionService.pinQuestion(
      req.params.id,
      req.params.questionId,
      req.user!.id,
      req.user!.role
    );
    res.json({ success: true, question });
  } catch (error) {
    next(error);
  }
};

export const deleteQuestion = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await LiveSessionService.deleteQuestion(
      req.params.id,
      req.params.questionId,
      req.user!.id,
      req.user!.role
    );
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const attachRecording = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validated = attachRecordingSchema.parse(req.body);
    const session = await LiveSessionService.attachRecording(
      req.params.id,
      validated,
      req.user!.id,
      req.user!.role
    );
    res.json({ success: true, message: 'Recording attached successfully.', session });
  } catch (error) {
    next(error);
  }
};

export const exportSessionIcs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const icsContent = await LiveSessionService.generateSessionIcs(req.params.id);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="live-class-${req.params.id}.ics"`
    );
    res.send(icsContent);
  } catch (error) {
    next(error);
  }
};

export const exportUserIcs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const icsContent = await LiveSessionService.generateUserIcs(req.user!.id);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="my-live-classes.ics"');
    res.send(icsContent);
  } catch (error) {
    next(error);
  }
};
