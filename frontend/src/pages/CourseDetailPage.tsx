import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { api } from '../services/api';
import { Course, Lesson } from '../types';
import { 
  CheckCircle2, 
  AlertOctagon, 
  Play, 
  Award, 
  Clock, 
  Smartphone, 
  ShieldCheck, 
  ArrowRight,
  BookOpen,
  User,
  Star,
  MessageSquare,
  HelpCircle,
  FileCode,
  Layers,
  ChevronRight,
  Video
} from 'lucide-react';
import { formatDuration } from '../components/course/CourseStats';
import { resolveMediaUrl, DEFAULT_COURSE_THUMBNAIL } from '../utils/media';
import { AppSidebar } from '../components/AppSidebar';
import { CourseReviews } from '../components/course/CourseReviews';

export const CourseDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'reviews' | 'instructor'>('overview');

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
      <div className="bg-[#F1F5F7] dark:bg-[#07182D] min-h-screen py-10 px-4 sm:px-6 lg:px-8 text-[#0B1F3A] dark:text-white transition-colors">
        <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
          <div className="h-64 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl"></div>
          <div className="space-y-4">
            <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
            <div className="h-24 bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-[70vh] bg-[#F1F5F7] dark:bg-[#07182D] flex items-center justify-center p-6 text-[#0B1F3A] dark:text-white transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl p-8 text-center shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-[#EF4444] flex items-center justify-center mx-auto shadow-xs">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-[#0B1F3A] dark:text-white">Course Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{error || 'Course details could not be found.'}</p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={fetchCourse}
              className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition"
            >
              Try Again
            </button>
            <Link
              to="/courses"
              className="px-5 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold rounded-xl text-xs transition shadow-xs"
            >
              Browse Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate stats dynamically from actual course modules and lessons
  const allLessons = course.modules?.flatMap((m) => m.lessons || []) || [];
  const lessonCount = allLessons.length || course.lessonCount || 0;
  const totalDurationMinutes = allLessons.reduce((sum, l) => sum + (l.durationMinutes || 0), 0) || course.totalDurationMinutes || 0;
  const moduleCount = course.modules?.length || 1;
  const reviewCount = course.reviewCount ?? course.stats?.reviewCount ?? 0;
  const ratingScore = course.averageRating ?? 5.0;

  // Dynamic Learning Objectives
  const dynamicObjectives = (course.learningObjectives && course.learningObjectives.length > 0)
    ? course.learningObjectives
    : [
        `Master the foundational and advanced principles of ${course.title}.`,
        'Hands-on lab exercises, step-by-step engineering workflows, and practical assignments.',
        'Real-world system design, troubleshooting, and production best practices.',
        'Earn an official verified certificate of completion upon graduation.'
      ];

  return (
    <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] flex flex-col lg:flex-row text-[#0B1F3A] dark:text-white font-sans pb-16 lg:pb-0 transition-colors">
      {/* Left Navigation Sidebar */}
      <AppSidebar activeItem="courses" />

      {/* Main Course Content View */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 w-full">
        
        {/* Course Hero Banner Card */}
        <div className="rounded-3xl overflow-hidden bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] shadow-xs">
          {/* Top Banner Graphic with Dark Overlay */}
          <div className="relative bg-[#102A43] dark:bg-[#0B223D] p-6 sm:p-8 text-white min-h-[220px] flex flex-col justify-between overflow-hidden">
            <img
              src={resolveMediaUrl(course.thumbnail)}
              alt={course.title}
              onError={(e) => {
                e.currentTarget.src = DEFAULT_COURSE_THUMBNAIL;
              }}
              className="absolute inset-0 w-full h-full object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#102A43] via-[#102A43]/85 to-[#102A43]/50 dark:from-[#0B223D] dark:via-[#0B223D]/85 dark:to-[#0B223D]/50" />
            
            <div className="relative z-10 space-y-2">
              <span className="px-3 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-[#087F78] text-white inline-block shadow-xs">
                {course.category?.name ? `${course.category.name} CERTIFICATION` : 'PROFESSIONAL CERTIFICATION'}
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {course.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                {course.description || 'Master real engineering workflows, practical labs, and production skills with Khalil Academy.'}
              </p>
            </div>
          </div>

          {/* Bottom Bar: Dynamic Metadata & Enroll Button */}
          <div className="p-4 sm:p-5 bg-white dark:bg-[#102A43] flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 dark:border-[#1E3A56]">
            {/* Dynamic Stats row */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-600 dark:text-slate-300 font-mono text-[11px]">
              <div className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
                <span>{moduleCount} Modules • {formatDuration(totalDurationMinutes) || '6 Hours'}</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <BookOpen className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
                <span>{lessonCount} Lessons</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#087F78] dark:bg-[#14B8A6]" />
                <span>{course.level || 'Beginner'} Level</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-[#F59E0B] text-sm leading-none">★</span>
                <span>{ratingScore.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'Review' : 'Reviews'})</span>
              </div>
            </div>

            {/* Enroll CTA Button */}
            <button
              onClick={handleEnrollClick}
              disabled={enrolling}
              className="px-6 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-xs shrink-0 disabled:opacity-50"
            >
              <span>
                {course.isEnrolled
                  ? 'Go to Learning Classroom'
                  : enrolling
                  ? 'Processing...'
                  : `Enroll Now - ${course.isFree || course.price === 0 ? 'FREE' : `${course.price} KSH`}`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#1E3A56] pb-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'Course Overview', icon: BookOpen },
            { id: 'curriculum', label: `Curriculum (${lessonCount} Lessons)`, icon: Layers },
            { id: 'reviews', label: `Student Reviews (${reviewCount})`, icon: MessageSquare },
            { id: 'instructor', label: 'Instructor Profile', icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#087F78] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white hover:bg-slate-100 dark:bg-[#0B223D] dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Two-Column Layout Below Navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Main Tab Content */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-[#102A43] rounded-3xl border border-slate-200/90 dark:border-[#1E3A56] p-6 sm:p-7 shadow-xs space-y-5">
                  <h2 className="text-base font-bold text-[#0B1F3A] dark:text-white">About this Course</h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {course.description || 'Welcome to this comprehensive course on Khalil Academy. This course gives you real-world engineering confidence with practical labs, interactive assignments, and verified certificates.'}
                  </p>

                  {/* Dynamic What You Will Learn */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-white">
                      WHAT YOU WILL LEARN
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {dynamicObjectives.map((obj, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6] shrink-0 mt-0.5" />
                          <span className="text-xs text-slate-700 dark:text-slate-300 leading-snug">{obj}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Requirements & Target Audience if provided */}
                  {course.requirements && course.requirements.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#1E3A56]">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-white">
                        Prerequisites & Requirements
                      </h4>
                      <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1">
                        {course.requirements.map((req, rIdx) => (
                          <li key={rIdx}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Quick Curriculum Preview inside Overview */}
                <div className="bg-white dark:bg-[#102A43] rounded-3xl border border-slate-200/90 dark:border-[#1E3A56] p-6 sm:p-7 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E3A56] pb-3">
                    <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white">Curriculum Highlights</h3>
                    <button
                      onClick={() => setActiveTab('curriculum')}
                      className="text-xs font-mono font-bold text-[#087F78] dark:text-[#14B8A6] hover:underline"
                    >
                      View All {lessonCount} Lessons
                    </button>
                  </div>

                  <div className="space-y-3">
                    {course.modules?.slice(0, 3).map((mod, mIdx) => (
                      <div key={mod.id} className="border border-slate-200 dark:border-[#1E3A56] rounded-2xl p-4 bg-slate-50/50 dark:bg-[#152F4A]/50 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#087F78] dark:text-[#14B8A6]">
                          <span>MODULE {mIdx + 1}: {mod.title}</span>
                          <span className="text-slate-400 dark:text-slate-500">{mod.lessons?.length || 0} Lessons</span>
                        </div>
                        {mod.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{mod.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Full Curriculum */}
            {activeTab === 'curriculum' && (
              <div className="bg-white dark:bg-[#102A43] rounded-3xl border border-slate-200/90 dark:border-[#1E3A56] p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1E3A56]">
                  <h2 className="text-base font-bold text-[#0B1F3A] dark:text-white">
                    Full Course Curriculum
                  </h2>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {moduleCount} Modules • {lessonCount} Lessons
                  </span>
                </div>

                <div className="space-y-4">
                  {course.modules && course.modules.length > 0 ? (
                    course.modules.map((mod, mIdx) => (
                      <div key={mod.id} className="border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl overflow-hidden bg-white dark:bg-[#152F4A] shadow-xs">
                        {/* Module Header Bar */}
                        <div className="px-4 py-3 bg-slate-50/80 dark:bg-[#0B223D]/80 border-b border-slate-100 dark:border-[#1E3A56] flex items-center justify-between text-[11px] font-mono font-bold">
                          <span className="text-[#087F78] dark:text-[#14B8A6] uppercase">
                            MODULE {mIdx + 1}
                          </span>
                          <span className="text-slate-400 dark:text-slate-500">
                            {mod.lessons?.length || 0} Lessons
                          </span>
                        </div>

                        {/* Module Title */}
                        <div className="p-4 space-y-3">
                          <h4 className="font-bold text-xs sm:text-sm text-[#0B1F3A] dark:text-white">
                            {mod.title}
                          </h4>
                          {mod.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">{mod.description}</p>
                          )}

                          {/* Lessons List */}
                          {mod.lessons && mod.lessons.length > 0 ? (
                            <div className="space-y-1.5 pt-1">
                              {mod.lessons.map((lesson, lIdx) => (
                                <button
                                  key={lesson.id}
                                  onClick={() => handleSelectPreviewLesson(lesson)}
                                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-[#152F4A] dark:hover:bg-slate-800 hover:text-[#087F78] dark:hover:text-[#14B8A6] transition text-left group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                    <Play className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-[#087F78] dark:group-hover:text-[#14B8A6] shrink-0" />
                                    <span className="truncate font-medium">
                                      {lIdx + 1}. {lesson.title}
                                    </span>
                                  </div>
                                  {lesson.durationMinutes ? (
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
                                      {lesson.durationMinutes}m
                                    </span>
                                  ) : null}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="p-3 text-xs text-slate-400 italic">No lessons in this module yet.</div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Curriculum modules are being uploaded by the instructor.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Reviews */}
            {activeTab === 'reviews' && (
              <CourseReviews
                courseId={course.id}
                isEnrolled={!!course.isEnrolled}
                onReviewUpdated={fetchCourse}
              />
            )}

            {/* Tab 4: Instructor Profile */}
            {activeTab === 'instructor' && (
              <div className="bg-white dark:bg-[#102A43] rounded-3xl border border-slate-200/90 dark:border-[#1E3A56] p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs bg-slate-100 dark:bg-slate-800 shrink-0">
                    <img
                      src={course.instructor?.avatar ? resolveMediaUrl(course.instructor.avatar) : DEFAULT_COURSE_THUMBNAIL}
                      alt={course.instructor?.name || 'Instructor'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_COURSE_THUMBNAIL;
                      }}
                    />
                  </div>

                  <div className="space-y-2 text-center sm:text-left">
                    <h3 className="text-xl font-extrabold text-[#0B1F3A] dark:text-white">
                      {course.instructor?.name || 'Khalil Abdi Wali'}
                    </h3>
                    <p className="text-xs font-mono font-bold text-[#087F78] dark:text-[#14B8A6]">
                      {course.instructor?.role || 'Lead Cloud & Systems Engineering Mentor'}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                      {course.instructor?.bio || 'Experienced software and systems engineer dedicated to empowering African and global learners with practical, industry-standard tech competencies.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: Instructor & Features Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Card 1: Instructor Quick Profile */}
            <div className="bg-white dark:bg-[#102A43] rounded-3xl border border-slate-200/90 dark:border-[#1E3A56] p-6 text-center shadow-xs space-y-3">
              <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto border border-slate-200 dark:border-slate-700 shadow-xs bg-slate-100 dark:bg-slate-800">
                <img
                  src={course.instructor?.avatar ? resolveMediaUrl(course.instructor.avatar) : DEFAULT_COURSE_THUMBNAIL}
                  alt={course.instructor?.name || 'Instructor'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_COURSE_THUMBNAIL;
                  }}
                />
              </div>

              <div>
                <h3 className="font-bold text-sm text-[#0B1F3A] dark:text-white">
                  {course.instructor?.name || 'Khalil Abdi Wali'}
                </h3>
                <p className="text-[11px] font-mono font-bold text-[#087F78] dark:text-[#14B8A6] mt-0.5">
                  {course.instructor?.role || 'Lead Instructor'}
                </p>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-left sm:text-center line-clamp-3">
                {course.instructor?.bio || 'Certified Cloud Engineer dedicated to teaching practical tech skills at Khalil Academy.'}
              </p>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('instructor')}
                  className="w-full py-2 bg-slate-50 dark:bg-[#152F4A] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 rounded-xl transition shadow-xs"
                >
                  View Full Profile
                </button>
              </div>
            </div>

            {/* Card 2: This course includes (100% Dynamic) */}
            <div className="bg-white dark:bg-[#102A43] rounded-3xl border border-slate-200/90 dark:border-[#1E3A56] p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#0B1F3A] dark:text-white">
                This Course Includes
              </h3>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <div className="flex items-center space-x-3">
                  <Video className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6] shrink-0" />
                  <span>{formatDuration(totalDurationMinutes) || 'On-demand video content'}</span>
                </div>

                <div className="flex items-center space-x-3">
                  <BookOpen className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6] shrink-0" />
                  <span>{lessonCount} Interactive Lessons</span>
                </div>

                <div className="flex items-center space-x-3">
                  <Layers className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6] shrink-0" />
                  <span>{moduleCount} Structured Modules</span>
                </div>

                <div className="flex items-center space-x-3">
                  <ShieldCheck className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6] shrink-0" />
                  <span>Full Lifetime Access</span>
                </div>

                <div className="flex items-center space-x-3">
                  <Smartphone className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6] shrink-0" />
                  <span>Access on Mobile, Tablet & Desktop</span>
                </div>

                <div className="flex items-center space-x-3">
                  <Award className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6] shrink-0" />
                  <span>Official Certificate of Completion</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleEnrollClick}
                disabled={enrolling}
                className="w-full py-3 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 mt-4"
              >
                <span>{course.isEnrolled ? 'Go to Classroom' : 'Enroll Now'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
};
