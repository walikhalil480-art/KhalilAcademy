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
      <div className="bg-[#132742] border border-[#23426A] rounded-2xl p-8 text-center text-[#94A3B8] space-y-2 shadow-xl">
        <p className="text-sm font-bold text-[#F8FAFC]">Curriculum is being prepared.</p>
        <p className="text-xs text-[#94A3B8]">Check back soon for updated syllabus content.</p>
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
          <div key={module.id} className="bg-[#132742] border border-[#23426A] rounded-2xl overflow-hidden shadow-xl transition">
            {/* Module Header Accordion */}
            <button
              onClick={() => toggleModule(module.id)}
              className="w-full p-4 sm:p-5 bg-[#0E1D33] border-b border-[#23426A] flex items-center justify-between text-left hover:bg-[#1A365D]/60 transition"
            >
              <div className="flex items-center space-x-3">
                <span className="text-xs sm:text-sm font-extrabold text-[#F8FAFC]">
                  Module {mIdx + 1}: {module.title}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-[#94A3B8] font-medium">
                <span>
                  {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} • {formatDuration(moduleDuration)}
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-[#94A3B8]" /> : <ChevronDown className="w-4 h-4 text-[#94A3B8]" />}
              </div>
            </button>

            {/* Lessons List */}
            {isOpen && (
              <div className="divide-y divide-[#23426A]">
                {lessons.length === 0 ? (
                  <div className="p-4 text-xs text-[#94A3B8] italic">No lessons published in this module yet.</div>
                ) : (
                  lessons.map((lesson, lIdx) => (
                    <div
                      key={lesson.id}
                      className="p-4 flex items-center justify-between hover:bg-[#1A365D]/40 transition"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-[#94A3B8] w-6 font-mono font-bold">
                          {String(lIdx + 1).padStart(2, '0')}
                        </span>
                        {lesson.contentType === 'VIDEO' ? (
                          <Video className="w-4 h-4 text-[#4FD1C5] flex-shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-[#22C55E] flex-shrink-0" />
                        )}
                        <span className="text-xs sm:text-sm font-medium text-[#F8FAFC]">{lesson.title}</span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs">
                        <span className="text-[#94A3B8] font-mono text-[11px]">
                          {formatLessonDuration(lesson.durationMinutes, (lesson as any).durationSeconds)}
                        </span>
                        {lesson.isPreview ? (
                          <button
                            onClick={() => onSelectPreviewLesson && onSelectPreviewLesson(lesson)}
                            className="px-2.5 py-1 bg-[#1A365D] text-[#4FD1C5] border border-[#4FD1C5]/40 font-bold rounded-lg text-[10px] hover:bg-[#4FD1C5] hover:text-[#0A1322] transition uppercase tracking-wider"
                          >
                            Free Preview
                          </button>
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-[#94A3B8]" />
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
