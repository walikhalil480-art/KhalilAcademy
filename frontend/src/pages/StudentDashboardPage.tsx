import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { api } from '../services/api';
import { Certificate } from '../types';
import { CircularProgress } from '../components/CircularProgress';
import { resolveMediaUrl, DEFAULT_COURSE_THUMBNAIL } from '../utils/media';
import { 
  BookOpen, 
  Award, 
  CheckCircle2, 
  PlayCircle, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  RefreshCw,
  Layers,
  GraduationCap,
  Compass,
  HelpCircle,
  Code2,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { AskKhalilAIDrawer } from '../components/ai/AskKhalilAIDrawer';
import { AIActionType } from '../types/ai';
import { StreakWidget } from '../components/gamification/StreakWidget';
import { BadgesWall } from '../components/gamification/BadgesWall';
import { gamificationApi, GamificationProfile } from '../services/gamificationApi';

export interface LearningCourseItem {
  enrollmentId: string;
  courseId: string;
  title: string;
  slug: string;
  thumbnail?: string;
  description?: string;
  instructorName: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  lastLessonId?: string;
  lastAccessedAt?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

export const StudentDashboardPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [learningCourses, setLearningCourses] = useState<LearningCourseItem[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [gamificationProfile, setGamificationProfile] = useState<GamificationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  // AI Assistant Drawer state
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiInitialAction, setAiInitialAction] = useState<AIActionType>('GENERAL');

  const openAIWithAction = (action: AIActionType = 'GENERAL') => {
    setAiInitialAction(action);
    setAiDrawerOpen(true);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch gamification profile
      try {
        const profile = await gamificationApi.getProfile();
        setGamificationProfile(profile);
      } catch (gamifyErr) {
        console.warn('Gamification profile unavailable:', gamifyErr);
      }

      // Fetch enrolled courses
      try {
        const learnRes = await api.get('/progress/my-learning');
        if (learnRes.data.success) {
          setLearningCourses(learnRes.data.courses || []);
        }
      } catch (courseErr: any) {
        console.error('Error loading enrolled courses:', courseErr);
        setError(courseErr.response?.data?.message || 'Unable to load your enrolled courses.');
      }

      // Fetch certificates
      try {
        const certRes = await api.get('/certificates/my-certificates');
        if (certRes.data?.success) {
          setCertificates(certRes.data.certificates || []);
        }
      } catch (certErr) {
        console.warn('Certificates unavailable:', certErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWeeklyGoal = async (minutes: number) => {
    await gamificationApi.updateWeeklyGoal(minutes);
    const updated = await gamificationApi.getProfile();
    setGamificationProfile(updated);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] bg-[#0A1322] text-[#F8FAFC] space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#4FD1C5] border-t-transparent"></div>
        <p className="text-xs font-semibold text-[#CBD5E1]">Loading your learning workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[75vh] bg-[#0A1322] text-[#F8FAFC] p-8 flex flex-col items-center justify-center">
        <div className="bg-[#132742] border border-[#23426A] rounded-3xl p-8 max-w-md text-center shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-[#F8FAFC]">Couldn't Load Courses</h2>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-bold text-xs rounded-xl shadow-md transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  const inProgress = learningCourses.filter((c) => c.status === 'IN_PROGRESS' || (c.progressPercent > 0 && c.progressPercent < 100));
  const completed = learningCourses.filter((c) => c.status === 'COMPLETED' || c.progressPercent >= 100);
  const activeCourse = inProgress.length > 0 ? inProgress[0] : (completed.length > 0 ? completed[0] : learningCourses[0]);

  const filteredCourses = activeFilter === 'ALL'
    ? learningCourses
    : activeFilter === 'IN_PROGRESS'
    ? inProgress
    : completed;

  return (
    <div className="min-h-screen bg-[#0A1322] text-[#F8FAFC] p-4 sm:p-8 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Welcome Header */}
        <div className="bg-[#132742] border border-[#23426A] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A365D] border border-[#4FD1C5]/40 text-[#4FD1C5] text-xs font-extrabold">
              <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Student Learning Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
              Welcome back, {user?.name || 'Student'}
            </h1>
            <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
              Continue where you left off and keep building your skills.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/student/certificates"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0E1D33] hover:bg-[#1A365D] border border-[#23426A] text-[#F8FAFC] font-extrabold text-xs shadow-md transition"
            >
              <Award className="w-4 h-4 text-[#F59E0B]" />
              <span>My Certificates</span>
            </Link>
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold text-xs shadow-lg shadow-[#4FD1C5]/20 transition"
            >
              <span>Explore Courses</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Learning Streaks, XP Points & Weekly Goals Widget */}
        {gamificationProfile && (
          <StreakWidget
            profile={gamificationProfile}
            onUpdateGoal={handleUpdateWeeklyGoal}
          />
        )}

        {/* 4 Analytics Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-[#132742] border border-[#23426A] rounded-2xl p-5 shadow-lg flex items-center space-x-4">
            <div className="p-3 bg-[#1A365D] text-[#4FD1C5] rounded-xl border border-[#4FD1C5]/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-extrabold text-[#F8FAFC]">{learningCourses.length}</span>
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Courses Enrolled</p>
            </div>
          </div>

          <div className="bg-[#132742] border border-[#23426A] rounded-2xl p-5 shadow-lg flex items-center space-x-4">
            <div className="p-3 bg-[#1A365D] text-[#4FD1C5] rounded-xl border border-[#4FD1C5]/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-extrabold text-[#F8FAFC]">{inProgress.length}</span>
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">In Progress</p>
            </div>
          </div>

          <div className="bg-[#132742] border border-[#23426A] rounded-2xl p-5 shadow-lg flex items-center space-x-4">
            <div className="p-3 bg-[#22C55E]/15 text-[#22C55E] rounded-xl border border-[#22C55E]/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-extrabold text-[#F8FAFC]">{completed.length}</span>
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Completed</p>
            </div>
          </div>

          <Link to="/student/certificates" className="bg-[#132742] border border-[#23426A] hover:border-[#4FD1C5]/60 rounded-2xl p-5 shadow-lg flex items-center space-x-4 transition">
            <div className="p-3 bg-[#F59E0B]/15 text-[#F59E0B] rounded-xl border border-[#F59E0B]/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-extrabold text-[#F8FAFC]">{certificates.length}</span>
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Certificates</p>
            </div>
          </Link>
        </div>

        {/* AI Learning Companion & Study Hub Card */}
        <div className="bg-gradient-to-r from-[#102342] via-[#132742] to-[#1A365D] border border-[#23426A] rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A365D] border border-[#4FD1C5]/40 text-[#4FD1C5] text-xs font-extrabold">
              <Sparkles className="w-3.5 h-3.5 text-[#4FD1C5] animate-pulse" />
              <span>Ask Khalil AI — Personal Learning Companion</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#F8FAFC]">
              Accelerate Your Learning with Grounded AI
            </h2>
            <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
              Ask questions about any enrolled course, generate personalized study roadmaps, practice technical quizzes, or troubleshoot code errors directly with your AI tutor.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                onClick={() => openAIWithAction('STUDY_PLAN')}
                className="px-4 py-2 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-black text-xs rounded-xl shadow-lg shadow-[#4FD1C5]/20 transition flex items-center gap-2"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Create My Study Plan</span>
              </button>

              <button
                onClick={() => openAIWithAction('RECOMMENDATION')}
                className="px-4 py-2 bg-[#0E1D33] hover:bg-[#1A365D] border border-[#23426A] hover:border-[#4FD1C5]/40 text-[#F8FAFC] font-extrabold text-xs rounded-xl transition flex items-center gap-2 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#4FD1C5]" />
                <span>Smart Next Steps</span>
              </button>

              <button
                onClick={() => openAIWithAction('GENERAL')}
                className="px-4 py-2 bg-[#0E1D33] hover:bg-[#1A365D] border border-[#23426A] hover:border-[#4FD1C5]/40 text-[#CBD5E1] hover:text-[#F8FAFC] font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#4FD1C5]" />
                <span>Ask Anything</span>
              </button>
            </div>
          </div>

          <div className="hidden lg:flex flex-col items-center justify-center p-6 bg-[#0A1322]/60 rounded-2xl border border-[#23426A] text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#1A365D] border border-[#4FD1C5]/40 text-[#4FD1C5] flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 animate-pulse text-[#4FD1C5]" />
            </div>
            <span className="text-xs font-bold text-[#F8FAFC]">100% Course Grounded</span>
            <span className="text-[11px] text-[#94A3B8]">Grounded in Khalil Academy Curriculum</span>
          </div>
        </div>

        {/* Continue Learning Spotlight Hero Card */}
        {activeCourse && (
          <div className="bg-[#132742] border border-[#23426A] rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#1A365D] border border-[#4FD1C5]/40 text-[#4FD1C5] text-xs font-extrabold uppercase rounded-full tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>{activeCourse.progressPercent >= 100 ? 'Course Completed' : 'Continue Learning'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#F8FAFC] leading-snug">{activeCourse.title}</h2>
              <p className="text-xs text-[#CBD5E1] line-clamp-2 leading-relaxed">{activeCourse.description}</p>
              <p className="text-xs text-[#94A3B8] font-medium">
                Completed <strong className="text-[#F8FAFC]">{activeCourse.completedLessons}</strong> of <strong className="text-[#F8FAFC]">{activeCourse.totalLessons}</strong> lessons
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  to={`/courses/${activeCourse.slug}/learn${activeCourse.lastLessonId ? `?lessonId=${activeCourse.lastLessonId}` : ''}`}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold rounded-xl text-xs transition shadow-lg shadow-[#4FD1C5]/20"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>{activeCourse.progressPercent >= 100 ? 'Review Lessons' : 'Resume Lesson'}</span>
                </Link>

                {activeCourse.progressPercent >= 100 && (
                  <Link
                    to="/student/certificates"
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-[#22C55E] hover:bg-[#16A34A] text-white font-extrabold rounded-xl text-xs transition shadow-lg shadow-[#22C55E]/25"
                  >
                    <Award className="w-4 h-4" />
                    <span>View Certificate</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-5 bg-[#0E1D33] rounded-2xl border border-[#23426A]">
              <CircularProgress percentage={activeCourse.progressPercent || 0} size={110} strokeWidth={8} />
              <span className="text-xs font-bold text-[#F8FAFC] mt-2">Overall Progress</span>
            </div>
          </div>
        )}

        {/* Tabbed My Courses Area */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-extrabold text-[#F8FAFC]">My Enrolled Courses</h2>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1.5 bg-[#0E1D33] border border-[#23426A] rounded-2xl shadow-inner">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeFilter === 'ALL'
                    ? 'bg-[#4FD1C5] text-[#0A1322] font-extrabold shadow-md'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                All ({learningCourses.length})
              </button>
              <button
                onClick={() => setActiveFilter('IN_PROGRESS')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeFilter === 'IN_PROGRESS'
                    ? 'bg-[#4FD1C5] text-[#0A1322] font-extrabold shadow-md'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                In Progress ({inProgress.length})
              </button>
              <button
                onClick={() => setActiveFilter('COMPLETED')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeFilter === 'COMPLETED'
                    ? 'bg-[#4FD1C5] text-[#0A1322] font-extrabold shadow-md'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                Completed ({completed.length})
              </button>
            </div>
          </div>

          {/* Courses List */}
          {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((item) => (
                <div
                  key={item.enrollmentId}
                  className="bg-[#132742] border border-[#23426A] rounded-2xl overflow-hidden shadow-lg flex flex-col hover:border-[#4FD1C5]/60 transition"
                >
                  <div className="relative aspect-video bg-[#0A1322]">
                    <img
                      src={resolveMediaUrl(item.thumbnail)}
                      alt={item.title}
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_COURSE_THUMBNAIL;
                      }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md border ${
                        item.status === 'COMPLETED'
                          ? 'bg-[#22C55E]/90 text-white border-[#22C55E]'
                          : 'bg-[#0A1322]/90 text-[#4FD1C5] border-[#4FD1C5]/30'
                      }`}>
                        {item.status === 'COMPLETED' ? 'Completed' : `${item.progressPercent}% Done`}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="font-extrabold text-[#F8FAFC] text-sm line-clamp-2">{item.title}</h3>
                      <p className="text-xs text-[#94A3B8] mt-1">{item.instructorName || 'Academy Instructor'}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="w-full h-2 bg-[#0E1D33] rounded-full overflow-hidden border border-[#23426A]">
                        <div
                          className="h-full bg-[#4FD1C5] rounded-full transition-all"
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-[#94A3B8]">
                        <span>{item.completedLessons} / {item.totalLessons} lessons</span>
                        <span className="font-bold text-[#F8FAFC]">{item.progressPercent}%</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Link
                        to={`/courses/${item.slug}/learn${item.lastLessonId ? `?lessonId=${item.lastLessonId}` : ''}`}
                        className="w-full py-2.5 bg-[#0E1D33] hover:bg-[#4FD1C5] text-[#F8FAFC] hover:text-[#0A1322] border border-[#23426A] hover:border-[#4FD1C5] font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
                      >
                        <PlayCircle className="w-4 h-4" />
                        <span>{item.status === 'COMPLETED' ? 'Review Lessons' : 'Continue Course'}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#132742] border border-[#23426A] rounded-3xl p-10 text-center space-y-4 shadow-xl">
              <BookOpen className="w-12 h-12 text-[#94A3B8] mx-auto" />
              <h3 className="text-base font-extrabold text-[#F8FAFC]">No courses found in this tab</h3>
              <p className="text-xs text-[#CBD5E1]">Explore the academy catalog to enroll in top-rated courses.</p>
              <Link
                to="/courses"
                className="inline-block px-5 py-2.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold text-xs rounded-xl shadow-md transition"
              >
                Browse Course Catalog
              </Link>
            </div>
          )}
        </div>

        {/* Badges & Achievements Wall */}
        {gamificationProfile && gamificationProfile.badges && (
          <BadgesWall badges={gamificationProfile.badges} />
        )}

      </div>

      {/* Ask Khalil AI Learning Assistant Drawer */}
      <AskKhalilAIDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        initialAction={aiInitialAction}
      />
    </div>
  );
};
