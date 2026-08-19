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
    <div className="bg-[#132742] rounded-2xl border border-[#23426A] hover:border-[#4FD1C5]/60 transition-all duration-300 flex flex-col overflow-hidden group hover:shadow-2xl hover:shadow-[#1A365D]/40 hover:-translate-y-0.5 font-sans">
      
      {/* Thumbnail & Badges */}
      <div className="relative aspect-video bg-[#0A1322] overflow-hidden border-b border-[#23426A]">
        <img
          src={imgSrc}
          alt={course.title}
          loading="lazy"
          onError={() => setImgSrc(DEFAULT_COURSE_THUMBNAIL)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#132742] via-transparent to-black/30 opacity-60 pointer-events-none" />
        
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
          {course.isEnrolled ? (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-[#22C55E]/90 text-white backdrop-blur-md border border-[#22C55E] shadow-sm">
              Enrolled
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-[#0E1D33]/90 text-[#4FD1C5] backdrop-blur-md border border-[#4FD1C5]/30 shadow-sm">
              {course.category?.name || 'Academy Track'}
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col space-y-3">
        
        {/* Track & Skill Level Header */}
        <div className="text-[11px] font-extrabold tracking-wider text-[#4FD1C5] uppercase">
          {categoryName} • {levelText}
        </div>

        {/* Course Title */}
        <Link
          to={course.isEnrolled ? `/courses/${course.slug}/learn` : `/courses/${course.slug}`}
          className="group-hover:text-[#4FD1C5] transition-colors block"
        >
          <h3 className="font-extrabold text-[#F8FAFC] text-base line-clamp-2 leading-snug">
            {course.title}
          </h3>
        </Link>

        {/* Course Description */}
        <p className="text-xs text-[#CBD5E1] line-clamp-2 leading-relaxed font-normal">
          {course.description || 'Comprehensive professional training curriculum.'}
        </p>

        {/* Social Proof: Real Star Rating */}
        <div className="flex items-center gap-1.5 text-xs">
          {ratingInfo.hasRating ? (
            <div className="flex items-center gap-1.5 text-[#F59E0B] font-extrabold">
              <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
              <span>{ratingInfo.score.toFixed(1)}</span>
              <span className="text-[#94A3B8] font-normal text-[11px]">
                ({ratingInfo.count} {ratingInfo.count === 1 ? 'rating' : 'ratings'})
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-[#94A3B8] italic">No ratings yet</span>
          )}
        </div>

        {/* Real Statistics: Duration & Active Enrollments */}
        <div className="pt-2 border-t border-[#23426A] grid grid-cols-2 gap-2 text-xs text-[#CBD5E1]">
          <div className="flex items-center gap-1.5 text-[11px] text-[#CBD5E1]">
            <Clock className="w-3.5 h-3.5 text-[#4FD1C5] flex-shrink-0" />
            <span className="truncate">{durationText}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#CBD5E1]">
            <Users className="w-3.5 h-3.5 text-[#4FD1C5] flex-shrink-0" />
            <span className="truncate">{enrollmentText}</span>
          </div>
        </div>

        {/* Instructor */}
        <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] pt-1">
          <User className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
          <span className="truncate">Instructor: <strong className="text-[#CBD5E1] font-semibold">{course.instructor?.name || 'Khalil Academy Instructor'}</strong></span>
        </div>

        {/* Price & Primary Action */}
        <div className="mt-auto pt-4 border-t border-[#23426A] flex items-center justify-between">
          <div>
            {course.isEnrolled ? (
              <span className="text-xs font-black text-[#4FD1C5] uppercase tracking-wider">ACTIVE ACCESS</span>
            ) : isFree ? (
              <span className="text-base font-extrabold text-[#4FD1C5]">FREE</span>
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-extrabold text-[#F8FAFC]">
                  ${course.discountPrice !== null && course.discountPrice !== undefined ? course.discountPrice : course.price}
                </span>
                {course.discountPrice !== null && course.discountPrice !== undefined && course.discountPrice < course.price && (
                  <span className="text-xs text-[#94A3B8] line-through">
                    ${course.price}
                  </span>
                )}
              </div>
            )}
          </div>

          <Link
            to={course.isEnrolled ? `/courses/${course.slug}/learn` : `/courses/${course.slug}`}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
              course.isEnrolled
                ? 'bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold'
                : 'bg-[#0E1D33] hover:bg-[#1A365D] text-[#F8FAFC] border border-[#23426A] hover:border-[#4FD1C5]'
            }`}
          >
            <span>{course.isEnrolled ? 'Resume' : 'View Course Curriculum'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

    </div>
  );
};
