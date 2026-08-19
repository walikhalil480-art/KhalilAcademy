import { Request, Response, NextFunction } from 'express';
import * as statsService from '../services/stats.service';

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
