import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import * as gamificationService from '../services/gamification.service';

export const getGamificationProfile = async (req: AuthenticatedRequest, res: Response) => {
  const profile = await gamificationService.getStudentGamificationProfile(req.user!.id);
  res.json({
    success: true,
    data: profile,
  });
};

export const getLeaderboard = async (req: AuthenticatedRequest, res: Response) => {
  const period = req.query.period === 'weekly' ? 'weekly' : 'all-time';
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
  const leaderboard = await gamificationService.getLeaderboard(period, limit);
  res.json({
    success: true,
    period,
    data: leaderboard,
  });
};

export const updateWeeklyGoal = async (req: AuthenticatedRequest, res: Response) => {
  const { weeklyGoalMinutes } = req.body;
  const updated = await gamificationService.updateWeeklyGoal(req.user!.id, weeklyGoalMinutes);
  res.json({
    success: true,
    message: 'Weekly learning goal updated successfully.',
    data: updated,
  });
};

export const checkDailyActivity = async (req: AuthenticatedRequest, res: Response) => {
  const result = await gamificationService.recordUserActivity(req.user!.id, 'DAILY_LOGIN');
  res.json({
    success: true,
    data: result,
  });
};
