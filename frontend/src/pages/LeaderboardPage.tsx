import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { gamificationApi, LeaderboardEntry } from '../services/gamificationApi';
import {
  Trophy,
  Medal,
  Flame,
  Zap,
  Sparkles,
  Search,
  Crown,
  Award,
  BookOpen,
  Users,
  Target,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { resolveMediaUrl } from '../utils/media';

export const LeaderboardPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [period, setPeriod] = useState<'all-time' | 'weekly'>('all-time');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await gamificationApi.getLeaderboard(period, 50);
      setLeaderboard(data || []);
    } catch (err) {
      console.error('Failed to load leaderboard', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = leaderboard.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = selectedTier === 'ALL' || s.levelTitle.toUpperCase() === selectedTier.toUpperCase();
    return matchesSearch && matchesTier;
  });

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  // Current logged in user ranking entry if found
  const currentUserEntry = user ? leaderboard.find((l) => l.userId === user.id || l.name === user.name) : null;
  const currentUserRank = currentUserEntry ? currentUserEntry.rank : null;

  // Aggregate stats
  const totalXpAwarded = leaderboard.reduce((sum, item) => sum + (item.xpPoints || 0), 0);
  const maxStreak = Math.max(...leaderboard.map((l) => l.currentStreakDays || 0), 0);
  const totalLessonsDone = leaderboard.reduce((sum, item) => sum + (item.lessonsCompleted || 0), 0);

  const getTierColor = (levelTitle: string) => {
    const title = levelTitle?.toLowerCase() || '';
    if (title.includes('grandmaster') || title.includes('legend')) {
      return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
    }
    if (title.includes('master')) {
      return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
    }
    if (title.includes('expert')) {
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    }
    if (title.includes('specialist')) {
      return 'bg-teal-500/15 text-[#087F78] dark:text-[#14B8A6] border-teal-500/30';
    }
    if (title.includes('practitioner')) {
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
    }
    return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
  };

  return (
    <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-[#F8FAFC] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
        
        {/* ========================================================================= */}
        {/* 1. HERO HEADER */}
        {/* ========================================================================= */}
        <div className="text-center space-y-3.5 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-extrabold uppercase tracking-wider shadow-xs">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Academy Streak & Badges Leaderboard</span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0B1F3A] dark:text-[#F8FAFC]">
            Top Learners & Achievers
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A9BACB] max-w-2xl mx-auto leading-relaxed">
            Top learners ranked by consecutive active streak, completed lessons, and earned badges. Compete with fellow students by mastering modules and logging in daily.
          </p>

          {/* Period Selector Switch */}
          <div className="pt-2 flex justify-center">
            <div className="inline-flex bg-white dark:bg-[#0B223D] p-1.5 rounded-2xl border border-slate-200 dark:border-[#1E3A56] shadow-md">
              <button
                type="button"
                onClick={() => setPeriod('all-time')}
                className={`px-5 sm:px-7 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  period === 'all-time'
                    ? 'bg-[#087F78] text-white shadow-md shadow-[#087F78]/30'
                    : 'text-slate-600 dark:text-[#A9BACB] hover:text-[#0B1F3A] dark:hover:text-white'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>All-Time Champions</span>
              </button>
              
              <button
                type="button"
                onClick={() => setPeriod('weekly')}
                className={`px-5 sm:px-7 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  period === 'weekly'
                    ? 'bg-[#087F78] text-white shadow-md shadow-[#087F78]/30'
                    : 'text-slate-600 dark:text-[#A9BACB] hover:text-[#0B1F3A] dark:hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Weekly Standouts</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. ACADEMY STATS OVERVIEW CARDS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-2xl p-4 shadow-xs flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-500 dark:text-[#A9BACB] truncate">Top Rank #1</div>
              <div className="text-sm sm:text-base font-extrabold text-[#0B1F3A] dark:text-[#F8FAFC] truncate">
                {top1 ? top1.name : 'Leader'}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-2xl p-4 shadow-xs flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-500 dark:text-[#A9BACB] truncate">Longest Streak</div>
              <div className="text-sm sm:text-base font-extrabold text-orange-500 truncate">
                {maxStreak} Days 🔥
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-2xl p-4 shadow-xs flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-[#087F78] dark:text-[#14B8A6] shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-500 dark:text-[#A9BACB] truncate">Lessons Completed</div>
              <div className="text-sm sm:text-base font-extrabold text-[#087F78] dark:text-[#14B8A6] truncate">
                {totalLessonsDone.toLocaleString()} Lessons
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-2xl p-4 shadow-xs flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-500 dark:text-[#A9BACB] truncate">Ranked Scholars</div>
              <div className="text-sm sm:text-base font-extrabold text-[#0B1F3A] dark:text-[#F8FAFC] truncate">
                {leaderboard.length} Students
              </div>
            </div>
          </div>
        </div>

        {/* Current user's standing banner */}
        {user && currentUserEntry && (
          <div className="bg-gradient-to-r from-[#087F78] to-[#0B223D] text-white p-4 sm:p-5 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 border border-[#14B8A6]/40">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-lg font-black text-[#14B8A6] shrink-0">
                #{currentUserRank}
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-teal-200 tracking-wider">Your Academy Standing</div>
                <div className="text-base font-bold text-white flex items-center gap-2">
                  <span>{user.name} (You)</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                    Level {currentUserEntry.level}: {currentUserEntry.levelTitle}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-5 text-xs font-bold">
              <div className="text-center sm:text-right">
                <div className="text-[10px] text-teal-200">Current Streak</div>
                <div className="text-sm font-extrabold text-amber-300 flex items-center justify-center sm:justify-end gap-1">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  <span>{currentUserEntry.currentStreakDays} Days</span>
                </div>
              </div>

              <div className="text-center sm:text-right">
                <div className="text-[10px] text-teal-200">Total XP</div>
                <div className="text-sm font-extrabold text-white flex items-center justify-center sm:justify-end gap-1">
                  <Zap className="w-3.5 h-3.5 text-[#14B8A6]" />
                  <span>{currentUserEntry.xpPoints.toLocaleString()} XP</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-[#087F78] border-t-transparent"></div>
            <p className="text-xs font-bold text-slate-500 dark:text-[#A9BACB]">Calculating XP rankings, lessons & streaks...</p>
          </div>
        ) : (
          <>
            {/* ========================================================================= */}
            {/* 3. TOP 3 PODIUM CARDS */}
            {/* ========================================================================= */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-end pt-8 pb-4 max-w-4xl mx-auto">
                
                {/* 2nd Place (Silver) */}
                {top2 && (
                  <div className="bg-white dark:bg-[#102A43] border border-slate-300 dark:border-slate-600 rounded-3xl p-6 text-center space-y-3.5 relative shadow-xl order-2 md:order-1 transition hover:shadow-2xl">
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-400 to-slate-200 text-slate-900 dark:text-white font-extrabold flex items-center justify-center text-sm shadow-md border border-white/40">
                      2
                    </div>
                    
                    <div className="w-16 h-16 rounded-full bg-[#F1F5F7] dark:bg-[#0B223D] border-3 border-slate-300 dark:border-slate-500 mx-auto overflow-hidden flex items-center justify-center text-lg font-black text-slate-700 dark:text-slate-200 shadow-md">
                      {top2.avatar ? (
                        <img src={resolveMediaUrl(top2.avatar)} alt={top2.name} className="w-full h-full object-cover" />
                      ) : (
                        top2.name[0]
                      )}
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-[#F8FAFC] truncate">{top2.name}</h3>
                      <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${getTierColor(top2.levelTitle)}`}>
                        Level {top2.level}: {top2.levelTitle}
                      </span>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-[#07182D] p-2.5 rounded-xl border border-slate-200 dark:border-[#1E3A56] flex items-center justify-around text-xs font-bold">
                      <span className="text-[#087F78] dark:text-[#14B8A6] flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        {top2.xpPoints.toLocaleString()} XP
                      </span>
                      <span className="text-orange-500 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        {top2.currentStreakDays}d streak
                      </span>
                    </div>
                  </div>
                )}

                {/* 1st Place (Gold Champion) */}
                {top1 && (
                  <div className="bg-gradient-to-b from-white to-amber-50/40 dark:from-[#152F4A] dark:to-[#102A43] border-2 border-amber-400 dark:border-amber-400 rounded-3xl p-6 text-center space-y-3.5 relative shadow-2xl shadow-amber-500/15 md:-translate-y-4 order-1 md:order-2">
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-900 dark:text-white font-extrabold flex items-center justify-center text-lg shadow-xl shadow-amber-500/30 border-2 border-white/60">
                      <Crown className="w-7 h-7 text-slate-900 dark:text-white" />
                    </div>
                    
                    <div className="w-20 h-20 rounded-full bg-[#F1F5F7] dark:bg-[#0B223D] border-4 border-amber-400 mx-auto overflow-hidden flex items-center justify-center text-2xl font-black text-amber-500 shadow-xl">
                      {top1.avatar ? (
                        <img src={resolveMediaUrl(top1.avatar)} alt={top1.name} className="w-full h-full object-cover" />
                      ) : (
                        top1.name[0]
                      )}
                    </div>
                    
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                        👑 Top Academy Scholar
                      </span>
                      <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-[#F8FAFC] truncate mt-0.5">{top1.name}</h3>
                      <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${getTierColor(top1.levelTitle)}`}>
                        Level {top1.level}: {top1.levelTitle}
                      </span>
                    </div>
                    
                    <div className="bg-white dark:bg-[#07182D] p-3 rounded-xl border border-amber-300 dark:border-amber-400/40 flex items-center justify-around text-xs font-bold shadow-xs">
                      <span className="text-[#087F78] dark:text-[#14B8A6] flex items-center gap-1 font-extrabold">
                        <Zap className="w-4 h-4 fill-current" />
                        {top1.xpPoints.toLocaleString()} XP
                      </span>
                      <span className="text-orange-500 flex items-center gap-1 font-extrabold">
                        <Flame className="w-4 h-4 fill-current" />
                        {top1.currentStreakDays}d Streak 🔥
                      </span>
                    </div>
                  </div>
                )}

                {/* 3rd Place (Bronze) */}
                {top3 && (
                  <div className="bg-white dark:bg-[#102A43] border border-amber-700/30 dark:border-amber-700/50 rounded-3xl p-6 text-center space-y-3.5 relative shadow-xl order-3 transition hover:shadow-2xl">
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-500 text-white font-extrabold flex items-center justify-center text-sm shadow-md border border-white/30">
                      3
                    </div>
                    
                    <div className="w-16 h-16 rounded-full bg-[#F1F5F7] dark:bg-[#0B223D] border-3 border-amber-600 mx-auto overflow-hidden flex items-center justify-center text-lg font-black text-amber-700 dark:text-amber-500 shadow-md">
                      {top3.avatar ? (
                        <img src={resolveMediaUrl(top3.avatar)} alt={top3.name} className="w-full h-full object-cover" />
                      ) : (
                        top3.name[0]
                      )}
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-[#F8FAFC] truncate">{top3.name}</h3>
                      <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${getTierColor(top3.levelTitle)}`}>
                        Level {top3.level}: {top3.levelTitle}
                      </span>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-[#07182D] p-2.5 rounded-xl border border-slate-200 dark:border-[#1E3A56] flex items-center justify-around text-xs font-bold">
                      <span className="text-[#087F78] dark:text-[#14B8A6] flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        {top3.xpPoints.toLocaleString()} XP
                      </span>
                      <span className="text-orange-500 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        {top3.currentStreakDays}d streak
                      </span>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ========================================================================= */}
            {/* 4. SEARCH & TIER FILTER BAR */}
            {/* ========================================================================= */}
            <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl overflow-hidden shadow-xl">
              
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#1E3A56] flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-[#0B223D]">
                <div className="flex items-center space-x-2.5">
                  <Medal className="w-5 h-5 text-[#087F78] dark:text-[#14B8A6]" />
                  <h3 className="text-sm sm:text-base font-extrabold text-[#0B1F3A] dark:text-[#F8FAFC]">
                    Academy Scholar Rankings
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-teal-500/15 text-[#087F78] dark:text-[#14B8A6] text-xs font-bold">
                    {filtered.length} Learners
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                  {/* Tier Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
                    {['ALL', 'GRANDMASTER', 'MASTER', 'EXPERT', 'SPECIALIST', 'PRACTITIONER', 'NOVICE'].map((tier) => (
                      <button
                        key={tier}
                        onClick={() => setSelectedTier(tier)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                          selectedTier === tier
                            ? 'bg-[#087F78] text-white'
                            : 'bg-white dark:bg-[#152F4A] text-slate-600 dark:text-[#A9BACB] hover:text-[#087F78] border border-slate-200 dark:border-[#1E3A56]'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-60">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search student..."
                      className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#07182D] border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:border-[#087F78] dark:focus:border-[#14B8A6]"
                    />
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 5. RANKINGS TABLE */}
              {/* ========================================================================= */}
              {filtered.length === 0 ? (
                <div className="p-16 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-teal-500/15 text-[#087F78] dark:text-[#14B8A6] flex items-center justify-center mx-auto">
                    <Trophy className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-[#0B1F3A] dark:text-[#F8FAFC]">No students match your filter</h4>
                  <p className="text-xs text-slate-500 dark:text-[#A9BACB]">
                    Try searching for another name or selecting 'ALL' tiers.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-[#CBD5E1]">
                    <thead className="bg-slate-100/80 dark:bg-[#07182D]/90 text-[10px] font-extrabold text-slate-500 dark:text-[#A9BACB] uppercase border-b border-slate-200 dark:border-[#1E3A56]">
                      <tr>
                        <th className="p-4 w-16 text-center">Rank</th>
                        <th className="p-4">Learner</th>
                        <th className="p-4">Tier & Level</th>
                        <th className="p-4 text-center">Active Streak</th>
                        <th className="p-4 text-center">Lessons</th>
                        <th className="p-4 text-center">Badges</th>
                        <th className="p-4 text-right">Total XP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#1E3A56]">
                      {filtered.map((entry) => {
                        const isCurrentUser = user && (entry.userId === user.id || entry.name === user.name);

                        return (
                          <tr
                            key={entry.userId}
                            className={`transition ${
                              isCurrentUser
                                ? 'bg-teal-50/60 dark:bg-[#087F78]/15 font-bold'
                                : entry.rank === 1
                                ? 'bg-amber-50/30 dark:bg-amber-500/5'
                                : entry.rank === 2
                                ? 'bg-slate-50 dark:bg-slate-800/10'
                                : entry.rank === 3
                                ? 'bg-orange-50/20 dark:bg-orange-500/5'
                                : 'hover:bg-slate-50/80 dark:hover:bg-[#152F4A]/40'
                            }`}
                          >
                            {/* Rank Badge */}
                            <td className="p-4 text-center">
                              {entry.rank === 1 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-400 text-slate-900 dark:text-white font-black text-xs shadow-md">
                                  1
                                </span>
                              ) : entry.rank === 2 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-300 text-slate-900 dark:text-white font-black text-xs">
                                  2
                                </span>
                              ) : entry.rank === 3 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-600 text-white font-black text-xs">
                                  3
                                </span>
                              ) : (
                                <span className="font-bold text-slate-500 dark:text-[#A9BACB]">
                                  #{entry.rank}
                                </span>
                              )}
                            </td>

                            {/* Student Profile Info */}
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-[#087F78] text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden shadow-xs">
                                  {entry.avatar ? (
                                    <img src={resolveMediaUrl(entry.avatar)} alt={entry.name} className="w-full h-full object-cover" />
                                  ) : (
                                    entry.name[0]
                                  )}
                                </div>
                                <div>
                                  <div className="font-extrabold text-[#0B1F3A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                                    <span>{entry.name}</span>
                                    {isCurrentUser && (
                                      <span className="px-1.5 py-0.2 rounded bg-[#087F78] text-white text-[9px] font-bold">
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Level Tier */}
                            <td className="p-4">
                              <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getTierColor(entry.levelTitle)}`}>
                                Lvl {entry.level}: {entry.levelTitle}
                              </span>
                            </td>

                            {/* Active Streak */}
                            <td className="p-4 text-center">
                              <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-xs font-bold">
                                <Flame className="w-3.5 h-3.5 fill-current" />
                                <span>{entry.currentStreakDays}d</span>
                              </div>
                            </td>

                            {/* Lessons Completed */}
                            <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#0B223D] border border-slate-200 dark:border-[#1E3A56] text-xs">
                                {entry.lessonsCompleted || Math.round(entry.xpPoints / 120)} lessons
                              </span>
                            </td>

                            {/* Badges Count */}
                            <td className="p-4 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-bold">
                                <Award className="w-3.5 h-3.5" />
                                <span>{entry.badgesCount || Math.min(8, Math.floor(entry.level * 1.1))}</span>
                              </span>
                            </td>

                            {/* Total XP Points */}
                            <td className="p-4 text-right">
                              <span className="text-sm font-extrabold text-[#0B1F3A] dark:text-[#F8FAFC]">
                                {entry.xpPoints.toLocaleString()}{' '}
                                <span className="text-[10px] font-bold text-[#087F78] dark:text-[#14B8A6]">XP</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default LeaderboardPage;

