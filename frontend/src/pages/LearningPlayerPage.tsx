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

      const cData: Course = courseRes.value.data.course;
      setCourse(cData);

      let pData = null;
      if (progressRes.status === 'fulfilled' && progressRes.value.data.success) {
        pData = progressRes.value.data.progress || progressRes.value.data;
        setProgressData(pData);
      }

      if (eligRes.status === 'fulfilled' && eligRes.value.data.success) {
        setEligibilityData(eligRes.value.data);
      }

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

    // Strict access control: If course is NOT enrolled and target lesson is NOT the first lesson (or isLocked):
    const isFirstLesson = all.length > 0 && all[0].id === target.id;
    const isLocked = target.isLocked || (!currentCourse.isEnrolled && !isFirstLesson);

    if (isLocked) {
      setLockedLessonAttempt(target);
      setShowEnrollPaywallModal(true);
      return;
    }

    setSearchParams({ lessonId: target.id });

    const currentProg = progressOverride || progressData;
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
      <div className="min-h-screen bg-[#0A1322] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#23426A] border-t-[#4FD1C5] rounded-full animate-spin"></div>
        <p className="text-xs text-[#CBD5E1] font-mono tracking-wider animate-pulse">Initializing Virtual Classroom...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-[#0A1322] flex items-center justify-center p-6">
        <div className="bg-[#132742] border border-[#23426A] rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] mx-auto flex items-center justify-center font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-[#F8FAFC]">Classroom Access Restricted</h2>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            {error || 'You are not enrolled in this course or this course content is currently unpublished.'}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Link
              to="/courses"
              className="px-5 py-2.5 bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white font-bold rounded-xl text-xs transition shadow-sm"
            >
              Browse Catalog
            </Link>
            <Link
              to="/dashboard"
              className="px-5 py-2.5 bg-[#0B1B35] hover:bg-[#142B4D] border border-[#23426A] text-white font-bold rounded-xl text-xs transition"
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
    <div className="min-h-screen bg-[#0A1322] text-[#F8FAFC] flex flex-col font-sans">
      
      {/* 1. Global LMS Header Bar */}
      <div className="h-14 bg-[#0E1D33] border-b border-[#23426A] flex items-center justify-between px-4 sm:px-6 z-20 shrink-0">
        <div className="flex items-center space-x-4 min-w-0">
          <Link
            to={`/courses/${course.slug}`}
            className="flex items-center space-x-1.5 text-xs text-[#CBD5E1] hover:text-[#4FD1C5] transition font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Overview</span>
          </Link>
          <span className="text-[#23426A] hidden sm:inline">|</span>
          <h2 className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] truncate max-w-sm sm:max-w-md">
            {course.title}
          </h2>
        </div>

        {/* Course Progress Counter & Bar & Status Actions */}
        <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0">
          {course.isEnrolled ? (
            <div className="hidden md:flex items-center space-x-3 text-xs font-semibold text-[#CBD5E1]">
              <span>
                Lesson <strong className="text-[#F8FAFC]">{currentLessonIndex >= 0 ? currentLessonIndex + 1 : 1}</strong> of <strong className="text-[#F8FAFC]">{totalLessons}</strong>
              </span>
              <span className="text-[#23426A]">|</span>
              <span>
                <strong className="text-[#F8FAFC]">{completedLessons} / {totalLessons}</strong> completed
              </span>
              <span className="text-[#23426A]">|</span>
              <span className="font-bold text-[#4FD1C5]">{progressPercent}%</span>
              <div className="w-20 sm:w-24 h-2 bg-[#0A1322] rounded-full overflow-hidden border border-[#23426A]">
                <div
                  className="bg-[#4FD1C5] h-full rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-xs text-[#F59E0B] font-bold">
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:from-[#D97706] hover:to-[#F59E0B] text-[#0A1322] shadow-md shadow-[#F59E0B]/20 hover:scale-105 transition"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Unlock Full Course</span>
            </button>
          ) : (
            eligibilityData && (
              <button
                onClick={() => setShowEligibilityModal(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                  eligibilityData.eligible
                    ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 hover:bg-[#22C55E]/30 animate-pulse'
                    : 'bg-[#132742] text-[#CBD5E1] border border-[#23426A] hover:border-[#4FD1C5] hover:text-[#4FD1C5]'
                }`}
                title="Course Completion & Certification Requirements"
              >
                <Award className="h-3.5 w-3.5 text-[#F59E0B]" />
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#4FD1C5] to-[#38B2AC] hover:from-[#38B2AC] hover:to-[#319795] text-[#0A1322] font-black rounded-xl text-xs transition shadow-md shadow-[#4FD1C5]/20 hover:scale-105 transform"
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
          <div className="w-full bg-[#0E1D33] border-r border-[#23426A] p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-7.5rem)]">
          
          {/* Top Course Card Header */}
          <div className="p-4 bg-[#132742] border border-[#23426A] rounded-2xl space-y-2 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#1A365D] border border-[#4FD1C5]/40 text-[#4FD1C5] flex items-center justify-center font-bold flex-shrink-0">
                <Disc className="h-5 w-5 text-[#4FD1C5] animate-pulse" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-[#F8FAFC] truncate leading-tight">{course.title}</h3>
                <span className="text-[11px] text-[#94A3B8] font-medium">
                  {course.isEnrolled ? `${completedLessons} / ${totalLessons} completed` : `Free Preview: 1 of ${totalLessons} videos`}
                </span>
              </div>
            </div>
          </div>

          {/* Certification Status or Free Preview Banner in Sidebar */}
          {!course.isEnrolled ? (
            <div className="p-3.5 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#F59E0B] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Free Preview
                </span>
                <span className="text-[10px] font-mono text-[#CBD5E1]">1 free video</span>
              </div>
              <p className="text-[11px] text-[#CBD5E1] leading-snug">
                You can watch Lesson 1 for free. Enroll now to unlock all {totalLessons} lessons & assignments.
              </p>
              <button
                onClick={() => {
                  setLockedLessonAttempt(null);
                  setShowEnrollPaywallModal(true);
                }}
                className="w-full py-2 bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:from-[#D97706] hover:to-[#F59E0B] text-[#0A1322] font-black text-xs rounded-xl shadow transition text-center uppercase tracking-wider"
              >
                Unlock Course
              </button>
            </div>
          ) : (
            eligibilityData && (
              <button
                onClick={() => setShowEligibilityModal(true)}
                className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between shadow-sm ${
                  eligibilityData.eligible
                    ? 'bg-[#22C55E]/10 border-[#22C55E]/40 hover:bg-[#22C55E]/20'
                    : 'bg-[#132742] border-[#23426A] hover:border-[#4FD1C5]/60'
                }`}
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8] block flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>{eligibilityData.eligible ? 'Certificate Ready' : 'Certification Criteria'}</span>
                  </span>
                  <div className="text-xs font-bold text-[#F8FAFC] truncate">
                    {eligibilityData.eligible ? '✅ All Requirements Satisfied' : `${eligibilityData.missingRequirements.length} item(s) pending`}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                  eligibilityData.eligible ? 'bg-[#22C55E] text-[#0A1322]' : 'bg-[#0E1D33] text-[#4FD1C5] border border-[#23426A]'
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
                  <div key={mod.id} className="bg-[#132742] border border-[#23426A] rounded-2xl overflow-hidden shadow-sm">
                    {/* Module Accordion Header */}
                    <button
                      onClick={() => toggleModuleAccordion(mod.id)}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#1A365D]/60 transition"
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">
                          MODULE {mIdx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-[#F8FAFC] truncate">{mod.title}</h4>
                        <span className="text-[11px] text-[#CBD5E1]">
                          {course.isEnrolled ? `${modCompleted} / ${lessons.length} completed` : `${lessons.length} lessons`}
                        </span>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-[#94A3B8] flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[#94A3B8] flex-shrink-0" />
                      )}
                    </button>

                    {/* Lesson, Quiz & Assignment Items inside Module */}
                    {isOpen && (
                      <div className="border-t border-[#23426A] divide-y divide-[#23426A]/60 bg-[#0A1322]">
                        {/* Lessons */}
                        {lessons.map((les, lIdx) => {
                          const isActive = activeLesson?.id === les.id;
                          const isFirstLessonInCourse = allLessons.length > 0 && allLessons[0].id === les.id;
                          const isLessonLocked = les.isLocked || (!course.isEnrolled && !isFirstLessonInCourse);
                          const isCompleted = !isLessonLocked && (!!progressMap.get(les.id) || !!les.progress?.isCompleted || (activeLesson?.id === les.id && !!activeLesson?.progress?.isCompleted));
                          const isInProgress = !isLessonLocked && !isCompleted && ((les.progress?.watchTime || 0) > 0 || (les.progress?.lastWatchedPosition || 0) > 0 || (activeLesson?.id === les.id && (activeLesson?.progress?.watchTime || 0) > 0));

                          return (
                            <button
                              key={les.id}
                              onClick={() => loadLesson(les.id)}
                              className={`w-full flex items-center justify-between px-3.5 py-3 text-left transition-all ${
                                isActive
                                  ? 'bg-[#4FD1C5] text-[#0A1322] font-extrabold shadow-md shadow-[#4FD1C5]/20'
                                  : isLessonLocked
                                  ? 'hover:bg-[#132742]/40 text-[#94A3B8]'
                                  : 'hover:bg-[#132742]/60 text-[#CBD5E1]'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                                {isLessonLocked ? (
                                  <Lock className="h-4 w-4 text-[#94A3B8] flex-shrink-0" />
                                ) : isCompleted ? (
                                  <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-[#0A1322]' : 'text-[#22C55E]'}`} />
                                ) : isInProgress || isActive ? (
                                  <PlayCircle className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-[#0A1322]' : 'text-[#4FD1C5]'}`} />
                                ) : (
                                  <Circle className="h-4 w-4 text-[#94A3B8] flex-shrink-0" />
                                )}
                                <span className={`text-xs truncate ${isCompleted && !isActive ? 'text-[#F8FAFC]' : isLessonLocked ? 'text-[#94A3B8]' : ''}`}>
                                  {lIdx + 1}. {les.title}
                                </span>
                                {isLessonLocked && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0E1D33] text-[#94A3B8] border border-[#23426A] uppercase flex-shrink-0">
                                    Locked
                                  </span>
                                )}
                                {!isLessonLocked && isFirstLessonInCourse && !course.isEnrolled && (
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#4FD1C5]/20 text-[#4FD1C5] border border-[#4FD1C5]/30 uppercase flex-shrink-0">
                                    Preview
                                  </span>
                                )}
                              </div>
                              <span className={`text-[10px] font-mono flex-shrink-0 ${isActive ? 'text-[#0A1322]/80 font-bold' : 'text-[#94A3B8]'}`}>
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
                            className="w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-all hover:bg-[#132742]/60 text-[#CBD5E1]"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                              {!course.isEnrolled ? (
                                <Lock className="h-4 w-4 text-[#94A3B8] flex-shrink-0" />
                              ) : (
                                <HelpCircle className="h-4 w-4 text-[#F59E0B] flex-shrink-0" />
                              )}
                              <span className="text-xs text-[#CBD5E1] truncate">Quiz: {quiz.title}</span>
                            </div>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 uppercase">
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
                            className="w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-all hover:bg-[#132742]/60 text-[#CBD5E1]"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                              {!course.isEnrolled ? (
                                <Lock className="h-4 w-4 text-[#94A3B8] flex-shrink-0" />
                              ) : (
                                <FileText className="h-4 w-4 text-[#4FD1C5] flex-shrink-0" />
                              )}
                              <span className="text-xs text-[#CBD5E1] truncate">Project: {assignment.title}</span>
                            </div>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#4FD1C5]/15 text-[#4FD1C5] border border-[#4FD1C5]/30 uppercase">
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
              <div className="p-6 text-center text-xs text-[#94A3B8]">No modules available.</div>
            )}
          </div>
        </div>
        )}

        {/* Right Column: Video Stage & Lesson Details */}
        <div className="w-full flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-7.5rem)] space-y-6 bg-[#0A1322]">
          
          {/* Top Breadcrumb & Action Controls Header */}
          <div className="flex items-center justify-between text-xs text-[#CBD5E1]">
            <div className="flex items-center space-x-2 truncate pr-4">
              <span className="text-[#94A3B8] font-medium">
                {activeModule ? `Module ${activeModuleIndex + 1}: ${activeModule.title}` : 'Course'}
              </span>
              <span>&gt;</span>
              <span className="text-[#F8FAFC] font-bold truncate">
                {activeLessonIndexInModule + 1}. {activeLesson?.title}
              </span>
            </div>

            <div className="flex items-center space-x-2.5 flex-shrink-0">
              <button
                onClick={() => openAIWithAction('GENERAL')}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#132742] hover:bg-[#1A365D] border border-[#4FD1C5]/40 hover:border-[#4FD1C5] rounded-lg text-xs font-bold text-[#4FD1C5] transition shadow-sm"
                title="Ask Khalil AI about this lesson"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ask AI</span>
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#132742] hover:bg-[#1A365D] border border-[#23426A] rounded-lg text-xs font-semibold text-[#F8FAFC] transition shadow-sm"
                title="Lesson Notes"
              >
                <FileText className="h-3.5 w-3.5 text-[#4FD1C5]" />
                <span>Notes</span>
              </button>

              <button
                onClick={() => setTheaterMode(!theaterMode)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition shadow-sm ${
                  theaterMode
                    ? 'bg-[#4FD1C5] border-[#4FD1C5] text-[#0A1322] font-bold shadow-[#4FD1C5]/20'
                    : 'bg-[#132742] hover:bg-[#1A365D] border-[#23426A] text-[#CBD5E1]'
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
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1A365D] to-[#132742] border border-[#4FD1C5]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4FD1C5]/20 text-[#4FD1C5] flex items-center justify-center font-bold flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC]">
                    Free Course Preview (Lesson 1 of {totalLessons})
                  </div>
                  <div className="text-[11px] text-[#CBD5E1]">
                    You are watching the free preview video. Enroll in this course to unlock all {totalLessons} lessons, quizzes, assignments & official verified certificate.
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setLockedLessonAttempt(null);
                  setShowEnrollPaywallModal(true);
                }}
                className="px-5 py-2.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-black text-xs rounded-xl shadow-lg shadow-[#4FD1C5]/20 transition flex-shrink-0 whitespace-nowrap uppercase tracking-wider"
              >
                Enroll to Unlock All
              </button>
            </div>
          )}

          {/* Large 16:9 Video Player Screen */}
          {activeLesson ? (
            <div className={`w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-[#23426A] bg-black flex items-center justify-center transition-all ${
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
            <div className="aspect-video bg-[#0E1D33] rounded-2xl flex items-center justify-center text-[#94A3B8] border border-[#23426A]">
              Select a lesson from the curriculum sidebar to start watching.
            </div>
          )}

          {/* Lesson Title & Sub-Tabs Section */}
          <div className="space-y-6">
            
            {/* Bold Lesson Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
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
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/40 shadow-sm shadow-[#22C55E]/10 self-start sm:self-auto">
                      <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                      <span>✓ Completed</span>
                    </div>
                  );
                }

                if (isVideo) {
                  return (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#4FD1C5]/10 text-[#4FD1C5] border border-[#4FD1C5]/30 shadow-sm self-start sm:self-auto">
                      <PlayCircle className="w-4 h-4 text-[#4FD1C5] animate-pulse" />
                      <span>In Progress ({currentWatchPercent}% watched · 60% auto-completes)</span>
                    </div>
                  );
                }

                // Non-video lessons (e.g. text/article)
                return (
                  <button
                    onClick={markLessonComplete}
                    disabled={completing}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] shadow-lg shadow-[#4FD1C5]/20 flex items-center gap-2 transition self-start sm:self-auto"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{completing ? 'Saving...' : 'Complete Lesson'}</span>
                  </button>
                );
              })()}
            </div>

            {/* Sub-Tabs: Overview | Transcript | Resources | Notes */}
            <div className="border-b border-[#23426A] flex items-center space-x-8 text-xs font-bold">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 relative transition-all ${
                  activeTab === 'overview'
                    ? 'text-[#4FD1C5] border-b-2 border-[#4FD1C5]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('transcript')}
                className={`pb-3 relative transition-all ${
                  activeTab === 'transcript'
                    ? 'text-[#4FD1C5] border-b-2 border-[#4FD1C5]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                Transcript
              </button>
              <button
                onClick={() => setActiveTab('resources')}
                className={`pb-3 relative transition-all ${
                  activeTab === 'resources'
                    ? 'text-[#4FD1C5] border-b-2 border-[#4FD1C5]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                Resources {activeLesson?.resources && activeLesson.resources.length > 0 && `(${activeLesson.resources.length})`}
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`pb-3 relative transition-all ${
                  activeTab === 'notes'
                    ? 'text-[#4FD1C5] border-b-2 border-[#4FD1C5]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                Notes
              </button>
            </div>

            {/* Tab 1: Overview View */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* AI Learning Assistant Quick Action Banner */}
                <div className="p-5 bg-gradient-to-r from-[#102342] to-[#132742] border border-[#23426A] rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#1A365D] border border-[#4FD1C5]/40 text-[#4FD1C5] flex items-center justify-center flex-shrink-0 shadow-md">
                      <Sparkles className="w-5 h-5 animate-pulse text-[#4FD1C5]" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
                        <span>Ask Khalil AI — Lesson Tutor</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#4FD1C5]/15 text-[#4FD1C5] uppercase tracking-wider">
                          Ready
                        </span>
                      </h4>
                      <p className="text-[11px] text-[#94A3B8]">
                        Need help understanding concepts, code, or practicing this lesson?
                      </p>
                    </div>
                  </div>

                  {/* Contextual Action Chips */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => openAIWithAction('EXPLAIN')}
                      className="px-3 py-1.5 bg-[#0E1D33] hover:bg-[#1A365D] border border-[#23426A] hover:border-[#4FD1C5]/40 text-[#CBD5E1] hover:text-[#F8FAFC] rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#4FD1C5]" />
                      <span>Explain Lesson</span>
                    </button>

                    <button
                      onClick={() => openAIWithAction('SUMMARY')}
                      className="px-3 py-1.5 bg-[#0E1D33] hover:bg-[#1A365D] border border-[#23426A] hover:border-[#4FD1C5]/40 text-[#CBD5E1] hover:text-[#F8FAFC] rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#4FD1C5]" />
                      <span>Summarize</span>
                    </button>

                    <button
                      onClick={() => openAIWithAction('QUIZ')}
                      className="px-3 py-1.5 bg-[#0E1D33] hover:bg-[#1A365D] border border-[#23426A] hover:border-[#4FD1C5]/40 text-[#CBD5E1] hover:text-[#F8FAFC] rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-[#4FD1C5]" />
                      <span>Practice / Quiz</span>
                    </button>

                    <button
                      onClick={() => openAIWithAction('CODE_HELP')}
                      className="px-3 py-1.5 bg-[#0E1D33] hover:bg-[#1A365D] border border-[#23426A] hover:border-[#4FD1C5]/40 text-[#CBD5E1] hover:text-[#F8FAFC] rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Code2 className="w-3.5 h-3.5 text-[#4FD1C5]" />
                      <span>Debug Code</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Description Column */}
                <div className={course?.learningObjectives && course.learningObjectives.length > 0 ? "lg:col-span-7 space-y-4" : "lg:col-span-12 space-y-4"}>
                  <div className="bg-[#132742] border border-[#23426A] rounded-2xl p-6 space-y-3 shadow-xl">
                    <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">Lesson Overview</h3>
                    {activeLesson?.description ? (
                      <div>
                        <p className={`text-xs sm:text-sm text-[#CBD5E1] leading-relaxed whitespace-pre-line ${!showMoreDesc ? 'line-clamp-6' : ''}`}>
                          {activeLesson.description}
                        </p>
                        {activeLesson.description.length > 250 && (
                          <button
                            onClick={() => setShowMoreDesc(!showMoreDesc)}
                            className="mt-3 text-xs font-bold text-[#4FD1C5] hover:text-[#38B2AC] transition flex items-center space-x-1"
                          >
                            <span>{showMoreDesc ? 'Show less' : 'Show more'}</span>
                            {showMoreDesc ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-[#94A3B8] italic">
                        No specific overview description provided for this lesson.
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Learning Outcomes Card (Only if course or lesson has learning objectives) */}
                {course?.learningObjectives && course.learningObjectives.length > 0 && (
                  <div className="lg:col-span-5 bg-[#132742] border border-[#23426A] rounded-2xl p-6 space-y-4 shadow-xl">
                    <h3 className="text-xs font-bold text-[#F8FAFC] tracking-wide uppercase tracking-wider">What You'll Learn in this Course</h3>
                    <ul className="space-y-3">
                      {course.learningObjectives.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start space-x-3 text-xs text-[#CBD5E1]">
                          <CheckCircle2 className="h-4 w-4 text-[#22C55E] flex-shrink-0 mt-0.5" />
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
              <div className="p-6 bg-[#132742] border border-[#23426A] rounded-2xl space-y-3 text-xs text-[#CBD5E1] leading-relaxed shadow-md">
                <h4 className="font-bold text-[#F8FAFC] text-xs uppercase tracking-wider">Lesson Transcript</h4>
                {activeLesson?.transcript || activeLesson?.textContent ? (
                  <p className="text-[#CBD5E1] whitespace-pre-wrap leading-relaxed">
                    {activeLesson?.transcript || activeLesson?.textContent}
                  </p>
                ) : (
                  <p className="text-[#94A3B8] italic">
                    No transcript available for this lesson.
                  </p>
                )}
              </div>
            )}

            {/* Tab 3: Resources */}
            {activeTab === 'resources' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Lesson Files & Downloads</h4>
                {activeLesson?.resources && activeLesson.resources.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeLesson.resources.map((res: LessonResource) => (
                      <div key={res.id} className="flex items-center justify-between p-4 bg-[#132742] border border-[#23426A] rounded-2xl hover:border-[#4FD1C5] transition">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="p-2.5 bg-[#1A365D] text-[#4FD1C5] rounded-xl flex-shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-[#F8FAFC] truncate">{res.title}</h5>
                            <p className="text-[10px] text-[#94A3B8]">{res.fileName || 'Download Resource'}</p>
                          </div>
                        </div>
                        <a
                          href={res.fileUrl.startsWith('http') ? res.fileUrl : `http://localhost:5001${res.fileUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#1A365D] transition"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#94A3B8] italic p-5 bg-[#132742] rounded-2xl border border-[#23426A]">
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
                  <div className="p-6 bg-[#132742] border border-[#23426A] rounded-2xl space-y-3 text-xs text-[#CBD5E1] leading-relaxed shadow-md">
                    <h4 className="font-bold text-[#F8FAFC] text-xs uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#4FD1C5]" />
                      <span>Instructor Lesson Notes</span>
                    </h4>
                    <p className="text-[#CBD5E1] whitespace-pre-wrap leading-relaxed">
                      {activeLesson?.notes || activeLesson?.textContent}
                    </p>
                  </div>
                )}

                {/* Personal Study Notes */}
                <div className="space-y-3 bg-[#132742] border border-[#23426A] rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">My Personal Study Notes</h4>
                    <span className="text-[10px] text-[#4FD1C5] font-semibold">Auto-saved to your browser</span>
                  </div>
                  <textarea
                    value={personalNotes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Type your personal study notes, key commands, or code snippets for this lesson..."
                    className="w-full h-40 p-4 bg-[#0E1D33] border border-[#23426A] focus:border-[#4FD1C5] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none transition resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* Bottom Navigation Bar: < Previous Lesson | Next Lesson > */}
            <div className="pt-8 border-t border-[#23426A] flex items-center justify-between">
              <button
                onClick={handlePrevLesson}
                disabled={!hasPrevLesson}
                className="px-5 py-2.5 bg-[#132742] hover:bg-[#1A365D] disabled:opacity-40 disabled:cursor-not-allowed border border-[#23426A] rounded-xl text-xs font-bold text-[#F8FAFC] transition flex items-center space-x-2 shadow-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous Lesson</span>
              </button>

              <button
                onClick={handleNextLesson}
                disabled={!hasNextLesson}
                className="px-6 py-2.5 bg-[#4FD1C5] hover:bg-[#38B2AC] disabled:opacity-40 disabled:cursor-not-allowed text-[#0A1322] font-extrabold text-xs rounded-xl shadow-lg shadow-[#4FD1C5]/20 transition flex items-center space-x-2"
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
        <div className="fixed bottom-8 right-8 z-50 bg-[#132742] border border-[#4FD1C5]/50 shadow-2xl rounded-2xl p-4 max-w-sm flex items-center gap-3 animate-slide-up text-[#F8FAFC]">
          <div className="w-10 h-10 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-extrabold text-[#22C55E] uppercase tracking-wider">Lesson Completed!</div>
            <div className="text-xs font-bold truncate text-[#F8FAFC]">Up Next: {autoAdvanceToast.nextTitle}</div>
          </div>
          <div className="w-4 h-4 border-2 border-[#4FD1C5] border-t-transparent rounded-full animate-spin flex-shrink-0" />
        </div>
      )}

      {/* Course Completion & Certification Checklist Modal */}
      {showEligibilityModal && eligibilityData && (
        <div className="fixed inset-0 bg-[#0A1322]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#132742] border border-[#23426A] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 text-[#F8FAFC] relative overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#23426A] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1A365D] border border-[#4FD1C5]/40 text-[#4FD1C5] flex items-center justify-center">
                  <Award className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#F8FAFC]">Course Certification Status</h3>
                  <p className="text-xs text-[#94A3B8]">{course.title}</p>
                </div>
              </div>
              <button onClick={() => setShowEligibilityModal(false)} className="text-[#94A3B8] hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bars */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-[#0E1D33] border border-[#23426A]">
              <div>
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Learning Progress</span>
                <div className="text-lg font-black text-[#F8FAFC]">{Math.round(eligibilityData.learningProgressPercentage)}%</div>
                <div className="w-full h-1.5 bg-[#132742] rounded-full overflow-hidden mt-1">
                  <div className="bg-[#4FD1C5] h-full rounded-full" style={{ width: `${eligibilityData.learningProgressPercentage}%` }} />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Certification Progress</span>
                <div className="text-lg font-black text-[#22C55E]">{Math.round(eligibilityData.certificationProgressPercentage)}%</div>
                <div className="w-full h-1.5 bg-[#132742] rounded-full overflow-hidden mt-1">
                  <div className="bg-[#22C55E] h-full rounded-full" style={{ width: `${eligibilityData.certificationProgressPercentage}%` }} />
                </div>
              </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#CBD5E1]">Requirement Checklist</h4>
              
              {/* 1. Lessons */}
              <div className="p-3.5 rounded-2xl bg-[#0E1D33] border border-[#23426A] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {eligibilityData.requirements.lessons.satisfied ? (
                    <CheckCircle2 className="w-5 h-5 text-[#22C55E] flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-[#94A3B8] flex-shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-[#F8FAFC]">Required Lessons Watched</div>
                    <div className="text-[11px] text-[#94A3B8]">
                      {eligibilityData.requirements.lessons.requiredCompleted} of {eligibilityData.requirements.lessons.requiredTotal} required lessons completed
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase ${
                  eligibilityData.requirements.lessons.satisfied ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                }`}>
                  {eligibilityData.requirements.lessons.satisfied ? 'COMPLETE' : 'INCOMPLETE'}
                </span>
              </div>

              {/* 2. Quizzes */}
              {eligibilityData.requirements.quizzes.requiredTotal > 0 && (
                <div className="p-3.5 rounded-2xl bg-[#0E1D33] border border-[#23426A] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {eligibilityData.requirements.quizzes.satisfied ? (
                      <CheckCircle2 className="w-5 h-5 text-[#22C55E] flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#94A3B8] flex-shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-[#F8FAFC]">Required Quizzes Passed</div>
                      <div className="text-[11px] text-[#94A3B8]">
                        {eligibilityData.requirements.quizzes.requiredPassed} of {eligibilityData.requirements.quizzes.requiredTotal} quizzes passed
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase ${
                    eligibilityData.requirements.quizzes.satisfied ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                  }`}>
                    {eligibilityData.requirements.quizzes.satisfied ? 'PASSED' : 'PENDING'}
                  </span>
                </div>
              )}

              {/* 3. Assignments */}
              {eligibilityData.requirements.assignments.requiredTotal > 0 && (
                <div className="p-3.5 rounded-2xl bg-[#0E1D33] border border-[#23426A] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {eligibilityData.requirements.assignments.satisfied ? (
                      <CheckCircle2 className="w-5 h-5 text-[#22C55E] flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#94A3B8] flex-shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-[#F8FAFC]">Required Assignments Approved</div>
                      <div className="text-[11px] text-[#94A3B8]">
                        {eligibilityData.requirements.assignments.requiredPassed} of {eligibilityData.requirements.assignments.requiredTotal} assignments approved
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase ${
                    eligibilityData.requirements.assignments.satisfied ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                  }`}>
                    {eligibilityData.requirements.assignments.satisfied ? 'APPROVED' : 'PENDING'}
                  </span>
                </div>
              )}

              {/* 4. Final Assessment */}
              {eligibilityData.requirements.finalAssessment.required && (
                <div className="p-3.5 rounded-2xl bg-[#0E1D33] border border-[#23426A] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {eligibilityData.requirements.finalAssessment.satisfied ? (
                      <CheckCircle2 className="w-5 h-5 text-[#22C55E] flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#94A3B8] flex-shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-[#F8FAFC]">Final Capstone Assessment</div>
                      <div className="text-[11px] text-[#94A3B8]">
                        Passing score: {eligibilityData.requirements.finalAssessment.passingScore}%
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase ${
                    eligibilityData.requirements.finalAssessment.satisfied ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                  }`}>
                    {eligibilityData.requirements.finalAssessment.satisfied ? 'PASSED' : 'REQUIRED'}
                  </span>
                </div>
              )}
            </div>

            {/* Missing Requirements Guidance */}
            {eligibilityData.missingRequirements.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/30 space-y-2">
                <div className="text-xs font-bold text-[#EF4444] flex items-center gap-1.5 uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4" /> Action Items to Earn Certificate
                </div>
                <ul className="text-xs text-[#CBD5E1] space-y-1.5 pl-1">
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
                  className="w-full py-3.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-black text-xs rounded-xl shadow-lg shadow-[#4FD1C5]/30 transition flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  <Award className="w-4 h-4" />
                  <span>View Official Verified Certificate</span>
                </Link>
              ) : (
                <button
                  onClick={() => setShowEligibilityModal(false)}
                  className="w-full py-3 bg-[#0E1D33] hover:bg-[#1A365D] text-[#CBD5E1] hover:text-white text-xs font-bold rounded-xl border border-[#23426A] transition"
                >
                  Continue Learning & Complete Requirements
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Completion & Certificate Ready Modal */}
      {courseCompletedModal && (
        <div className="fixed inset-0 bg-[#0A1322]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#132742] border border-[#23426A] rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl space-y-6 text-[#F8FAFC] relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#1A365D]/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#4FD1C5]/20 rounded-full blur-3xl pointer-events-none" />

            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#F59E0B] to-[#FBBF24] text-[#0A1322] mx-auto flex items-center justify-center shadow-xl shadow-[#F59E0B]/25">
              <Award className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Course 100% Completed</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#F8FAFC]">🎉 Congratulations!</h2>
              <p className="text-[#CBD5E1] text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
                You have successfully completed every lesson in <strong className="text-[#F8FAFC]">"{course?.title}"</strong>. Your official certificate of accomplishment is now generated and ready to download!
              </p>
            </div>

            <div className="p-4 bg-[#0E1D33] rounded-2xl border border-[#23426A] flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#1A365D] text-[#4FD1C5]">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#F8FAFC]">Official Verified Certificate</div>
                  <div className="text-[11px] text-[#94A3B8]">Ready for portfolio, LinkedIn & PDF export</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-[#22C55E]/15 text-[#22C55E] text-[10px] font-extrabold border border-[#22C55E]/30 uppercase">
                ISSUED
              </span>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Link
                to="/student/certificates"
                className="w-full py-3.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold text-xs rounded-xl shadow-lg shadow-[#4FD1C5]/30 transition flex items-center justify-center gap-2"
              >
                <Award className="w-4 h-4" />
                <span>View & Download My Certificate</span>
              </Link>
              <button
                onClick={() => setCourseCompletedModal(false)}
                className="w-full py-2.5 bg-[#0E1D33] hover:bg-[#1A365D] text-[#CBD5E1] hover:text-[#F8FAFC] text-xs font-bold rounded-xl border border-[#23426A] transition"
              >
                Continue Reviewing Lessons
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Enrollment Paywall Modal for Locked Lessons / Previews */}
      {showEnrollPaywallModal && (
        <div className="fixed inset-0 bg-[#0A1322]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#132742] border border-[#23426A] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 text-[#F8FAFC] relative overflow-hidden">
            {/* Background Accent Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#EF4444]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#4FD1C5]/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-[#23426A] pb-4">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-10 h-10 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-extrabold text-[#F8FAFC] truncate">
                    {lockedLessonAttempt ? `Unlock "${lockedLessonAttempt.title}"` : 'Enroll to Unlock Course'}
                  </h3>
                  <p className="text-xs text-[#94A3B8] truncate">{course.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEnrollPaywallModal(false)}
                className="text-[#94A3B8] hover:text-white p-1 rounded-lg hover:bg-[#1A365D] transition flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-[#CBD5E1] leading-relaxed">
                Free preview access is limited to the first introductory video. To stream all {totalLessons} video lessons, take module quizzes, submit assignments, and earn your verified certificate of completion, please enroll below.
              </p>

              <div className="p-4 rounded-2xl bg-[#0E1D33] border border-[#23426A] space-y-3">
                <div className="flex justify-between items-baseline border-b border-[#23426A]/60 pb-2">
                  <span className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">Tuition:</span>
                  <span className="text-2xl font-black text-[#4FD1C5]">
                    {course.isFree || course.price === 0 ? 'FREE' : `${(course.discountPrice !== null && course.discountPrice !== undefined ? course.discountPrice : course.price).toLocaleString()} KSH`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#CBD5E1] pt-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] flex-shrink-0" />
                    <span>All {totalLessons} Video Lessons</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] flex-shrink-0" />
                    <span>Interactive Quizzes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] flex-shrink-0" />
                    <span>Hands-on Projects</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] flex-shrink-0" />
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
                className="w-full py-3.5 bg-gradient-to-r from-[#4FD1C5] to-[#38B2AC] hover:from-[#38B2AC] hover:to-[#319795] text-[#0A1322] font-black text-xs rounded-xl shadow-lg shadow-[#4FD1C5]/30 transition flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                <span>{course.isFree || course.price === 0 ? 'Enroll in Course (Free)' : 'Enroll & Get Lifetime Access'}</span>
              </button>
              <button
                onClick={() => setShowEnrollPaywallModal(false)}
                className="w-full py-2.5 bg-[#0E1D33] hover:bg-[#1A365D] text-[#CBD5E1] hover:text-white text-xs font-bold rounded-xl border border-[#23426A] transition"
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
