import React, { useState } from 'react';
import { BadgeItem } from '../../services/gamificationApi';
import { Award, Lock, CheckCircle2, Sparkles } from 'lucide-react';

interface BadgesWallProps {
  badges: BadgeItem[];
}

export const BadgesWall: React.FC<BadgesWallProps> = ({ badges }) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNLOCKED' | 'LOCKED'>('ALL');

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;

  const filteredBadges = badges.filter((b) => {
    if (activeFilter === 'UNLOCKED') return b.isUnlocked;
    if (activeFilter === 'LOCKED') return !b.isUnlocked;
    return true;
  });

  return (
    <div className="bg-[#0B1E38] border border-[#23426A] rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#23426A]/60 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-[#EAB308]/15 border border-[#EAB308]/30 flex items-center justify-center text-[#EAB308]">
              <Award className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-[#F8FAFC]">
              Badges & Achievements
            </h3>
          </div>
          <p className="text-xs text-[#CBD5E1] mt-0.5">
            Earn badges as you hit milestones, maintain streaks, and master coursework.
          </p>
        </div>

        {/* Filter Tabs & Counter */}
        <div className="flex items-center space-x-2 self-end sm:self-center">
          <div className="px-3 py-1 bg-[#1A365D] border border-[#23426A] rounded-xl text-xs font-bold text-[#EAB308]">
            {unlockedCount} / {badges.length} Unlocked
          </div>

          <div className="flex items-center bg-[#07182D] p-1 rounded-xl border border-[#23426A]">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                activeFilter === 'ALL'
                  ? 'bg-[#38BDF8] text-[#08152A] font-black'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('UNLOCKED')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                activeFilter === 'UNLOCKED'
                  ? 'bg-[#38BDF8] text-[#08152A] font-black'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Unlocked ({unlockedCount})
            </button>
            <button
              onClick={() => setActiveFilter('LOCKED')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                activeFilter === 'LOCKED'
                  ? 'bg-[#38BDF8] text-[#08152A] font-black'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Locked ({badges.length - unlockedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {filteredBadges.map((badge) => (
          <div
            key={badge.type}
            className={`p-4 rounded-2xl border transition-all flex flex-col items-center text-center space-y-2.5 relative group ${
              badge.isUnlocked
                ? 'bg-gradient-to-b from-[#0D223F] to-[#08152A] border-[#EAB308]/40 hover:border-[#EAB308] hover:shadow-lg hover:shadow-[#EAB308]/10'
                : 'bg-[#07182D]/60 border-[#23426A]/40 opacity-60 hover:opacity-90'
            }`}
          >
            {/* Badge Icon Shield */}
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 shadow-md ${
                badge.isUnlocked
                  ? 'bg-gradient-to-tr from-[#854D0E] via-[#CA8A04] to-[#FACC15] border border-[#FEF08A]/40 shadow-yellow-500/20'
                  : 'bg-[#0F2038] border border-[#23426A] text-[#94A3B8] grayscale'
              }`}
            >
              {badge.isUnlocked ? badge.icon : <Lock className="w-6 h-6 text-[#94A3B8]" />}
            </div>

            {/* Badge Details */}
            <div className="space-y-1 w-full min-w-0">
              <h4 className="text-xs font-black text-[#F8FAFC] truncate">
                {badge.title}
              </h4>
              <p className="text-[10px] text-[#94A3B8] line-clamp-2 leading-relaxed">
                {badge.description}
              </p>
            </div>

            {/* Unlocked / Locked Status Badge */}
            <div className="pt-1 w-full">
              {badge.isUnlocked ? (
                <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-[9px] font-extrabold">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>
                    {badge.earnedAt
                      ? new Date(badge.earnedAt).toLocaleDateString()
                      : 'Unlocked'}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#1A365D] text-[#94A3B8] text-[9px] font-bold">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Locked</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
