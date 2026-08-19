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
    <div className="border-b border-[#23426A] flex space-x-6 sm:space-x-8 text-xs sm:text-sm font-semibold overflow-x-auto scrollbar-none">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`pb-3.5 transition-all flex items-center space-x-2 whitespace-nowrap focus:outline-none relative ${
              isActive
                ? 'text-[#4FD1C5] font-extrabold'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] font-semibold'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isActive ? 'bg-[#1A365D] text-[#4FD1C5] border border-[#4FD1C5]/40' : 'bg-[#0E1D33] text-[#94A3B8] border border-[#23426A]'
              }`}>
                {tab.badge}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4FD1C5] rounded-t-full shadow-sm shadow-[#4FD1C5]/50" />
            )}
          </button>
        );
      })}
    </div>
  );
};
