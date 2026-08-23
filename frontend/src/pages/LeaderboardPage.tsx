import React, { useState, useEffect } from 'react';
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
  TrendingUp,
  User as UserIcon,
} from 'lucide-react';
import { resolveMediaUrl } from '../utils/media';

export const LeaderboardPage: React.FC = () => {
  const [period, setPeriod] = useState<'all-time' | 'weekly'>('all-time');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await gamificationApi.getLeaderboard(period, 50);
      setLeaderboard(data);
    } catch (err) {
      console.error('Failed to load leaderboard', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = leaderboard.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  return (
    <div className="min-h-screen bg-[#071326] text-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
        {/* Page Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#EAB308]/15 border border-[#EAB308]/30 text-[#EAB308] text-xs font-black uppercase tracking-wider">
            <Trophy className="w-4 h-4" />
            <span>Khalil Academy Leaderboard</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-[#F8FAFC]">
            Top Learners & Achievers
          </h1>
          <p className="text-xs sm:text-sm text-[#CBD5E1]">
            Compete with students worldwide by completing lessons, passing quizzes, and maintaining daily learning streaks.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex bg-[#0B1E38] p-1.5 rounded-2xl border border-[#23426A] shadow-lg">
            <button
              onClick={() => setPeriod('all-time')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition ${
                period === 'all-time'
                  ? 'bg-gradient-to-r from-[#0284c7] to-[#38BDF8] text-[#08152A] shadow-md shadow-[#38BDF8]/20'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              👑 All-Time Champions
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition ${
                period === 'weekly'
                  ? 'bg-gradient-to-r from-[#0284c7] to-[#38BDF8] text-[#08152A] shadow-md shadow-[#38BDF8]/20'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              ⚡ This Week's Standouts
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#38BDF8] border-t-transparent"></div>
            <p className="text-xs font-bold text-[#94A3B8]">Calculating XP rankings and streaks...</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium Cards */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-end pt-8 pb-4 max-w-4xl mx-auto">
                {/* 2nd Place (Silver) */}
                {top2 && (
                  <div className="bg-[#0B1E38] border border-[#94A3B8]/40 rounded-3xl p-6 text-center space-y-3 relative shadow-xl hover:border-[#94A3B8] transition order-2 md:order-1">
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#64748B] to-[#CBD5E1] text-[#0F172A] font-black flex items-center justify-center text-sm shadow-lg shadow-[#CBD5E1]/20">
                      2
                    </div>
                    <div className="w-16 h-16 rounded-full bg-[#1A365D] border-2 border-[#CBD5E1] mx-auto overflow-hidden flex items-center justify-center text-lg font-black text-[#CBD5E1]">
                      {top2.avatar ? (
                        <img src={resolveMediaUrl(top2.avatar)} alt={top2.name} className="w-full h-full object-cover" />
                      ) : (
                        top2.name[0]
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#F8FAFC] truncate">{top2.name}</h3>
                      <span className="text-[10px] text-[#94A3B8] font-bold">Level {top2.level}: {top2.levelTitle}</span>
                    </div>
                    <div className="bg-[#071326] p-2.5 rounded-xl border border-[#23426A] flex items-center justify-around text-xs font-black">
                      <span className="text-[#38BDF8] flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 fill-[#38BDF8]" />
                        {top2.xpPoints.toLocaleString()} XP
                      </span>
                      <span className="text-[#F97316] flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 fill-[#F97316]" />
                        {top2.currentStreakDays}d
                      </span>
                    </div>
                  </div>
                )}

                {/* 1st Place (Gold Champion) */}
                {top1 && (
                  <div className="bg-gradient-to-b from-[#1E293B] to-[#0B1E38] border-2 border-[#FACC15] rounded-3xl p-6 text-center space-y-3 relative shadow-2xl shadow-yellow-500/10 md:-translate-y-4 order-1 md:order-2">
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#CA8A04] to-[#FACC15] text-[#08152A] font-black flex items-center justify-center text-lg shadow-xl shadow-yellow-500/30">
                      <Crown className="w-7 h-7 text-[#08152A]" />
                    </div>
                    <div className="w-20 h-20 rounded-full bg-[#1A365D] border-4 border-[#FACC15] mx-auto overflow-hidden flex items-center justify-center text-2xl font-black text-[#FACC15] shadow-lg shadow-yellow-500/20">
                      {top1.avatar ? (
                        <img src={resolveMediaUrl(top1.avatar)} alt={top1.name} className="w-full h-full object-cover" />
                      ) : (
                        top1.name[0]
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#FACC15] block">
                        👑 Top Scholar
                      </span>
                      <h3 className="text-base font-black text-[#F8FAFC] truncate">{top1.name}</h3>
                      <span className="text-[11px] text-[#38BDF8] font-bold">Level {top1.level}: {top1.levelTitle}</span>
                    </div>
                    <div className="bg-[#071326] p-3 rounded-xl border border-[#FACC15]/40 flex items-center justify-around text-xs font-black">
                      <span className="text-[#38BDF8] flex items-center gap-1">
                        <Zap className="w-4 h-4 fill-[#38BDF8]" />
                        {top1.xpPoints.toLocaleString()} XP
                      </span>
                      <span className="text-[#F97316] flex items-center gap-1">
                        <Flame className="w-4 h-4 fill-[#F97316]" />
                        {top1.currentStreakDays}d Streak
                      </span>
                    </div>
                  </div>
                )}

                {/* 3rd Place (Bronze) */}
                {top3 && (
                  <div className="bg-[#0B1E38] border border-[#B45309]/40 rounded-3xl p-6 text-center space-y-3 relative shadow-xl hover:border-[#B45309] transition order-3">
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#92400E] to-[#D97706] text-white font-black flex items-center justify-center text-sm shadow-lg shadow-orange-700/20">
                      3
                    </div>
                    <div className="w-16 h-16 rounded-full bg-[#1A365D] border-2 border-[#D97706] mx-auto overflow-hidden flex items-center justify-center text-lg font-black text-[#D97706]">
                      {top3.avatar ? (
                        <img src={resolveMediaUrl(top3.avatar)} alt={top3.name} className="w-full h-full object-cover" />
                      ) : (
                        top3.name[0]
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#F8FAFC] truncate">{top3.name}</h3>
                      <span className="text-[10px] text-[#94A3B8] font-bold">Level {top3.level}: {top3.levelTitle}</span>
                    </div>
                    <div className="bg-[#071326] p-2.5 rounded-xl border border-[#23426A] flex items-center justify-around text-xs font-black">
                      <span className="text-[#38BDF8] flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 fill-[#38BDF8]" />
                        {top3.xpPoints.toLocaleString()} XP
                      </span>
                      <span className="text-[#F97316] flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 fill-[#F97316]" />
                        {top3.currentStreakDays}d
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Search Bar & Table Container */}
            <div className="bg-[#0B1E38] border border-[#23426A] rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-4 sm:p-5 border-b border-[#23426A] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#08152A]">
                <div className="flex items-center space-x-2">
                  <Medal className="w-5 h-5 text-[#38BDF8]" />
                  <h3 className="text-sm sm:text-base font-black text-[#F8FAFC]">
                    Full Academy Rankings
                  </h3>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student name..."
                    className="w-full pl-9 pr-3 py-1.5 bg-[#0D223F] border border-[#23426A] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#94A3B8]">
                  No learners found matching "{searchQuery}".
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#CBD5E1]">
                    <thead className="bg-[#08152A]/90 text-[10px] font-black text-[#94A3B8] uppercase border-b border-[#23426A]">
                      <tr>
                        <th className="p-4 w-16 text-center">Rank</th>
                        <th className="p-4">Student</th>
                        <th className="p-4">Level Tier</th>
                        <th className="p-4">Learning Streak</th>
                        <th className="p-4 text-right">Total XP Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#23426A]/50">
                      {filtered.map((entry) => {
                        const isPodium = entry.rank <= 3;
                        return (
                          <tr
                            key={entry.userId}
                            className={`hover:bg-[#132742]/50 transition ${
                              entry.rank === 1
                                ? 'bg-[#FACC15]/5'
                                : entry.rank === 2
                                ? 'bg-[#CBD5E1]/5'
                                : entry.rank === 3
                                ? 'bg-[#D97706]/5'
                                : ''
                            }`}
                          >
                            {/* Rank */}
                            <td className="p-4 text-center">
                              {entry.rank === 1 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-[#FACC15] text-[#08152A] font-black text-xs shadow-md">
                                  1
                                </span>
                              ) : entry.rank === 2 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-[#CBD5E1] text-[#0F172A] font-black text-xs">
                                  2
                                </span>
                              ) : entry.rank === 3 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-[#D97706] text-white font-black text-xs">
                                  3
                                </span>
                              ) : (
                                <span className="font-bold text-[#94A3B8]">#{entry.rank}</span>
                              )}
                            </td>

                            {/* Student Info */}
                            <td className="p-4 font-bold text-[#F8FAFC]">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-[#1A365D] border border-[#23426A] flex items-center justify-center text-xs font-black text-[#38BDF8] overflow-hidden">
                                  {entry.avatar ? (
                                    <img src={resolveMediaUrl(entry.avatar)} alt={entry.name} className="w-full h-full object-cover" />
                                  ) : (
                                    entry.name[0]
                                  )}
                                </div>
                                <span>{entry.name}</span>
                              </div>
                            </td>

                            {/* Level Tier */}
                            <td className="p-4">
                              <span className="px-2.5 py-1 rounded-lg bg-[#1A365D] text-[#38BDF8] border border-[#38BDF8]/30 text-[11px] font-extrabold">
                                Level {entry.level}: {entry.levelTitle}
                              </span>
                            </td>

                            {/* Learning Streak */}
                            <td className="p-4">
                              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#EA580C]/10 text-[#EA580C] border border-[#EA580C]/30 text-xs font-black">
                                <Flame className="w-3.5 h-3.5 fill-[#EA580C]" />
                                <span>{entry.currentStreakDays} Days</span>
                              </div>
                            </td>

                            {/* XP Points */}
                            <td className="p-4 text-right">
                              <span className="text-sm font-black text-[#F8FAFC]">
                                {entry.xpPoints.toLocaleString()} <span className="text-[10px] text-[#38BDF8]">XP</span>
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
