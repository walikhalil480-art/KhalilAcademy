import { Request, Response, NextFunction } from 'express';
import * as courseService from '../services/course.service';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../config/database';
import { assertCourseOwnership } from '../utils/authorization';
import { CourseStatus } from '@prisma/client';

export const listCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    const filters = {
      search: req.query.search as string,
      category: req.query.category as string,
      level: req.query.level as any,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      sortBy: req.query.sortBy as any,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 12,
    };

    const result = await courseService.getCourses(filters, true, userId);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    const course = await courseService.getCourseBySlug(req.params.slug, userId);
    res.json({ success: true, course });
  } catch (error) {
    next(error);
  }
};

export const getInstructorCourses = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const filterInstructorId = req.query.instructorId as string;
    const courses = await courseService.getInstructorCourses(req.user!.id, req.user!.role, filterInstructorId);
    res.json({ success: true, courses });
  } catch (error) {
    next(error);
  }
};

export const createCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Only Admin can assign a course to another instructor; Instructors always own courses they create
    let assignedInstructorId = req.user!.id;
    if ((req.user!.role === 'ADMIN' || req.user!.role === 'SUPER_ADMIN') && req.body.instructorId) {
      assignedInstructorId = req.body.instructorId;
    }

    const course = await courseService.createCourse(assignedInstructorId, req.body);
    res.status(201).json({ success: true, message: 'Course created successfully.', course });
  } catch (error) {
    next(error);
  }
};

export const updateCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await assertCourseOwnership(req.params.id, req.user!);

    const updateData = { ...req.body };
    // Only Admin can reassign ownership
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
      delete updateData.instructorId;
    }

    const course = await courseService.updateCourse(req.params.id, updateData);
    res.json({ success: true, message: 'Course updated successfully.', course });
  } catch (error) {
    next(error);
  }
};

export const publishCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await assertCourseOwnership(req.params.id, req.user!);
    const course = await courseService.setCoursePublishStatus(req.params.id, CourseStatus.PUBLISHED);
    res.json({ success: true, message: 'Course published successfully.', course });
  } catch (error) {
    next(error);
  }
};

export const unpublishCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await assertCourseOwnership(req.params.id, req.user!);
    const course = await courseService.setCoursePublishStatus(req.params.id, CourseStatus.DRAFT);
    res.json({ success: true, message: 'Course unpublished successfully.', course });
  } catch (error) {
    next(error);
  }
};

export const deleteCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await assertCourseOwnership(req.params.id, req.user!);

    await courseService.deleteCourseCascade(req.params.id);

    res.json({ success: true, message: 'Course deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
