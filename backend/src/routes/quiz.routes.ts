import { Router } from 'express';
import * as quizController from '../controllers/quiz.controller';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/rbac';

const router = Router();

router.get('/:id', authenticate, quizController.getQuiz);
router.post('/:id/attempt', authenticate, quizController.submitAttempt);
router.post('/:id/disqualify', authenticate, quizController.disqualifyQuiz);
router.get('/:id/results', authenticate, quizController.getHistory);
router.get('/:id/submissions', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), quizController.getInstructorSubmissions);
router.post('/:id/reset-attempts', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), quizController.resetAttempts);
router.post('/', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), quizController.createQuiz);
router.patch('/:id', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), quizController.updateQuiz);

export default router;
