import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Award, ShieldCheck } from 'lucide-react';
import { Course } from '../../types';

interface CourseHeaderProps {
  course: Course;
}

export const CourseHeader: React.FC<CourseHeaderProps> = ({ course }) => {
  const avgRating = course.stats?.averageRating ?? course.averageRating ?? 0;
  const reviewCount = course.stats?.reviewCount ?? course.reviewCount ?? 0;
  const hasRatings = reviewCount > 0 && avgRating > 0;

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-xs font-semibold text-slate-500 dark:text-[#A9BACB]">
        <Link to="/" className="hover:text-[#006666] transition">Home</Link>
        <span>/</span>
        <Link to="/courses" className="hover:text-[#006666] transition">Courses</Link>
        {course.category && (
          <>
            <span>/</span>
            <Link to={`/courses?category=${encodeURIComponent(course.category.name)}`} className="hover:text-[#006666] transition">
              {course.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-[#0B1F3A] dark:text-white font-bold line-clamp-1">{course.title}</span>
      </nav>

      {/* Course Title */}
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0B1F3A] dark:text-white tracking-tight leading-tight">
        {course.title}
      </h1>

      {/* Description */}
      {course.description && (
        <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A9BACB] leading-relaxed max-w-3xl font-normal">
          {course.description}
        </p>
      )}

      {/* Meta Row: Rating, Level, Certificate */}
      <div className="flex flex-wrap items-center gap-3 text-xs pt-1 text-[#0B1F3A] dark:text-white">
        {/* Rating */}
        {hasRatings ? (
          <div className="flex items-center gap-1.5 font-bold text-[#0B1F3A] dark:text-white">
            <Star className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
            <span>{avgRating.toFixed(1)}</span>
            <span className="text-slate-400 font-normal text-[11px]">
              ({reviewCount} reviews)
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">No reviews yet</span>
        )}

        <span className="text-slate-300">•</span>

        {/* Level */}
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#E6F7F5] text-[#087F78] border border-[#006666]/20 uppercase">
          {course.level} Level
        </span>

        <span className="text-slate-300">•</span>

        {/* Certificate Included */}
        <span className="flex items-center gap-1 text-[#10B981] font-bold text-xs">
          <Award className="w-4 h-4 text-[#F59E0B]" />
          <span>Certificate Included</span>
        </span>
      </div>
    </div>
  );
};
