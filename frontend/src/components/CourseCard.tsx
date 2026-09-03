import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../types';
import { Star, Clock, Users, User, ArrowRight } from 'lucide-react';
import { resolveMediaUrl, DEFAULT_COURSE_THUMBNAIL } from '../utils/media';
import { formatCourseDuration, formatRatingDisplay, formatEnrollmentDisplay } from '../utils/formatters';

interface CourseCardProps {
  course: Course;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  const isFree = course.price === 0 || course.isFree;
  const [imgSrc, setImgSrc] = useState(() => resolveMediaUrl(course.thumbnail));

  const totalMinutes = course.totalDurationMinutes ?? (course.durationHours ? Math.round(course.durationHours * 60) : 0);
  const ratingInfo = formatRatingDisplay(course.averageRating, course.reviewCount ?? (course as any).ratingCount);
  const durationText = formatCourseDuration(totalMinutes);
  const enrolledCount = course.enrollmentCount ?? course.studentCount ?? 0;
  const enrollmentText = formatEnrollmentDisplay(enrolledCount);

  const categoryName = (course.category?.name || 'TECHNOLOGY').toUpperCase();
  const levelText = `${course.level} LEVEL`;

  return (
    <div className="bg-white dark:bg-[#102A43] rounded-2xl border border-slate-200/90 dark:border-[#1E3A56] hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col overflow-hidden group shadow-xs hover:shadow-md font-sans">
      
      {/* Thumbnail & Badges */}
      <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden border-b border-slate-100 dark:border-[#1E3A56]">
        <img
          src={imgSrc}
          alt={course.title}
          loading="lazy"
          onError={() => setImgSrc(DEFAULT_COURSE_THUMBNAIL)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
          {course.isEnrolled ? (
            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-[#10B981] text-white shadow-xs">
              Enrolled
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-white/95 dark:bg-[#0B223D]/95 text-[#087F78] dark:text-[#14B8A6] border border-slate-200 dark:border-slate-700 shadow-xs">
              {course.category?.name || 'TECHNOLOGY'}
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col space-y-3">
        
        {/* Track & Skill Level Header */}
        <div className="text-[10px] font-mono font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
          {categoryName} • {levelText}
        </div>

        {/* Course Title */}
        <Link
          to={course.isEnrolled ? `/courses/${course.slug}/learn` : `/courses/${course.slug}`}
          className="group-hover:text-[#087F78] dark:group-hover:text-[#14B8A6] transition-colors block"
        >
          <h3 className="font-bold text-[#0B1F3A] dark:text-white text-base line-clamp-2 leading-snug">
            {course.title}
          </h3>
        </Link>

        {/* Course Description */}
        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-normal">
          {course.description || 'Master the core principles and frameworks required for industry mastery.'}
        </p>

        {/* Instructor */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 pt-1">
          <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="font-mono text-[11px] truncate">{course.instructor?.name || 'Khalil Academy Instructor'}</span>
        </div>

        {/* Real Statistics: Duration & Enrollments */}
        <div className="pt-2 border-t border-slate-100 dark:border-[#1E3A56] grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono text-[11px]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#087F78] dark:text-[#14B8A6] flex-shrink-0" />
            <span className="truncate">{durationText}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#087F78] dark:text-[#14B8A6] flex-shrink-0" />
            <span className="truncate">{enrollmentText}</span>
          </div>
        </div>

        {/* Price, Social Proof & Primary Action */}
        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-[#1E3A56] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {ratingInfo.hasRating ? (
              <div className="flex items-center gap-1 text-xs font-bold text-[#0B1F3A] dark:text-white">
                <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                <span>{ratingInfo.score.toFixed(1)}</span>
                <span className="text-slate-400 dark:text-slate-500 font-normal text-[10px]">
                  ({ratingInfo.count})
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Unrated</span>
            )}
            
            <span className="text-slate-300 dark:text-slate-700">•</span>
            
            <div className="font-mono font-bold text-xs">
              {isFree ? (
                <span className="text-[#10B981] font-bold">FREE</span>
              ) : (
                <span className="text-[#0B1F3A] dark:text-white font-black">{course.price.toLocaleString()} KSH</span>
              )}
            </div>
          </div>

          <Link
            to={course.isEnrolled ? `/courses/${course.slug}/learn` : `/courses/${course.slug}`}
            className="p-2 rounded-xl bg-slate-50 dark:bg-[#152F4A] hover:bg-[#087F78] dark:hover:bg-[#087F78] text-slate-600 dark:text-slate-300 hover:text-white dark:hover:text-white transition shadow-xs"
            aria-label={`View ${course.title}`}
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
};
