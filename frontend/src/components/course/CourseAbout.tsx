import React from 'react';
import { CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { Course } from '../../types';

interface CourseAboutProps {
  course: Course;
}

export const CourseAbout: React.FC<CourseAboutProps> = ({ course }) => {
  const hasObjectives = Array.isArray(course.learningObjectives) && course.learningObjectives.length > 0;
  const hasRequirements = Array.isArray(course.requirements) && course.requirements.length > 0;
  const hasAudience = Array.isArray(course.targetAudience) && course.targetAudience.length > 0;

  return (
    <div className="space-y-6">
      {/* Course Overview & Description */}
      {course.description && (
        <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white">Course Overview</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A9BACB] leading-relaxed whitespace-pre-line font-normal">
            {course.description}
          </p>

          {/* WHAT YOU WILL LEARN (Mockup 3) */}
          {hasObjectives && (
            <div className="pt-4 border-t border-slate-100 dark:border-[#1E3A56] space-y-3">
              <h4 className="text-xs font-mono font-bold tracking-wider text-slate-500 dark:text-[#A9BACB] uppercase">
                What You Will Learn
              </h4>
              <div className="space-y-2.5 pt-1">
                {course.learningObjectives.map((obj, idx) => (
                  <div key={idx} className="flex items-start space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#006666] flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700 dark:text-[#A9BACB] font-medium leading-relaxed">{obj}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Requirements */}
      {hasRequirements && (
        <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-3">
          <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#006666]" />
            <span>Prerequisites & Requirements</span>
          </h3>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-[#A9BACB] font-medium pl-1">
            {course.requirements.map((req, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#006666] mt-1.5 shrink-0" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Target Audience */}
      {hasAudience && (
        <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-3">
          <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-[#006666]" />
            <span>Target Audience</span>
          </h3>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-[#A9BACB] font-medium pl-1">
            {course.targetAudience.map((aud, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#006666] mt-1.5 shrink-0" />
                <span>{aud}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
