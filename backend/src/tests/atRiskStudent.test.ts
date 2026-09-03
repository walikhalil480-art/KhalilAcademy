import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/database';
import { generateAccessToken } from '../utils/jwt';
import { AtRiskStudentService } from '../services/atRiskStudent.service';
import bcrypt from 'bcryptjs';

describe('At-Risk Student Detection & Intervention Test Suite', () => {
  let adminUser: any;
  let instructorUser: any;
  let normalStudent: any;
  let atRiskStudent: any;

  let adminToken: string;
  let instructorToken: string;
  let studentToken: string;

  let testCategory: any;
  let testCourse: any;
  let testModule: any;
  let testLesson: any;
  let testQuiz: any;
  let testAssignment: any;

  beforeAll(async () => {
    const pwdHash = await bcrypt.hash('Password123!', 10);

    // 1. Create Admin, Instructor, Normal Student, and At-Risk Student
    adminUser = await prisma.user.create({
      data: {
        email: `admin_risk_${Date.now()}@khalilacademy.com`,
        name: 'Admin Risk Officer',
        passwordHash: pwdHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    instructorUser = await prisma.user.create({
      data: {
        email: `instructor_risk_${Date.now()}@khalilacademy.com`,
        name: 'Instructor Risk Tester',
        passwordHash: pwdHash,
        role: 'INSTRUCTOR',
        status: 'ACTIVE',
      },
    });

    normalStudent = await prisma.user.create({
      data: {
        email: `student_active_${Date.now()}@khalilacademy.com`,
        name: 'Active Progressing Student',
        passwordHash: pwdHash,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });

    atRiskStudent = await prisma.user.create({
      data: {
        email: `student_atrisk_${Date.now()}@khalilacademy.com`,
        name: 'Struggling Inactive Student',
        passwordHash: pwdHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000), // Created 15 days ago
      },
    });

    adminToken = generateAccessToken({
      userId: adminUser.id,
      role: adminUser.role,
      email: adminUser.email,
    });
    instructorToken = generateAccessToken({
      userId: instructorUser.id,
      role: instructorUser.role,
      email: instructorUser.email,
    });
    studentToken = generateAccessToken({
      userId: normalStudent.id,
      role: normalStudent.role,
      email: normalStudent.email,
    });

    // 2. Reuse Category, create Course, Module, Lesson, Quiz, Assignment
    testCategory = (await prisma.category.findFirst({ where: { slug: 'devops' } })) || (await prisma.category.findFirst());
    if (!testCategory) throw new Error('No category found in test database.');

    testCourse = await prisma.course.create({
      data: {
        title: 'Kubernetes in Production',
        slug: `k8s-prod-${Date.now()}`,
        description: 'Comprehensive cluster setup and troubleshooting.',
        instructorId: instructorUser.id,
        categoryId: testCategory.id,
        isFree: true,
        status: 'PUBLISHED',
      },
    });

    testModule = await prisma.module.create({
      data: {
        title: 'Module 1: Pods & Deployments',
        order: 1,
        courseId: testCourse.id,
      },
    });

    testLesson = await prisma.lesson.create({
      data: {
        title: 'Lesson 1: Pod Architecture',
        order: 1,
        moduleId: testModule.id,
      },
    });

    testQuiz = await prisma.quiz.create({
      data: {
        title: 'Kubernetes Pods Mastery Quiz',
        passingScore: 70.0,
        moduleId: testModule.id,
        courseId: testCourse.id,
      },
    });

    testAssignment = await prisma.assignment.create({
      data: {
        title: 'Deploy Multi-Tier K8s Cluster',
        instructions: 'Submit your manifest YAML and screenshots.',
        dueDate: new Date(Date.now() - 3 * 24 * 3600 * 1000), // Overdue by 3 days
        moduleId: testModule.id,
        courseId: testCourse.id,
      },
    });

    // 3. Normal Student Setup: Active enrollment + recent login + passed quiz
    await prisma.enrollment.create({
      data: {
        userId: normalStudent.id,
        courseId: testCourse.id,
        status: 'ACTIVE',
        progressPercentage: 80.0,
        updatedAt: new Date(), // updated today
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: normalStudent.id,
        action: 'USER_LOGIN',
        entity: 'User',
        createdAt: new Date(), // today
      },
    });

    await prisma.quizAttempt.create({
      data: {
        userId: normalStudent.id,
        quizId: testQuiz.id,
        score: 90,
        maxScore: 100,
        percentage: 90,
        passed: true,
        completedAt: new Date(),
      },
    });

    await prisma.assignmentSubmission.create({
      data: {
        userId: normalStudent.id,
        assignmentId: testAssignment.id,
        submissionText: 'https://github.com/active-student/manifests',
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    // 4. At-Risk Student Setup: Stalled enrollment (35% with no activity for 12 days)
    await prisma.enrollment.create({
      data: {
        userId: atRiskStudent.id,
        courseId: testCourse.id,
        status: 'ACTIVE',
        progressPercentage: 35.0,
        updatedAt: new Date(Date.now() - 12 * 24 * 3600 * 1000),
        createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000),
      },
    });

    // At-Risk Student: 3 consecutive quiz failures
    for (let i = 1; i <= 3; i++) {
      await prisma.quizAttempt.create({
        data: {
          userId: atRiskStudent.id,
          quizId: testQuiz.id,
          score: 40,
          maxScore: 100,
          percentage: 40,
          passed: false,
          completedAt: new Date(Date.now() - (14 - i) * 24 * 3600 * 1000),
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.studentRiskRecord.deleteMany({
      where: { userId: { in: [normalStudent.id, atRiskStudent.id] } },
    });
    await prisma.quizAttempt.deleteMany({
      where: { quizId: testQuiz.id },
    });
    await prisma.assignmentSubmission.deleteMany({
      where: { assignmentId: testAssignment.id },
    });
    await prisma.assignment.deleteMany({ where: { id: testAssignment.id } });
    await prisma.quiz.deleteMany({ where: { id: testQuiz.id } });
    await prisma.lessonProgress.deleteMany({ where: { lessonId: testLesson.id } });
    await prisma.lesson.deleteMany({ where: { id: testLesson.id } });
    await prisma.module.deleteMany({ where: { id: testModule.id } });
    await prisma.enrollment.deleteMany({ where: { courseId: testCourse.id } });
    await prisma.course.deleteMany({ where: { id: testCourse.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [adminUser.id, instructorUser.id, normalStudent.id, atRiskStudent.id] } },
    });
    await prisma.$disconnect();
  });

  describe('Deterministic Risk Detection Engine', () => {
    it('should NOT flag an active, progressing student', async () => {
      const result = await AtRiskStudentService.analyzeStudent(normalStudent.id);

      expect(result.activeSignals.length).toBe(0);
      expect(result.overallRiskLevel).toBeNull();
    });

    it('should accurately detect multiple risk conditions for at-risk student', async () => {
      const result = await AtRiskStudentService.analyzeStudent(atRiskStudent.id);

      expect(result.activeSignals.length).toBeGreaterThanOrEqual(3);

      const reasons = result.activeSignals.map((s) => s.riskReason);
      expect(reasons).toContain('INACTIVE_10_DAYS');
      expect(reasons).toContain('COURSE_PROGRESS_STALLED');
      expect(reasons).toContain('QUIZ_FAILED_3_TIMES');
      expect(reasons).toContain('ASSIGNMENT_OVERDUE');

      // Multi-condition combination must result in HIGH risk
      expect(result.overallRiskLevel).toBe('HIGH');
    });

    it('should persist risk records in database with non-duplicated entries', async () => {
      // Run analysis twice to verify idempotency and deduplication
      await AtRiskStudentService.analyzeStudent(atRiskStudent.id);
      await AtRiskStudentService.analyzeStudent(atRiskStudent.id);

      const records = await prisma.studentRiskRecord.findMany({
        where: { userId: atRiskStudent.id, status: 'ACTIVE' },
      });

      const uniqueReasons = new Set(records.map((r) => r.riskReason));
      expect(records.length).toBe(uniqueReasons.size);
    });

    it('should automatically resolve risk when student demonstrates recovery', async () => {
      // 1. Simulate recovery: Student passes the failed quiz
      await prisma.quizAttempt.create({
        data: {
          userId: atRiskStudent.id,
          quizId: testQuiz.id,
          score: 85,
          maxScore: 100,
          percentage: 85,
          passed: true,
          completedAt: new Date(),
        },
      });

      // 2. Simulate recovery: Student submits overdue assignment
      await prisma.assignmentSubmission.create({
        data: {
          userId: atRiskStudent.id,
          assignmentId: testAssignment.id,
          submissionText: 'https://github.com/student/k8s-cluster',
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });

      // 3. Re-run analysis
      const result = await AtRiskStudentService.analyzeStudent(atRiskStudent.id);

      expect(result.resolvedCount).toBeGreaterThanOrEqual(2);

      // Verify quiz failure and assignment overdue records transitioned to RESOLVED
      const resolvedQuiz = await prisma.studentRiskRecord.findFirst({
        where: {
          userId: atRiskStudent.id,
          riskReason: 'QUIZ_FAILED_3_TIMES',
          status: 'RESOLVED',
        },
      });
      expect(resolvedQuiz).toBeDefined();
      expect(resolvedQuiz?.resolvedAt).toBeTruthy();

      const resolvedAssignment = await prisma.studentRiskRecord.findFirst({
        where: {
          userId: atRiskStudent.id,
          riskReason: 'ASSIGNMENT_OVERDUE',
          status: 'RESOLVED',
        },
      });
      expect(resolvedAssignment).toBeDefined();
      expect(resolvedAssignment?.resolvedAt).toBeTruthy();
    });
  });

  describe('REST API & Access Control', () => {
    it('should block STUDENT role from accessing risk analytics (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/at-risk-students')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow ADMIN to fetch at-risk summary and list', async () => {
      const res = await request(app)
        .get('/api/at-risk-students')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.totalAtRisk).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.records)).toBe(true);
    });

    it('should allow fetching detailed risk profile for a student', async () => {
      const res = await request(app)
        .get(`/api/at-risk-students/${atRiskStudent.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.student.id).toBe(atRiskStudent.id);
      expect(res.body.student.enrollments.length).toBeGreaterThanOrEqual(1);
      expect(res.body.activeRisks).toBeDefined();
      expect(res.body.resolvedRisks).toBeDefined();
    });

    it('should allow Instructor/Admin to send supportive intervention to student', async () => {
      const res = await request(app)
        .post(`/api/at-risk-students/${atRiskStudent.id}/intervene`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'We are here to support your Kubernetes learning!',
          message:
            'Hi, we noticed you got stuck on the Pod architecture module. Feel free to reply or book office hours with your instructor!',
          linkUrl: `/courses/${testCourse.slug}/learn`,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify in-app notification created for student
      const notif = await prisma.notification.findFirst({
        where: {
          userId: atRiskStudent.id,
          type: 'STUDENT_SUPPORT_REMINDER',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(notif).toBeDefined();
      expect(notif?.message).toContain('Pod architecture');
    });

    it('should allow Admin to dismiss a risk record', async () => {
      const activeRecord = await prisma.studentRiskRecord.findFirst({
        where: { userId: atRiskStudent.id, status: 'ACTIVE' },
      });

      if (activeRecord) {
        const res = await request(app)
          .patch(`/api/at-risk-students/records/${activeRecord.id}/dismiss`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            reason: 'Student contacted via direct message; resolved blocker.',
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.record.status).toBe('DISMISSED');
      }
    });

    it('should run whole-academy scan via POST /api/at-risk-students/analyze', async () => {
      const res = await request(app)
        .post('/api/at-risk-students/analyze')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result.totalAnalyzed).toBeGreaterThanOrEqual(2);
    });
  });
});
