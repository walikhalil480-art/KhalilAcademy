import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { verifyLessonAccessPermission } from '../services/enrollment.service';
import { assertModuleOwnership, assertLessonOwnership } from '../utils/authorization';
import { extractVideoDurationMinutes } from '../utils/videoDuration';
import path from 'path';

export const getLesson = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const lessonId = req.params.id;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Enforce access control: Paid courses require enrollment unless isPreview = true
    await verifyLessonAccessPermission(userId, userRole, lessonId);

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
        resources: true,
      },
    });

    if (!lesson) throw new AppError('Lesson not found.', 404);

    let progress = null;
    if (userId) {
      progress = await prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId: lesson.id } },
      });
    }

    res.json({
      success: true,
      lesson: {
        ...lesson,
        progress,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createLesson = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { moduleId } = req.body;
    await assertModuleOwnership(moduleId, req.user!);

    const data = { ...req.body };
    if ((!data.durationMinutes || data.durationMinutes <= 0) && data.videoUrl && data.videoUrl.includes('/videos/')) {
      const filename = path.basename(data.videoUrl);
      const absPath = path.resolve(process.cwd(), './uploads/videos', filename);
      const dur = extractVideoDurationMinutes(absPath);
      if (dur) data.durationMinutes = dur;
    }

    const lesson = await prisma.lesson.create({
      data,
    });
    res.status(201).json({ success: true, lesson });
  } catch (error) {
    next(error);
  }
};

export const updateLesson = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await assertLessonOwnership(req.params.id, req.user!);

    const data = { ...req.body };
    if ((!data.durationMinutes || data.durationMinutes <= 0) && data.videoUrl && data.videoUrl.includes('/videos/')) {
      const filename = path.basename(data.videoUrl);
      const absPath = path.resolve(process.cwd(), './uploads/videos', filename);
      const dur = extractVideoDurationMinutes(absPath);
      if (dur) data.durationMinutes = dur;
    }

    const lesson = await prisma.lesson.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, lesson });
  } catch (error) {
    next(error);
  }
};

export const addLessonResource = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const lessonId = req.params.id;
    await assertLessonOwnership(lessonId, req.user!);

    const { title, fileUrl, fileName, fileSize, mimeType } = req.body;
    if (!title || !fileUrl) {
      throw new AppError('Resource title and file URL are required.', 400);
    }

    const resource = await prisma.lessonResource.create({
      data: {
        lessonId,
        title: title.trim(),
        fileUrl: fileUrl.trim(),
        fileName: fileName ? fileName.trim() : undefined,
        fileSize: fileSize ? parseInt(fileSize) : undefined,
        mimeType: mimeType ? mimeType.trim() : undefined,
      },
    });

    res.status(201).json({ success: true, resource });
  } catch (error) {
    next(error);
  }
};

export const deleteLessonResource = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const resourceId = req.params.resourceId;
    const resource = await prisma.lessonResource.findUnique({
      where: { id: resourceId },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!resource) {
      throw new AppError('Lesson resource not found.', 404);
    }

    // Check ownership
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
      if (resource.lesson.module.course.instructorId !== req.user!.id) {
        throw new AppError('You do not have permission to delete this resource.', 403);
      }
    }

    await prisma.lessonResource.delete({
      where: { id: resourceId },
    });

    res.json({ success: true, message: 'Resource deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const deleteLesson = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await assertLessonOwnership(req.params.id, req.user!);

    await prisma.lesson.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Lesson deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const reorderLessons = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { moduleId, lessonIds } = req.body;
    if (!moduleId || !Array.isArray(lessonIds)) {
      throw new AppError('Module ID and array of lesson IDs are required.', 400);
    }
    await assertModuleOwnership(moduleId, req.user!);

    await prisma.$transaction(
      lessonIds.map((id: string, index: number) =>
        prisma.lesson.update({
          where: { id },
          data: { order: index + 1 },
        })
      )
    );

    res.json({ success: true, message: 'Lessons reordered successfully.' });
  } catch (error) {
    next(error);
  }
};
