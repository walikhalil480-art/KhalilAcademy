import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import * as adminService from '../services/admin.service';

export const getDashboard = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await adminService.getAdminDashboardMetrics();
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const filters = {
      search: req.query.search as string,
      role: req.query.role as any,
      status: req.query.status as any,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 15,
    };
    const result = await adminService.getUsersAdmin(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const updateUserRoleOrStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await adminService.updateUserRoleOrStatusAdmin(
      req.user!.id,
      req.user!.role,
      req.params.id,
      req.body
    );
    res.json({ success: true, message: 'User updated successfully.', user: updated });
  } catch (error) {
    next(error);
  }
};

export const resetUserPassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await adminService.adminResetUserPassword(
      req.user!.id,
      req.user!.role,
      req.params.id,
      req.body.newPassword
    );
    res.json({ success: true, message: 'User password reset successfully.' });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const result = await adminService.getAuditLogsAdmin(page, limit);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await adminService.deleteUserAdmin(
      req.user!.id,
      req.user!.role,
      req.params.id
    );
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

