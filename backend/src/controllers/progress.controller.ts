import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import * as progressService from '../services/progress.service';

export const completeLesson = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const lessonId = req.params.id;
    const result = await progressService.updateLessonProgress(req.user!.id, lessonId, {
      isCompleted: req.body.isCompleted !== undefined ? req.body.isCompleted : true,
      lastWatchedPosition: req.body.lastWatchedPosition,
    });

    res.json({
      success: true,
      message: 'Lesson progress updated.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const recordPlayback = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const lessonId = req.params.id;
    const result = await progressService.recordLessonPlayback(req.user!.id, lessonId, {
      lastWatchedPosition: Number(req.body.lastWatchedPosition || 0),
      deltaSeconds: req.body.deltaSeconds !== undefined ? Number(req.body.deltaSeconds) : undefined,
      playbackRate: req.body.playbackRate !== undefined ? Number(req.body.playbackRate) : 1,
      durationSeconds: req.body.durationSeconds !== undefined ? Number(req.body.durationSeconds) : undefined,
    });

    res.json({
      success: true,
      message: 'Playback progress recorded.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getCourseProgress = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const progress = await progressService.getCourseProgress(req.user!.id, req.params.id);
    res.json({ success: true, progress });
  } catch (error) {
    next(error);
  }
};

export const getUserLearning = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const courses = await progressService.getUserLearningCourses(req.user!.id);
    res.json({ success: true, courses });
  } catch (error) {
    next(error);
  }
};
