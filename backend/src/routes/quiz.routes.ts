import { Router } from 'express';
import * as quizController from '../controllers/quiz.controller';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/rbac';

const router = Router();

router.get('/:id', authenticate, quizController.getQuiz);
router.post('/:id/attempt', authenticate, quizController.submitAttempt);
router.get('/:id/results', authenticate, quizController.getHistory);
router.post('/', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), quizController.createQuiz);

export default router;
