import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../config/database';
import { assertCourseOwnership, assertModuleOwnership } from '../utils/authorization';
import { AppError } from '../middlewares/errorHandler';

export const createModule = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, title, description, order } = req.body;
    await assertCourseOwnership(courseId, req.user!);

    const module = await prisma.module.create({
      data: {
        courseId,
        title,
        description,
        order: order || 1,
      },
    });
    res.status(201).json({ success: true, module });
  } catch (error) {
    next(error);
  }
};

export const updateModule = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await assertModuleOwnership(req.params.id, req.user!);

    const module = await prisma.module.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, module });
  } catch (error) {
    next(error);
  }
};

export const deleteModule = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await assertModuleOwnership(req.params.id, req.user!);

    await prisma.module.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Module deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const reorderModules = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, moduleIds } = req.body;
    if (!courseId || !Array.isArray(moduleIds)) {
      throw new AppError('Course ID and array of module IDs are required.', 400);
    }
    await assertCourseOwnership(courseId, req.user!);

    await prisma.$transaction(
      moduleIds.map((id: string, index: number) =>
        prisma.module.update({
          where: { id },
          data: { order: index + 1 },
        })
      )
    );

    res.json({ success: true, message: 'Modules reordered successfully.' });
  } catch (error) {
    next(error);
  }
};
