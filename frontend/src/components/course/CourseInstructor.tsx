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
    <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl p-6 sm:p-8 shadow-xs text-center space-y-4">
      {/* Instructor Avatar */}
      <div className="flex justify-center">
        {instructor.avatar ? (
          <img
            src={instructor.avatar}
            alt={instructor.name || 'Instructor'}
            className="w-20 h-20 rounded-2xl object-cover border border-slate-200 dark:border-[#1E3A56] shadow-sm"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-[#087F78] text-white font-extrabold text-2xl flex items-center justify-center shadow-sm">
            {instructor.name ? instructor.name.charAt(0).toUpperCase() : 'I'}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-base sm:text-lg font-bold text-[#0B1F3A] dark:text-white">{instructor.name || 'Dr. Aris Thorne'}</h3>
        <p className="text-xs text-[#087F78] font-mono font-bold">
          {instructor.role || 'Former CTO at TechNova'}
        </p>
      </div>

      {/* Instructor Biography */}
      <p className="text-xs text-slate-600 dark:text-[#A9BACB] leading-relaxed max-w-lg mx-auto font-normal">
        {instructor.bio || 'With extensive experience leading engineering teams across enterprise organizations, the instructor brings battle-tested practical strategies to this curriculum.'}
      </p>

      {/* View Profile Action */}
      <div className="pt-2">
        <button
          onClick={() => {}}
          className="w-full max-w-xs mx-auto py-2 px-4 rounded-xl border border-slate-300 dark:border-[#1E3A56] hover:border-[#087F78] hover:text-[#087F78] text-slate-700 dark:text-[#A9BACB] font-mono text-xs font-bold transition shadow-xs"
        >
          View Profile
        </button>
      </div>
    </div>
  );
};
