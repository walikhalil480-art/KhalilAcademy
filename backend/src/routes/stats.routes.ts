import { Router } from 'express';
import * as statsController from '../controllers/stats.controller';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/rbac';

const router = Router();

// Public academy-wide statistics
router.get('/public', statsController.getPublicStats);

// Academy Leaderboard
router.get('/leaderboard', statsController.getLeaderboardStats);

// Admin detailed analytics
router.get('/admin', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), statsController.getAdminStats);

export default router;

