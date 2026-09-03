import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Course, Lesson, LessonResource, CourseEligibilityResult } from '../types';
import { VideoPlayer } from '../components/player/VideoPlayer';
import {
  ArrowLeft,
  CheckCircle,
  CheckCircle2,
  Circle,
  PlayCircle,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Lock,
  Award,
  Sparkles,
  Download,
  Disc,
  Maximize2,
  HelpCircle,
  Code2,
  Compass,
  MessageSquare,
  Zap,
  AlertCircle,
  ExternalLink,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatLessonDuration } from '../utils/formatters';
import { AskKhalilAIDrawer } from '../components/ai/AskKhalilAIDrawer';
import { AIActionType } from '../types/ai';

export const LearningPlayerPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const lessonIdParam = searchParams.get('lessonId');

  const [course, setCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [progressData, setProgressData] = useState<any>(null);
  const [eligibilityData, setEligibilityData] = useState<CourseEligibilityResult | null>(null);
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [showEnrollPaywallModal, setShowEnrollPaywallModal] = useState(false);
  const [lockedLessonAttempt, setLockedLessonAttempt] = useState<Lesson | null>(null);

  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseCompletedModal, setCourseCompletedModal] = useState(false);
  const [autoAdvanceToast, setAutoAdvanceToast] = useState<{ title: string; nextTitle: string } | null>(null);

  // Accordion state for modules
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  // Sub-tabs: 'overview' | 'transcript' | 'resources' | 'notes'
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript' | 'resources' | 'notes'>('overview');
  const [showMoreDesc, setShowMoreDesc] = useState(false);
  const [personalNotes, setPersonalNotes] = useState<string>('');
  const [theaterMode, setTheaterMode] = useState(false);

  // AI Assistant Drawer state
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiInitialAction, setAiInitialAction] = useState<AIActionType>('GENERAL');

  const openAIWithAction = (action: AIActionType = 'GENERAL') => {
    setAiInitialAction(action);
    setAiDrawerOpen(true);
  };

  useEffect(() => {
    fetchCourseAndProgress();
  }, [slug, lessonIdParam]);

  // Load personal notes per lesson
  useEffect(() => {
    if (activeLesson) {
      const savedNote = localStorage.getItem(`khalil_notes_${activeLesson.id}`) || '';
      setPersonalNotes(savedNote);
    }
  }, [activeLesson?.id]);

  const handleNotesChange = (val: string) => {
    setPersonalNotes(val);
    if (activeLesson) {
      localStorage.setItem(`khalil_notes_${activeLesson.id}`, val);
    }
  };

  const toggleModuleAccordion = (modId: string) => {
    setOpenModules((prev) => ({
      ...prev,
      [modId]: prev[modId] === undefined ? false : !prev[modId],
    }));
  };

  const fetchCourseAndProgress = async () => {
    try {
      setLoading(true);
      setError(null);

      const [courseRes, progressRes, eligRes] = await Promise.allSettled([
        api.get(`/courses/${slug}`),
        api.get(`/progress/courses/${slug}`),
        api.get(`/certificates/courses/${slug}/eligibility`),
      ]);

      if (courseRes.status === 'rejected' || !courseRes.value.data.success || !courseRes.value.data.course) {
        setError('Unable to load course. Please verify your enrollment.');
        setLoading(false);
        return;
      }

      let pData = null;
      let isEnrolledFromProgress = false;
      if (progressRes.status === 'fulfilled' && progressRes.value.data?.success) {
        pData = progressRes.value.data.progress || progressRes.value.data;
        isEnrolledFromProgress = true;
        setProgressData(pData);
      }

      if (eligRes.status === 'fulfilled' && eligRes.value.data?.success) {
        setEligibilityData(eligRes.value.data);
      }

      const isEnrolled = !!(courseRes.value.data.course.isEnrolled || isEnrolledFromProgress);
      const cData: Course = {
        ...courseRes.value.data.course,
        isEnrolled,
      };
      setCourse(cData);

      // Automatically open all modules
      const initialOpen: Record<string, boolean> = {};
      (cData.modules || []).forEach((m) => {
        initialOpen[m.id] = true;
      });
      setOpenModules(initialOpen);

      // Select active lesson
      const allLessons = (cData.modules || []).flatMap((m) => m.lessons.filter((l) => l.isPublished));
      if (allLessons.length > 0) {
        let selected: Lesson | undefined;
        if (lessonIdParam) {
          selected = allLessons.find((l) => l.id === lessonIdParam);
        }
        if (!selected) {
          if (pData?.lastAccessedLessonId) {
            selected = allLessons.find((l) => l.id === pData.lastAccessedLessonId);
          }
        }
        if (!selected) {
          selected = allLessons[0];
        }

        if (selected) {
          loadLesson(selected.id, cData, pData);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initialize player.');
    } finally {
      setLoading(false);
    }
  };

  const loadLesson = async (lessonId: string, courseOverride?: Course, progressOverride?: any) => {
    const currentCourse = courseOverride || course;
    if (!currentCourse) return;

    const all = (currentCourse.modules || []).flatMap((m) => m.lessons.filter((l) => l.isPublished));
    const target = all.find((l) => l.id === lessonId);
    if (!target) return;

    const currentProg = progressOverride || progressData;
    const isEnrolledUser = !!(currentCourse.isEnrolled || currentProg);
    const isFirstLesson = all.length > 0 && all[0].id === target.id;

    // Strict access control: If user is NOT enrolled and target is not the first preview lesson:
    const isLocked = !isEnrolledUser && !isFirstLesson;

    if (isLocked) {
      setLockedLessonAttempt(target);
      setShowEnrollPaywallModal(true);
      return;
    }

    setSearchParams({ lessonId: target.id });

    const lessonProg = currentProg?.lessonProgress?.[target.id] || target.progress;

    setActiveLesson({
      ...target,
      progress: lessonProg || {
        isCompleted: false,
        lastWatchedPosition: 0,
        watchTime: 0,
        progressPercentage: 0,
        status: 'NOT_STARTED',
      },
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Heartbeat / progress updates
  const handleProgressUpdate = async (positionSeconds: number, deltaSeconds?: number, durationSeconds?: number) => {
    if (!activeLesson) return;

    const targetDur = Math.max(1, durationSeconds ? Math.round(durationSeconds) : (activeLesson.durationMinutes ? activeLesson.durationMinutes * 60 : 300));
    const currentWatch = activeLesson.progress?.watchTime || 0;
    const newWatchTime = Math.min(targetDur, currentWatch + (deltaSeconds ? Math.min(deltaSeconds, 15) : 5));
    const newPercent = Math.min(100, parseFloat(((newWatchTime / targetDur) * 100).toFixed(1)));
    const is60 = newPercent >= 60 || newWatchTime >= targetDur * 0.6;
    const wasAlreadyCompleted = activeLesson.progress?.isCompleted || progressMap.get(activeLesson.id);

    // Update active lesson progress in local state
    setActiveLesson((prev) => {
      if (!prev || prev.id !== activeLesson.id) return prev;
      return {
        ...prev,
        progress: {
          ...prev.progress,
          lastWatchedPosition: Math.floor(positionSeconds),
          watchTime: newWatchTime,
          progressPercentage: is60 ? 100 : newPercent,
          status: is60 ? 'COMPLETED' : (newWatchTime > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'),
          isCompleted: is60 || (prev.progress?.isCompleted || false),
        },
      };
    });

    // If reached 60% and wasn't completed before: trigger celebratory confetti
    if (is60 && !wasAlreadyCompleted) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.8 },
      });
    }

    // Persist progress to server every 10 seconds or when completed (for enrolled students)
    try {
      if (course?.isEnrolled) {
        await api.post(`/progress/lessons/${activeLesson.id}/heartbeat`, {
          positionSeconds,
          deltaSeconds: deltaSeconds || 5,
          durationSeconds: targetDur,
        });

        if (is60 && !wasAlreadyCompleted) {
          await markLessonComplete();
          confetti({
            particleCount: 100,
            spread: 90,
            origin: { y: 0.7 },
            colors: ['#4F46E5', '#7C3AED', '#06B6D4', '#22C55E', '#F59E0B'],
          });
        }
      }
    } catch (err) {
      // Background heartbeat fail silently
    }
  };

  const handleVideoEnded = async () => {
    if (!activeLesson) return;

    // 1. Mark current lesson complete if enrolled
    if (course?.isEnrolled) {
      await markLessonComplete();
    }

    // 2. If unenrolled student finished the free preview video, prompt paywall!
    if (!course?.isEnrolled) {
      setShowEnrollPaywallModal(true);
      return;
    }

    // 3. Identify next lesson
    const all = (course?.modules || []).flatMap((m) => m.lessons.filter((l) => l.isPublished));
    const currentIndex = all.findIndex((l) => l.id === activeLesson.id);
    const next = currentIndex >= 0 && currentIndex < all.length - 1 ? all[currentIndex + 1] : null;

    if (next) {
      // Show auto-advance notification and advance
      setAutoAdvanceToast({
        title: activeLesson.title,
        nextTitle: next.title,
      });
      setTimeout(() => {
        setAutoAdvanceToast(null);
        loadLesson(next.id);
      }, 2000);
    } else {
      // Last lesson in the course! 100% course completion!
      setCourseCompletedModal(true);
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.6 },
        colors: ['#4F46E5', '#7C3AED', '#06B6D4', '#22C55E', '#F59E0B'],
      });
    }
  };

  const markLessonComplete = async () => {
    if (!activeLesson || completing || !course?.isEnrolled) return;
    try {
      setCompleting(true);
      const res = await api.post(`/progress/lessons/${activeLesson.id}/complete`);
      if (res.data.success) {
        // Update local active lesson state
        setActiveLesson((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            progress: {
              ...prev.progress,
              isCompleted: true,
              lastWatchedPosition: prev.progress?.lastWatchedPosition ?? 0,
              watchTime: prev.progress?.watchTime,
              progressPercentage: 100,
              status: 'COMPLETED',
            },
          };
        });

        // Trigger celebratory confetti burst
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.8 },
        });

        // Re-fetch progress to update progress bars & certificate status
        try {
          const [pRes, eligRes] = await Promise.allSettled([
            api.get(`/progress/courses/${slug}`),
            api.get(`/certificates/courses/${slug}/eligibility`),
          ]);

          if (pRes.status === 'fulfilled' && pRes.value.data.success) {
            const freshPData = pRes.value.data.progress || pRes.value.data;
            setProgressData(freshPData);
          }

          if (eligRes.status === 'fulfilled' && eligRes.value.data.success) {
            const freshElig = eligRes.value.data;
            setEligibilityData(freshElig);
            if (freshElig.eligible && (!freshElig.wasAlreadyCompleted || !courseCompletedModal)) {
              setCourseCompletedModal(true);
              confetti({
                particleCount: 200,
                spread: 120,
                origin: { y: 0.6 },
                colors: ['#4F46E5', '#7C3AED', '#06B6D4', '#22C55E', '#F59E0B'],
              });
            }
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error completing lesson:', err);
    } finally {
      setCompleting(false);
    }
  };

  // Linear lesson navigation
  const allLessons = (course?.modules || []).flatMap((m) => m.lessons.filter((l) => l.isPublished));
  const currentLessonIndex = allLessons.findIndex((l) => l.id === activeLesson?.id);
  const hasPrevLesson = currentLessonIndex > 0;
  const hasNextLesson = currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1;

  const handlePrevLesson = () => {
    if (hasPrevLesson) {
      loadLesson(allLessons[currentLessonIndex - 1].id);
    }
  };

  const handleNextLesson = () => {
    if (!course?.isEnrolled) {
      setShowEnrollPaywallModal(true);
      return;
    }
    if (hasNextLesson) {
      loadLesson(allLessons[currentLessonIndex + 1].id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#087F78] border-t-transparent"></div>
        <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">Loading course curriculum and interactive player...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] flex items-center justify-center p-6">
        <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-[#EF4444] mx-auto flex items-center justify-center font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-[#0B1F3A] dark:text-white">Classroom Access Restricted</h2>
          <p className="text-xs text-slate-500 dark:text-[#A9BACB] leading-relaxed">
            {error || 'You are not enrolled in this course or this course content is currently unpublished.'}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Link
              to="/courses"
              className="px-5 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold rounded-xl text-xs transition shadow-xs"
            >
              Browse Catalog
            </Link>
            <Link
              to="/dashboard"
              className="px-5 py-2.5 bg-slate-100 dark:bg-[#0B223D] hover:bg-slate-200 dark:hover:bg-[#1E3A56] dark:bg-[#0B223D] border border-slate-200 dark:border-[#1E3A56] text-slate-700 dark:text-[#A9BACB] font-bold rounded-xl text-xs transition"
            >
              Student Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate dynamic progress metrics
  const progressMap = new Map<string, boolean>();

  // 1. From progressData.lessons
  (progressData?.lessons || []).forEach((l: any) => {
    if (l.isCompleted) progressMap.set(l.id, true);
  });

  // 2. From progressData.lessonsProgress
  (progressData?.lessonsProgress || []).forEach((lp: any) => {
    if (lp.isCompleted) progressMap.set(lp.lessonId || lp.id, true);
  });

  // 3. From progressData.lessonProgress object map
  if (progressData?.lessonProgress && typeof progressData.lessonProgress === 'object') {
    Object.entries(progressData.lessonProgress).forEach(([lid, val]: [string, any]) => {
      if (val?.isCompleted || val === true) progressMap.set(lid, true);
    });
  }

  // 4. From activeLesson state if marked complete locally
  if (activeLesson?.id && activeLesson.progress?.isCompleted) {
    progressMap.set(activeLesson.id, true);
  }

  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter(
    (l) => progressMap.get(l.id) || l.progress?.isCompleted || (l.id === activeLesson?.id && activeLesson?.progress?.isCompleted)
  ).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Active module & lesson metadata
  const activeModuleIndex = (course.modules || []).findIndex((m) =>
    m.lessons.some((l) => l.id === activeLesson?.id)
  );
  const activeModule = activeModuleIndex >= 0 ? course.modules![activeModuleIndex] : null;
  const activeLessonIndexInModule = (activeModule?.lessons || []).findIndex((l) => l.id === activeLesson?.id);

  // Dynamic Learning Outcomes
  const rawOutcomes = (activeLesson as any)?.learningOutcomes;
  const learningOutcomes: string[] = Array.isArray(rawOutcomes) && rawOutcomes.length > 0
    ? rawOutcomes
    : [
        'Understand core architecture concepts presented in this module',
        'Learn real-world practical patterns applied in professional environments',
        'Gain hands-on command experience and configuration best practices',
      ];

  return (
    <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white flex flex-col font-sans transition-colors">
      
      {/* 1. Global LMS Header Bar */}
      <div className="h-14 bg-white dark:bg-[#0B223D] border-b border-slate-200 dark:border-[#1E3A56] flex items-center justify-between px-4 sm:px-6 z-20 shrink-0">
        <div className="flex items-center space-x-4 min-w-0">
          <Link
            to={`/courses/${course.slug}`}
            className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-[#087F78] dark:hover:text-[#14B8A6] transition font-bold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Overview</span>
          </Link>
          <span className="text-slate-200 dark:text-slate-700 hidden sm:inline">|</span>
          <h2 className="text-xs sm:text-sm font-extrabold text-[#0B1F3A] dark:text-white truncate max-w-sm sm:max-w-md">
            {course.title}
          </h2>
        </div>

        {/* Course Progress Counter & Bar & Status Actions */}
        <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0">
          {course.isEnrolled ? (
            <div className="hidden md:flex items-center space-x-3 text-xs font-semibold text-slate-600 dark:text-[#A9BACB]">
              <span>
                Lesson <strong className="text-[#0B1F3A] dark:text-white">{currentLessonIndex >= 0 ? currentLessonIndex + 1 : 1}</strong> of <strong className="text-[#0B1F3A] dark:text-white">{totalLessons}</strong>
              </span>
              <span className="text-slate-200">|</span>
              <span>
                <strong className="text-[#0B1F3A] dark:text-white">{completedLessons} / {totalLessons}</strong> completed
              </span>
              <span className="text-slate-200">|</span>
              <span className="font-bold text-[#087F78] font-mono">{progressPercent}%</span>
              <div className="w-20 sm:w-24 h-2 bg-slate-100 dark:bg-[#0B223D] rounded-full overflow-hidden">
                <div
                  className="bg-[#087F78] h-full rounded-full transition-all duration-500 shadow-xs"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Free Preview Mode</span>
            </div>
          )}

          {/* Certificate or Unlock Button */}
          {!course.isEnrolled ? (
            <button
              onClick={() => {
                setLockedLessonAttempt(null);
                setShowEnrollPaywallModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#087F78] hover:bg-[#076E6A] text-white shadow-xs transition"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Unlock Full Course</span>
            </button>
          ) : (
            eligibilityData && (
              <button
                onClick={() => setShowEligibilityModal(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                  eligibilityData.eligible
                    ? 'bg-teal-50 text-[#087F78] border border-teal-200 hover:bg-teal-100 animate-pulse'
                    : 'bg-slate-100 dark:bg-[#0B223D] text-slate-700 dark:text-[#A9BACB] border border-slate-200 dark:border-[#1E3A56] hover:border-[#087F78] hover:text-[#087F78]'
                }`}
                title="Course Completion & Certification Requirements"
              >
                <Award className="h-3.5 w-3.5 text-amber-500" />
                <span>
                  {eligibilityData.eligible
                    ? '🎉 Certificate Ready'
                    : `Requirements (${Math.round(eligibilityData.certificationProgressPercentage)}%)`}
                </span>
              </button>
            )
          )}

          {/* Ask Khalil AI Header Trigger */}
          <button
            onClick={() => openAIWithAction('GENERAL')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#E6F7F5] hover:bg-[#d1f1ed] text-[#087F78] font-bold rounded-xl text-xs transition border border-[#087F78]/20 shadow-xs"
            title="Ask Khalil AI Tutor"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Ask Khalil AI</span>
          </button>
        </div>
      </div>

      {/* 2. Main Two-Column Layout (Curriculum Sidebar + Large Video Stage) */}
      <div className={`w-full flex-1 grid grid-cols-1 ${
        theaterMode ? 'lg:grid-cols-1' : 'lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]'
      } overflow-hidden transition-all duration-300`}>
        
        {/* Left Column: Course Curriculum Sidebar */}
        {!theaterMode && (
          <div className="w-full bg-white dark:bg-[#102A43] border-r border-slate-200 dark:border-[#1E3A56] p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-7.5rem)]">
          
          {/* Top Course Card Header */}
          <div className="p-4 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl space-y-2 shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#E6F7F5] border border-[#087F78]/20 text-[#087F78] flex items-center justify-center font-bold flex-shrink-0">
                <Disc className="h-5 w-5 text-[#087F78] animate-pulse" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-[#0B1F3A] dark:text-white truncate leading-tight">{course.title}</h3>
                <span className="text-[11px] text-slate-500 dark:text-[#A9BACB] font-medium">
                  {course.isEnrolled ? `${completedLessons} / ${totalLessons} completed` : `Free Preview: 1 of ${totalLessons} videos`}
                </span>
              </div>
            </div>
          </div>

          {/* Certification Status or Free Preview Banner in Sidebar */}
          {!course.isEnrolled ? (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Free Preview
                </span>
                <span className="text-[10px] font-mono text-slate-600 dark:text-[#A9BACB]">1 free video</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-[#A9BACB] leading-snug">
                You can watch Lesson 1 for free. Enroll now to unlock all {totalLessons} lessons & assignments.
              </p>
              <button
                onClick={() => {
                  setLockedLessonAttempt(null);
                  setShowEnrollPaywallModal(true);
                }}
                className="w-full py-2 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition text-center uppercase tracking-wider"
              >
                Unlock Course
              </button>
            </div>
          ) : (
            eligibilityData && (
              <button
                onClick={() => setShowEligibilityModal(true)}
                className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between shadow-xs ${
                  eligibilityData.eligible
                    ? 'bg-teal-50 border-teal-200 hover:bg-teal-100'
                    : 'bg-slate-50 dark:bg-[#152F4A] border-slate-200 dark:border-[#1E3A56] hover:border-[#087F78]/60'
                }`}
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#A9BACB] block flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>{eligibilityData.eligible ? 'Certificate Ready' : 'Certification Criteria'}</span>
                  </span>
                  <div className="text-xs font-bold text-[#0B1F3A] dark:text-white truncate">
                    {eligibilityData.eligible ? '✅ All Requirements Satisfied' : `${eligibilityData.missingRequirements.length} item(s) pending`}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase ${
                  eligibilityData.eligible ? 'bg-[#087F78] text-white' : 'bg-white dark:bg-[#102A43] text-[#087F78] border border-slate-200 dark:border-[#1E3A56]'
                }`}>
                  {eligibilityData.eligible ? 'CLAIM' : `${Math.round(eligibilityData.certificationProgressPercentage)}%`}
                </span>
              </button>
            )
          )}

          {/* Module Accordions List */}
          <div className="space-y-3">
            {course.modules && course.modules.length > 0 ? (
              course.modules.map((mod, mIdx) => {
                const lessons = mod.lessons.filter((l) => l.isPublished);
                const modCompleted = lessons.filter(
                  (l) => progressMap.get(l.id) || l.progress?.isCompleted || (l.id === activeLesson?.id && activeLesson?.progress?.isCompleted)
                ).length;
                const isOpen = openModules[mod.id] !== false;
                const quizzes = mod.quizzes || [];
                const assignments = mod.assignments || [];

                return (
                  <div key={mod.id} className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-2xl overflow-hidden shadow-xs">
                    {/* Module Accordion Header */}
                    <button
                      onClick={() => toggleModuleAccordion(mod.id)}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-[#152F4A] dark:bg-[#152F4A] transition"
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-[#A9BACB] uppercase tracking-wider block font-mono">
                          MODULE {mIdx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-[#0B1F3A] dark:text-white truncate">{mod.title}</h4>
                        <span className="text-[11px] text-slate-500 dark:text-[#A9BACB] font-mono">
                          {course.isEnrolled ? `${modCompleted} / ${lessons.length} completed` : `${lessons.length} lessons`}
                        </span>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      )}
                    </button>

                    {/* Lesson, Quiz & Assignment Items inside Module */}
                    {isOpen && (
                      <div className="border-t border-slate-100 dark:border-[#1E3A56] divide-y divide-slate-100 dark:divide-[#1E3A56] bg-slate-50 dark:bg-[#152F4A]/50">
                        {/* Lessons */}
                        {lessons.map((les, lIdx) => {
                          const isActive = activeLesson?.id === les.id;
                          const isFirstLessonInCourse = allLessons.length > 0 && allLessons[0].id === les.id;
                          const isEnrolledStudent = !!(course.isEnrolled || progressData);
                          const isLessonLocked = !isEnrolledStudent && !isFirstLessonInCourse;
                          const isCompleted = !isLessonLocked && (!!progressMap.get(les.id) || !!les.progress?.isCompleted || (activeLesson?.id === les.id && !!activeLesson?.progress?.isCompleted));
                          const isInProgress = !isLessonLocked && !isCompleted && ((les.progress?.watchTime || 0) > 0 || (les.progress?.lastWatchedPosition || 0) > 0 || (activeLesson?.id === les.id && (activeLesson?.progress?.watchTime || 0) > 0));

                          return (
                            <button
                              key={les.id}
                              onClick={() => loadLesson(les.id)}
                              className={`w-full flex items-center justify-between px-3.5 py-3 text-left transition-all ${
                                isActive
                                  ? 'bg-[#087F78] text-white font-bold shadow-xs'
                                  : isLessonLocked
                                  ? 'hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D] text-slate-400'
                                  : 'hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D] text-slate-700 dark:text-[#A9BACB]'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                                {isLessonLocked ? (
                                  <Lock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                ) : isCompleted ? (
                                  <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#087F78]'}`} />
                                ) : isInProgress || isActive ? (
                                  <PlayCircle className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#087F78]'}`} />
                                ) : (
                                  <Circle className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                )}
                                <span className={`text-xs truncate ${isCompleted && !isActive ? 'text-[#0B1F3A] dark:text-white' : isLessonLocked ? 'text-slate-400' : ''}`}>
                                  {lIdx + 1}. {les.title}
                                </span>
                                {isLessonLocked && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#0B223D] text-slate-500 dark:text-[#A9BACB] border border-slate-200 dark:border-[#1E3A56] uppercase flex-shrink-0">
                                    Locked
                                  </span>
                                )}
                                {!isLessonLocked && isFirstLessonInCourse && !isEnrolledStudent && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-[#087F78] border border-teal-200 uppercase flex-shrink-0">
                                    Preview
                                  </span>
                                )}
                              </div>
                              <span className={`text-[10px] font-mono flex-shrink-0 ${isActive ? 'text-white/80 font-bold' : 'text-slate-400'}`}>
                                {formatLessonDuration(les.durationMinutes, (les as any).durationSeconds)}
                              </span>
                            </button>
                          );
                        })}

                        {/* Module Quizzes */}
                        {quizzes.map((quiz) => (
                          <button
                            key={quiz.id}
                            type="button"
                            onClick={() => {
                              if (!course.isEnrolled) {
                                setShowEnrollPaywallModal(true);
                              } else {
                                navigate(`/quizzes/${quiz.id}`);
                              }
                            }}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-all hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D] text-slate-700 dark:text-[#A9BACB]"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                              {!course.isEnrolled ? (
                                <Lock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                              ) : (
                                <HelpCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                              )}
                              <span className="text-xs text-slate-700 dark:text-[#A9BACB] truncate">Quiz: {quiz.title}</span>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase font-mono">
                              Pass: {quiz.passingScore}%
                            </span>
                          </button>
                        ))}

                        {/* Module Assignments */}
                        {assignments.map((assignment) => (
                          <button
                            key={assignment.id}
                            type="button"
                            onClick={() => {
                              if (!course.isEnrolled) {
                                setShowEnrollPaywallModal(true);
                              } else {
                                navigate(`/assignments/${assignment.id}`);
                              }
                            }}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-all hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D] text-slate-700 dark:text-[#A9BACB]"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                              {!course.isEnrolled ? (
                                <Lock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                              ) : (
                                <FileText className="h-4 w-4 text-[#087F78] flex-shrink-0" />
                              )}
                              <span className="text-xs text-slate-700 dark:text-[#A9BACB] truncate">Project: {assignment.title}</span>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-[#087F78] border border-teal-200 uppercase">
                              Submit
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">No modules available.</div>
            )}
          </div>
        </div>
        )}

        {/* Right Column: Video Stage & Lesson Details */}
        <div className="w-full flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-7.5rem)] space-y-6 bg-[#F1F5F7] dark:bg-[#07182D] transition-colors">
          
          {/* Top Breadcrumb & Action Controls Header */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#A9BACB]">
            <div className="flex items-center space-x-2 truncate pr-4">
              <span className="text-slate-400 font-medium">
                {activeModule ? `Module ${activeModuleIndex + 1}: ${activeModule.title}` : 'Course'}
              </span>
              <span>&gt;</span>
              <span className="text-[#0B1F3A] dark:text-white font-bold truncate">
                {activeLessonIndexInModule + 1}. {activeLesson?.title}
              </span>
            </div>

            <div className="flex items-center space-x-2.5 flex-shrink-0">
              <button
                onClick={() => openAIWithAction('GENERAL')}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#E6F7F5] hover:bg-[#d1f1ed] border border-[#087F78]/20 rounded-lg text-xs font-bold text-[#087F78] transition shadow-xs"
                title="Ask Khalil AI about this lesson"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ask AI</span>
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-[#102A43] hover:bg-slate-50 dark:hover:bg-[#152F4A] border border-slate-200 dark:border-[#1E3A56] rounded-lg text-xs font-bold text-[#0B1F3A] dark:text-white transition shadow-xs"
                title="Lesson Notes"
              >
                <FileText className="h-3.5 w-3.5 text-[#087F78]" />
                <span>Notes</span>
              </button>

              <button
                onClick={() => setTheaterMode(!theaterMode)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 border rounded-lg text-xs font-bold transition shadow-xs ${
                  theaterMode
                    ? 'bg-[#087F78] border-[#087F78] text-white shadow-xs'
                    : 'bg-white dark:bg-[#102A43] hover:bg-slate-50 dark:hover:bg-[#152F4A] border-slate-200 dark:border-[#1E3A56] text-slate-600 dark:text-[#A9BACB]'
                }`}
                title="Toggle Theater Mode (Expands Video)"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{theaterMode ? 'Exit Theater' : 'Theater'}</span>
              </button>
            </div>
          </div>

          {/* Free Course Preview Banner for Unenrolled Users */}
          {!course.isEnrolled && (
            <div className="p-4 rounded-2xl bg-white dark:bg-[#102A43] border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-extrabold text-[#0B1F3A] dark:text-white">
                    Free Course Preview (Lesson 1 of {totalLessons})
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-[#A9BACB]">
                    You are watching the free preview video. Enroll in this course to unlock all {totalLessons} lessons, quizzes, assignments & official verified certificate.
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setLockedLessonAttempt(null);
                  setShowEnrollPaywallModal(true);
                }}
                className="px-5 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition flex-shrink-0 whitespace-nowrap uppercase tracking-wider"
              >
                Enroll to Unlock All
              </button>
            </div>
          )}

          {/* Large 16:9 Video Player Screen */}
          {activeLesson ? (
            <div className={`w-full aspect-video rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-[#1E3A56] bg-black flex items-center justify-center transition-all ${
              theaterMode
                ? 'min-h-[550px] sm:min-h-[640px] md:min-h-[720px] lg:min-h-[800px]'
                : 'min-h-[440px] sm:min-h-[520px] md:min-h-[580px] lg:min-h-[650px]'
            }`}>
              <VideoPlayer
                title={activeLesson.title}
                videoSource={activeLesson.videoSource}
                videoUrl={activeLesson.videoUrl}
                youtubeVideoId={activeLesson.youtubeVideoId}
                initialPosition={activeLesson.progress?.lastWatchedPosition || 0}
                onProgressUpdate={handleProgressUpdate}
                onEnded={handleVideoEnded}
              />
            </div>
          ) : (
            <div className="aspect-video bg-white dark:bg-[#102A43] rounded-2xl flex items-center justify-center text-slate-400 border border-slate-200 dark:border-[#1E3A56]">
              Select a lesson from the curriculum sidebar to start watching.
            </div>
          )}

          {/* Lesson Title & Sub-Tabs Section */}
          <div className="space-y-6">
            
            {/* Bold Lesson Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white tracking-tight">
                {activeLessonIndexInModule + 1}. {activeLesson?.title}
              </h1>

              {/* Lesson Completion Status Indicator */}
              {activeLesson && (() => {
                const isLessonCompleted = !!progressMap.get(activeLesson.id) || !!activeLesson.progress?.isCompleted;
                const currentWatchTime = activeLesson.progress?.watchTime || 0;
                const targetDur = Math.max(1, activeLesson.durationMinutes ? activeLesson.durationMinutes * 60 : 300);
                const currentWatchPercent = Math.min(100, Math.round(activeLesson.progress?.progressPercentage || ((currentWatchTime / targetDur) * 100)));
                const isVideo = activeLesson.contentType === 'VIDEO';

                if (isLessonCompleted) {
                  return (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-teal-50 text-[#087F78] border border-teal-200 shadow-xs self-start sm:self-auto font-mono">
                      <CheckCircle2 className="w-4 h-4 text-[#087F78]" />
                      <span>✓ Completed</span>
                    </div>
                  );
                }

                if (isVideo) {
                  return (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#0B223D] text-slate-700 dark:text-[#A9BACB] border border-slate-200 dark:border-[#1E3A56] shadow-xs self-start sm:self-auto font-mono">
                      <PlayCircle className="w-4 h-4 text-[#087F78] animate-pulse" />
                      <span>In Progress ({currentWatchPercent}% watched · 60% auto-completes)</span>
                    </div>
                  );
                }

                // Non-video lessons (e.g. text/article)
                return (
                  <button
                    onClick={markLessonComplete}
                    disabled={completing}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#087F78] hover:bg-[#076E6A] text-white shadow-xs flex items-center gap-2 transition self-start sm:self-auto"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{completing ? 'Saving...' : 'Complete Lesson'}</span>
                  </button>
                );
              })()}
            </div>

            {/* Sub-Tabs: Overview | Transcript | Resources | Notes */}
            <div className="border-b border-slate-200 dark:border-[#1E3A56] flex items-center space-x-8 text-xs font-bold">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 relative transition-all ${
                  activeTab === 'overview'
                    ? 'text-[#087F78] border-b-2 border-[#087F78]'
                    : 'text-slate-500 dark:text-[#A9BACB] hover:text-[#0B1F3A]'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('transcript')}
                className={`pb-3 relative transition-all ${
                  activeTab === 'transcript'
                    ? 'text-[#087F78] border-b-2 border-[#087F78]'
                    : 'text-slate-500 dark:text-[#A9BACB] hover:text-[#0B1F3A]'
                }`}
              >
                Transcript
              </button>
              <button
                onClick={() => setActiveTab('resources')}
                className={`pb-3 relative transition-all ${
                  activeTab === 'resources'
                    ? 'text-[#087F78] border-b-2 border-[#087F78]'
                    : 'text-slate-500 dark:text-[#A9BACB] hover:text-[#0B1F3A]'
                }`}
              >
                Resources {activeLesson?.resources && activeLesson.resources.length > 0 && `(${activeLesson.resources.length})`}
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`pb-3 relative transition-all ${
                  activeTab === 'notes'
                    ? 'text-[#087F78] border-b-2 border-[#087F78]'
                    : 'text-slate-500 dark:text-[#A9BACB] hover:text-[#0B1F3A]'
                }`}
              >
                Notes
              </button>
            </div>

            {/* Tab 1: Overview View */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* AI Learning Assistant Quick Action Banner */}
                <div className="p-5 bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#E6F7F5] border border-[#087F78]/20 text-[#087F78] flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Sparkles className="w-5 h-5 animate-pulse text-[#087F78]" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                        <span>Ask Khalil AI — Lesson Tutor</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-50 text-[#087F78] uppercase tracking-wider font-mono">
                          Ready
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-[#A9BACB]">
                        Need help understanding concepts, code, or practicing this lesson?
                      </p>
                    </div>
                  </div>

                  {/* Contextual Action Chips */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => openAIWithAction('EXPLAIN')}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-[#152F4A] hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D] border border-slate-200 dark:border-[#1E3A56] text-slate-700 dark:text-[#A9BACB] hover:text-[#0B1F3A] rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#087F78]" />
                      <span>Explain Lesson</span>
                    </button>

                    <button
                      onClick={() => openAIWithAction('SUMMARY')}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-[#152F4A] hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D] border border-slate-200 dark:border-[#1E3A56] text-slate-700 dark:text-[#A9BACB] hover:text-[#0B1F3A] rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#087F78]" />
                      <span>Summarize</span>
                    </button>

                    <button
                      onClick={() => openAIWithAction('QUIZ')}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-[#152F4A] hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D] border border-slate-200 dark:border-[#1E3A56] text-slate-700 dark:text-[#A9BACB] hover:text-[#0B1F3A] rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-[#087F78]" />
                      <span>Practice / Quiz</span>
                    </button>

                    <button
                      onClick={() => openAIWithAction('CODE_HELP')}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-[#152F4A] hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D] border border-slate-200 dark:border-[#1E3A56] text-slate-700 dark:text-[#A9BACB] hover:text-[#0B1F3A] rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Code2 className="w-3.5 h-3.5 text-[#087F78]" />
                      <span>Debug Code</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Description Column */}
                <div className={course?.learningObjectives && course.learningObjectives.length > 0 ? "lg:col-span-7 space-y-4" : "lg:col-span-12 space-y-4"}>
                  <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl p-6 space-y-3 shadow-xs">
                    <h3 className="text-xs font-bold text-[#0B1F3A] dark:text-white uppercase tracking-wider">Lesson Overview</h3>
                    {activeLesson?.description ? (
                      <div>
                        <p className={`text-xs sm:text-sm text-slate-600 dark:text-[#A9BACB] leading-relaxed whitespace-pre-line ${!showMoreDesc ? 'line-clamp-6' : ''}`}>
                          {activeLesson.description}
                        </p>
                        {activeLesson.description.length > 250 && (
                          <button
                            onClick={() => setShowMoreDesc(!showMoreDesc)}
                            className="mt-3 text-xs font-bold text-[#087F78] hover:underline transition flex items-center space-x-1"
                          >
                            <span>{showMoreDesc ? 'Show less' : 'Show more'}</span>
                            {showMoreDesc ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        No specific overview description provided for this lesson.
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Learning Outcomes Card (Only if course or lesson has learning objectives) */}
                {course?.learningObjectives && course.learningObjectives.length > 0 && (
                  <div className="lg:col-span-5 bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl p-6 space-y-4 shadow-xs">
                    <h3 className="text-xs font-bold text-[#0B1F3A] dark:text-white tracking-wide uppercase tracking-wider">What You'll Learn in this Course</h3>
                    <ul className="space-y-3">
                      {course.learningObjectives.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start space-x-3 text-xs text-slate-600 dark:text-[#A9BACB]">
                          <CheckCircle2 className="h-4 w-4 text-[#087F78] flex-shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                </div>
              </div>
            )}

            {/* Tab 2: Transcript */}
            {activeTab === 'transcript' && (
              <div className="p-6 bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl space-y-3 text-xs text-slate-600 dark:text-[#A9BACB] leading-relaxed shadow-xs">
                <h4 className="font-bold text-[#0B1F3A] dark:text-white text-xs uppercase tracking-wider">Lesson Transcript</h4>
                {activeLesson?.transcript || activeLesson?.textContent ? (
                  <p className="text-slate-600 dark:text-[#A9BACB] whitespace-pre-wrap leading-relaxed">
                    {activeLesson?.transcript || activeLesson?.textContent}
                  </p>
                ) : (
                  <p className="text-slate-400 italic">
                    No transcript available for this lesson.
                  </p>
                )}
              </div>
            )}

            {/* Tab 3: Resources */}
            {activeTab === 'resources' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 dark:text-[#A9BACB] uppercase tracking-wider">Lesson Files & Downloads</h4>
                {activeLesson?.resources && activeLesson.resources.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeLesson.resources.map((res: LessonResource) => (
                      <div key={res.id} className="flex items-center justify-between p-4 bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl hover:border-[#087F78] transition shadow-xs">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="p-2.5 bg-teal-50 text-[#087F78] rounded-xl flex-shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-[#0B1F3A] dark:text-white truncate">{res.title}</h5>
                            <p className="text-[10px] text-slate-400">{res.fileName || 'Download Resource'}</p>
                          </div>
                        </div>
                        <a
                          href={res.fileUrl.startsWith('http') ? res.fileUrl : `http://localhost:5001${res.fileUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-slate-400 hover:text-[#0B1F3A] dark:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D] transition"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic p-5 bg-white dark:bg-[#102A43] rounded-2xl border border-slate-200 dark:border-[#1E3A56]">
                    No downloadable resources attached to this lesson.
                  </p>
                )}
              </div>
            )}

            {/* Tab 4: Notes (Instructor Notes + Personal Study Notes) */}
            {activeTab === 'notes' && (
              <div className="space-y-6">
                {/* Instructor Notes */}
                {(activeLesson?.notes || activeLesson?.textContent) && (
                  <div className="p-6 bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl space-y-3 text-xs text-slate-600 dark:text-[#A9BACB] leading-relaxed shadow-xs">
                    <h4 className="font-bold text-[#0B1F3A] dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#087F78]" />
                      <span>Instructor Lesson Notes</span>
                    </h4>
                    <p className="text-slate-600 dark:text-[#A9BACB] whitespace-pre-wrap leading-relaxed">
                      {activeLesson?.notes || activeLesson?.textContent}
                    </p>
                  </div>
                )}

                {/* Personal Study Notes */}
                <div className="space-y-3 bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl p-6 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#0B1F3A] dark:text-white uppercase tracking-wider">My Personal Study Notes</h4>
                    <span className="text-[10px] text-[#087F78] font-bold font-mono">Auto-saved to your browser</span>
                  </div>
                  <textarea
                    value={personalNotes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Type your personal study notes, key commands, or code snippets for this lesson..."
                    className="w-full h-40 p-4 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] focus:border-[#087F78] rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:outline-none transition resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* Bottom Navigation Bar: < Previous Lesson | Next Lesson > */}
            <div className="pt-8 border-t border-slate-200 dark:border-[#1E3A56] flex items-center justify-between">
              <button
                onClick={handlePrevLesson}
                disabled={!hasPrevLesson}
                className="px-5 py-2.5 bg-white dark:bg-[#102A43] hover:bg-slate-100 dark:hover:bg-[#0B223D] disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs font-bold text-slate-700 dark:text-[#A9BACB] transition flex items-center space-x-2 shadow-xs"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous Lesson</span>
              </button>

              <button
                onClick={handleNextLesson}
                disabled={!hasNextLesson}
                className="px-6 py-2.5 bg-[#087F78] hover:bg-[#076E6A] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-2"
              >
                <span>Next Lesson</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Floating Auto-Advance Toast */}
      {autoAdvanceToast && (
        <div className="fixed bottom-8 right-8 z-50 bg-white dark:bg-[#102A43] border border-teal-200 shadow-xl rounded-2xl p-4 max-w-sm flex items-center gap-3 animate-slide-up text-[#0B1F3A] dark:text-white">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-[#087F78] flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-[#087F78] uppercase tracking-wider font-mono">Lesson Completed!</div>
            <div className="text-xs font-bold truncate text-[#0B1F3A] dark:text-white">Up Next: {autoAdvanceToast.nextTitle}</div>
          </div>
          <div className="w-4 h-4 border-2 border-[#087F78] border-t-transparent rounded-full animate-spin flex-shrink-0" />
        </div>
      )}

      {/* Course Completion & Certification Checklist Modal */}
      {showEligibilityModal && eligibilityData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 text-[#0B1F3A] dark:text-white relative overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E3A56] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <Award className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white">Course Certification Status</h3>
                  <p className="text-xs text-slate-500 dark:text-[#A9BACB]">{course.title}</p>
                </div>
              </div>
              <button onClick={() => setShowEligibilityModal(false)} className="text-slate-400 hover:text-slate-700 dark:text-[#A9BACB] p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bars */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-[#1E3A56]">
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-[#A9BACB] uppercase block font-mono">Learning Progress</span>
                <div className="text-lg font-black text-[#0B1F3A] dark:text-white">{Math.round(eligibilityData.learningProgressPercentage)}%</div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-[#0B223D] rounded-full overflow-hidden mt-1">
                  <div className="bg-[#087F78] h-full rounded-full" style={{ width: `${eligibilityData.learningProgressPercentage}%` }} />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-[#A9BACB] uppercase block font-mono">Certification Progress</span>
                <div className="text-lg font-black text-[#087F78]">{Math.round(eligibilityData.certificationProgressPercentage)}%</div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-[#0B223D] rounded-full overflow-hidden mt-1">
                  <div className="bg-[#087F78] h-full rounded-full" style={{ width: `${eligibilityData.certificationProgressPercentage}%` }} />
                </div>
              </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-[#A9BACB]">Requirement Checklist</h4>
              
              {/* 1. Lessons */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-[#1E3A56] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {eligibilityData.requirements.lessons.satisfied ? (
                    <CheckCircle2 className="w-5 h-5 text-[#087F78] flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-[#0B1F3A] dark:text-white">Required Lessons Watched</div>
                    <div className="text-[11px] text-slate-500 dark:text-[#A9BACB]">
                      {eligibilityData.requirements.lessons.requiredCompleted} of {eligibilityData.requirements.lessons.requiredTotal} required lessons completed
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase font-mono ${
                  eligibilityData.requirements.lessons.satisfied ? 'bg-teal-50 text-[#087F78]' : 'bg-amber-50 text-amber-700'
                }`}>
                  {eligibilityData.requirements.lessons.satisfied ? 'COMPLETE' : 'INCOMPLETE'}
                </span>
              </div>

              {/* 2. Quizzes */}
              {eligibilityData.requirements.quizzes.requiredTotal > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-[#1E3A56] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {eligibilityData.requirements.quizzes.satisfied ? (
                      <CheckCircle2 className="w-5 h-5 text-[#087F78] flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-[#0B1F3A] dark:text-white">Required Quizzes Passed</div>
                      <div className="text-[11px] text-slate-500 dark:text-[#A9BACB]">
                        {eligibilityData.requirements.quizzes.requiredPassed} of {eligibilityData.requirements.quizzes.requiredTotal} quizzes passed
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase font-mono ${
                    eligibilityData.requirements.quizzes.satisfied ? 'bg-teal-50 text-[#087F78]' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {eligibilityData.requirements.quizzes.satisfied ? 'PASSED' : 'PENDING'}
                  </span>
                </div>
              )}

              {/* 3. Assignments */}
              {eligibilityData.requirements.assignments.requiredTotal > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-[#1E3A56] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {eligibilityData.requirements.assignments.satisfied ? (
                      <CheckCircle2 className="w-5 h-5 text-[#087F78] flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-[#0B1F3A] dark:text-white">Required Assignments Approved</div>
                      <div className="text-[11px] text-slate-500 dark:text-[#A9BACB]">
                        {eligibilityData.requirements.assignments.requiredPassed} of {eligibilityData.requirements.assignments.requiredTotal} assignments approved
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase font-mono ${
                    eligibilityData.requirements.assignments.satisfied ? 'bg-teal-50 text-[#087F78]' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {eligibilityData.requirements.assignments.satisfied ? 'APPROVED' : 'PENDING'}
                  </span>
                </div>
              )}

              {/* 4. Final Assessment */}
              {eligibilityData.requirements.finalAssessment.required && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-[#1E3A56] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {eligibilityData.requirements.finalAssessment.satisfied ? (
                      <CheckCircle2 className="w-5 h-5 text-[#087F78] flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-[#0B1F3A] dark:text-white">Final Capstone Assessment</div>
                      <div className="text-[11px] text-slate-500 dark:text-[#A9BACB]">
                        Passing score: {eligibilityData.requirements.finalAssessment.passingScore}%
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase font-mono ${
                    eligibilityData.requirements.finalAssessment.satisfied ? 'bg-teal-50 text-[#087F78]' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {eligibilityData.requirements.finalAssessment.satisfied ? 'PASSED' : 'REQUIRED'}
                  </span>
                </div>
              )}
            </div>

            {/* Missing Requirements Guidance */}
            {eligibilityData.missingRequirements.length > 0 && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-2">
                <div className="text-xs font-bold text-[#EF4444] flex items-center gap-1.5 uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4" /> Action Items to Earn Certificate
                </div>
                <ul className="text-xs text-slate-600 dark:text-[#A9BACB] space-y-1.5 pl-1">
                  {eligibilityData.missingRequirements.map((item, idx) => (
                    <li key={idx} className="leading-relaxed flex items-start gap-1.5">
                      <span className="text-[#EF4444] font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2">
              {eligibilityData.eligible ? (
                <Link
                  to={eligibilityData.certificate ? `/certificates/${eligibilityData.certificate.certificateNumber}` : '/student/certificates'}
                  className="w-full py-3.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  <Award className="w-4 h-4" />
                  <span>View Official Verified Certificate</span>
                </Link>
              ) : (
                <button
                  onClick={() => setShowEligibilityModal(false)}
                  className="w-full py-3 bg-slate-100 dark:bg-[#0B223D] hover:bg-slate-200 dark:hover:bg-[#1E3A56] dark:bg-[#0B223D] text-slate-700 dark:text-[#A9BACB] text-xs font-bold rounded-xl border border-slate-200 dark:border-[#1E3A56] transition"
                >
                  Continue Learning & Complete Requirements
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Completion & Certificate Ready / Assignment Requirement Modal */}
      {courseCompletedModal && (() => {
        const isCertificateEligible = !!eligibilityData?.eligible;
        const allCourseAssignments = (course?.modules || []).flatMap((m) => m.assignments || []);
        const allCourseQuizzes = (course?.modules || []).flatMap((m) => m.quizzes || []);
        const targetAssignmentId = eligibilityData?.pendingAssignmentId || (allCourseAssignments.length > 0 ? allCourseAssignments[0].id : null);
        const targetQuizId = eligibilityData?.pendingQuizId || (allCourseQuizzes.length > 0 ? allCourseQuizzes[0].id : null);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl space-y-6 text-[#0B1F3A] dark:text-white relative overflow-hidden animate-in fade-in zoom-in-95">
              <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-xs">
                <Award className="w-10 h-10 text-amber-500" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6] border border-teal-200 dark:border-teal-700/50 tracking-wider font-mono">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Course Lectures 100% Completed</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white">🎉 Congratulations!</h2>
                <p className="text-slate-500 dark:text-[#A9BACB] text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
                  {isCertificateEligible ? (
                    <>You have completed all coursework and assessments in <strong className="text-[#0B1F3A] dark:text-white">"{course?.title}"</strong>. Your official verified certificate of accomplishment is now generated and ready to download!</>
                  ) : (
                    <>You have successfully finished every video lecture in <strong className="text-[#0B1F3A] dark:text-white">"{course?.title}"</strong>! To earn and unlock your official certificate, you must now complete the final course assignment and score <strong>80% or higher</strong>.</>
                  )}
                </p>
              </div>

              {isCertificateEligible ? (
                <div className="p-4 bg-slate-50 dark:bg-[#152F4A] rounded-2xl border border-slate-200 dark:border-[#1E3A56] flex items-center justify-between text-left">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6]">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#0B1F3A] dark:text-white">Official Verified Certificate</div>
                      <div className="text-[11px] text-slate-400">Ready for portfolio, LinkedIn & PDF export</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6] text-[10px] font-bold border border-teal-200 dark:border-teal-700/50 uppercase font-mono">
                    ISSUED
                  </span>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-[#152F4A] rounded-2xl border border-slate-200 dark:border-[#1E3A56] text-left space-y-2.5 text-xs text-slate-600 dark:text-[#A9BACB]">
                  <div className="font-bold text-[#0B1F3A] dark:text-white flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                    <span>Certification Criteria (Final Step)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] space-y-0.5">
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">Passing Grade</span>
                      <strong className="text-[#087F78] dark:text-[#14B8A6] font-extrabold text-xs">80% or Higher</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] space-y-0.5">
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">Max Attempts</span>
                      <strong className="text-[#0B1F3A] dark:text-white font-extrabold text-xs">3 Attempts Allowed</strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    🛡️ <strong>Anti-Cheating Monitored</strong>: Tab-switching and external copying are prohibited during the assessment.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2">
                {isCertificateEligible ? (
                  <Link
                    to="/student/certificates"
                    className="w-full py-3.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                  >
                    <Award className="w-4 h-4" />
                    <span>View & Download My Certificate</span>
                  </Link>
                ) : targetAssignmentId ? (
                  <Link
                    to={`/assignments/${targetAssignmentId}`}
                    className="w-full py-3.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Start Final Assignment (80% Passing Score) →</span>
                  </Link>
                ) : targetQuizId ? (
                  <Link
                    to={`/quizzes/${targetQuizId}`}
                    className="w-full py-3.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Take Final Assessment (80% Passing Score) →</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      setCourseCompletedModal(false);
                      setShowEligibilityModal(true);
                    }}
                    className="w-full py-3.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                  >
                    <Award className="w-4 h-4" />
                    <span>View Certification Checklist</span>
                  </button>
                )}

                <button
                  onClick={() => setCourseCompletedModal(false)}
                  className="w-full py-2.5 bg-slate-100 dark:bg-[#0B223D] hover:bg-slate-200 dark:hover:bg-[#1E3A56] text-slate-700 dark:text-[#A9BACB] text-xs font-bold rounded-xl border border-slate-200 dark:border-[#1E3A56] transition"
                >
                  Continue Reviewing Lessons
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Course Enrollment Paywall Modal for Locked Lessons / Previews */}
      {showEnrollPaywallModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 text-[#0B1F3A] dark:text-white relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E3A56] pb-4">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-extrabold text-[#0B1F3A] dark:text-white truncate">
                    {lockedLessonAttempt ? `Unlock "${lockedLessonAttempt.title}"` : 'Enroll to Unlock Course'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#A9BACB] truncate">{course.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEnrollPaywallModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:text-[#A9BACB] p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D] transition flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-[#A9BACB] leading-relaxed">
                Free preview access is limited to the first introductory video. To stream all {totalLessons} video lessons, take module quizzes, submit assignments, and earn your verified certificate of completion, please enroll below.
              </p>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-[#1E3A56] space-y-3">
                <div className="flex justify-between items-baseline border-b border-slate-200 dark:border-[#1E3A56] pb-2">
                  <span className="text-xs text-slate-500 dark:text-[#A9BACB] font-bold uppercase tracking-wider">Tuition:</span>
                  <span className="text-2xl font-black text-[#087F78]">
                    {course.isFree || course.price === 0 ? 'FREE' : `${(course.discountPrice !== null && course.discountPrice !== undefined ? course.discountPrice : course.price).toLocaleString()} KSH`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-[#A9BACB] pt-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#087F78] flex-shrink-0" />
                    <span>All {totalLessons} Video Lessons</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#087F78] flex-shrink-0" />
                    <span>Interactive Quizzes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#087F78] flex-shrink-0" />
                    <span>Hands-on Projects</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#087F78] flex-shrink-0" />
                    <span>Official Certificate</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-1">
              <button
                onClick={() => {
                  setShowEnrollPaywallModal(false);
                  if (course.isFree || course.price === 0) {
                    navigate(`/courses/${course.slug}`);
                  } else {
                    navigate(`/checkout/${course.id}`);
                  }
                }}
                className="w-full py-3.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                <span>{course.isFree || course.price === 0 ? 'Enroll in Course (Free)' : 'Enroll & Get Lifetime Access'}</span>
              </button>
              <button
                onClick={() => setShowEnrollPaywallModal(false)}
                className="w-full py-2.5 bg-slate-100 dark:bg-[#0B223D] hover:bg-slate-200 dark:hover:bg-[#1E3A56] dark:bg-[#0B223D] text-slate-700 dark:text-[#A9BACB] text-xs font-bold rounded-xl border border-slate-200 dark:border-[#1E3A56] transition"
              >
                Continue Watching Free Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ask Khalil AI Learning Assistant Drawer */}
      <AskKhalilAIDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        courseId={course?.id}
        courseTitle={course?.title}
        lessonId={activeLesson?.id}
        lessonTitle={activeLesson?.title}
        initialAction={aiInitialAction}
      />
    </div>
  );
};
