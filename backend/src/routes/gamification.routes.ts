import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import * as gamificationController from '../controllers/gamification.controller';

const router = Router();

// Student Gamification Profile (Streaks, XP, Level, Badges, 7-Day Activity)
router.get('/profile', authenticate, gamificationController.getGamificationProfile);

// Daily Login / Active Check-in
router.post('/check-in', authenticate, gamificationController.checkDailyActivity);

// Academy Leaderboard (Public / Authenticated)
router.get('/leaderboard', authenticate, gamificationController.getLeaderboard);

// Update Weekly Learning Goal
router.put('/weekly-goal', authenticate, gamificationController.updateWeeklyGoal);

export default router;
