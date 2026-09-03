import { Router } from 'express';
import * as progressController from '../controllers/progress.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/my-learning', authenticate, progressController.getUserLearning);
router.post('/lessons/:id/complete', authenticate, progressController.completeLesson);
router.post('/lessons/:id/playback', authenticate, progressController.recordPlayback);
router.post('/lessons/:id/heartbeat', authenticate, progressController.recordPlayback);
router.get('/courses/:id/progress', authenticate, progressController.getCourseProgress);
router.get('/courses/:id', authenticate, progressController.getCourseProgress);

export default router;
