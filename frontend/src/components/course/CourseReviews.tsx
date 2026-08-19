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
    <div className="space-y-8">
      {/* 1. Rating Summary Breakdown */}
      <div className="bg-[#132742] border border-[#23426A] rounded-2xl p-6 sm:p-8 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        {/* Left Score */}
        <div className="flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-[#23426A] pb-6 md:pb-0 md:pr-6 space-y-2">
          <span className="text-5xl font-black text-[#F8FAFC]">{averageRating > 0 ? averageRating.toFixed(1) : '0.0'}</span>
          <div className="flex text-[#F59E0B]">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${star <= Math.round(averageRating) ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-[#23426A]'}`}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-[#94A3B8]">
            Course Rating • {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
          </span>
        </div>

        {/* Right Star Distribution Progress Bars */}
        <div className="md:col-span-2 space-y-2 text-xs font-semibold text-[#CBD5E1]">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = ratingDistribution[stars.toString()] || 0;
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <div key={stars} className="flex items-center space-x-3">
                <span className="w-12 text-[#94A3B8] font-bold">{stars} stars</span>
                <div className="flex-1 h-2 bg-[#0A1322] rounded-full overflow-hidden border border-[#23426A]">
                  <div className="h-full bg-[#F59E0B] rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                </div>
                <span className="w-8 text-right text-[#94A3B8] font-mono">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Write Review Form for Enrolled Students */}
      {isAuthenticated && isEnrolled && !userExistingReview && (
        <div className="bg-[#132742] border border-[#23426A] rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-[#F8FAFC] flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-[#4FD1C5]" />
            <span>Write a Course Review</span>
          </h3>

          {submitSuccess && (
            <div className="p-3 bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
              <span>{submitSuccess}</span>
            </div>
          )}

          {submitError && (
            <div className="p-3 bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-[#EF4444]" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#CBD5E1] uppercase mb-1">Your Rating</label>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 focus:outline-none transition"
                  >
                    <Star
                      className={`h-6 w-6 ${star <= rating ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-[#23426A] hover:text-[#F59E0B]/70'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#CBD5E1] uppercase mb-1">Your Feedback</label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience taking this course..."
                className="w-full p-3 bg-[#0E1D33] border border-[#23426A] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:bg-[#0A1322] focus:outline-none focus:border-[#4FD1C5]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>
      )}

      {/* 3. Reviews List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[#F8FAFC]">Student Reviews ({totalReviews})</h3>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div key={n} className="bg-[#132742] border border-[#23426A] rounded-xl p-6 animate-pulse space-y-3">
                <div className="h-4 bg-[#0E1D33] rounded w-1/4"></div>
                <div className="h-3 bg-[#0E1D33] rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs rounded-xl">{error}</div>
        ) : reviews.length === 0 ? (
          <div className="bg-[#132742] border border-[#23426A] rounded-2xl p-10 text-center text-[#94A3B8] space-y-2">
            <p className="text-base font-bold text-[#F8FAFC]">No reviews yet.</p>
            <p className="text-xs text-[#94A3B8]">Be the first student to review this course.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => {
              const isOwner = user && user.id === rev.user.id;
              const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');
              const canModify = isOwner || isAdmin;
              const isEditing = editingReviewId === rev.id;

              return (
                <div key={rev.id} className="bg-[#132742] border border-[#23426A] rounded-xl p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {rev.user.avatar ? (
                        <img src={rev.user.avatar} alt={rev.user.name} className="w-9 h-9 rounded-full object-cover border border-[#23426A]" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#1A365D] border border-[#4FD1C5]/40 text-[#4FD1C5] font-bold flex items-center justify-center text-xs">
                          {rev.user.name ? rev.user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <div>
                        <h5 className="text-xs font-bold text-[#F8FAFC]">{rev.user.name}</h5>
                        <p className="text-[10px] text-[#94A3B8]">
                          {new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {canModify && !isEditing && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleStartEdit(rev)}
                          className="p-1 text-[#94A3B8] hover:text-[#4FD1C5] transition"
                          title="Edit Review"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteReview(rev.id)}
                          className="p-1 text-[#94A3B8] hover:text-[#EF4444] transition"
                          title="Delete Review"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Rating Stars */}
                  {isEditing ? (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button type="button" key={star} onClick={() => setEditRating(star)}>
                            <Star className={`h-5 w-5 ${star <= editRating ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-[#23426A]'}`} />
                          </button>
                        ))}
                      </div>
                      <textarea
                        rows={2}
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        className="w-full p-2 bg-[#0E1D33] border border-[#23426A] rounded-lg text-xs text-[#F8FAFC]"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSaveEdit(rev.id)}
                          className="px-3 py-1.5 bg-[#4FD1C5] text-[#0A1322] font-bold text-xs rounded-lg hover:bg-[#38B2AC]"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingReviewId(null)}
                          className="px-3 py-1.5 bg-[#0E1D33] text-[#CBD5E1] border border-[#23426A] font-bold text-xs rounded-lg hover:bg-[#1A365D]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex text-[#F59E0B]">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${star <= rev.rating ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-[#23426A]'}`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-[#CBD5E1] leading-relaxed">{rev.comment}</p>
                    </>
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
