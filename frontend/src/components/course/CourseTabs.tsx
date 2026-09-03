import React from 'react';

export type CourseTabType = 'about' | 'curriculum' | 'instructor' | 'reviews';

interface CourseTabsProps {
  activeTab: CourseTabType;
  onTabChange: (tab: CourseTabType) => void;
  reviewCount?: number;
}

export const CourseTabs: React.FC<CourseTabsProps> = ({ activeTab, onTabChange, reviewCount }) => {
  const tabs: { id: CourseTabType; label: string; badge?: number }[] = [
    { id: 'about', label: 'Overview' },
    { id: 'curriculum', label: 'Curriculum & Modules' },
    { id: 'instructor', label: 'Instructor Profile' },
    { id: 'reviews', label: 'Student Reviews', badge: reviewCount },
  ];

  return (
    <div className="border-b border-slate-200 dark:border-[#1E3A56] flex space-x-6 sm:space-x-8 text-xs sm:text-sm font-semibold overflow-x-auto scrollbar-none">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`pb-3.5 transition-all flex items-center space-x-2 whitespace-nowrap focus:outline-none relative ${
              isActive
                ? 'text-[#087F78] font-extrabold'
                : 'text-slate-500 dark:text-[#A9BACB] hover:text-[#0B1F3A] font-semibold'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isActive ? 'bg-[#E6F7F5] text-[#087F78] border border-[#006666]/30' : 'bg-slate-100 dark:bg-[#0B223D] text-slate-500 dark:text-[#A9BACB] border border-slate-200 dark:border-[#1E3A56]'
              }`}>
                {tab.badge}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#087F78] rounded-t-full shadow-xs" />
            )}
          </button>
        );
      })}
    </div>
  );
};
