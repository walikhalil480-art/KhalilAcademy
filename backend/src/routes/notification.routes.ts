import { Router } from 'express';
import * as notifController from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/', authenticate, notifController.getNotifications);
router.patch('/:id/read', authenticate, notifController.markAsRead);

export default router;
