import { Router } from 'express';
import * as courseController from '../controllers/course.controller';
import * as reviewController from '../controllers/review.controller';
import * as paymentController from '../controllers/payment.controller';
import * as courseAnalyticsController from '../controllers/courseAnalytics.controller';
import { authenticate, authenticateOptional } from '../middlewares/auth';
import { authorize } from '../middlewares/rbac';

const router = Router();

router.get('/', authenticateOptional, courseController.listCourses);
router.get('/:slug', authenticateOptional, courseController.getCourse);
router.post('/:id/enroll', authenticate, paymentController.enrollFree);

// Course Analytics & Student Performance (Course Instructor & Admins ONLY)
router.get('/:id/analytics', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), courseAnalyticsController.getCourseAnalytics);

// Course Reviews
router.get('/:courseId/reviews', reviewController.getCourseReviews);
router.post('/:courseId/reviews', authenticate, reviewController.createReview);

// Course Admin & Instructor Management
router.get('/instructor/my-courses', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), courseController.getInstructorCourses);
router.post('/', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), courseController.createCourse);
router.patch('/:id/publish', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), courseController.publishCourse);
router.patch('/:id/unpublish', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), courseController.unpublishCourse);
router.patch('/:id', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), courseController.updateCourse);
router.delete('/:id', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), courseController.deleteCourse);

export default router;
