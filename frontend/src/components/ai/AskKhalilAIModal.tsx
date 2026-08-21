import React, { useState } from 'react';
import { AskKhalilAIDrawer } from './AskKhalilAIDrawer';
import { Sparkles, Compass, HelpCircle, Code2, MessageSquare } from 'lucide-react';
import { AIActionType } from '../../types/ai';

interface AskKhalilAIModalProps {
  courseId?: string;
  courseTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
}

export const AskKhalilAIModal: React.FC<AskKhalilAIModalProps> = ({
  courseId,
  courseTitle,
  lessonId,
  lessonTitle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialAction, setInitialAction] = useState<AIActionType>('GENERAL');

  const openWithAction = (action: AIActionType) => {
    setInitialAction(action);
    setIsOpen(true);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        onClick={() => openWithAction('GENERAL')}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 bg-gradient-to-r from-[#4FD1C5] to-[#38B2AC] hover:from-[#38B2AC] hover:to-[#319795] text-[#0A1322] font-black text-xs sm:text-sm rounded-full shadow-2xl shadow-[#4FD1C5]/30 hover:shadow-[#4FD1C5]/50 transition-all transform hover:scale-105 flex items-center gap-2.5 border border-white/20"
        title="Ask Khalil AI Tutor"
      >
        <div className="w-6 h-6 rounded-full bg-[#0A1322]/20 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-[#0A1322] animate-spin" />
        </div>
        <span>Ask Khalil AI</span>
      </button>

      {/* Slide-over Drawer */}
      <AskKhalilAIDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        courseId={courseId}
        courseTitle={courseTitle}
        lessonId={lessonId}
        lessonTitle={lessonTitle}
        initialAction={initialAction}
      />
    </>
  );
};
