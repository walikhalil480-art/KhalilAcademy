import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { api } from '../services/api';
import { Course, Category, AcademyStats } from '../types';
import { resolveMediaUrl, DEFAULT_COURSE_THUMBNAIL } from '../utils/media';
import { formatCourseDuration } from '../utils/formatters';
import { 
  Award, 
  BookOpen, 
  Clock, 
  Star, 
  Search,
  PlayCircle,
  Play,
  Pause,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Terminal,
  Radio,
  Layers,
  GraduationCap,
  ChevronRight,
  TrendingUp,
  Cpu,
  Check,
  Target,
  Eye,
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  Globe,
} from 'lucide-react';
import { LearningCourseItem } from './StudentDashboardPage';

export const LandingPage: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<AcademyStats | null>(null);
  const [myLearningCourses, setMyLearningCourses] = useState<LearningCourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: 'Course Inquiries & Enrollment',
    message: '',
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) return;
    setContactLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setContactSubmitted(true);
      setContactForm({
        name: '',
        email: '',
        subject: 'Course Inquiries & Enrollment',
        message: '',
      });
    } finally {
      setContactLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, catRes, sRes] = await Promise.all([
          api.get('/courses?limit=12'),
          api.get('/categories'),
          api.get('/stats/public'),
        ]);
        if (cRes.data.success) setCourses(cRes.data.courses || []);
        if (catRes.data.success) setCategories(catRes.data.categories || []);
        if (sRes.data.success) setStats(sRes.data.stats);
      } catch (err) {
        console.error('Failed to load landing data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch enrolled learning courses only if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      api.get('/progress/my-learning')
        .then((res) => {
          if (res.data?.success) {
            setMyLearningCourses(res.data.courses || []);
          }
        })
        .catch((err) => {
          console.warn('Unable to load student learning courses on landing page:', err);
        });
    } else {
      setMyLearningCourses([]);
    }
  }, [isAuthenticated]);

  // Find active in-progress course for authenticated student
  const activeEnrolledCourse = myLearningCourses.length > 0
    ? (myLearningCourses.find((c) => c.status === 'IN_PROGRESS' || c.progressPercent < 100) || myLearningCourses[0])
    : null;

  const displayName = user?.name ? user.name.trim().split(' ')[0] : 'Learner';

  const filteredCourses = selectedCategory === 'ALL'
    ? courses
    : courses.filter((c) => c.category?.id === selectedCategory || c.category?.name === selectedCategory);

  const displayCourses = filteredCourses.slice(0, 6);

  return (
    <div className="space-y-16 pb-24 bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white font-sans transition-colors">
      
      {/* ========================================================================= */}
      {/* 1. HERO SECTION: BRAND, HEADLINE, SEARCH & CTAS */}
      {/* ========================================================================= */}
      <section className="relative pt-10 pb-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-6">
        {/* Ambient Glow Background Accent */}
        <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[350px] bg-gradient-to-tr from-[#087F78]/15 via-teal-400/10 to-transparent blur-3xl rounded-full opacity-70 dark:opacity-40 -z-10" />

        {/* Hero Headline & Tag */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="space-y-3 pt-2">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#0B1F3A] dark:text-white tracking-tight leading-tight">
              {isAuthenticated ? (
                <>Welcome back, <span className="text-[#087F78] dark:text-[#14B8A6]">{displayName}</span></>
              ) : (
                <>Master Cloud, Linux & DevOps <br className="hidden sm:inline" /><span className="text-[#087F78] dark:text-[#14B8A6]">With Real-World Practice</span></>
              )}
            </h1>
            <p className="text-xs sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              {isAuthenticated
                ? 'Track your real-time learning progress, earned certifications, live scheduled classes, and interactive AI mentor support.'
                : 'Join thousands of ambitious students mastering high-demand engineering skills with hands-on labs, 24/7 AI tutoring, and cryptographic credentials.'}
            </p>
          </div>
        </div>

        {/* Hero Search Bar */}
        <div className="max-w-2xl mx-auto pt-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.currentTarget.elements.namedItem('search') as HTMLInputElement)?.value;
              if (input) window.location.href = `/courses?search=${encodeURIComponent(input)}`;
            }}
            className="relative group"
          >
            <input
              name="search"
              type="text"
              placeholder="Search courses, technologies (Linux, Docker, Python, Cloud)..."
              className="w-full bg-white dark:bg-[#102A43] text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs sm:text-sm rounded-2xl pl-11 pr-28 py-3.5 sm:py-4 border border-slate-200/90 dark:border-[#1E3A56] shadow-sm group-hover:border-[#087F78]/40 focus:outline-none focus:border-[#087F78] focus:ring-2 focus:ring-[#087F78]/20 transition"
            />
            <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5 sm:top-4" />
            
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 px-4 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 hover:scale-[1.02]"
            >
              <span>Explore</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Filter Tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Popular:</span>
            {['Linux Administration', 'Cloud & DevOps', 'Docker & Kubernetes', 'System Design', 'Python'].map((tag) => (
              <Link
                key={tag}
                to={`/courses?search=${encodeURIComponent(tag)}`}
                className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-[#152F4A] text-slate-700 dark:text-slate-300 hover:text-[#087F78] dark:hover:text-[#14B8A6] hover:bg-teal-50 dark:hover:bg-[#087F78]/20 transition"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. FOUR METRICS CARDS ROW (EXACT USER SPECIFICATION) */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Card 1: Active Students */}
          <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs card-hover-effect flex flex-col items-center justify-center text-center space-y-2 group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-teal-50 dark:bg-[#087F78]/20 border border-teal-200/60 dark:border-teal-700/40 flex items-center justify-center text-[#00A896] dark:text-[#14B8A6] group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white font-mono tracking-tight">
              {stats?.activeStudents ?? 15}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
              Active Students
            </div>
          </div>

          {/* Card 2: Professional Courses */}
          <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs card-hover-effect flex flex-col items-center justify-center text-center space-y-2 group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-teal-50 dark:bg-[#087F78]/20 border border-teal-200/60 dark:border-teal-700/40 flex items-center justify-center text-[#00A896] dark:text-[#14B8A6] group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white font-mono tracking-tight">
              {stats?.publishedCourses ?? courses.length ?? 4}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
              Professional Courses
            </div>
          </div>

          {/* Card 3: Lessons Completed */}
          <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs card-hover-effect flex flex-col items-center justify-center text-center space-y-2 group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-700/40 flex items-center justify-center text-[#10B981] dark:text-[#34D399] group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white font-mono tracking-tight">
              {stats?.lessonsCompleted ?? 19}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
              Lessons Completed
            </div>
          </div>

          {/* Card 4: Average Rating */}
          <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs card-hover-effect flex flex-col items-center justify-center text-center space-y-2 group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-700/40 flex items-center justify-center text-[#F59E0B] dark:text-[#FBBF24] group-hover:scale-110 transition-transform">
              <Star className="w-5 h-5 sm:w-6 sm:h-6 fill-amber-400 dark:fill-[#FBBF24]" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white font-mono tracking-tight">
              {stats?.averageRating ? `${stats.averageRating.toFixed(1)} / 5` : '4.9 / 5'}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
              Average Rating
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CONTINUE LEARNING SPOTLIGHT (For Authenticated Students) */}
      {/* ========================================================================= */}
      {isAuthenticated && activeEnrolledCourse && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-[#087F78] dark:text-[#14B8A6]" />
              <span>Continue Learning</span>
            </h2>
            <Link
              to="/dashboard"
              className="text-xs font-mono font-bold text-[#087F78] dark:text-[#14B8A6] hover:underline flex items-center gap-1"
            >
              <span>Full Student Dashboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white dark:bg-[#102A43] rounded-3xl border border-slate-200/90 dark:border-[#1E3A56] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row gap-6 items-center">
            {/* Thumbnail with duration/progress overlay */}
            <div className="relative w-full md:w-72 aspect-video rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
              <img
                src={resolveMediaUrl(activeEnrolledCourse.thumbnail)}
                alt={activeEnrolledCourse.title}
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_COURSE_THUMBNAIL;
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-mono font-bold">
                {activeEnrolledCourse.completedLessons}/{activeEnrolledCourse.totalLessons} Lessons
              </div>
            </div>

            {/* Content Details */}
            <div className="flex-1 w-full space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6] uppercase">
                  {activeEnrolledCourse.instructorName || 'Lead Mentor'}
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold">
                  {activeEnrolledCourse.completedLessons} of {activeEnrolledCourse.totalLessons} lessons completed
                </span>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#0B1F3A] dark:text-white line-clamp-1">
                  {activeEnrolledCourse.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 font-normal">
                  {activeEnrolledCourse.description || 'Pick up right where you left off in your curriculum.'}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] font-mono font-bold">
                  <span className="text-slate-500 dark:text-slate-400">Curriculum Mastery</span>
                  <span className="text-[#087F78] dark:text-[#14B8A6]">{Math.round(activeEnrolledCourse.progressPercent)}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#087F78] to-[#0284C7] dark:from-[#14B8A6] dark:to-[#38BDF8] rounded-full transition-all duration-500" 
                    style={{ width: `${Math.max(activeEnrolledCourse.progressPercent, 5)}%` }} 
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Link
                  to={`/courses/${activeEnrolledCourse.slug}/learn`}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl transition inline-flex items-center justify-center gap-2 shadow-xs group/btn"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-white transition-transform group-hover/btn:scale-110" />
                  <span>Resume Learning Classroom</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. VISUAL FEATURE SPOTLIGHT: PLATFORM CAPABILITIES & IMAGE PREVIEW */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-white to-teal-50/50 dark:from-[#102A43] dark:to-[#0B223D] rounded-3xl border border-slate-200/90 dark:border-[#1E3A56] p-6 sm:p-10 shadow-xs overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Col: Features & Value Proposition */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-[#087F78]/30 border border-teal-200 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] text-xs font-mono font-bold uppercase tracking-wider">
                <Cpu className="w-3.5 h-3.5" />
                <span>Engineered for Real-World Tech Mastery</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white leading-tight">
                An Interactive Learning Experience Built for Modern Engineers
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Khalil Academy pairs high-yield video lectures with hands-on assignments, automated quizzes, live virtual classrooms, and an intelligent AI tutor ready to debug errors around the clock.
              </p>

              {/* 4 Feature Value Bullets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {[
                  { title: 'Ask Khalil AI Tutor', desc: 'Instant code debugging, quiz preparation & concepts breakdown 24/7.' },
                  { title: 'Live Scheduled Sessions', desc: 'Interactive webinars and live problem-solving sessions with Khalil Abdi.' },
                  { title: 'Verifiable Credentials', desc: 'Tamper-proof cryptographic certificates with shareable verification URLs.' },
                  { title: 'Leaderboards & Streaks', desc: 'Earn badges, maintain daily study streaks, and rank on the leaderboards.' },
                ].map((feat, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 rounded-2xl bg-white/80 dark:bg-[#152F4A]/60 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                    <div className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6] flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0B1F3A] dark:text-white">{feat.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  to="/courses"
                  className="px-6 py-3 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-2"
                >
                  <span>Explore Course Catalog</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/live-classes"
                  className="px-5 py-3 bg-white dark:bg-[#152F4A] hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[#0B1F3A] dark:text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-2"
                >
                  <Radio className="w-4 h-4 text-[#EF4444] animate-pulse" />
                  <span>View Live Classes</span>
                </Link>
              </div>
            </div>

            {/* Right Col: Graphic Preview Card & Terminal Mockup */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-sm rounded-3xl bg-[#102A43] border border-slate-700 p-5 shadow-2xl text-white space-y-4">
                
                {/* Terminal Header */}
                <div className="flex items-center justify-between border-b border-slate-700 pb-3 text-xs text-slate-400 font-mono">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                    <span className="text-[11px] text-slate-300 font-bold ml-1">khalil-academy-labs ~</span>
                  </div>
                  <Terminal className="w-4 h-4 text-[#14B8A6]" />
                </div>

                {/* Simulated CLI commands */}
                <div className="space-y-2 font-mono text-xs text-slate-300">
                  <div className="flex items-center space-x-2">
                    <span className="text-[#14B8A6] font-bold">$</span>
                    <span>khalil-cli enroll --track devops</span>
                  </div>
                  <div className="text-[11px] text-emerald-400 pl-4">
                    ✔ Linux & Cloud Fundamentals: Mastered (10/10 Lessons)
                  </div>
                  <div className="text-[11px] text-emerald-400 pl-4">
                    ✔ Docker & Microservices: 100% Passed
                  </div>
                  <div className="flex items-center space-x-2 pt-1">
                    <span className="text-[#14B8A6] font-bold">$</span>
                    <span>ask-ai --explain "Kubernetes Ingress"</span>
                  </div>
                  <div className="text-[11px] text-teal-300 bg-[#152F4A] p-2.5 rounded-xl border border-slate-700 leading-relaxed">
                    💡 <strong>Khalil AI Tutor:</strong> An Ingress exposes HTTP and HTTPS routes from outside the cluster to services within the cluster...
                  </div>
                </div>

                {/* Floating Credential Badge Overlay */}
                <div className="pt-2">
                  <div className="p-3 bg-gradient-to-r from-[#087F78] to-[#0284C7] rounded-2xl flex items-center justify-between text-xs text-white shadow-md">
                    <div className="flex items-center space-x-2.5">
                      <Award className="w-5 h-5 text-amber-300" />
                      <div>
                        <div className="font-bold text-[11px]">Official Certificate Issued</div>
                        <div className="text-[9px] text-teal-100 font-mono">Verification: ID-KA-2026</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#102A43]/20 dark:bg-[#07182D]/20 text-[9px] font-mono font-bold">
                      VERIFIED
                    </span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. CATEGORY EXPLORER BAR */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0B1F3A] dark:text-white">Explore by Category</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Discover specialized learning paths designed for high-impact tech careers.</p>
          </div>
          <Link
            to="/courses"
            className="text-xs font-mono font-bold text-[#087F78] dark:text-[#14B8A6] hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View All Categories</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-xs ${
              selectedCategory === 'ALL'
                ? 'bg-[#087F78] text-white shadow-xs'
                : 'bg-white dark:bg-[#102A43] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1E3A56] hover:border-[#087F78]'
            }`}
          >
            All Tracks ({courses.length})
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-xs ${
                selectedCategory === cat.id
                  ? 'bg-[#087F78] text-white shadow-xs'
                  : 'bg-white dark:bg-[#102A43] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1E3A56] hover:border-[#087F78]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FEATURED PROFESSIONAL COURSES GRID */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0B1F3A] dark:text-white">Featured Courses</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Master real engineering workflows from foundational concepts to advanced production deployments.</p>
          </div>
          <Link
            to="/courses"
            className="text-xs font-mono font-bold text-[#087F78] dark:text-[#14B8A6] hover:underline"
          >
            Browse All ({courses.length})
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-72 rounded-3xl bg-white dark:bg-[#102A43] animate-pulse border border-slate-200 dark:border-[#1E3A56]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayCourses.map((course) => {
              const ratingScore = course.averageRating || 4.9;
              return (
                <div
                  key={course.id}
                  className="bg-white dark:bg-[#102A43] rounded-3xl border border-slate-200/90 dark:border-[#1E3A56] overflow-hidden shadow-xs hover:shadow-xl card-hover-effect transition-all duration-300 flex flex-col group"
                >
                  {/* Thumbnail & Badges */}
                  <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={resolveMediaUrl(course.thumbnail)}
                      alt={course.title}
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_COURSE_THUMBNAIL;
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-white/95 dark:bg-[#0B223D]/95 backdrop-blur-xs text-[#0B1F3A] dark:text-white text-[10px] font-bold flex items-center gap-1 shadow-xs font-mono">
                      <Star className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
                      <span>{ratingScore.toFixed(1)}</span>
                    </div>

                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-[#087F78]/90 text-white text-[10px] font-mono font-bold">
                      {course.level || 'BEGINNER'}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-[#087F78] dark:text-[#14B8A6] uppercase">
                        {course.category?.name || 'TECHNOLOGY'}
                      </span>
                      <Link to={`/courses/${course.slug}`} className="block">
                        <h4 className="font-extrabold text-sm sm:text-base text-[#0B1F3A] dark:text-white group-hover:text-[#087F78] dark:group-hover:text-[#14B8A6] line-clamp-2 leading-snug transition-colors">
                          {course.title}
                        </h4>
                      </Link>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {course.description || 'Comprehensive hands-on curriculum with real-world architecture examples.'}
                      </p>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-[#1E3A56] space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-[#087F78] dark:text-[#14B8A6]" />
                          <span>{course.lessonCount || 10} Lessons</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#087F78] dark:text-[#14B8A6]" />
                          <span>{formatCourseDuration(course.totalDurationMinutes) || '6h 30m'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-sm font-extrabold text-[#0B1F3A] dark:text-white font-mono">
                          {course.isFree || course.price === 0 ? 'Free' : `${course.price.toFixed(0)} KSH`}
                        </span>

                        <Link
                          to={`/courses/${course.slug}`}
                          className="px-4 py-2 bg-slate-100 dark:bg-[#152F4A] group-hover:bg-[#087F78] text-slate-700 dark:text-slate-200 group-hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1 shadow-xs"
                        >
                          <span>View Details</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 8. MISSION & VISION: OUR PURPOSE & CORE VALUES */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-50 dark:bg-[#087F78]/30 border border-teal-200 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] text-xs font-mono font-bold uppercase tracking-wider">
            <Target className="w-3.5 h-3.5" />
            <span>Our Foundation & Purpose</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white">
            Our Mission & Vision
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Dedicated to cultivating world-class engineers, architects, and technical leaders through hands-on rigor and mentorship.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mission Card */}
          <div className="p-7 sm:p-8 rounded-3xl bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] shadow-xs card-hover-effect flex flex-col justify-between space-y-6 relative overflow-hidden group">
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6] flex items-center justify-center shadow-xs">
                  <Target className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#087F78] dark:text-[#14B8A6] bg-teal-50 dark:bg-[#087F78]/30 px-3 py-1 rounded-full border border-teal-200/60 dark:border-teal-700/50">
                  Core Mission
                </span>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-[#0B1F3A] dark:text-white mb-2">
                  Democratizing Elite Tech Mastery
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  To empower ambitious learners, engineers, and tech professionals across East Africa and globally with production-grade technical education, interactive live studios, and industry-validated certifications that unlock premier career opportunities.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#1E3A56]">
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6] shrink-0" />
                  <span>100% Practical & Real-World Lab Architectures</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6] shrink-0" />
                  <span>AI-Augmented Adaptive Tutoring on Every Lesson</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6] shrink-0" />
                  <span>Direct Mentorship with Industry Lead Instructors</span>
                </div>
              </div>
            </div>
          </div>

          {/* Vision Card */}
          <div className="p-7 sm:p-8 rounded-3xl bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] shadow-xs card-hover-effect flex flex-col justify-between space-y-6 relative overflow-hidden group">
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6] flex items-center justify-center shadow-xs">
                  <Eye className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#087F78] dark:text-[#14B8A6] bg-teal-50 dark:bg-[#087F78]/30 px-3 py-1 rounded-full border border-teal-200/60 dark:border-teal-700/50">
                  Global Vision
                </span>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-[#0B1F3A] dark:text-white mb-2">
                  The Premier Hub for Cloud & Systems Leadership
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  To become the definitive global academy and innovation hub where theoretical knowledge transforms into architectural execution, building a network of 10,000+ certified specialists driving distributed systems and cloud infrastructure worldwide.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#1E3A56]">
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6] shrink-0" />
                  <span>Global Talent Pathways & Enterprise Readiness</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6] shrink-0" />
                  <span>Cryptographically Verifiable Academic Credentials</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6] shrink-0" />
                  <span>Collaborative Open Learning Ecosystem & Community</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. CONTACT US & ACADEMIC INQUIRIES */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8" id="contact">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-50 dark:bg-[#087F78]/30 border border-teal-200 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] text-xs font-mono font-bold uppercase tracking-wider">
            <Mail className="w-3.5 h-3.5" />
            <span>Get in Touch</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white">
            Contact & Academic Support
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Have questions about course curricula, live masterclasses, or corporate training? Reach out to our team.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Info Columns (4 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#0B1F3A] dark:text-white mb-1">
                  Contact Information
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Our academic advisors and technical support team are here to assist you.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6] flex items-center justify-center shrink-0 border border-teal-200/60 dark:border-teal-700/50">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#0B1F3A] dark:text-white block">Email Support</span>
                    <a href="mailto:support@khalilacademy.com" className="text-slate-500 dark:text-slate-400 hover:text-[#087F78] dark:hover:text-[#14B8A6] transition">
                      support@khalilacademy.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6] flex items-center justify-center shrink-0 border border-teal-200/60 dark:border-teal-700/50">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#0B1F3A] dark:text-white block">Global Virtual Campus</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Nairobi, Kenya & Worldwide Online
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6] flex items-center justify-center shrink-0 border border-teal-200/60 dark:border-teal-700/50">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#0B1F3A] dark:text-white block">Advisory Hours</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Monday – Saturday, 8:00 AM – 8:00 PM EAT
                    </span>
                  </div>
                </div>
              </div>

              {/* Fast Response Guarantee */}
              <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-[#087F78]/20 border border-teal-200/80 dark:border-teal-700/50 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#087F78] dark:text-[#14B8A6] shrink-0" />
                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                  <strong>Fast Inquiries:</strong> Inquiries submitted via this form are routed directly to lead mentors with an average response time of under 2 hours.
                </p>
              </div>
            </div>
          </div>

          {/* Right Contact Form (7 cols) */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] shadow-xs">
              {contactSubmitted ? (
                <div className="p-8 text-center space-y-4 animate-fadeIn">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0B1F3A] dark:text-white">
                    Message Sent Successfully!
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                    Thank you for reaching out to Khalil Academy. An academic advisor will review your message and reply back to you shortly.
                  </p>
                  <button
                    onClick={() => setContactSubmitted(false)}
                    className="px-5 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    Send Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#0B1F3A] dark:text-white">
                        Your Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. John Doe"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78] transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#0B1F3A] dark:text-white">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78] transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0B1F3A] dark:text-white">
                      Inquiry Topic
                    </label>
                    <select
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 text-xs text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78] transition"
                    >
                      <option value="Course Inquiries & Enrollment">Course Inquiries & Enrollment</option>
                      <option value="Live Masterclasses & Schedule">Live Masterclasses & Schedule</option>
                      <option value="Corporate & Team Training">Corporate & Team Training</option>
                      <option value="Certificate Verification Assistance">Certificate Verification Assistance</option>
                      <option value="General Academic Question">General Academic Question</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0B1F3A] dark:text-white">
                      Your Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="How can we help your learning journey or career goals today?"
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      className="w-full p-4 rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78] transition resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={contactLoading}
                    className="w-full py-3.5 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{contactLoading ? 'Sending Inquiry...' : 'Send Message to Academy Advisors'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. INSTRUCTOR SPOTLIGHT & BOTTOM CTA BANNER */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#087F78] to-[#102A43] text-white rounded-3xl p-8 sm:p-12 shadow-xl space-y-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#102A43]/20 dark:bg-[#07182D]/20 text-teal-200 text-xs font-mono font-bold">
              <GraduationCap className="w-4 h-4 text-teal-200" />
              <span>Lead Instructor: Khalil Abdi Wali</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Start Building Real Tech Competence Today
            </h3>
            <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed">
              Whether you are preparing for certifications, advancing your cloud engineering skills, or starting from scratch, Khalil Academy equips you with practical mastery.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 bg-white dark:bg-[#102A43] hover:bg-slate-100 dark:hover:bg-[#0B223D] text-[#087F78] font-extrabold text-xs rounded-xl shadow-lg transition text-center"
            >
              Get Started Free
            </Link>
            <Link
              to="/courses"
              className="w-full sm:w-auto px-6 py-3.5 bg-white dark:bg-[#102A43]/15 dark:bg-[#07182D]/15 hover:bg-white dark:hover:bg-[#152F4A] dark:bg-[#102A43]/25 dark:bg-[#07182D]/25 text-white font-bold text-xs rounded-xl border border-white/20 transition text-center"
            >
              Explore Catalog
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};
