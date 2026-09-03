import React from 'react';

interface CourseStatsProps {
  level?: string;
  moduleCount?: number;
  lessonCount: number;
  totalDurationMinutes: number;
  studentCount: number;
}

export const formatDuration = (totalMinutes?: number | null): string => {
  if (!totalMinutes || totalMinutes <= 0) return 'Duration unavailable';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const CourseStats: React.FC<CourseStatsProps> = ({
  level = 'BEGINNER',
  moduleCount,
  lessonCount,
  totalDurationMinutes,
  studentCount,
}) => {
  const formattedStudents = studentCount === 1 ? '1 Student' : `${studentCount} Students`;
  const formattedCurriculum = moduleCount
    ? `${moduleCount} ${moduleCount === 1 ? 'Module' : 'Modules'} · ${lessonCount} ${lessonCount === 1 ? 'Lesson' : 'Lessons'}`
    : lessonCount === 1 ? '1 Lesson' : `${lessonCount} Lessons`;

  return (
    <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center shadow-xs">
      <div className="border-r border-slate-100 dark:border-[#1E3A56] last:border-none">
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Skill Level</span>
        <span className="text-xs sm:text-sm font-bold text-[#0B1F3A] dark:text-white mt-0.5 block capitalize">{level.toLowerCase()}</span>
      </div>
      <div className="border-r border-slate-100 dark:border-[#1E3A56] last:border-none">
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Curriculum</span>
        <span className="text-xs sm:text-sm font-bold text-[#0B1F3A] dark:text-white mt-0.5 block">{formattedCurriculum}</span>
      </div>
      <div className="border-r border-slate-100 dark:border-[#1E3A56] last:border-none">
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Total Duration</span>
        <span className="text-xs sm:text-sm font-bold text-[#0B1F3A] dark:text-white mt-0.5 block">{formatDuration(totalDurationMinutes)}</span>
      </div>
      <div>
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Learners Enrolled</span>
        <span className="text-xs sm:text-sm font-bold text-[#0B1F3A] dark:text-white mt-0.5 block">{formattedStudents}</span>
      </div>
    </div>
  );
};
