import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Star, Trash2, Edit3, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { RootState } from '../../store';
import { api } from '../../services/api';

export interface ReviewItem {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface CourseReviewsProps {
  courseId: string;
  isEnrolled: boolean;
  onReviewUpdated?: () => void;
}

export const CourseReviews: React.FC<CourseReviewsProps> = ({ courseId, isEnrolled, onReviewUpdated }) => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState<Record<string, number>>({
    '5': 0,
    '4': 0,
    '3': 0,
    '2': 0,
    '1': 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New / Edit Review Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Edit Mode state
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [courseId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/courses/${courseId}/reviews`);
      if (res.data.success) {
        setReviews(res.data.reviews || []);
        setAverageRating(res.data.averageRating || 0);
        setTotalReviews(res.data.totalReviews || 0);
        if (res.data.ratingDistribution) {
          setRatingDistribution(res.data.ratingDistribution);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load course reviews.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setSubmitError('Please enter a review comment.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(null);

      const res = await api.post(`/courses/${courseId}/reviews`, {
        rating,
        comment,
      });

      if (res.data.success) {
        setSubmitSuccess('Review submitted successfully!');
        setComment('');
        setRating(5);
        fetchReviews();
        if (onReviewUpdated) onReviewUpdated();
      }
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (rev: ReviewItem) => {
    setEditingReviewId(rev.id);
    setEditRating(rev.rating);
    setEditComment(rev.comment);
  };

  const handleSaveEdit = async (reviewId: string) => {
    try {
      const res = await api.put(`/reviews/${reviewId}`, {
        rating: editRating,
        comment: editComment,
      });
      if (res.data.success) {
        setEditingReviewId(null);
        fetchReviews();
        if (onReviewUpdated) onReviewUpdated();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update review.');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      const res = await api.delete(`/reviews/${reviewId}`);
      if (res.data.success) {
        fetchReviews();
        if (onReviewUpdated) onReviewUpdated();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete review.');
    }
  };

  // Check if current user has already submitted a review
  const userExistingReview = user ? reviews.find((r) => r.user.id === user.id) : undefined;

  return (
    <div className="space-y-6">
      {/* 1. Rating Summary Breakdown */}
      <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl p-6 sm:p-7 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Left Score */}
        <div className="flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-slate-100 dark:border-[#1E3A56] pb-6 md:pb-0 md:pr-6 space-y-2">
          <span className="text-4xl sm:text-5xl font-extrabold text-[#0B1F3A] dark:text-white font-mono">
            {averageRating > 0 ? averageRating.toFixed(1) : '5.0'}
          </span>
          <div className="flex text-amber-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${star <= Math.round(averageRating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Course Rating • {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
          </span>
        </div>

        {/* Right Star Distribution Progress Bars */}
        <div className="md:col-span-2 space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = ratingDistribution[stars.toString()] || 0;
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : (stars === 5 ? 100 : 0);
            return (
              <div key={stars} className="flex items-center space-x-3">
                <span className="w-12 text-slate-500 dark:text-slate-400 font-bold">{stars} stars</span>
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                </div>
                <span className="w-8 text-right text-slate-400 dark:text-slate-500 font-mono">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Write Review Form for Enrolled Students */}
      {isAuthenticated && isEnrolled && !userExistingReview && (
        <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-[#087F78] dark:text-[#14B8A6]" />
            <span>Write a Course Review</span>
          </h3>

          {submitSuccess && (
            <div className="p-3 bg-teal-50 dark:bg-[#087F78]/20 border border-teal-200 dark:border-teal-800 text-[#087F78] dark:text-[#14B8A6] rounded-xl text-xs flex items-center space-x-2 font-bold">
              <CheckCircle2 className="h-4 w-4 text-[#087F78] dark:text-[#14B8A6]" />
              <span>{submitSuccess}</span>
            </div>
          )}

          {submitError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-[#EF4444] rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-[#EF4444]" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Your Rating</label>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 focus:outline-none transition"
                  >
                    <Star
                      className={`h-6 w-6 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700 hover:text-amber-400/70'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Your Feedback</label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience taking this course, what you learned, and how it helped you..."
                className="w-full p-3 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-[#0B223D] focus:outline-none focus:border-[#087F78] transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold rounded-xl text-xs shadow-xs transition disabled:opacity-50"
            >
              {submitting ? 'Submitting Review...' : 'Submit Course Review'}
            </button>
          </form>
        </div>
      )}

      {/* 3. Reviews List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white">
          Student Reviews {totalReviews > 0 && `(${totalReviews})`}
        </h3>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div key={n} className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-xl p-6 animate-pulse space-y-3 shadow-xs">
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/4"></div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-[#EF4444] text-xs rounded-xl">{error}</div>
        ) : reviews.length === 0 ? (
          <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl p-8 text-center text-slate-500 dark:text-slate-400 space-y-2 shadow-xs">
            <p className="text-sm font-bold text-[#0B1F3A] dark:text-white">No reviews yet.</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEnrolled
                ? 'You are enrolled in this course! Be the first student to share your review above.'
                : 'Enroll in this course to leave your review and feedback.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev) => {
              const isOwner = user && user.id === rev.user.id;
              const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');
              const canModify = isOwner || isAdmin;
              const isEditing = editingReviewId === rev.id;

              return (
                <div key={rev.id} className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-xl p-5 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {rev.user.avatar ? (
                        <img src={rev.user.avatar} alt={rev.user.name} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-teal-50 dark:bg-[#087F78]/30 border border-[#087F78]/20 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] font-bold flex items-center justify-center text-xs">
                          {rev.user.name ? rev.user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <div>
                        <h5 className="text-xs font-bold text-[#0B1F3A] dark:text-white">{rev.user.name}</h5>
                        <div className="flex items-center gap-2">
                          <div className="flex text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            {new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {canModify && !isEditing && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleStartEdit(rev)}
                          className="p-1 text-slate-400 hover:text-[#087F78] dark:hover:text-[#14B8A6] transition"
                          title="Edit Review"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteReview(rev.id)}
                          className="p-1 text-slate-400 hover:text-[#EF4444] transition"
                          title="Delete Review"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setEditRating(star)}
                            className="p-1 focus:outline-none"
                          >
                            <Star
                              className={`h-5 w-5 ${star <= editRating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        rows={2}
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-[#0B1F3A] dark:text-white focus:outline-none"
                      />
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleSaveEdit(rev.id)}
                          className="px-3.5 py-1.5 bg-[#087F78] hover:bg-[#076E6A] text-white text-xs font-bold rounded-lg"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingReviewId(null)}
                          className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {rev.comment}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
