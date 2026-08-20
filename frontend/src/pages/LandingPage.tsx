import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Course, Category, AcademyStats } from '../types';
import { CourseCard } from '../components/CourseCard';
import { resolveMediaUrl, DEFAULT_COURSE_THUMBNAIL } from '../utils/media';
import { formatCourseDuration, formatRatingDisplay, formatEnrollmentDisplay, formatStatCount } from '../utils/formatters';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Users, 
  Award, 
  BookOpen, 
  Clock, 
  ShieldCheck, 
  Star, 
  Compass, 
  Laptop, 
  CheckCircle 
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<AcademyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, catRes, sRes] = await Promise.all([
          api.get('/courses?limit=7'),
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

  const featuredCourse = courses.length > 0 ? courses[0] : null;
  const gridCourses = courses.length > 1 ? courses.slice(1, 7) : courses;

  const featuredDuration = featuredCourse ? formatCourseDuration(featuredCourse.totalDurationMinutes) : '';
  const featuredRating = featuredCourse ? formatRatingDisplay(featuredCourse.averageRating, featuredCourse.reviewCount) : null;
  const featuredEnrolled = featuredCourse ? formatEnrollmentDisplay(featuredCourse.enrollmentCount) : '';

  return (
    <div className="space-y-24 pb-20 bg-[#0A1322] text-[#F8FAFC]">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 border-b border-[#23426A] bg-[#0A1322]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[380px] bg-[#1A365D]/30 blur-[140px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          
          {/* Main Heading */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#F8FAFC] max-w-4xl mx-auto leading-[1.15]">
            Master In-Demand Skills. <br />
            Advance Your Career.
          </h1>

          {/* Supporting Text */}
          <p className="text-base sm:text-lg text-[#CBD5E1] max-w-2xl mx-auto font-normal leading-relaxed">
            High-quality courses and hands-on training designed to help you master modern technologies, gain verified certifications, and achieve your career goals.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/courses"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold text-xs shadow-xl shadow-[#4FD1C5]/20 flex items-center justify-center gap-2 transition"
            >
              <span>Explore Courses</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/register"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#0E1D33] border border-[#23426A] hover:border-[#4FD1C5] text-[#F8FAFC] font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
            >
              <span>Start Learning Free</span>
            </Link>
          </div>

          {/* Real Credibility Stats Bar (Calculated from Database) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-10">
            {[
              {
                label: 'Active Students',
                val: formatStatCount(stats?.activeStudents, 1000),
                icon: Users,
                color: 'text-[#4FD1C5]',
              },
              {
                label: 'Professional Courses',
                val: formatStatCount(stats?.publishedCourses, 50),
                icon: BookOpen,
                color: 'text-[#4FD1C5]',
              },
              {
                label: 'Lessons Completed',
                val: formatStatCount(stats?.lessonsCompleted, 10000),
                icon: CheckCircle2,
                color: 'text-[#22C55E]',
              },
              {
                label: 'Average Rating',
                val: stats?.averageRating && stats.averageRating > 0 ? `${stats.averageRating.toFixed(1)} / 5` : 'No ratings yet',
                icon: Star,
                color: 'text-[#F59E0B]',
              },
            ].map((stat, i) => (
              <div key={i} className="p-5 rounded-2xl bg-[#132742] border border-[#23426A] text-center shadow-md">
                <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
                <div className="text-xl font-extrabold text-[#F8FAFC]">{stat.val}</div>
                <div className="text-[11px] text-[#94A3B8] font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Course Spotlight */}
      {featuredCourse && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#132742] rounded-3xl border border-[#23426A] p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Featured Visual */}
              <div className="lg:col-span-5 relative aspect-video lg:aspect-[4/3] rounded-2xl overflow-hidden bg-[#0A1322] border border-[#23426A]">
                <img
                  src={resolveMediaUrl(featuredCourse.thumbnail)}
                  alt={featuredCourse.title}
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_COURSE_THUMBNAIL;
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 px-3 py-1 bg-[#F59E0B] text-[#0A1322] rounded-lg text-xs font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-[#0A1322]" />
                  <span>Featured Course</span>
                </div>
              </div>

              {/* Featured Details */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#0E1D33] text-[#4FD1C5] border border-[#4FD1C5]/30 uppercase tracking-wider">
                    {featuredCourse.category?.name || 'Academy Track'}
                  </span>
                  <span className="text-xs text-[#94A3B8]">•</span>
                  <span className="text-xs text-[#CBD5E1] font-medium">{featuredCourse.level} Level</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] leading-tight">
                  {featuredCourse.title}
                </h2>

                <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
                  {featuredCourse.description}
                </p>

                <div className="flex flex-wrap items-center gap-6 py-3 text-xs text-[#CBD5E1] border-y border-[#23426A]">
                  <div className="flex items-center gap-1.5 font-bold text-[#F59E0B]">
                    {featuredRating?.hasRating ? (
                      <>
                        <Star className="w-4 h-4 fill-[#F59E0B]" />
                        <span>{featuredRating.score.toFixed(1)}</span>
                        <span className="text-[#94A3B8] font-normal">({featuredRating.count} ratings)</span>
                      </>
                    ) : (
                      <span className="text-[#94A3B8] font-normal italic">No ratings yet</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-[#4FD1C5]" />
                    <span>{featuredDuration}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-[#4FD1C5]" />
                    <span>{featuredEnrolled}</span>
                  </div>

                  {featuredCourse.instructor?.name && (
                    <div className="font-medium">
                      Instructor: <strong className="text-[#F8FAFC]">{featuredCourse.instructor.name}</strong>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="text-2xl font-black text-[#F8FAFC]">
                      {featuredCourse.isFree || featuredCourse.price === 0 ? 'FREE' : `${featuredCourse.price.toLocaleString()} KSH`}
                    </span>
                  </div>

                  <Link
                    to={`/courses/${featuredCourse.slug}`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold text-xs shadow-lg shadow-[#4FD1C5]/20 transition"
                  >
                    <span>View Course Curriculum</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

              </div>
            </div>
          </div>
        </section>
      )}

      {/* Explore Our Courses Marketplace */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-[#4FD1C5] text-xs font-extrabold uppercase tracking-wider mb-1">
              <Compass className="w-3.5 h-3.5" />
              <span>Academy Catalog</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">Explore Our Courses</h2>
            <p className="text-xs sm:text-sm text-[#CBD5E1] mt-1">
              Build practical knowledge and develop the skills that matter for your career.
            </p>
          </div>
          <Link
            to="/courses"
            className="text-xs font-extrabold text-[#4FD1C5] hover:text-white flex items-center gap-1 group"
          >
            <span>View All Courses</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 rounded-2xl bg-[#132742] animate-pulse border border-[#23426A]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {gridCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>

      {/* Why Choose Us */}
      <section className="bg-[#0E1D33] border-y border-[#23426A] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">Why Choose Khalil Academy?</h2>
            <p className="text-xs sm:text-sm text-[#CBD5E1] mt-1">Structured education designed around real-world mastery.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Learn Practical Skills',
                desc: 'Focus on knowledge and techniques you can immediately apply in real-world environments.',
                icon: Laptop,
                color: 'text-[#4FD1C5]',
              },
              {
                title: 'Learn at Your Own Pace',
                desc: 'Access video lessons, quizzes, and course resources whenever your schedule allows.',
                icon: Clock,
                color: 'text-[#4FD1C5]',
              },
              {
                title: 'Professional Courses',
                desc: 'Learn from structured, industry-aligned courses designed by senior engineering practitioners.',
                icon: BookOpen,
                color: 'text-[#4FD1C5]',
              },
              {
                title: 'Build Your Future',
                desc: 'Develop tangible competencies and earn verified certificates supporting your career growth.',
                icon: Award,
                color: 'text-[#F59E0B]',
              },
            ].map((item, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-[#132742] border border-[#23426A] space-y-3 shadow-lg hover:border-[#4FD1C5]/60 transition">
                <div className={`w-10 h-10 rounded-xl bg-[#0A1322] border border-[#23426A] ${item.color} flex items-center justify-center`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-extrabold text-[#F8FAFC]">{item.title}</h3>
                <p className="text-xs text-[#CBD5E1] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verified Certificate Trust Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#132742] border border-[#23426A] p-8 sm:p-12 shadow-2xl relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A365D] border border-[#4FD1C5]/40 text-[#4FD1C5] text-xs font-bold">
                <Award className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Verifiable Academic Credentials</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] leading-tight">
                Earn Official Certificates of Completion
              </h2>
              <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
                Upon successfully completing all course requirements and evaluations, you receive a cryptographically verified certificate inscribed with your registered legal name and validation ID.
              </p>
              
              <div className="space-y-2.5 pt-1">
                {[
                  'Permanent certificate serial numbers for global verification',
                  'Online validation URL accessible to employers and institutions',
                  'High-resolution PDF certificate export for resumes and LinkedIn',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-[#F8FAFC] font-medium">
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3">
                <Link
                  to="/certificates/verify/KHA-2026-000001"
                  className="inline-flex items-center gap-2 text-xs font-extrabold text-[#4FD1C5] hover:text-white"
                >
                  <span>Check Certificate Verification System</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Certificate Preview Card */}
            <div className="bg-[#0A1322] border border-[#23426A] rounded-2xl p-6 sm:p-8 space-y-4 shadow-inner relative">
              <div className="flex justify-between items-start border-b border-[#23426A] pb-4">
                <div>
                  <span className="text-[10px] font-mono text-[#4FD1C5] block uppercase tracking-wider font-bold">Official Credential</span>
                  <h4 className="text-base font-extrabold text-[#F8FAFC]">Certificate of Completion</h4>
                </div>
                <span className="text-[10px] font-mono text-[#F59E0B] font-extrabold px-2 py-0.5 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/30">
                  KHA-2026-981245
                </span>
              </div>
              <div className="space-y-1 py-2">
                <span className="text-[11px] text-[#94A3B8] block">This certificate is awarded to</span>
                <span className="text-lg font-extrabold text-[#F8FAFC] block">Mohamed Ibrahim</span>
                <span className="text-xs text-[#CBD5E1] block pt-1">
                  for successfully mastering the curriculum in <strong className="text-[#4FD1C5]">Docker & Kubernetes Masterclass</strong>
                </span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-[#23426A] text-[10px] text-[#94A3B8]">
                <span>Issued by Khalil Academy</span>
                <span className="text-[#22C55E] font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-[#22C55E]" /> Verified & Active
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#1A365D] p-8 sm:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 text-white border border-[#4FD1C5]/30">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight text-white">
              Ready to Build Skills and Advance Your Career?
            </h2>
            <p className="text-xs sm:text-sm text-[#CBD5E1]">
              Join students and professionals expanding their technical expertise today.
            </p>
          </div>
          <Link
            to="/register"
            className="px-8 py-3.5 rounded-xl bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-black text-xs shadow-xl transition whitespace-nowrap"
          >
            Create Free Account
          </Link>
        </div>
      </section>

    </div>
  );
};
