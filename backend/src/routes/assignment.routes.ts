import { Router } from 'express';
import * as assignmentController from '../controllers/assignment.controller';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/rbac';

const router = Router();

router.post('/', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), assignmentController.createAssignment);
router.post('/:id/submit', authenticate, assignmentController.submitAssignment);
router.get('/course/:courseId/submissions', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), assignmentController.getCourseSubmissions);
router.post('/submissions/:id/grade', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), assignmentController.gradeSubmission);

export default router;
