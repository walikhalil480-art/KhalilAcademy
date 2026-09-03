import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lock, PlayCircle, FileText, Video } from 'lucide-react';
import { Module, Lesson } from '../../types';
import { formatDuration } from './CourseStats';
import { formatLessonDuration } from '../../utils/formatters';

interface CourseCurriculumProps {
  modules?: Module[];
  onSelectPreviewLesson?: (lesson: Lesson) => void;
}

export const CourseCurriculum: React.FC<CourseCurriculumProps> = ({ modules = [], onSelectPreviewLesson }) => {
  const [openModules, setOpenModules] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (modules.length > 0) {
      initial[modules[0].id] = true;
    }
    return initial;
  });

  const toggleModule = (id: string) => {
    setOpenModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!modules || modules.length === 0) {
    return (
      <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl p-8 text-center text-slate-500 dark:text-[#A9BACB] space-y-2 shadow-xs">
        <p className="text-sm font-bold text-[#0B1F3A] dark:text-white">Curriculum is being prepared.</p>
        <p className="text-xs text-slate-500 dark:text-[#A9BACB]">Check back soon for updated syllabus content.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {modules.map((module, mIdx) => {
        const isOpen = openModules[module.id] ?? (mIdx === 0);
        const lessons = module.lessons || [];
        const moduleDuration = lessons.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);

        return (
          <div key={module.id} className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl overflow-hidden shadow-xs transition">
            {/* Module Header Accordion matching Mockup 3 */}
            <button
              onClick={() => toggleModule(module.id)}
              className="w-full p-4 sm:p-5 bg-slate-50 dark:bg-[#152F4A] border-b border-slate-100 dark:border-[#1E3A56] flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D]/60 transition"
            >
              <div className="space-y-1">
                <div className="text-[10px] font-mono font-bold tracking-wider text-[#087F78] uppercase">
                  MODULE {mIdx + 1} • WEEK {mIdx * 2 + 1}-{mIdx * 2 + 2} • {lessons.length} {lessons.length === 1 ? 'Lesson' : 'Lessons'}
                </div>
                <span className="text-xs sm:text-sm font-bold text-[#0B1F3A] dark:text-white block">
                  {module.title}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium">
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500 dark:text-[#A9BACB]" /> : <ChevronDown className="w-4 h-4 text-slate-500 dark:text-[#A9BACB]" />}
              </div>
            </button>

            {/* Lessons List */}
            {isOpen && (
              <div className="divide-y divide-slate-100 dark:divide-[#1E3A56]">
                {lessons.length === 0 ? (
                  <div className="p-4 text-xs text-slate-400 italic">No lessons published in this module yet.</div>
                ) : (
                  lessons.map((lesson, lIdx) => (
                    <div
                      key={lesson.id}
                      className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#152F4A] dark:bg-[#152F4A] transition"
                    >
                      <div className="flex items-center space-x-3">
                        {lesson.contentType === 'VIDEO' ? (
                          <PlayCircle className="w-4 h-4 text-[#006666] flex-shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-slate-500 dark:text-[#A9BACB] flex-shrink-0" />
                        )}
                        <span className="text-xs sm:text-sm font-medium text-[#0B1F3A] dark:text-white">{lesson.title}</span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs">
                        <span className="text-slate-400 font-mono text-[11px]">
                          {formatLessonDuration(lesson.durationMinutes, (lesson as any).durationSeconds)}
                        </span>
                        {lesson.isPreview ? (
                          <button
                            onClick={() => onSelectPreviewLesson && onSelectPreviewLesson(lesson)}
                            className="px-2.5 py-1 bg-[#E6F7F5] text-[#087F78] border border-[#006666]/30 font-bold rounded-lg text-[10px] hover:bg-[#006666] hover:text-white transition uppercase tracking-wider"
                          >
                            Free Preview
                          </button>
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
