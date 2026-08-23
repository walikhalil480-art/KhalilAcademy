import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { getCourseAnalytics as fetchCourseAnalytics } from '../services/courseAnalytics.service';

export const getCourseAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.id || req.params.courseId;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const data = await fetchCourseAnalytics(courseId, userId, userRole);
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
};
