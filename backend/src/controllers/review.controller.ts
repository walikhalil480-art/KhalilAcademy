import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import * as reviewService from '../services/review.service';

export const getCourseReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.courseId || req.params.id;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const result = await reviewService.getCourseReviews(courseId, { page, limit });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const createReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.courseId || req.body.courseId;
    const { rating, comment } = req.body;

    const review = await reviewService.createCourseReview(req.user!.id, courseId, rating, comment);
    res.status(201).json({ success: true, message: 'Review submitted successfully.', review });
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const reviewId = req.params.id || req.params.reviewId;
    const { rating, comment } = req.body;

    const review = await reviewService.updateReview(req.user!.id, req.user!.role, reviewId, rating, comment);
    res.json({ success: true, message: 'Review updated successfully.', review });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const reviewId = req.params.id || req.params.reviewId;

    const result = await reviewService.deleteReview(req.user!.id, req.user!.role, reviewId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
