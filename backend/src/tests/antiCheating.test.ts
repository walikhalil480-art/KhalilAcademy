import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/database';
import { generateAccessToken } from '../utils/jwt';
import { SubmissionStatus } from '@prisma/client';

describe('Anti-Cheating Proctoring & Assessment Lockout System', () => {
  let studentUser: any;
  let instructorUser: any;
  let studentToken: string;
  let instructorToken: string;
  let testCourse: any;
  let testModule: any;
  let testAssignment: any;

  beforeAll(async () => {
    // Clean up previous test artifacts
    await prisma.course.deleteMany({ where: { title: { contains: 'Anti-Cheating Test Course' } } });

    // Seed test users
    studentUser = await prisma.user.upsert({
      where: { email: 'student_cheattest@example.com' },
      update: {},
      create: {
        email: 'student_cheattest@example.com',
        name: 'Student Cheating Test',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEF',
        role: 'STUDENT',
        emailVerified: true,
        status: 'ACTIVE',
      },
    });
    studentToken = generateAccessToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: studentUser.role,
    });

    instructorUser = await prisma.user.upsert({
      where: { email: 'instructor_cheattest@example.com' },
      update: {},
      create: {
        email: 'instructor_cheattest@example.com',
        name: 'Instructor Cheating Test',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEF',
        role: 'INSTRUCTOR',
        emailVerified: true,
        status: 'ACTIVE',
      },
    });
    instructorToken = generateAccessToken({
      userId: instructorUser.id,
      email: instructorUser.email,
      role: instructorUser.role,
    });

    const category = await prisma.category.upsert({
      where: { slug: 'anti-cheat-cat' },
      update: {},
      create: {
        name: 'Anti-Cheat Category',
        slug: 'anti-cheat-cat',
        description: 'Test category',
      },
    });

    testCourse = await prisma.course.create({
      data: {
        title: 'Anti-Cheating Test Course',
        slug: `anti-cheat-course-${Date.now()}`,
        description: 'Testing 3-strike tab switch enforcement',
        instructorId: instructorUser.id,
        categoryId: category.id,
        status: 'PUBLISHED',
      },
    });

    testModule = await prisma.module.create({
      data: {
        title: 'Module 1',
        order: 1,
        courseId: testCourse.id,
      },
    });

    testAssignment = await prisma.assignment.create({
      data: {
        title: 'Proctored Final Assignment',
        instructions: 'Do not switch tabs during this assessment.',
        maxScore: 100,
        passingScore: 80,
        isRequired: true,
        moduleId: testModule.id,
        courseId: testCourse.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.course.deleteMany({ where: { id: testCourse.id } });
    await prisma.user.deleteMany({ where: { email: { in: ['student_cheattest@example.com', 'instructor_cheattest@example.com'] } } });
  });

  it('1. Should initially allow accessing assignment with isCheatingLocked: false', async () => {
    const res = await request(app)
      .get(`/api/assignments/${testAssignment.id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isCheatingLocked).toBe(false);
  });

  it('2. Should disqualify student on 3rd violation via POST /assignments/:id/disqualify', async () => {
    const res = await request(app)
      .post(`/api/assignments/${testAssignment.id}/disqualify`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isCheatingLocked).toBe(true);
    expect(res.body.submission.score).toBe(0);
    expect(res.body.submission.submissionAttempts).toBe(3);
    expect(res.body.submission.status).toBe(SubmissionStatus.RETURNED);
    expect(res.body.submission.feedback).toContain('anti-cheating');
  });

  it('3. Should return isCheatingLocked: true on subsequent GET /assignments/:id', async () => {
    const res = await request(app)
      .get(`/api/assignments/${testAssignment.id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isCheatingLocked).toBe(true);
  });

  it('4. Should reject further submissions once disqualified for cheating', async () => {
    const res = await request(app)
      .post(`/api/assignments/${testAssignment.id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        submissionText: 'Attempting to bypass lockout',
        fileUrl: 'https://example.com/bypass',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('maximum allowed attempts');
  });

  it('5. Should have recorded a StudentRiskRecord with HIGH risk level', async () => {
    const risk = await prisma.studentRiskRecord.findFirst({
      where: {
        userId: studentUser.id,
        assignmentId: testAssignment.id,
        status: 'ACTIVE',
      },
    });

    expect(risk).not.toBeNull();
    expect(risk?.riskLevel).toBe('HIGH');
    expect(risk?.title).toContain('Anti-Cheating Disqualification');
  });

  it('6. Should allow instructor to reset attempts and unlock student via POST /assignments/:id/reset-attempts', async () => {
    const res = await request(app)
      .post(`/api/assignments/${testAssignment.id}/reset-attempts`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ userId: studentUser.id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify student is unlocked
    const checkRes = await request(app)
      .get(`/api/assignments/${testAssignment.id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(checkRes.status).toBe(200);
    expect(checkRes.body.isCheatingLocked).toBe(false);

    // Verify student can submit again legally
    const submitRes = await request(app)
      .post(`/api/assignments/${testAssignment.id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        submissionText: 'Fresh legal submission after instructor unlock',
        fileUrl: 'https://example.com/legal-work',
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.submission.submissionAttempts).toBe(1);

    // Verify student risk record was resolved
    const risk = await prisma.studentRiskRecord.findFirst({
      where: {
        userId: studentUser.id,
        assignmentId: testAssignment.id,
      },
    });
    expect(risk?.status).toBe('RESOLVED');
  });
});
