import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { generateAccessToken } from '../utils/jwt';
import * as gamificationService from '../services/gamification.service';
import { BadgeType } from '@prisma/client';

describe('Gamification, Learning Streaks & Leaderboard Test Suite', () => {
  let studentUser: any;
  let studentToken: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const uniqueSuffix = Date.now();

    studentUser = await prisma.user.create({
      data: {
        email: `student_gamify_${uniqueSuffix}@khalilacademy.com`,
        passwordHash,
        name: 'Gamification Student Tester',
        role: 'STUDENT',
        status: 'ACTIVE',
        emailVerified: true,
      },
    });

    studentToken = generateAccessToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: studentUser.role,
    });
  });

  afterAll(async () => {
    // Clean up test records
    await prisma.userBadge.deleteMany({ where: { userId: studentUser.id } });
    await prisma.userActivityDay.deleteMany({ where: { userId: studentUser.id } });
    await prisma.userGamificationProfile.deleteMany({ where: { userId: studentUser.id } });
    await prisma.user.delete({ where: { id: studentUser.id } });
  });

  describe('1. XP Points and Level Tier Calculations', () => {
    it('should correctly classify Level 1 (Novice) for 0 - 200 XP', () => {
      const levelInfo = gamificationService.calculateLevelInfo(100);
      expect(levelInfo.level).toBe(1);
      expect(levelInfo.title).toBe('Novice');
      expect(levelInfo.progressPercentage).toBe(50);
    });

    it('should correctly classify Level 3 (Practitioner) for 650 XP', () => {
      const levelInfo = gamificationService.calculateLevelInfo(650);
      expect(levelInfo.level).toBe(3);
      expect(levelInfo.title).toBe('Practitioner');
      expect(levelInfo.currentTierMin).toBe(500);
      expect(levelInfo.nextTierMin).toBe(1000);
      expect(levelInfo.progressPercentage).toBe(30);
    });

    it('should correctly classify Level 8 (Tech Legend) for 9000+ XP', () => {
      const levelInfo = gamificationService.calculateLevelInfo(9500);
      expect(levelInfo.level).toBe(8);
      expect(levelInfo.title).toBe('Tech Legend');
    });
  });

  describe('2. Deterministic Streak Engine & XP Awarding', () => {
    it('should award 20 XP on lesson completion and initialize 1-day streak', async () => {
      const result = await gamificationService.recordUserActivity(studentUser.id, 'LESSON_COMPLETED', {
        durationMinutes: 15,
      });

      expect(result).not.toBeNull();
      expect(result!.xpAwarded).toBe(20);
      expect(result!.totalXp).toBe(20);
      expect(result!.currentStreakDays).toBe(1);
      expect(result!.longestStreakDays).toBe(1);
    });

    it('should award 75 XP (50 base + 25 perfect bonus) for a 100% quiz score', async () => {
      const result = await gamificationService.recordUserActivity(studentUser.id, 'QUIZ_PASSED', {
        quizScore: 100,
        quizMaxScore: 100,
      });

      expect(result).not.toBeNull();
      expect(result!.xpAwarded).toBe(75);
      expect(result!.totalXp).toBe(95); // 20 + 75
    });

    it('should increment streak when user was active yesterday', async () => {
      // Artificially set lastActiveDate to yesterday
      const yesterday = gamificationService.getYesterdayDateString();
      await prisma.userGamificationProfile.update({
        where: { userId: studentUser.id },
        data: {
          lastActiveDate: yesterday,
          currentStreakDays: 3,
          longestStreakDays: 3,
        },
      });

      const result = await gamificationService.recordUserActivity(studentUser.id, 'LESSON_COMPLETED');
      expect(result!.currentStreakDays).toBe(4);
      expect(result!.longestStreakDays).toBe(4);
    });

    it('should award STREAK_3 badge when streak reaches 3 or more', async () => {
      const badges = await prisma.userBadge.findMany({
        where: { userId: studentUser.id },
      });
      const hasStreak3 = badges.some((b) => b.badgeType === BadgeType.STREAK_3);
      expect(hasStreak3).toBe(true);
    });
  });

  describe('3. REST API Endpoints', () => {
    it('GET /api/gamification/profile should return streak, XP, badges, and 7-day activity', async () => {
      const res = await request(app)
        .get('/api/gamification/profile')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentStreakDays).toBeGreaterThanOrEqual(1);
      expect(res.body.data.level).toBeDefined();
      expect(res.body.data.levelTitle).toBeDefined();
      expect(res.body.data.last7DaysActivity).toHaveLength(7);
      expect(res.body.data.badges).toBeInstanceOf(Array);
      expect(res.body.data.weeklyGoalMinutes).toBeDefined();
    });

    it('PUT /api/gamification/weekly-goal should update weekly learning goal', async () => {
      const res = await request(app)
        .put('/api/gamification/weekly-goal')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ weeklyGoalMinutes: 180 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.weeklyGoalMinutes).toBe(180);
    });

    it('POST /api/gamification/check-in should record daily login activity and return XP', async () => {
      const res = await request(app)
        .post('/api/gamification/check-in')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.xpAwarded).toBe(10);
    });

    it('GET /api/gamification/leaderboard should return top students sorted by XP', async () => {
      const res = await request(app)
        .get('/api/gamification/leaderboard')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      // Verify sorting descending by XP
      const leaderboard = res.body.data;
      for (let i = 0; i < leaderboard.length - 1; i++) {
        expect(leaderboard[i].xpPoints).toBeGreaterThanOrEqual(leaderboard[i + 1].xpPoints);
      }
    });
  });
});
