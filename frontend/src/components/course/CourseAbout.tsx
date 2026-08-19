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
      {/* What You'll Learn */}
      {hasObjectives && (
        <div className="bg-[#132742] border border-[#23426A] rounded-2xl p-6 sm:p-7 shadow-xl space-y-4">
          <h3 className="text-base font-extrabold text-[#F8FAFC] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
            <span>What You'll Learn</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {course.learningObjectives.map((obj, idx) => (
              <div key={idx} className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] flex-shrink-0 mt-0.5" />
                <span className="text-xs text-[#CBD5E1] font-medium leading-relaxed">{obj}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course Overview & Description */}
      {course.description && (
        <div className="bg-[#132742] border border-[#23426A] rounded-2xl p-6 sm:p-7 shadow-xl space-y-3">
          <h3 className="text-base font-extrabold text-[#F8FAFC]">Course Overview</h3>
          <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed whitespace-pre-line font-normal">
            {course.description}
          </p>
        </div>
      )}

      {/* Requirements */}
      {hasRequirements && (
        <div className="bg-[#132742] border border-[#23426A] rounded-2xl p-6 sm:p-7 shadow-xl space-y-3">
          <h3 className="text-base font-extrabold text-[#F8FAFC] flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#4FD1C5]" />
            <span>Prerequisites & Requirements</span>
          </h3>
          <ul className="space-y-2 text-xs text-[#CBD5E1] font-medium pl-1">
            {course.requirements.map((req, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4FD1C5] mt-1.5 shrink-0" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Target Audience */}
      {hasAudience && (
        <div className="bg-[#132742] border border-[#23426A] rounded-2xl p-6 sm:p-7 shadow-xl space-y-3">
          <h3 className="text-base font-extrabold text-[#F8FAFC] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#4FD1C5]" />
            <span>Target Audience</span>
          </h3>
          <ul className="space-y-2 text-xs text-[#CBD5E1] font-medium pl-1">
            {course.targetAudience.map((aud, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4FD1C5] mt-1.5 shrink-0" />
                <span>{aud}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
