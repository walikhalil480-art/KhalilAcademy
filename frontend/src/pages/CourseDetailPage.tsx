import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { api } from '../services/api';
import { Course, Lesson } from '../types';
import { CheckCircle2, AlertOctagon, Play, Award, Clock, Smartphone, ShieldCheck, ArrowRight } from 'lucide-react';

import { CourseHeader } from '../components/course/CourseHeader';
import { CourseStats, formatDuration } from '../components/course/CourseStats';
import { CourseTabs, CourseTabType } from '../components/course/CourseTabs';
import { CourseAbout } from '../components/course/CourseAbout';
import { CourseCurriculum } from '../components/course/CourseCurriculum';
import { CourseInstructor } from '../components/course/CourseInstructor';
import { CourseReviews } from '../components/course/CourseReviews';
import { resolveMediaUrl, DEFAULT_COURSE_THUMBNAIL } from '../utils/media';

export const CourseDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CourseTabType>('about');

  useEffect(() => {
    fetchCourse();
  }, [slug]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/courses/${slug}`);
      if (res.data.success && res.data.course) {
        setCourse(res.data.course);
      } else {
        setError('Course not found in catalog.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load course details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollClick = async () => {
    if (!course) return;

    if (course.isEnrolled) {
      navigate(`/courses/${course.slug}/learn`);
      return;
    }

    if (course.isFree || course.price === 0) {
      if (!isAuthenticated) {
        navigate(`/login?redirect=${encodeURIComponent(`/courses/${slug}`)}`);
        return;
      }

      try {
        setEnrolling(true);
        let res;
        try {
          res = await api.post(`/courses/${course.id}/enroll`);
        } catch (postErr) {
          res = await api.post(`/payments/courses/${course.id}/enroll`);
        }

        if (res.data.success || res.data.enrollment) {
          setCourse((prev) => (prev ? { ...prev, isEnrolled: true } : null));
          navigate(`/courses/${course.slug}/learn`);
        }
      } catch (err: any) {
        if (err.response?.status === 409 || err.response?.data?.alreadyEnrolled) {
          setCourse((prev) => (prev ? { ...prev, isEnrolled: true } : null));
          navigate(`/courses/${course.slug}/learn`);
        } else {
          alert(err.response?.data?.message || 'Enrollment could not be completed.');
        }
      } finally {
        setEnrolling(false);
      }
    } else {
      if (!isAuthenticated) {
        navigate(`/login?redirect=${encodeURIComponent(`/checkout/${course.id}`)}`);
      } else {
        navigate(`/checkout/${course.id}`);
      }
    }
  };

  const handleSelectPreviewLesson = (lesson: Lesson) => {
    if (course) {
      navigate(`/courses/${course.slug}/learn?lessonId=${lesson.id}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#0A1322] min-h-screen py-10 px-4 sm:px-6 lg:px-8 text-[#F8FAFC]">
        <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
          <div className="h-6 bg-[#0E1D33] rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-10 bg-[#0E1D33] rounded w-3/4"></div>
              <div className="h-4 bg-[#0E1D33] rounded w-1/2"></div>
              <div className="h-24 bg-[#132742] border border-[#23426A] rounded-2xl"></div>
              <div className="h-16 bg-[#132742] border border-[#23426A] rounded-2xl"></div>
            </div>
            <div className="h-96 bg-[#132742] border border-[#23426A] rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-[70vh] bg-[#0A1322] flex items-center justify-center p-6 text-[#F8FAFC]">
        <div className="max-w-md w-full bg-[#132742] border border-[#23426A] rounded-3xl p-8 text-center shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] flex items-center justify-center mx-auto">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-[#F8FAFC]">Course Not Found</h2>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">{error || 'Course details could not be found.'}</p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={fetchCourse}
              className="px-5 py-2.5 bg-[#0E1D33] border border-[#23426A] hover:bg-[#1A365D] text-[#F8FAFC] font-bold rounded-xl text-xs transition"
            >
              Try Again
            </button>
            <Link
              to="/courses"
              className="px-5 py-2.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-bold rounded-xl text-xs transition shadow-md shadow-[#4FD1C5]/20"
            >
              Browse Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate stats dynamically
  const lessonCount = course.stats?.lessonCount ?? course.lessonCount ?? course.modules?.flatMap((m) => m.lessons).length ?? 0;
  const totalDurationMinutes = course.stats?.totalDurationMinutes ?? course.totalDurationMinutes ?? course.modules?.flatMap((m) => m.lessons).reduce((sum, l) => sum + (l.durationMinutes || 0), 0) ?? 0;
  const studentCount = course.stats?.studentCount ?? course.studentCount ?? 0;
  const reviewCount = course.stats?.reviewCount ?? course.reviewCount ?? 0;

  return (
    <div className="bg-[#0A1322] text-[#F8FAFC] min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          
          {/* Left Column: Main Course Information */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header & Breadcrumbs */}
            <CourseHeader course={course} />

            {/* Horizontal Stats Bar */}
            <CourseStats
              level={course.level}
              moduleCount={course.modules?.length || 0}
              lessonCount={lessonCount}
              totalDurationMinutes={totalDurationMinutes}
              studentCount={studentCount}
            />

            {/* Interactive Tabs */}
            <CourseTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              reviewCount={reviewCount}
            />

            {/* Tab Content Panels */}
            <div className="pt-1">
              {activeTab === 'about' && <CourseAbout course={course} />}
              
              {activeTab === 'curriculum' && (
                <CourseCurriculum
                  modules={course.modules}
                  onSelectPreviewLesson={handleSelectPreviewLesson}
                />
              )}

              {activeTab === 'instructor' && <CourseInstructor instructor={course.instructor} />}

              {activeTab === 'reviews' && (
                <CourseReviews
                  courseId={course.id}
                  isEnrolled={!!course.isEnrolled}
                  onReviewUpdated={fetchCourse}
                />
              )}
            </div>
          </div>

          {/* Right Column: Floating Purchase & Features Card */}
          <div className="bg-[#132742] border border-[#23426A] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 lg:sticky lg:top-24">
            
            {/* Video Thumbnail Preview */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#0A1322] border border-[#23426A] shadow-inner group">
              <img
                src={resolveMediaUrl(course.thumbnail)}
                alt={course.title}
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_COURSE_THUMBNAIL;
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <button
                onClick={() => navigate(`/courses/${course.slug}/learn`)}
                className="absolute inset-0 bg-black/50 hover:bg-black/30 flex items-center justify-center transition"
                aria-label="Preview Course"
              >
                <div className="w-12 h-12 rounded-full bg-[#4FD1C5] text-[#0A1322] flex items-center justify-center shadow-lg shadow-[#4FD1C5]/30 group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 fill-[#0A1322] ml-0.5" />
                </div>
              </button>
            </div>

            {/* Already Enrolled Notice */}
            {course.isEnrolled ? (
              <div className="p-4 bg-[#22C55E]/15 border border-[#22C55E]/30 rounded-2xl flex items-start gap-3 text-[#22C55E]">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <div className="font-extrabold text-[#F8FAFC]">You are already enrolled!</div>
                  <p className="text-[11px] text-[#CBD5E1]">
                    You have active lifetime access. Click below to continue your lessons.
                  </p>
                </div>
              </div>
            ) : (
              /* Pricing Section */
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider">Tuition & Enrollment</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#F8FAFC]">
                    {course.isFree || course.price === 0 ? 'FREE' : `$${course.discountPrice !== null && course.discountPrice !== undefined ? course.discountPrice.toFixed(2) : course.price.toFixed(2)}`}
                  </span>
                  {course.discountPrice !== null && course.discountPrice !== undefined && course.discountPrice < course.price && (
                    <span className="text-sm text-[#94A3B8] line-through">
                      ${course.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              onClick={handleEnrollClick}
              disabled={enrolling}
              className={`w-full py-3.5 ${
                course.isEnrolled
                  ? 'bg-[#22C55E] hover:bg-[#16A34A] shadow-[#22C55E]/25 text-white'
                  : 'bg-[#4FD1C5] hover:bg-[#38B2AC] shadow-[#4FD1C5]/20 text-[#0A1322]'
              } disabled:opacity-50 font-extrabold rounded-xl shadow-lg transition text-xs flex items-center justify-center space-x-2`}
            >
              <span>{course.isEnrolled ? 'Go to Course & Resume Learning' : enrolling ? 'Processing...' : 'Enroll in Course'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Features Guarantee List */}
            <div className="space-y-3 pt-3 text-xs text-[#CBD5E1] border-t border-[#23426A]">
              <h4 className="font-extrabold text-[#F8FAFC] text-xs uppercase tracking-wider">This course includes:</h4>

              <div className="flex items-center space-x-2.5">
                <Clock className="w-4 h-4 text-[#4FD1C5] flex-shrink-0" />
                <span className="text-[#F8FAFC]">{formatDuration(totalDurationMinutes)} on-demand video</span>
              </div>

              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] flex-shrink-0" />
                <span className="text-[#F8FAFC]">{lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'} across structured modules</span>
              </div>

              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-[#4FD1C5] flex-shrink-0" />
                <span className="text-[#F8FAFC]">Full lifetime access to course updates</span>
              </div>

              <div className="flex items-center space-x-2.5">
                <Smartphone className="w-4 h-4 text-[#4FD1C5] flex-shrink-0" />
                <span className="text-[#F8FAFC]">Accessible on desktop, tablet, and mobile</span>
              </div>

              <div className="flex items-center space-x-2.5">
                <Award className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
                <span className="font-bold text-[#F8FAFC]">Official verified certificate upon completion</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
