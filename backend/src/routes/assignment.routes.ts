import { Router } from 'express';
import * as assignmentController from '../controllers/assignment.controller';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/rbac';

const router = Router();

router.get('/:id', authenticate, assignmentController.getAssignment);
router.post('/', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), assignmentController.createAssignment);
router.patch('/:id', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), assignmentController.updateAssignment);
router.post('/:id/submit', authenticate, assignmentController.submitAssignment);
router.post('/:id/disqualify', authenticate, assignmentController.disqualifyAssignmentForCheating);
router.post('/:id/reset-attempts', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), assignmentController.resetAssignmentAttempts);
router.get('/course/:courseId/submissions', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), assignmentController.getCourseSubmissions);
router.post('/submissions/:id/grade', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), assignmentController.gradeSubmission);

export default router;
