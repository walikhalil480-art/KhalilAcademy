import { prisma } from '../config/database';
import { CourseStatus, Level, ContentType } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';

export interface CourseQueryFilters {
  search?: string;
  category?: string;
  level?: Level;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  sortBy?: 'newest' | 'popularity' | 'priceAsc' | 'priceDesc';
  page?: number;
  limit?: number;
  status?: CourseStatus;
}

export const getCourses = async (filters: CourseQueryFilters, isPublic = true, userId?: string) => {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 12));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (isPublic) {
    where.status = CourseStatus.PUBLISHED;
  } else if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.category) {
    where.category = {
      OR: [
        { id: filters.category },
        { slug: filters.category },
      ],
    };
  }

  if (filters.level) {
    where.level = filters.level;
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {};
    if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
    if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
  }

  let orderBy: any = { createdAt: 'desc' };
  if (filters.sortBy === 'popularity') {
    orderBy = { enrollments: { _count: 'desc' } };
  } else if (filters.sortBy === 'priceAsc') {
    orderBy = { price: 'asc' };
  } else if (filters.sortBy === 'priceDesc') {
    orderBy = { price: 'desc' };
  }

  let enrolledCourseIds = new Set<string>();
  if (userId) {
    const userEnrollments = await prisma.enrollment.findMany({
      where: { userId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      select: { courseId: true },
    });
    enrolledCourseIds = new Set(userEnrollments.map((e) => e.courseId));
  }

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        instructor: { select: { id: true, name: true, avatar: true, bio: true } },
        category: { select: { id: true, name: true, slug: true, icon: true } },
        _count: {
          select: {
            enrollments: { where: { status: { in: ['ACTIVE', 'COMPLETED'] } } },
            reviews: true,
            modules: true,
          },
        },
        reviews: { select: { rating: true } },
        modules: {
          select: {
            lessons: {
              where: { isPublished: true },
              select: { durationMinutes: true },
            },
          },
        },
      },
    }),
    prisma.course.count({ where }),
  ]);

  const formatted = courses.map((course) => {
    const totalReviews = course.reviews.length;
    const avgRating = totalReviews > 0
      ? parseFloat((course.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
      : 0;

    const allPublishedLessons = course.modules.flatMap((m) => m.lessons);
    const totalDurationMinutes = allPublishedLessons.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
    const lessonCount = allPublishedLessons.length;
    const activeEnrollmentCount = course._count.enrollments;

    return {
      ...course,
      reviews: undefined,
      modules: undefined,
      isEnrolled: enrolledCourseIds.has(course.id),
      averageRating: avgRating,
      ratingCount: totalReviews,
      reviewCount: totalReviews,
      enrollmentCount: activeEnrollmentCount,
      studentCount: activeEnrollmentCount,
      moduleCount: course._count.modules,
      lessonCount,
      totalDurationMinutes,
      durationHours: totalDurationMinutes > 0 ? parseFloat((totalDurationMinutes / 60).toFixed(1)) : 0,
    };
  });

  return {
    courses: formatted,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getCourseBySlug = async (slug: string, userId?: string, userRole?: string) => {
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      instructor: {
        select: {
          id: true,
          name: true,
          avatar: true,
          bio: true,
          role: true,
        },
      },
      category: { select: { id: true, name: true, slug: true, icon: true } },
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              contentType: true,
              videoSource: true,
              youtubeVideoId: true,
              videoUrl: true,
              storageKey: true,
              fileName: true,
              fileSize: true,
              mimeType: true,
              textContent: true,
              notes: true,
              transcript: true,
              resourceUrl: true,
              durationMinutes: true,
              order: true,
              isPreview: true,
              isRequired: true,
              isPublished: true,
              resources: true,
            },
          },
          quizzes: { select: { id: true, title: true, timeLimitMinutes: true, passingScore: true, isRequired: true, isFinalAssessment: true } },
          assignments: { select: { id: true, title: true, maxScore: true, passingScore: true, isRequired: true } },
        },
      },
    },
  });

  if (!course) {
    throw new AppError('Course not found.', 404);
  }

  // 1. Is Enrolled & Access check
  let isEnrolled = false;
  if (userId) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    });
    isEnrolled = !!(enrollment && (enrollment.status === 'ACTIVE' || enrollment.status === 'COMPLETED'));
  }

  const isPrivileged = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || (userRole === 'INSTRUCTOR' && course.instructorId === userId);
  const hasFullAccess = isEnrolled || isPrivileged;

  // 2. Real Student Count
  const studentCount = await prisma.enrollment.count({
    where: { courseId: course.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
  });

  // 3. Real Review Count & Rating Average
  const reviewAgg = await prisma.review.aggregate({
    where: { courseId: course.id },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const reviewCount = reviewAgg._count._all || 0;
  const averageRating = reviewCount > 0 ? parseFloat((reviewAgg._avg.rating || 0).toFixed(1)) : 0;

  // 4. Calculate total lessons and total duration
  const allPublishedLessons = course.modules.flatMap((m) => m.lessons.filter((l) => l.isPublished));
  const lessonCount = allPublishedLessons.length;
  const totalDurationMinutes = allPublishedLessons.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
  const firstLessonId = allPublishedLessons.length > 0 ? allPublishedLessons[0].id : null;

  // 5. Calculate Instructor Metrics across all instructor courses
  const [instructorCourseCount, instructorStudentCount, instructorReviewAgg] = await Promise.all([
    prisma.course.count({
      where: { instructorId: course.instructorId, status: 'PUBLISHED' },
    }),
    prisma.enrollment.count({
      where: { course: { instructorId: course.instructorId }, status: { in: ['ACTIVE', 'COMPLETED'] } },
    }),
    prisma.review.aggregate({
      where: { course: { instructorId: course.instructorId } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const instructorReviewCount = instructorReviewAgg._count._all || 0;
  const instructorAverageRating = instructorReviewCount > 0 ? parseFloat((instructorReviewAgg._avg.rating || 0).toFixed(1)) : 0;

  // 6. Format modules with strict access control: ONLY the first published lesson is previewable for unenrolled students
  const formattedModules = course.modules.map((m) => {
    const moduleLessons = m.lessons.filter((l) => l.isPublished).map((l) => {
      const isFirstLesson = l.id === firstLessonId;
      const canAccessLesson = hasFullAccess || isFirstLesson;

      if (canAccessLesson) {
        return {
          ...l,
          isLocked: false,
          isPreview: isFirstLesson,
        };
      }

      // Redact video URLs, storage keys, notes, and resources for locked lessons
      return {
        id: l.id,
        title: l.title,
        description: l.description,
        contentType: l.contentType,
        videoSource: l.videoSource,
        durationMinutes: l.durationMinutes,
        order: l.order,
        isRequired: l.isRequired,
        isPublished: l.isPublished,
        isPreview: false,
        isLocked: true,
        youtubeVideoId: null,
        videoUrl: null,
        storageKey: null,
        fileName: null,
        fileSize: null,
        mimeType: null,
        textContent: null,
        notes: null,
        transcript: null,
        resourceUrl: null,
        resources: [],
      };
    });

    const moduleDuration = moduleLessons.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
    return {
      ...m,
      lessons: moduleLessons,
      lessonCount: moduleLessons.length,
      durationMinutes: moduleDuration,
    };
  });

  return {
    ...course,
    modules: formattedModules,
    isEnrolled,
    stats: {
      lessonCount,
      totalDurationMinutes,
      studentCount,
      averageRating,
      reviewCount,
    },
    instructor: {
      ...course.instructor,
      courseCount: instructorCourseCount,
      studentCount: instructorStudentCount,
      averageRating: instructorAverageRating,
    },
    // Backwards compatibility top-level properties
    averageRating,
    reviewCount,
    enrollmentCount: studentCount,
    studentCount,
    lessonCount,
    totalDurationMinutes,
  };
};

export const createCourse = async (instructorId: string, data: any) => {
  const trimmedTitle = (data.title || '').trim();
  if (!trimmedTitle) {
    throw new AppError('Course title is required.', 400);
  }

  // Enforce single course upload: check if instructor already uploaded a course with this title
  const existingCourse = await prisma.course.findFirst({
    where: {
      instructorId,
      title: { equals: trimmedTitle, mode: 'insensitive' },
    },
  });

  if (existingCourse) {
    throw new AppError(
      `A course titled "${trimmedTitle}" already exists in your account. Each course can only be uploaded once. Please update the existing course.`,
      409
    );
  }

  const baseSlug = trimmedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const existingSlug = await prisma.course.findFirst({ where: { slug: baseSlug } });
  const slug = existingSlug ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

  let targetCategoryId = data.categoryId;
  if (!targetCategoryId) {
    const firstCat = await prisma.category.findFirst();
    if (firstCat) {
      targetCategoryId = firstCat.id;
    } else {
      const newCat = await prisma.category.create({
        data: { name: 'General', slug: 'general' },
      });
      targetCategoryId = newCat.id;
    }
  }

  return prisma.course.create({
    data: {
      title: trimmedTitle,
      slug,
      description: data.description || '',
      thumbnail: data.thumbnail,
      instructorId,
      categoryId: targetCategoryId,
      level: data.level || 'BEGINNER',
      price: data.price !== undefined ? parseFloat(data.price) : 0,
      discountPrice: data.discountPrice ? parseFloat(data.discountPrice) : null,
      durationHours: data.durationHours ? parseFloat(data.durationHours) : 0,
      learningObjectives: Array.isArray(data.learningObjectives) ? data.learningObjectives : [],
      requirements: Array.isArray(data.requirements) ? data.requirements : [],
      targetAudience: Array.isArray(data.targetAudience) ? data.targetAudience : [],
      status: data.status || CourseStatus.DRAFT,
      certificateEnabled: data.certificateEnabled !== undefined ? !!data.certificateEnabled : true,
      requireAllLessons: data.requireAllLessons !== undefined ? !!data.requireAllLessons : true,
      requireQuizzes: data.requireQuizzes !== undefined ? !!data.requireQuizzes : false,
      quizPassingScore: data.quizPassingScore !== undefined ? parseFloat(data.quizPassingScore) : 70.0,
      requireAssignments: data.requireAssignments !== undefined ? !!data.requireAssignments : false,
      assignmentPassingScore: data.assignmentPassingScore !== undefined ? parseFloat(data.assignmentPassingScore) : 70.0,
      requireFinalAssessment: data.requireFinalAssessment !== undefined ? !!data.requireFinalAssessment : false,
      finalAssessmentPassingScore: data.finalAssessmentPassingScore !== undefined ? parseFloat(data.finalAssessmentPassingScore) : 70.0,
      finalAssessmentQuizId: data.finalAssessmentQuizId || null,
      minimumProgressPercentage: data.minimumProgressPercentage !== undefined ? parseFloat(data.minimumProgressPercentage) : 100.0,
    },
  });
};

export const getInstructorCourses = async (userId: string, userRole: string, filterInstructorId?: string) => {
  const where: any = {};
  if (userRole === 'INSTRUCTOR') {
    where.instructorId = userId;
  } else if (filterInstructorId) {
    where.instructorId = filterInstructorId;
  }

  const courses = await prisma.course.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      instructor: { select: { id: true, name: true, email: true, avatar: true } },
      _count: { select: { enrollments: true, modules: true, quizzes: true, assignments: true } },
    },
  });

  return courses;
};

export const updateCourse = async (courseId: string, data: any) => {
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) updateData.description = data.description.trim();
  if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.level !== undefined) updateData.level = data.level;
  if (data.isFree !== undefined) updateData.isFree = !!data.isFree;
  if (data.price !== undefined) updateData.price = parseFloat(data.price) || 0;
  if (data.discountPrice !== undefined) updateData.discountPrice = data.discountPrice ? parseFloat(data.discountPrice) : null;
  if (data.durationHours !== undefined) updateData.durationHours = parseFloat(data.durationHours) || 0;
  if (data.learningObjectives !== undefined) updateData.learningObjectives = Array.isArray(data.learningObjectives) ? data.learningObjectives : [];
  if (data.requirements !== undefined) updateData.requirements = Array.isArray(data.requirements) ? data.requirements : [];
  if (data.targetAudience !== undefined) updateData.targetAudience = Array.isArray(data.targetAudience) ? data.targetAudience : [];
  if (data.status !== undefined) updateData.status = data.status;
  if (data.certificateEnabled !== undefined) updateData.certificateEnabled = !!data.certificateEnabled;
  if (data.requireAllLessons !== undefined) updateData.requireAllLessons = !!data.requireAllLessons;
  if (data.requireQuizzes !== undefined) updateData.requireQuizzes = !!data.requireQuizzes;
  if (data.quizPassingScore !== undefined) updateData.quizPassingScore = parseFloat(data.quizPassingScore) || 70.0;
  if (data.requireAssignments !== undefined) updateData.requireAssignments = !!data.requireAssignments;
  if (data.assignmentPassingScore !== undefined) updateData.assignmentPassingScore = parseFloat(data.assignmentPassingScore) || 70.0;
  if (data.requireFinalAssessment !== undefined) updateData.requireFinalAssessment = !!data.requireFinalAssessment;
  if (data.finalAssessmentPassingScore !== undefined) updateData.finalAssessmentPassingScore = parseFloat(data.finalAssessmentPassingScore) || 70.0;
  if (data.finalAssessmentQuizId !== undefined) updateData.finalAssessmentQuizId = data.finalAssessmentQuizId || null;
  if (data.minimumProgressPercentage !== undefined) updateData.minimumProgressPercentage = parseFloat(data.minimumProgressPercentage) || 100.0;

  return prisma.course.update({
    where: { id: courseId },
    data: updateData,
  });
};

export const setCoursePublishStatus = async (courseId: string, status: CourseStatus) => {
  if (status === CourseStatus.PUBLISHED) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });

    if (!course) {
      throw new AppError('Course not found.', 404);
    }

    if (!course.title || course.title.trim().length === 0) {
      throw new AppError('Course title is required before publishing.', 400);
    }

    if (!course.description || course.description.trim().length === 0) {
      throw new AppError('Course description is required before publishing.', 400);
    }

    if (!course.modules || course.modules.length === 0) {
      throw new AppError('A course must contain at least one module before it can be published.', 400);
    }

    const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    if (totalLessons === 0) {
      throw new AppError('A course must contain at least one lesson before it can be published.', 400);
    }
  }

  return prisma.course.update({
    where: { id: courseId },
    data: { status },
  });
};

export const deleteCourseCascade = async (courseId: string) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Payments referencing orders for this course
    await tx.payment.deleteMany({
      where: { order: { courseId } },
    });

    // 2. Orders for this course
    await tx.order.deleteMany({
      where: { courseId },
    });

    // 3. Certificates for this course
    await tx.certificate.deleteMany({
      where: { courseId },
    });

    // 4. Reviews for this course
    await tx.review.deleteMany({
      where: { courseId },
    });

    // 5. Enrollments for this course
    await tx.enrollment.deleteMany({
      where: { courseId },
    });

    // 6. Quiz answers & attempts for quizzes in this course
    await tx.quizAnswer.deleteMany({
      where: { attempt: { quiz: { courseId } } },
    });
    await tx.quizAttempt.deleteMany({
      where: { quiz: { courseId } },
    });
    await tx.quizOption.deleteMany({
      where: { question: { quiz: { courseId } } },
    });
    await tx.quizQuestion.deleteMany({
      where: { quiz: { courseId } },
    });
    await tx.quiz.deleteMany({
      where: { courseId },
    });

    // 7. Assignment submissions & assignments in this course
    await tx.assignmentSubmission.deleteMany({
      where: { assignment: { courseId } },
    });
    await tx.assignment.deleteMany({
      where: { courseId },
    });

    // 8. Lesson resources & lesson progress for lessons in this course
    await tx.lessonResource.deleteMany({
      where: { lesson: { module: { courseId } } },
    });
    await tx.lessonProgress.deleteMany({
      where: { lesson: { module: { courseId } } },
    });

    // 9. Lessons in this course
    await tx.lesson.deleteMany({
      where: { module: { courseId } },
    });

    // 10. Modules in this course
    await tx.module.deleteMany({
      where: { courseId },
    });

    // 11. Delete the course
    return await tx.course.delete({
      where: { id: courseId },
    });
  });
};

