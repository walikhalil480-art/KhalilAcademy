import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';

export interface AuthUser {
  id: string;
  role: string;
}

/**
 * Asserts that the authenticated user owns the course or is an Admin/SuperAdmin.
 * Returns the course record if authorized, otherwise throws AppError 403 or 404.
 */
export const assertCourseOwnership = async (courseId: string, user: AuthUser) => {
  if (!courseId) throw new AppError('Course ID is required.', 400);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    throw new AppError('Course not found.', 404);
  }

  // Admin & SuperAdmin can manage any course
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return course;
  }

  // Instructor can only manage courses they own
  if (user.role === 'INSTRUCTOR' && course.instructorId === user.id) {
    return course;
  }

  throw new AppError('You do not have permission to manage this course.', 403);
};

/**
 * Asserts that the authenticated user owns the module's parent course or is an Admin/SuperAdmin.
 * Returns the module record if authorized, otherwise throws AppError 403 or 404.
 */
export const assertModuleOwnership = async (moduleId: string, user: AuthUser) => {
  if (!moduleId) throw new AppError('Module ID is required.', 400);

  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { course: { select: { id: true, instructorId: true } } },
  });

  if (!module) {
    throw new AppError('Module not found.', 404);
  }

  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return module;
  }

  if (user.role === 'INSTRUCTOR' && module.course.instructorId === user.id) {
    return module;
  }

  throw new AppError('You do not have permission to manage this course module.', 403);
};

/**
 * Asserts that the authenticated user owns the lesson's parent course or is an Admin/SuperAdmin.
 * Returns the lesson record if authorized, otherwise throws AppError 403 or 404.
 */
export const assertLessonOwnership = async (lessonId: string, user: AuthUser) => {
  if (!lessonId) throw new AppError('Lesson ID is required.', 400);

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: { select: { id: true, instructorId: true } },
        },
      },
    },
  });

  if (!lesson) {
    throw new AppError('Lesson not found.', 404);
  }

  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return lesson;
  }

  if (user.role === 'INSTRUCTOR' && lesson.module.course.instructorId === user.id) {
    return lesson;
  }

  throw new AppError('You do not have permission to manage this lesson.', 403);
};
