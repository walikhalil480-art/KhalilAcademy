import React, { useState } from 'react';
import { GamificationProfile } from '../../services/gamificationApi';
import {
  Flame,
  Zap,
  Target,
  Trophy,
  Calendar,
  Sparkles,
  ChevronRight,
  Edit2,
  Check,
  Award,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface StreakWidgetProps {
  profile: GamificationProfile;
  onUpdateGoal?: (minutes: number) => Promise<void>;
}

export const StreakWidget: React.FC<StreakWidgetProps> = ({ profile, onUpdateGoal }) => {
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(profile.weeklyGoalMinutes || 120));
  const [savingGoal, setSavingGoal] = useState(false);

  const handleSaveGoal = async () => {
    const mins = parseInt(goalInput, 10);
    if (isNaN(mins) || mins < 15) {
      alert('Please enter a goal of at least 15 minutes per week.');
      return;
    }
    if (onUpdateGoal) {
      try {
        setSavingGoal(true);
        await onUpdateGoal(mins);
        setEditingGoal(false);
      } catch (err) {
        alert('Failed to update goal');
      } finally {
        setSavingGoal(false);
      }
    }
  };

  const isStreakActive = profile.currentStreakDays > 0;

  return (
    <div className="bg-gradient-to-br from-[#0B1E38] via-[#0E2445] to-[#08152A] border border-[#23426A] rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden space-y-5">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#38BDF8]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#F59E0B]/5 rounded-full blur-2xl pointer-events-none" />

      {/* Top Bar: Streak, Level Badge & Leaderboard Link */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#23426A]/60 pb-4">
        {/* Streak Flame Header */}
        <div className="flex items-center space-x-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform ${
              isStreakActive
                ? 'bg-gradient-to-tr from-[#EA580C] via-[#F97316] to-[#FBBF24] text-white shadow-orange-500/25 scale-105'
                : 'bg-[#1A365D] text-[#94A3B8]'
            }`}
          >
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-black text-[#F8FAFC]">
                {profile.currentStreakDays}-Day Learning Streak!
              </h3>
              {profile.longestStreakDays > profile.currentStreakDays && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1A365D] text-[#94A3B8] border border-[#23426A]">
                  Best: {profile.longestStreakDays}d
                </span>
              )}
            </div>
            <p className="text-xs text-[#CBD5E1]">
              {isStreakActive
                ? 'Keep up the daily momentum to earn bonus XP and streak badges!'
                : 'Complete a lesson or quiz today to start a new learning streak!'}
            </p>
          </div>
        </div>

        {/* Level & Leaderboard CTA */}
        <div className="flex items-center space-x-2.5 self-end sm:self-center">
          <div className="px-3 py-1.5 rounded-xl bg-[#1A365D] border border-[#38BDF8]/30 flex items-center space-x-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="text-xs font-black text-[#38BDF8]">
              Level {profile.level}: {profile.levelTitle}
            </span>
          </div>

          <Link
            to="/leaderboard"
            className="px-3.5 py-1.5 bg-[#0284c7]/20 hover:bg-[#0284c7]/30 border border-[#38BDF8]/50 hover:border-[#38BDF8] text-[#38BDF8] font-bold rounded-xl text-xs transition flex items-center space-x-1 shadow-sm"
          >
            <Trophy className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Leaderboard</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Middle Grid: XP Progress & Weekly Learning Goal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: XP Points & Level Progress */}
        <div className="bg-[#08152A]/80 border border-[#23426A]/60 p-4 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-[#38BDF8]">
              <Zap className="w-4 h-4 fill-[#38BDF8]" />
              <span className="text-xs font-extrabold uppercase tracking-wider">Experience Points</span>
            </div>
            <span className="text-xs font-black text-[#F8FAFC]">
              {profile.xpPoints.toLocaleString()} <span className="text-[10px] text-[#94A3B8]">XP</span>
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-[#1A365D] h-2.5 rounded-full overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-[#0284c7] via-[#38BDF8] to-[#4FD1C5] h-full rounded-full transition-all duration-500 shadow-sm shadow-[#38BDF8]/40"
                style={{ width: `${profile.tierProgressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#94A3B8]">
              <span>Level {profile.level} ({profile.currentTierMin} XP)</span>
              <span>{profile.tierProgressPercentage}% to Level {profile.level + 1} ({profile.nextTierMin} XP)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Weekly Learning Goal */}
        <div className="bg-[#08152A]/80 border border-[#23426A]/60 p-4 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-[#22C55E]">
              <Target className="w-4 h-4" />
              <span className="text-xs font-extrabold uppercase tracking-wider">Weekly Learning Goal</span>
            </div>

            {editingGoal ? (
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  min="15"
                  max="2400"
                  step="15"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="w-16 px-1.5 py-0.5 bg-[#0D223F] border border-[#23426A] text-xs font-bold text-white rounded text-center focus:outline-none focus:border-[#38BDF8]"
                />
                <button
                  onClick={handleSaveGoal}
                  disabled={savingGoal}
                  className="p-1 bg-[#22C55E] text-[#08152A] rounded hover:bg-[#16A34A] transition"
                  title="Save Goal"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <span className="text-xs font-black text-[#F8FAFC]">
                  {profile.weeklyLearnedMinutes} / {profile.weeklyGoalMinutes} <span className="text-[10px] text-[#94A3B8]">mins</span>
                </span>
                <button
                  onClick={() => setEditingGoal(true)}
                  className="p-1 text-[#94A3B8] hover:text-[#38BDF8] rounded transition"
                  title="Edit Goal"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Goal Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-[#1A365D] h-2.5 rounded-full overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-[#16A34A] to-[#22C55E] h-full rounded-full transition-all duration-500 shadow-sm shadow-[#22C55E]/40"
                style={{ width: `${Math.min(100, profile.weeklyGoalPercentage)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#94A3B8]">
              <span>{profile.weeklyGoalPercentage}% completed this week</span>
              {profile.weeklyGoalPercentage >= 100 ? (
                <span className="text-[#22C55E] font-bold">🎯 Goal Crushed!</span>
              ) : (
                <span>{Math.max(0, profile.weeklyGoalMinutes - profile.weeklyLearnedMinutes)} mins remaining</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: 7-Day Activity Calendar Dots */}
      <div className="bg-[#08152A]/60 border border-[#23426A]/40 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-[#CBD5E1]">
          <Calendar className="w-4 h-4 text-[#38BDF8]" />
          <span className="text-xs font-bold">7-Day Activity Heatmap</span>
        </div>

        {/* 7 Days Dots */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {profile.last7DaysActivity.map((day) => (
            <div
              key={day.date}
              className="flex flex-col items-center space-y-1 group relative cursor-pointer"
            >
              {/* Day Initial */}
              <span className="text-[10px] font-bold text-[#94A3B8] group-hover:text-white transition">
                {day.dayName}
              </span>

              {/* Dot indicator */}
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                  day.active
                    ? 'bg-gradient-to-tr from-[#16A34A] to-[#22C55E] text-white shadow-md shadow-[#22C55E]/30 scale-105'
                    : 'bg-[#0D223F] border border-[#23426A] text-[#94A3B8]'
                }`}
              >
                {day.active ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '·'}
              </div>

              {/* Hover Tooltip */}
              <div className="absolute bottom-10 hidden group-hover:flex flex-col items-center z-30 pointer-events-none min-w-28 text-center bg-[#071326] border border-[#23426A] p-2 rounded-xl text-[10px] text-white shadow-xl">
                <span className="font-bold text-[#38BDF8]">{day.date}</span>
                <span>{day.minutesLearned} mins learned</span>
                <span>+{day.xpEarned} XP</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
