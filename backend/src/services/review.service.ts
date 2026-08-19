import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';

export interface GetReviewsFilters {
  page?: number;
  limit?: number;
}

export const getCourseReviews = async (courseIdOrSlug: string, filters: GetReviewsFilters = {}) => {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 10));
  const skip = (page - 1) * limit;

  // Resolve courseId if slug is passed
  let courseId = courseIdOrSlug;
  const course = await prisma.course.findFirst({
    where: {
      OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }],
    },
    select: { id: true },
  });

  if (course) {
    courseId = course.id;
  }

  // 1. Fetch paginated reviews
  const [reviews, totalReviews] = await Promise.all([
    prisma.review.findMany({
      where: { courseId, isModerated: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    }),
    prisma.review.count({ where: { courseId, isModerated: true } }),
  ]);

  // 2. Aggregate average rating
  const avgAgg = await prisma.review.aggregate({
    where: { courseId, isModerated: true },
    _avg: { rating: true },
  });

  const averageRating = totalReviews > 0 ? parseFloat((avgAgg._avg.rating || 0).toFixed(1)) : 0;

  // 3. Aggregate rating distribution
  const groupRatings = await prisma.review.groupBy({
    by: ['rating'],
    where: { courseId, isModerated: true },
    _count: { rating: true },
  });

  const ratingDistribution: Record<string, number> = {
    '5': 0,
    '4': 0,
    '3': 0,
    '2': 0,
    '1': 0,
  };

  groupRatings.forEach((g) => {
    const key = g.rating.toString();
    if (ratingDistribution[key] !== undefined) {
      ratingDistribution[key] = g._count.rating;
    }
  });

  return {
    reviews,
    averageRating,
    totalReviews,
    ratingDistribution,
    pagination: {
      total: totalReviews,
      page,
      limit,
      totalPages: Math.ceil(totalReviews / limit),
    },
  };
};

export const createCourseReview = async (userId: string, courseId: string, rating: number, comment: string) => {
  // Validate course exists
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    throw new AppError('Course not found.', 404);
  }

  // Check user enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (!enrollment || (enrollment.status !== 'ACTIVE' && enrollment.status !== 'COMPLETED')) {
    throw new AppError('You must be enrolled in this course to submit a review.', 403);
  }

  // Validate rating
  const parsedRating = Math.floor(Number(rating));
  if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    throw new AppError('Rating must be an integer between 1 and 5.', 400);
  }

  // Validate comment length
  const cleanComment = (comment || '').trim();
  if (!cleanComment || cleanComment.length < 3) {
    throw new AppError('Review comment must be at least 3 characters long.', 400);
  }

  // Upsert review (one review per user per course)
  const review = await prisma.review.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: {
      rating: parsedRating,
      comment: cleanComment,
      isModerated: true,
    },
    create: {
      userId,
      courseId,
      rating: parsedRating,
      comment: cleanComment,
      isModerated: true,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
  });

  return review;
};

export const updateReview = async (userId: string, userRole: string, reviewId: string, rating: number, comment: string) => {
  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing) {
    throw new AppError('Review not found.', 404);
  }

  if (existing.userId !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    throw new AppError('You are not authorized to update this review.', 403);
  }

  const parsedRating = Math.floor(Number(rating));
  if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    throw new AppError('Rating must be between 1 and 5.', 400);
  }

  const cleanComment = (comment || '').trim();
  if (!cleanComment || cleanComment.length < 3) {
    throw new AppError('Review comment must be at least 3 characters long.', 400);
  }

  return prisma.review.update({
    where: { id: reviewId },
    data: {
      rating: parsedRating,
      comment: cleanComment,
    },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
  });
};

export const deleteReview = async (userId: string, userRole: string, reviewId: string) => {
  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing) {
    throw new AppError('Review not found.', 404);
  }

  if (existing.userId !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    throw new AppError('You are not authorized to delete this review.', 403);
  }

  await prisma.review.delete({ where: { id: reviewId } });
  return { success: true, message: 'Review deleted successfully.' };
};
