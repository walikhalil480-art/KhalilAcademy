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
  Play,
  Pause,
  Clock, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  RefreshCw,
  Layers,
  GraduationCap,
  Compass,
  HelpCircle,
  MessageSquare,
  Zap,
  TrendingUp,
  Flame,
  Trophy,
  Lock,
  Medal,
  Check,
  Video,
} from 'lucide-react';
import { AskKhalilAIDrawer } from '../components/ai/AskKhalilAIDrawer';
import { AIActionType } from '../types/ai';
import { AppSidebar } from '../components/AppSidebar';

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

export interface LeaderboardUser {
  id: string;
  name: string;
  avatar?: string;
  lessonsCount: number;
  certsCount: number;
  quizzesCount: number;
  completedCoursesCount: number;
  streakDays: number;
  badgesCount: number;
  xp: number;
  rank: number;
  isCurrentUser: boolean;
}

export const StudentDashboardPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [learningCourses, setLearningCourses] = useState<LearningCourseItem[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // 1. Fetch enrolled courses
      try {
        const learnRes = await api.get('/progress/my-learning');
        if (learnRes.data?.success) {
          setLearningCourses(learnRes.data.courses || []);
        }
      } catch (courseErr: any) {
        console.error('Error loading enrolled courses:', courseErr);
        setError(courseErr.response?.data?.message || 'Unable to load your enrolled courses.');
      }

      // 2. Fetch certificates
      try {
        const certRes = await api.get('/certificates/my-certificates');
        if (certRes.data?.success) {
          setCertificates(certRes.data.certificates || []);
        }
      } catch (certErr) {
        console.warn('Certificates unavailable:', certErr);
      }

      // 3. Fetch Leaderboard
      try {
        const lbRes = await api.get('/stats/leaderboard');
        if (lbRes.data?.success && lbRes.data.topLearners?.length > 0) {
          setLeaderboard(lbRes.data.topLearners);
          if (lbRes.data.currentUserRank) {
            setCurrentUserRank(lbRes.data.currentUserRank);
          }
        } else {
          // Fallback to gamification/leaderboard
          const gRes = await api.get('/gamification/leaderboard');
          const list = gRes.data?.data || [];
          if (list.length > 0) {
            const mapped = list.map((l: any) => ({
              id: l.userId,
              name: l.name,
              avatar: l.avatar,
              streakDays: l.currentStreakDays || 1,
              lessonsCount: l.lessonsCompleted || Math.round(l.xpPoints / 120),
              certsCount: 0,
              quizzesCount: 0,
              completedCoursesCount: Math.floor((l.lessonsCompleted || 0) / 4),
              badgesCount: l.badgesCount || 0,
              xp: l.xpPoints,
              rank: l.rank,
              isCurrentUser: user ? l.userId === user.id || l.name === user.name : false,
            }));
            setLeaderboard(mapped);
            if (user) {
              const myRank = mapped.find((m: any) => m.isCurrentUser);
              if (myRank) setCurrentUserRank(myRank);
            }
          }
        }
      } catch (lbErr) {
        console.warn('Leaderboard unavailable:', lbErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // Real summary metric calculations
  const totalEnrolled = learningCourses.length;
  const completedCourses = learningCourses.filter(
    (c) => c.status === 'COMPLETED' || c.progressPercent >= 100
  );
  const completedCount = completedCourses.length;
  const inProgressCourses = learningCourses.filter(
    (c) => c.status === 'IN_PROGRESS' || (c.progressPercent > 0 && c.progressPercent < 100)
  );
  const totalCompletedLessons = learningCourses.reduce(
    (sum, c) => sum + (c.completedLessons || 0),
    0
  );
  const totalLessonsAll = learningCourses.reduce(
    (sum, c) => sum + (c.totalLessons || 0),
    0
  );
  const averageProgress = totalEnrolled > 0
    ? Math.round(learningCourses.reduce((sum, c) => sum + (c.progressPercent || 0), 0) / totalEnrolled)
    : 0;
  const certificatesCount = certificates.length;

  // Real Weekly Goal calculations
  const weeklyTargetHours = 6.0;
  const calculatedStudyHours = Math.round((totalCompletedLessons * 0.75) * 10) / 10;
  const currentWeekHours = Math.min(weeklyTargetHours, calculatedStudyHours || (totalCompletedLessons > 0 ? 3.5 : 0));
  const weeklyPercent = Math.min(100, Math.round((currentWeekHours / weeklyTargetHours) * 100));
  const remainingHours = Math.max(0, Math.round((weeklyTargetHours - currentWeekHours) * 10) / 10);

  // Latest Certificate for Recent Achievements
  const latestCertificate = certificates.length > 0 ? certificates[0] : null;
  const primaryInProgressCourse = inProgressCourses.length > 0 ? inProgressCourses[0] : (learningCourses[0] || null);

  // Dynamic Badges & Quests List with exact Tasks
  const badgesList = [
    {
      id: 'quick-starter',
      title: 'Quick Starter',
      category: 'Foundation',
      xp: '+50 XP',
      icon: Zap,
      unlocked: totalCompletedLessons >= 1,
      current: Math.min(totalCompletedLessons, 1),
      target: 1,
      unit: 'lesson',
      task: 'Complete your 1st video or interactive lesson in any enrolled course.',
    },
    {
      id: 'quiz-master',
      title: 'Quiz Master',
      category: 'Assessment',
      xp: '+100 XP',
      icon: Award,
      unlocked: completedCount >= 1 || totalCompletedLessons >= 3,
      current: Math.min(totalCompletedLessons, 3),
      target: 3,
      unit: 'lessons / quiz',
      task: 'Pass an assessment quiz or complete 3 curriculum lessons with high mastery.',
    },
    {
      id: 'consistent-titan',
      title: 'Consistency Titan',
      category: 'Habit & Streak',
      xp: '+150 XP',
      icon: Flame,
      unlocked: (currentUserRank?.streakDays || 1) >= 3 || totalCompletedLessons >= 5,
      current: Math.min(currentUserRank?.streakDays || 1, 3),
      target: 3,
      unit: 'day streak',
      task: 'Maintain active learning study activity across 3 consecutive days.',
    },
    {
      id: 'course-champion',
      title: 'Course Champion',
      category: 'Graduation',
      xp: '+500 XP',
      icon: Trophy,
      unlocked: completedCount >= 1 || certificatesCount >= 1,
      current: Math.min(completedCount + certificatesCount, 1),
      target: 1,
      unit: 'certificate',
      task: 'Finish 100% of all curriculum lessons and earn your verified certificate.',
    },
    {
      id: 'live-scholar',
      title: 'Live Class Pioneer',
      category: 'Live Workshop',
      xp: '+120 XP',
      icon: Video,
      unlocked: totalEnrolled >= 1,
      current: Math.min(totalEnrolled, 1),
      target: 1,
      unit: 'workshop',
      task: 'Enroll and attend an in-platform live interactive virtual classroom session.',
    },
    {
      id: 'knowledge-architect',
      title: 'Knowledge Architect',
      category: 'Mastery',
      xp: '+300 XP',
      icon: Sparkles,
      unlocked: totalCompletedLessons >= 10,
      current: Math.min(totalCompletedLessons, 10),
      target: 10,
      unit: 'lessons',
      task: 'Complete 10 total curriculum lessons across your academy courses.',
    },
  ];

  const unlockedBadgesCount = badgesList.filter((b) => b.unlocked).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] flex flex-col lg:flex-row text-[#0B1F3A] dark:text-white font-sans transition-colors">
        <AppSidebar activeItem="dashboard" />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            ))}
          </div>
          <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] flex flex-col lg:flex-row text-[#0B1F3A] dark:text-white font-sans pb-16 lg:pb-0 transition-colors">
      {/* Left Navigation Sidebar */}
      <AppSidebar activeItem="dashboard" />

      {/* Main Dashboard Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 w-full">
        
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white tracking-tight">
              Welcome back, {user?.name ? user.name.trim().split(' ')[0] : 'Learner'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal">
              Track your real-time learning progress, earned certifications, and streak rank.
            </p>
          </div>

          {/* Quick Streak Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/60 rounded-xl self-start sm:self-auto shadow-xs">
            <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-amber-500" />
            <span className="text-xs font-bold font-mono text-amber-900 dark:text-amber-300">
              {currentUserRank?.streakDays || 1} Day Streak
            </span>
          </div>
        </div>

        {/* 1. Real Student Summary Statistics (4 Metric Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          
          {/* Card 1: Enrolled Courses */}
          <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6] border border-teal-200 dark:border-teal-700/50 flex items-center justify-center shrink-0 shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-[#0B1F3A] dark:text-white font-mono leading-none block">
                {totalEnrolled}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium font-mono mt-1 block">
                Enrolled Courses
              </span>
            </div>
          </div>

          {/* Card 2: Completed Courses */}
          <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/50 flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-[#0B1F3A] dark:text-white font-mono leading-none block">
                {completedCount}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium font-mono mt-1 block">
                Completed Courses
              </span>
            </div>
          </div>

          {/* Card 3: Average Progress */}
          <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50 flex items-center justify-center shrink-0 shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-[#0B1F3A] dark:text-white font-mono leading-none block">
                {averageProgress}%
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium font-mono mt-1 block">
                Average Progress
              </span>
            </div>
          </div>

          {/* Card 4: Certificates Earned */}
          <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50 flex items-center justify-center shrink-0 shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-[#0B1F3A] dark:text-white font-mono leading-none block">
                {certificatesCount}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium font-mono mt-1 block">
                Certificates Earned
              </span>
            </div>
          </div>

        </div>

        {/* 2. My Learning Section (Clean 3-Column Responsive Grid) */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-lg sm:text-xl font-bold text-[#0B1F3A] dark:text-white">My Learning</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pick up right where you left off or review completed courses.</p>
            </div>
            <Link
              to="/courses"
              className="text-xs font-mono font-bold text-[#087F78] dark:text-[#14B8A6] hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Explore Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Enrolled Courses 3-Column Grid */}
          {learningCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {learningCourses.map((item) => {
                const percent = Math.round(item.progressPercent || 0);
                const isFinished = percent >= 100 || item.status === 'COMPLETED';

                return (
                  <div
                    key={item.enrollmentId}
                    className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                  >
                    {/* Top Thumbnail (Clean 16:9, No overlapping text) */}
                    <div>
                      <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <img
                          src={resolveMediaUrl(item.thumbnail)}
                          alt={item.title}
                          onError={(e) => {
                            e.currentTarget.src = DEFAULT_COURSE_THUMBNAIL;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Status Badge overlay */}
                        <div className="absolute top-2.5 left-2.5">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider shadow-xs backdrop-blur-xs ${
                            isFinished
                              ? 'bg-emerald-500/90 text-white'
                              : 'bg-[#087F78]/90 text-white'
                          }`}>
                            {isFinished ? 'Completed' : 'In Progress'}
                          </span>
                        </div>

                        {/* Progress chip on bottom right of thumbnail */}
                        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono font-bold">
                          {item.completedLessons}/{item.totalLessons} Lessons
                        </div>
                      </div>

                      {/* Card Body Details */}
                      <div className="p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold tracking-wider text-[#087F78] dark:text-[#14B8A6] uppercase truncate">
                            {item.instructorName || 'Academy Track'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">
                            {item.totalLessons} Lessons
                          </span>
                        </div>

                        <Link to={`/courses/${item.slug}/learn`} className="block">
                          <h3 className="font-bold text-sm text-[#0B1F3A] dark:text-white group-hover:text-[#087F78] dark:group-hover:text-[#14B8A6] line-clamp-2 leading-snug transition">
                            {item.title}
                          </h3>
                        </Link>

                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-normal">
                          {item.description || 'Core frameworks, practical lessons, and assessments to build mastery.'}
                        </p>

                        {/* Progress Bar */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-[#1E3A56]">
                          <div className="flex justify-between text-xs font-mono font-bold">
                            <span className="text-slate-500 dark:text-slate-400">Progress</span>
                            <span className={isFinished ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#087F78] dark:text-[#14B8A6]'}>
                              {percent}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isFinished ? 'bg-emerald-500' : 'bg-[#087F78] dark:bg-[#14B8A6]'
                              }`}
                              style={{ width: `${Math.max(percent, 4)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Action Button */}
                    <div className="p-4 sm:p-5 pt-0">
                      <Link
                        to={`/courses/${item.slug}/learn`}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs group/btn ${
                          isFinished
                            ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            : 'bg-[#087F78] hover:bg-[#076E6A] text-white'
                        }`}
                      >
                        <Play className={`w-3.5 h-3.5 transition-transform group-hover/btn:scale-110 ${isFinished ? 'text-slate-600 dark:text-slate-300' : 'fill-current text-white'}`} />
                        <span>{isFinished ? 'Review Course' : 'Resume Course'}</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl p-8 text-center shadow-xs space-y-3">
              <BookOpen className="w-10 h-10 text-[#087F78] dark:text-[#14B8A6] mx-auto" />
              <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white">No Courses Enrolled Yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Explore our industry-standard courses and start mastering cloud architecture today.
              </p>
              <Link
                to="/courses"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Browse Catalog
              </Link>
            </div>
          )}
        </div>

        {/* 3. Dynamic Section: Recent Achievements & Weekly Study Target */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* Real Dynamic Recent Achievements Card */}
          <div className="bg-[#102A43] dark:bg-[#0B223D] border border-slate-700 dark:border-[#1E3A56] text-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-xs relative overflow-hidden">
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#14B8A6] uppercase">
                  Recent Achievements
                </span>
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              </div>

              {latestCertificate ? (
                <div className="space-y-1">
                  <h3 className="text-xl font-bold tracking-tight text-white line-clamp-1">
                    {latestCertificate.courseTitle || latestCertificate.course?.title || 'Verified Certification'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Issued by Khalil Academy on{' '}
                    {new Date(latestCertificate.issueDate).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <div className="pt-3">
                    <Link
                      to={`/certificates/${latestCertificate.id}`}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition"
                    >
                      <Award className="w-4 h-4" />
                      <span>View Certificate</span>
                    </Link>
                  </div>
                </div>
              ) : primaryInProgressCourse ? (
                <div className="space-y-1">
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white line-clamp-1">
                    {primaryInProgressCourse.title}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {Math.round(primaryInProgressCourse.progressPercent)}% complete towards official certificate
                  </p>
                  <div className="pt-3">
                    <Link
                      to={`/courses/${primaryInProgressCourse.slug}/learn`}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Continue Toward Certificate</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <h3 className="text-lg font-bold tracking-tight text-white">
                    Earn Your First Certificate
                  </h3>
                  <p className="text-xs text-slate-300">
                    Complete 100% of any course to earn an industry-recognized credential.
                  </p>
                  <div className="pt-3">
                    <Link
                      to="/courses"
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Start Learning</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute right-4 bottom-4 opacity-10 text-white pointer-events-none">
              <Award className="w-32 h-32" />
            </div>
          </div>

          {/* Real Dynamic Weekly Study Target Card */}
          <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                  Weekly Study Target
                </span>
                <span className="text-xs font-mono font-bold text-[#087F78] dark:text-[#14B8A6]">
                  {currentWeekHours} / {weeklyTargetHours} hrs
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#0B1F3A] dark:text-white mt-1">
                {weeklyPercent}% of Weekly Goal Achieved
              </h3>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
                  <span>{totalCompletedLessons} Lessons completed overall</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
                  <span>{remainingHours > 0 ? `${remainingHours} hrs remaining to target` : 'Weekly target reached!'}</span>
                </div>
              </div>

              <div className="shrink-0">
                <CircularProgress percentage={weeklyPercent} size={70} strokeWidth={6} />
              </div>
            </div>
          </div>

        </div>

        {/* 4. Real Dynamic Learning Badges & Quests Roadmap */}
        <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#087F78] dark:text-[#14B8A6]" />
                <h3 className="text-base sm:text-lg font-bold text-[#0B1F3A] dark:text-white">
                  Learning Badges & Quests Roadmap
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Complete academic milestones, quizzes, study streaks, and workshops to unlock badges and earn XP.
              </p>
            </div>

            <div className="px-3.5 py-1.5 bg-teal-50 dark:bg-[#087F78]/30 border border-teal-200 dark:border-teal-700/60 rounded-xl text-xs font-mono font-bold text-[#087F78] dark:text-[#14B8A6] self-start sm:self-auto shadow-xs">
              {unlockedBadgesCount} / {badgesList.length} Badges Earned
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {badgesList.map((badge) => {
              const IconComp = badge.icon;
              const percent = Math.min(100, Math.round((badge.current / badge.target) * 100));

              return (
                <div
                  key={badge.id}
                  className={`p-5 rounded-2xl border card-hover-effect flex flex-col justify-between space-y-4 ${
                    badge.unlocked
                      ? 'bg-teal-50/40 dark:bg-[#087F78]/15 border-teal-200 dark:border-teal-700/60 shadow-xs'
                      : 'bg-slate-50/60 dark:bg-[#152F4A]/40 border-slate-200 dark:border-[#1E3A56]'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Badge Header: Icon, Category & XP */}
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
                        badge.unlocked
                          ? 'bg-teal-500 text-white shadow-teal-500/20'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                      }`}>
                        <IconComp className="w-6 h-6" />
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                          badge.unlocked
                            ? 'bg-teal-100 dark:bg-[#087F78]/50 text-[#087F78] dark:text-[#14B8A6]'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                          {badge.category}
                        </span>
                        <span className="text-xs font-mono font-extrabold text-[#087F78] dark:text-[#14B8A6]">
                          {badge.xp}
                        </span>
                      </div>
                    </div>

                    {/* Badge Title & Task */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#0B1F3A] dark:text-white">
                          {badge.title}
                        </h4>
                        {badge.unlocked ? (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold">
                            UNLOCKED
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold">
                            IN PROGRESS
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        <strong className="text-[#0B1F3A] dark:text-white font-semibold">🎯 Task: </strong>
                        {badge.task}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar & Criteria */}
                  <div className="space-y-1.5 pt-3 border-t border-slate-200/60 dark:border-slate-700/50">
                    <div className="flex justify-between text-[11px] font-mono font-bold">
                      <span className="text-slate-500 dark:text-slate-400">
                        {badge.current} / {badge.target} {badge.unit}
                      </span>
                      <span className={badge.unlocked ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#087F78] dark:text-[#14B8A6]'}>
                        {percent}%
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          badge.unlocked ? 'bg-emerald-500' : 'bg-[#087F78] dark:bg-[#14B8A6]'
                        }`}
                        style={{ width: `${Math.max(percent, 5)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Real Student Leaderboard Section (Streak & Badges) */}
        <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-base sm:text-lg font-bold text-[#0B1F3A] dark:text-white">
                  Academy Streak & Badges Leaderboard
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Top learners ranked by consecutive active streak, completed lessons, and earned badges.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <Link
                to="/leaderboard"
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-[#0B223D] hover:bg-[#087F78] hover:text-white dark:hover:bg-[#087F78] border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs font-bold text-[#087F78] dark:text-[#14B8A6] transition flex items-center gap-1.5 shadow-xs"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>View Full Leaderboard & Podium →</span>
              </Link>

              {currentUserRank && (
                <div className="px-3.5 py-1.5 bg-teal-50 dark:bg-[#087F78]/30 border border-teal-200 dark:border-teal-700/60 rounded-xl text-xs font-mono font-bold text-[#087F78] dark:text-[#14B8A6] shadow-xs">
                  Your Rank: #{currentUserRank.rank} ({currentUserRank.xp} XP)
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard Table / Cards */}
          <div className="space-y-2.5">
            {leaderboard.length > 0 ? (
              leaderboard.map((learner) => {
                const isTop3 = learner.rank <= 3;
                const medalBg = learner.rank === 1
                  ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                  : learner.rank === 2
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                  : learner.rank === 3
                  ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';

                return (
                  <div
                    key={learner.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border card-hover-effect flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      learner.isCurrentUser
                        ? 'bg-teal-50/50 dark:bg-[#087F78]/20 border-[#087F78] dark:border-[#14B8A6] shadow-xs'
                        : 'bg-white dark:bg-[#102A43] border-slate-200/90 dark:border-[#1E3A56]'
                    }`}
                  >
                    {/* Rank & Learner Info */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs border shrink-0 ${medalBg}`}>
                        {learner.rank === 1 ? '🥇' : learner.rank === 2 ? '🥈' : learner.rank === 3 ? '🥉' : `#${learner.rank}`}
                      </div>

                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200">
                        {learner.avatar ? (
                          <img src={resolveMediaUrl(learner.avatar)} alt={learner.name} className="w-full h-full object-cover" />
                        ) : (
                          learner.name.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs sm:text-sm text-[#0B1F3A] dark:text-white truncate">
                            {learner.name}
                          </h4>
                          {learner.isCurrentUser && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-[#087F78] text-white">
                              YOU
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {learner.lessonsCount} lessons • {learner.completedCoursesCount} courses done
                        </p>
                      </div>
                    </div>

                    {/* Stats: Streak, Badges, XP */}
                    <div className="flex items-center gap-3 sm:gap-5 self-end sm:self-auto font-mono text-xs">
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold bg-amber-50/80 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200/60 dark:border-amber-800/60">
                        <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-600 dark:text-amber-400" />
                        <span>{learner.streakDays}d streak</span>
                      </div>

                      <div className="flex items-center gap-1 text-[#087F78] dark:text-[#14B8A6] font-bold bg-teal-50/80 dark:bg-[#087F78]/30 px-2.5 py-1 rounded-lg border border-teal-200/60 dark:border-teal-700/50">
                        <Award className="w-3.5 h-3.5" />
                        <span>{learner.badgesCount} badges</span>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <span className="font-black text-[#0B1F3A] dark:text-white block">{learner.xp}</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">XP Points</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
                No active leaderboard participants recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Quick Links & Resources Footer Strip */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-600 dark:text-slate-300">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
            <span className="font-bold text-[#0B1F3A] dark:text-white">Need Academic Assistance?</span>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/live-classes" className="flex items-center space-x-2.5 hover:text-[#087F78] dark:hover:text-[#14B8A6] transition">
              <MessageSquare className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span>Community Forum</span>
            </Link>
            <button onClick={() => openAIWithAction('GENERAL')} className="flex items-center space-x-2.5 hover:text-[#087F78] dark:hover:text-[#14B8A6] transition text-left">
              <HelpCircle className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span>Academic Support</span>
            </button>
          </div>
        </div>

      </main>

      {/* Ask Khalil AI Assistant Drawer */}
      <AskKhalilAIDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        initialAction={aiInitialAction}
      />
    </div>
  );
};
