import { prisma } from '../config/database';
import { BadgeType, SubmissionStatus, EnrollmentStatus, NotificationType } from '@prisma/client';
import { createNotification } from './notification.service';
import { logger } from '../config/logger';

export interface LevelTier {
  level: number;
  title: string;
  minXp: number;
  maxXp: number;
}

export const LEVEL_TIERS: LevelTier[] = [
  { level: 1, title: 'Novice', minXp: 0, maxXp: 200 },
  { level: 2, title: 'Apprentice', minXp: 200, maxXp: 500 },
  { level: 3, title: 'Practitioner', minXp: 500, maxXp: 1000 },
  { level: 4, title: 'Specialist', minXp: 1000, maxXp: 2000 },
  { level: 5, title: 'Expert', minXp: 2000, maxXp: 3500 },
  { level: 6, title: 'Master', minXp: 3500, maxXp: 5500 },
  { level: 7, title: 'Grandmaster', minXp: 5500, maxXp: 8000 },
  { level: 8, title: 'Tech Legend', minXp: 8000, maxXp: 999999 },
];

export const BADGE_DEFINITIONS: Record<BadgeType, { title: string; description: string; icon: string; category: string }> = {
  FIRST_LESSON: {
    title: 'First Step Taken',
    description: 'Completed your first video lesson at Khalil Academy',
    icon: '🎓',
    category: 'LEARNING',
  },
  FIRST_COURSE: {
    title: 'First Course Completed',
    description: 'Graduated your first complete course curriculum',
    icon: '🏅',
    category: 'COMPLETION',
  },
  STREAK_3: {
    title: 'On Fire (3-Day Streak)',
    description: 'Learned for 3 consecutive days in a row',
    icon: '🔥',
    category: 'STREAK',
  },
  STREAK_7: {
    title: 'Unstoppable (7-Day Streak)',
    description: 'Maintained a 7-day daily learning streak',
    icon: '🔥',
    category: 'STREAK',
  },
  STREAK_30: {
    title: 'Dedicated Scholar (30-Day Streak)',
    description: 'Achieved a 30-day streak of continuous daily mastery',
    icon: '⚡',
    category: 'STREAK',
  },
  QUIZ_MASTER: {
    title: 'Quiz Master',
    description: 'Maintained a 90%+ average score across 3 or more assessments',
    icon: '🎯',
    category: 'ASSESSMENT',
  },
  PERFECT_ASSIGNMENT: {
    title: 'Ace Student',
    description: 'Earned a 100% perfect score on a course assignment',
    icon: '📝',
    category: 'ASSIGNMENT',
  },
  SPEED_LEARNER: {
    title: 'Speed Learner',
    description: 'Completed 3 or more lessons in a single day',
    icon: '⚡',
    category: 'SPEED',
  },
  MULTI_CERTIFIED: {
    title: 'Multi-Certified',
    description: 'Earned 2 or more verified academy certificates',
    icon: '👑',
    category: 'CERTIFICATION',
  },
  LIVE_CLASS_ATTENDEE: {
    title: 'Live Workshop Attendee',
    description: 'Participated in an interactive live masterclass',
    icon: '🎙️',
    category: 'COMMUNITY',
  },
};

export const getTodayDateString = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};

export const getYesterdayDateString = (date: Date = new Date()): string => {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

export const calculateLevelInfo = (xp: number) => {
  let tier = LEVEL_TIERS[0];
  for (const t of LEVEL_TIERS) {
    if (xp >= t.minXp) {
      tier = t;
    } else {
      break;
    }
  }

  const currentTierMin = tier.minXp;
  const nextTierMin = tier.maxXp;
  const progressInTier = xp - currentTierMin;
  const tierRange = Math.max(1, nextTierMin - currentTierMin);
  const percentage = Math.min(100, Math.round((progressInTier / tierRange) * 100));

  return {
    level: tier.level,
    title: tier.title,
    currentTierMin,
    nextTierMin,
    progressPercentage: percentage,
  };
};

export type GamificationAction =
  | 'LESSON_COMPLETED'
  | 'QUIZ_PASSED'
  | 'ASSIGNMENT_SUBMITTED'
  | 'ASSIGNMENT_PASSED'
  | 'COURSE_COMPLETED'
  | 'CERTIFICATE_ISSUED'
  | 'DAILY_LOGIN'
  | 'LIVE_ATTENDANCE';

export interface ActivityMetadata {
  lessonId?: string;
  durationMinutes?: number;
  quizId?: string;
  quizScore?: number;
  quizMaxScore?: number;
  assignmentId?: string;
  assignmentScore?: number;
  courseId?: string;
  certificateNumber?: string;
}

/**
 * Core function to record any student activity, calculate streaks, award XP, and evaluate badge unlock conditions.
 */
export const recordUserActivity = async (
  userId: string,
  action: GamificationAction,
  metadata: ActivityMetadata = {}
) => {
  try {
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();

    // 1. Determine base XP for the action
    let xpToAward = 0;
    let minutesLearned = metadata.durationMinutes || 0;
    let lessonsInc = 0;
    let quizzesInc = 0;
    let assignmentsInc = 0;

    switch (action) {
      case 'LESSON_COMPLETED':
        xpToAward = 20;
        minutesLearned = minutesLearned > 0 ? minutesLearned : 10;
        lessonsInc = 1;
        break;
      case 'QUIZ_PASSED':
        xpToAward = 50;
        if (metadata.quizScore && metadata.quizMaxScore && metadata.quizScore >= metadata.quizMaxScore) {
          xpToAward += 25; // Bonus for 100%
        }
        quizzesInc = 1;
        break;
      case 'ASSIGNMENT_SUBMITTED':
        xpToAward = 30;
        break;
      case 'ASSIGNMENT_PASSED':
        xpToAward = 100;
        assignmentsInc = 1;
        break;
      case 'COURSE_COMPLETED':
        xpToAward = 300;
        break;
      case 'CERTIFICATE_ISSUED':
        xpToAward = 200;
        break;
      case 'LIVE_ATTENDANCE':
        xpToAward = 50;
        minutesLearned = 45;
        break;
      case 'DAILY_LOGIN':
        xpToAward = 10;
        break;
    }

    // 2. Fetch or create user's gamification profile
    let profile = await prisma.userGamificationProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await prisma.userGamificationProfile.create({
        data: {
          userId,
          xpPoints: xpToAward,
          level: 1,
          levelTitle: 'Novice',
          currentStreakDays: 1,
          longestStreakDays: 1,
          lastActiveDate: today,
        },
      });
    } else {
      // Calculate streak progression
      let currentStreak = profile.currentStreakDays;
      if (profile.lastActiveDate === yesterday) {
        currentStreak += 1;
      } else if (profile.lastActiveDate === today) {
        // Same day activity - maintain current streak
        currentStreak = Math.max(1, currentStreak);
      } else {
        // Missed one or more days - reset to 1
        currentStreak = 1;
      }

      const longestStreak = Math.max(profile.longestStreakDays, currentStreak);

      profile = await prisma.userGamificationProfile.update({
        where: { id: profile.id },
        data: {
          currentStreakDays: currentStreak,
          longestStreakDays: longestStreak,
          lastActiveDate: today,
          xpPoints: { increment: xpToAward },
        },
      });
    }

    // 3. Upsert UserActivityDay
    const dayRecord = await prisma.userActivityDay.upsert({
      where: { userId_date: { userId, date: today } },
      create: {
        userId,
        date: today,
        minutesLearned,
        lessonsCompleted: lessonsInc,
        quizzesTaken: quizzesInc,
        assignmentsCompleted: assignmentsInc,
        xpEarned: xpToAward,
      },
      update: {
        minutesLearned: { increment: minutesLearned },
        lessonsCompleted: { increment: lessonsInc },
        quizzesTaken: { increment: quizzesInc },
        assignmentsCompleted: { increment: assignmentsInc },
        xpEarned: { increment: xpToAward },
      },
    });

    // 4. Update Level if XP crossed threshold
    const levelInfo = calculateLevelInfo(profile.xpPoints);
    const leveledUp = levelInfo.level > profile.level;
    if (leveledUp || levelInfo.title !== profile.levelTitle) {
      await prisma.userGamificationProfile.update({
        where: { id: profile.id },
        data: {
          level: levelInfo.level,
          levelTitle: levelInfo.title,
        },
      });

      if (leveledUp) {
        await createNotification({
          userId,
          title: `🎉 Level Up! You reached Level ${levelInfo.level}: ${levelInfo.title}!`,
          message: `Congratulations! You have advanced to Level ${levelInfo.level} (${levelInfo.title}) with ${profile.xpPoints} total XP. Keep ascending!`,
          type: NotificationType.LEVEL_UP,
          linkUrl: '/dashboard',
        });
      }
    }

    // 5. Evaluate and Award Badges
    const unlockedBadges = await evaluateAndAwardBadges(userId, profile, dayRecord);

    return {
      xpAwarded: xpToAward,
      totalXp: profile.xpPoints,
      level: levelInfo.level,
      levelTitle: levelInfo.title,
      leveledUp,
      currentStreakDays: profile.currentStreakDays,
      longestStreakDays: profile.longestStreakDays,
      newBadgesUnlocked: unlockedBadges,
    };
  } catch (err: any) {
    logger.error(`[GAMIFICATION ERROR] Failed to record activity for user ${userId}: ${err.message}`);
    return null;
  }
};

/**
 * Checks all badge conditions and awards newly satisfied badges.
 */
export const evaluateAndAwardBadges = async (
  userId: string,
  profile: any,
  todayRecord?: any
): Promise<BadgeType[]> => {
  const newlyUnlocked: BadgeType[] = [];

  // Fetch already earned badges
  const existingBadges = await prisma.userBadge.findMany({
    where: { userId },
    select: { badgeType: true },
  });
  const earnedSet = new Set(existingBadges.map((b) => b.badgeType));

  const checkAndUnlock = async (type: BadgeType) => {
    if (earnedSet.has(type)) return;
    const def = BADGE_DEFINITIONS[type];
    if (!def) return;

    await prisma.userBadge.create({
      data: {
        userId,
        badgeType: type,
        title: def.title,
        description: def.description,
        icon: def.icon,
        category: def.category,
      },
    });

    earnedSet.add(type);
    newlyUnlocked.push(type);

    await createNotification({
      userId,
      title: `🏅 Badge Unlocked: ${def.title}!`,
      message: `You earned the "${def.title}" achievement (${def.description})!`,
      type: NotificationType.ACHIEVEMENT_UNLOCKED,
      linkUrl: '/dashboard',
    });
  };

  // 1. Streak Badges
  if (profile.currentStreakDays >= 3 || profile.longestStreakDays >= 3) {
    await checkAndUnlock(BadgeType.STREAK_3);
  }
  if (profile.currentStreakDays >= 7 || profile.longestStreakDays >= 7) {
    await checkAndUnlock(BadgeType.STREAK_7);
  }
  if (profile.currentStreakDays >= 30 || profile.longestStreakDays >= 30) {
    await checkAndUnlock(BadgeType.STREAK_30);
  }

  // 2. First Lesson
  if (!earnedSet.has(BadgeType.FIRST_LESSON)) {
    const completedLessonCount = await prisma.lessonProgress.count({
      where: { userId, isCompleted: true },
    });
    if (completedLessonCount >= 1) {
      await checkAndUnlock(BadgeType.FIRST_LESSON);
    }
  }

  // 3. First Course Completed
  if (!earnedSet.has(BadgeType.FIRST_COURSE)) {
    const completedCourseCount = await prisma.enrollment.count({
      where: { userId, status: EnrollmentStatus.COMPLETED },
    });
    if (completedCourseCount >= 1) {
      await checkAndUnlock(BadgeType.FIRST_COURSE);
    }
  }

  // 4. Multi-Certified (2+ certificates)
  if (!earnedSet.has(BadgeType.MULTI_CERTIFIED)) {
    const certCount = await prisma.certificate.count({
      where: { userId, isRevoked: false },
    });
    if (certCount >= 2) {
      await checkAndUnlock(BadgeType.MULTI_CERTIFIED);
    }
  }

  // 5. Quiz Master (3+ quizzes with 90%+ avg)
  if (!earnedSet.has(BadgeType.QUIZ_MASTER)) {
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId },
      select: { percentage: true },
    });
    if (attempts.length >= 3) {
      const avg = attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length;
      if (avg >= 90) {
        await checkAndUnlock(BadgeType.QUIZ_MASTER);
      }
    }
  }

  // 6. Perfect Assignment (100% score)
  if (!earnedSet.has(BadgeType.PERFECT_ASSIGNMENT)) {
    const perfectSub = await prisma.assignmentSubmission.findFirst({
      where: {
        userId,
        status: SubmissionStatus.PASSED,
        score: { not: null },
      },
      include: { assignment: { select: { maxScore: true } } },
    });
    if (perfectSub && perfectSub.score && perfectSub.assignment.maxScore && perfectSub.score >= perfectSub.assignment.maxScore) {
      await checkAndUnlock(BadgeType.PERFECT_ASSIGNMENT);
    }
  }

  // 7. Speed Learner (3+ lessons completed in a single day)
  if (!earnedSet.has(BadgeType.SPEED_LEARNER) && todayRecord && todayRecord.lessonsCompleted >= 3) {
    await checkAndUnlock(BadgeType.SPEED_LEARNER);
  }

  return newlyUnlocked;
};

/**
 * Returns full gamification profile for student dashboard.
 */
export const getStudentGamificationProfile = async (userId: string) => {
  // Ensure profile exists
  let profile = await prisma.userGamificationProfile.findUnique({
    where: { userId },
  });

  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  if (!profile) {
    profile = await prisma.userGamificationProfile.create({
      data: {
        userId,
        xpPoints: 0,
        level: 1,
        levelTitle: 'Novice',
        currentStreakDays: 1,
        longestStreakDays: 1,
        lastActiveDate: today,
        weeklyGoalMinutes: 120,
      },
    });
  } else {
    // If user missed yesterday, check if streak should reset
    if (profile.lastActiveDate && profile.lastActiveDate !== today && profile.lastActiveDate !== yesterday) {
      profile = await prisma.userGamificationProfile.update({
        where: { id: profile.id },
        data: { currentStreakDays: 0 },
      });
    }
  }

  const levelInfo = calculateLevelInfo(profile.xpPoints);

  // Fetch last 7 days of activity
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const recentActivityDays = await prisma.userActivityDay.findMany({
    where: {
      userId,
      date: { gte: sevenDaysAgoStr },
    },
    orderBy: { date: 'asc' },
  });

  const activityMap = new Map<string, any>();
  recentActivityDays.forEach((a) => activityMap.set(a.date, a));

  // Build structured 7-day calendar array
  const last7Days = [];
  let weeklyLearnedMinutes = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const act = activityMap.get(dateStr);
    const mins = act ? act.minutesLearned : 0;
    weeklyLearnedMinutes += mins;

    last7Days.push({
      date: dateStr,
      dayName,
      active: !!act && (act.minutesLearned > 0 || act.lessonsCompleted > 0 || act.xpEarned > 0),
      minutesLearned: mins,
      lessonsCompleted: act ? act.lessonsCompleted : 0,
      xpEarned: act ? act.xpEarned : 0,
    });
  }

  // Fetch all earned badges
  const earnedBadges = await prisma.userBadge.findMany({
    where: { userId },
    orderBy: { earnedAt: 'desc' },
  });
  const earnedMap = new Map<string, any>();
  earnedBadges.forEach((b) => earnedMap.set(b.badgeType, b));

  // Construct comprehensive badges list (unlocked + locked with descriptions)
  const allBadges = (Object.keys(BADGE_DEFINITIONS) as BadgeType[]).map((type) => {
    const def = BADGE_DEFINITIONS[type];
    const earned = earnedMap.get(type);
    return {
      type,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
      isUnlocked: !!earned,
      earnedAt: earned ? earned.earnedAt : null,
    };
  });

  const weeklyGoalMinutes = profile.weeklyGoalMinutes || 120;
  const weeklyGoalPercentage = Math.min(100, Math.round((weeklyLearnedMinutes / weeklyGoalMinutes) * 100));

  return {
    xpPoints: profile.xpPoints,
    level: levelInfo.level,
    levelTitle: levelInfo.title,
    currentTierMin: levelInfo.currentTierMin,
    nextTierMin: levelInfo.nextTierMin,
    tierProgressPercentage: levelInfo.progressPercentage,
    currentStreakDays: profile.currentStreakDays,
    longestStreakDays: profile.longestStreakDays,
    lastActiveDate: profile.lastActiveDate,
    weeklyGoalMinutes,
    weeklyLearnedMinutes,
    weeklyGoalPercentage,
    last7DaysActivity: last7Days,
    badges: allBadges,
    unlockedBadgesCount: earnedBadges.length,
    totalBadgesCount: allBadges.length,
  };
};

/**
 * Returns Academy Leaderboard sorted by XP.
 */
export const getLeaderboard = async (period: 'all-time' | 'weekly' = 'all-time', limit: number = 25) => {
  if (period === 'weekly') {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().split('T')[0];

    const weeklyActivities = await prisma.userActivityDay.groupBy({
      by: ['userId'],
      where: { date: { gte: dateStr } },
      _sum: { xpEarned: true, minutesLearned: true, lessonsCompleted: true },
      orderBy: { _sum: { xpEarned: 'desc' } },
      take: limit,
    });

    const userIds = weeklyActivities.map((w) => w.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, role: 'STUDENT' },
      select: { id: true, name: true, avatar: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const profiles = await prisma.userGamificationProfile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, level: true, levelTitle: true, currentStreakDays: true },
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    return weeklyActivities
      .filter((w) => userMap.has(w.userId))
      .map((w, idx) => {
        const u = userMap.get(w.userId)!;
        const p = profileMap.get(w.userId);
        return {
          rank: idx + 1,
          userId: u.id,
          name: u.name,
          avatar: u.avatar,
          xpPoints: w._sum.xpEarned || 0,
          minutesLearned: w._sum.minutesLearned || 0,
          lessonsCompleted: w._sum.lessonsCompleted || 0,
          level: p ? p.level : 1,
          levelTitle: p ? p.levelTitle : 'Novice',
          currentStreakDays: p ? p.currentStreakDays : 0,
        };
      });
  }

  // All-time leaderboard
  const topProfiles = await prisma.userGamificationProfile.findMany({
    where: { user: { role: 'STUDENT' } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
          email: true,
          badges: { select: { id: true } },
        },
      },
    },
    orderBy: { xpPoints: 'desc' },
    take: limit,
  });

  return topProfiles.map((p, idx) => ({
    rank: idx + 1,
    userId: p.userId,
    name: p.user.name,
    avatar: p.user.avatar,
    xpPoints: p.xpPoints,
    level: p.level,
    levelTitle: p.levelTitle,
    currentStreakDays: p.currentStreakDays,
    longestStreakDays: p.longestStreakDays,
    badgesCount: p.user.badges?.length || 0,
  }));
};

/**
 * Updates student weekly learning goal in minutes.
 */
export const updateWeeklyGoal = async (userId: string, weeklyGoalMinutes: number) => {
  const goal = Math.max(15, Math.min(2400, weeklyGoalMinutes));
  return prisma.userGamificationProfile.upsert({
    where: { userId },
    create: {
      userId,
      weeklyGoalMinutes: goal,
      xpPoints: 0,
      level: 1,
      levelTitle: 'Novice',
    },
    update: {
      weeklyGoalMinutes: goal,
    },
  });
};
