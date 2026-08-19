import React from 'react';
import { BookOpen, Users, Star } from 'lucide-react';

interface InstructorProps {
  instructor?: {
    id?: string;
    name?: string;
    avatar?: string;
    bio?: string;
    role?: string;
    courseCount?: number;
    studentCount?: number;
    averageRating?: number;
  };
}

export const CourseInstructor: React.FC<InstructorProps> = ({ instructor }) => {
  if (!instructor) return null;

  const averageRating = instructor.averageRating || 5.0;
  const courseCount = instructor.courseCount || 0;
  const studentCount = instructor.studentCount || 0;

  return (
    <div className="bg-[#132742] border border-[#23426A] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
        {instructor.avatar ? (
          <img
            src={instructor.avatar}
            alt={instructor.name || 'Instructor'}
            className="w-20 h-20 rounded-2xl object-cover border border-[#23426A] shadow-md"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-[#1A365D] border border-[#4FD1C5]/40 text-[#4FD1C5] font-extrabold text-2xl flex items-center justify-center shadow-lg">
            {instructor.name ? instructor.name.charAt(0).toUpperCase() : 'I'}
          </div>
        )}

        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-[#F8FAFC]">{instructor.name || 'Academy Instructor'}</h3>
          <p className="text-xs text-[#4FD1C5] font-bold uppercase tracking-wider">
            {instructor.role || 'Course Instructor'}
          </p>

          {/* Instructor Metrics Row */}
          <div className="flex flex-wrap gap-4 pt-2 text-xs font-semibold text-[#CBD5E1]">
            {averageRating > 0 && (
              <div className="flex items-center space-x-1 font-bold text-[#F59E0B]">
                <Star className="h-4 w-4 fill-[#F59E0B]" />
                <span className="text-[#F8FAFC]">{averageRating.toFixed(1)} Instructor Rating</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4 text-[#94A3B8]" />
              <span>{studentCount} {studentCount === 1 ? 'Student' : 'Students'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <BookOpen className="h-4 w-4 text-[#94A3B8]" />
              <span>{courseCount} {courseCount === 1 ? 'Course' : 'Courses'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Instructor Biography */}
      {instructor.bio && instructor.bio.trim().length > 0 && (
        <div className="pt-4 border-t border-[#23426A] space-y-2">
          <h4 className="text-xs font-extrabold text-[#94A3B8] uppercase tracking-wider">About the Instructor</h4>
          <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed whitespace-pre-line font-normal">
            {instructor.bio}
          </p>
        </div>
      )}
    </div>
  );
};
