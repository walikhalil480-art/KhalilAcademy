import { Request, Response, NextFunction } from 'express';
import * as statsService from '../services/stats.service';
import * as gamificationService from '../services/gamification.service';

export const getPublicStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await statsService.getPublicAcademyStats();
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await statsService.getAdminDetailedStats();
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaderboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = (req.query.period as 'all-time' | 'weekly') || 'all-time';
    const limit = parseInt(req.query.limit as string) || 20;
    const leaderboard = await gamificationService.getLeaderboard(period, limit);
    
    // Map to expected format for backward compatibility
    const currentUserId = (req as any).user?.id;
    const topLearners = leaderboard.map((l) => ({
      id: l.userId,
      name: l.name,
      avatar: l.avatar,
      streakDays: l.currentStreakDays,
      lessonsCount: l.lessonsCompleted || Math.round(l.xpPoints / 120),
      badgesCount: l.badgesCount || 0,
      xp: l.xpPoints,
      rank: l.rank,
      level: l.level,
      levelTitle: l.levelTitle,
      isCurrentUser: currentUserId ? l.userId === currentUserId : false,
    }));

    const currentUserRank = currentUserId ? topLearners.find((l) => l.id === currentUserId) || null : null;

    res.json({
      success: true,
      topLearners,
      currentUserRank,
    });
  } catch (error) {
    next(error);
  }
};

