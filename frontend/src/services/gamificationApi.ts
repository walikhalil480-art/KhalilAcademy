import { api } from './api';

export interface DayActivity {
  date: string;
  dayName: string;
  active: boolean;
  minutesLearned: number;
  lessonsCompleted: number;
  xpEarned: number;
}

export interface BadgeItem {
  type: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  isUnlocked: boolean;
  earnedAt: string | null;
}

export interface GamificationProfile {
  xpPoints: number;
  level: number;
  levelTitle: string;
  currentTierMin: number;
  nextTierMin: number;
  tierProgressPercentage: number;
  currentStreakDays: number;
  longestStreakDays: number;
  lastActiveDate: string | null;
  weeklyGoalMinutes: number;
  weeklyLearnedMinutes: number;
  weeklyGoalPercentage: number;
  last7DaysActivity: DayActivity[];
  badges: BadgeItem[];
  unlockedBadgesCount: number;
  totalBadgesCount: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string | null;
  xpPoints: number;
  level: number;
  levelTitle: string;
  currentStreakDays: number;
  longestStreakDays?: number;
  badgesCount?: number;
  minutesLearned?: number;
  lessonsCompleted?: number;
}

export const gamificationApi = {
  getProfile: async (): Promise<GamificationProfile> => {
    const res = await api.get('/gamification/profile');
    return res.data.data;
  },

  checkIn: async (): Promise<any> => {
    const res = await api.post('/gamification/check-in');
    return res.data.data;
  },

  getLeaderboard: async (period: 'all-time' | 'weekly' = 'all-time', limit: number = 25): Promise<LeaderboardEntry[]> => {
    const res = await api.get(`/gamification/leaderboard?period=${period}&limit=${limit}`);
    return res.data.data;
  },

  updateWeeklyGoal: async (weeklyGoalMinutes: number): Promise<any> => {
    const res = await api.put('/gamification/weekly-goal', { weeklyGoalMinutes });
    return res.data.data;
  },
};
