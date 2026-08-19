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
      <nav className="flex items-center space-x-2 text-xs font-semibold text-[#94A3B8]">
        <Link to="/" className="hover:text-[#4FD1C5] transition">Home</Link>
        <span>/</span>
        <Link to="/courses" className="hover:text-[#4FD1C5] transition">Courses</Link>
        {course.category && (
          <>
            <span>/</span>
            <Link to={`/courses?category=${encodeURIComponent(course.category.name)}`} className="hover:text-[#4FD1C5] transition">
              {course.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-[#F8FAFC] font-bold line-clamp-1">{course.title}</span>
      </nav>

      {/* Course Title */}
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#F8FAFC] tracking-tight leading-tight">
        {course.title}
      </h1>

      {/* Description */}
      {course.description && (
        <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed max-w-3xl font-normal">
          {course.description}
        </p>
      )}

      {/* Meta Row: Rating, Level, Certificate */}
      <div className="flex flex-wrap items-center gap-4 text-xs pt-1 text-[#F8FAFC]">
        {/* Rating */}
        {hasRatings ? (
          <div className="flex items-center gap-1.5 font-bold text-[#F59E0B]">
            <span>{avgRating.toFixed(1)}</span>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    star <= Math.round(avgRating)
                      ? 'fill-[#F59E0B] text-[#F59E0B]'
                      : 'text-[#23426A]'
                  }`}
                />
              ))}
            </div>
            <span className="text-[#94A3B8] font-normal">
              ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        ) : (
          <span className="text-xs text-[#94A3B8] italic">No ratings yet</span>
        )}

        <span className="text-[#23426A]">•</span>

        {/* Level */}
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0E1D33] text-[#4FD1C5] border border-[#4FD1C5]/30 uppercase tracking-wider">
          {course.level}
        </span>

        <span className="text-[#23426A]">•</span>

        {/* Certificate Included */}
        <span className="flex items-center gap-1 text-[#22C55E] font-bold">
          <Award className="w-4 h-4 text-[#F59E0B]" />
          <span>Verified Certificate Included</span>
        </span>
      </div>

      {/* Instructor Badge */}
      {course.instructor && (
        <div className="flex items-center space-x-3 pt-2">
          {course.instructor.avatar ? (
            <img
              src={course.instructor.avatar}
              alt={course.instructor.name}
              className="w-10 h-10 rounded-xl object-cover border border-[#23426A] shadow-md"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-[#1A365D] border border-[#4FD1C5]/40 text-[#4FD1C5] font-extrabold flex items-center justify-center text-sm shadow-md">
              {course.instructor.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h4 className="text-sm font-bold text-[#F8FAFC]">{course.instructor.name}</h4>
            <p className="text-xs text-[#94A3B8] font-medium">Academy Instructor</p>
          </div>
        </div>
      )}
    </div>
  );
};
