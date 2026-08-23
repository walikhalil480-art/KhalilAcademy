import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/database';
import { generateAccessToken } from '../utils/jwt';
import bcrypt from 'bcryptjs';

describe('AI Learning Assistant ("Ask Khalil AI") Test Suite', () => {
  let userA: any;
  let userB: any;
  let tokenA: string;
  let tokenB: string;
  let testCourse: any;
  let testModule: any;
  let testLesson: any;

  beforeAll(async () => {
    // 1. Create test users
    const pwdHash = await bcrypt.hash('Password123!', 10);
    userA = await prisma.user.create({
      data: {
        email: `ai_student_a_${Date.now()}@khalilacademy.com`,
        name: 'Student Alpha',
        passwordHash: pwdHash,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `ai_student_b_${Date.now()}@khalilacademy.com`,
        name: 'Student Beta',
        passwordHash: pwdHash,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });

    tokenA = generateAccessToken({ userId: userA.id, role: userA.role, email: userA.email });
    tokenB = generateAccessToken({ userId: userB.id, role: userB.role, email: userB.email });

    // 2. Reuse Category, create Course, Module, Lesson
    const cat = (await prisma.category.findFirst({ where: { slug: 'devops' } })) || (await prisma.category.findFirst());
    if (!cat) throw new Error('No category found in test database.');

    testCourse = await prisma.course.create({
      data: {
        title: 'Kubernetes for Production Engineers',
        slug: `k8s-prod-eng-${Date.now()}`,
        description: 'Comprehensive guide to mastering Kubernetes, Pods, Deployments, and Helm in production.',
        instructorId: userA.id,
        categoryId: cat.id,
        level: 'INTERMEDIATE',
        learningObjectives: ['Understand Kubernetes Pods', 'Deploy high-availability microservices'],
        status: 'PUBLISHED',
      },
    });

    testModule = await prisma.module.create({
      data: {
        title: 'Module 1: Pod Architecture & Networking',
        order: 1,
        courseId: testCourse.id,
      },
    });

    testLesson = await prisma.lesson.create({
      data: {
        title: 'Deep Dive into Kubernetes Pods',
        description: 'Learn the lifecycle, networking model, and storage patterns of Kubernetes Pods.',
        textContent: 'Kubernetes Pods are the smallest deployable units of computing in Kubernetes. A Pod encapsulates one or more containers, storage resources, and a unique network IP.',
        notes: 'Important commands: kubectl get pods, kubectl describe pod <name>, kubectl logs <name>.',
        transcript: 'Welcome to this lesson on Kubernetes Pods. Today we will explore container orchestration...',
        order: 1,
        isPublished: true,
        moduleId: testModule.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.aIMessage.deleteMany({
      where: {
        conversation: {
          userId: { in: [userA.id, userB.id] },
        },
      },
    });
    await prisma.aIConversation.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.lesson.deleteMany({ where: { id: testLesson.id } });
    await prisma.module.deleteMany({ where: { id: testModule.id } });
    await prisma.course.deleteMany({ where: { id: testCourse.id } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    await prisma.$disconnect();
  });

  describe('POST /api/ai/chat — Core Assistant Conversations', () => {
    let createdConvId: string;

    it('should start a new AI conversation grounded in current lesson', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          message: 'Explain Kubernetes Pods like I am a beginner.',
          courseId: testCourse.id,
          lessonId: testLesson.id,
          actionType: 'EXPLAIN',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.conversationId).toBeDefined();
      expect(res.body.assistantMessage).toBeDefined();
      expect(res.body.assistantMessage.content).toBeTruthy();
      createdConvId = res.body.conversationId;
    });

    it('should continue multi-turn conversation using conversationId', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          conversationId: createdConvId,
          message: 'Give me a real-world analogy for that.',
          actionType: 'SIMPLIFY',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.conversationId).toBe(createdConvId);
      expect(res.body.assistantMessage.content).toBeTruthy();
    });

    it('should handle natural greetings without irrelevant lesson boilerplate', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          message: 'hello',
          actionType: 'GENERAL',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.assistantMessage.content.toLowerCase()).toContain('hello');
    });

    it('should prevent Student B from accessing Student A conversation', async () => {
      const res = await request(app)
        .get(`/api/ai/conversations/${createdConvId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(500);
    });

    it('should allow Student A to fetch their conversation history', async () => {
      const res = await request(app)
        .get(`/api/ai/conversations/${createdConvId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.conversation.id).toBe(createdConvId);
      expect(res.body.conversation.messages.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /api/ai/summarize — Lesson Summaries', () => {
    it('should generate a concise lesson summary grounded in lesson content', async () => {
      const res = await request(app)
        .post('/api/ai/summarize')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          lessonId: testLesson.id,
          summaryType: 'quick',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.lessonTitle).toBe(testLesson.title);
      expect(res.body.summary).toContain('Pod');
    });
  });

  describe('POST /api/ai/practice — Practice Questions & Answer Evaluation', () => {
    let questionText: string;

    it('should generate an interactive practice question for the lesson', async () => {
      const res = await request(app)
        .post('/api/ai/practice/generate')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          lessonId: testLesson.id,
          questionType: 'multiple_choice',
          difficulty: 'intermediate',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.questionText).toBeTruthy();
      questionText = res.body.questionText;
    });

    it('should evaluate student answer and provide constructive educational feedback', async () => {
      const res = await request(app)
        .post('/api/ai/practice/evaluate')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          lessonId: testLesson.id,
          question: questionText || 'What is a Kubernetes Pod?',
          studentAnswer: 'A Pod is the smallest deployable unit that encapsulates containers and shares network/storage.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.evaluation).toBeTruthy();
    });
  });

  describe('POST /api/ai/code-help — Code & Debugging Assistance', () => {
    it('should provide root cause analysis and corrections for code errors', async () => {
      const res = await request(app)
        .post('/api/ai/code-help')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          lessonId: testLesson.id,
          code: 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: my-pod\nspec:\n  containers:\n  - name: nginx\n    image: nginx:latest\n    ports:\n    - containerPort: 80',
          errorMessage: 'Error from server (BadRequest): error when creating "pod.yaml": Pod in version "v1" cannot be handled as a Pod',
          language: 'yaml',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.explanation).toBeTruthy();
    });
  });

  describe('POST /api/ai/study-plan & /api/ai/recommendations', () => {
    it('should generate personalized study plan tailored to Khalil Academy courses', async () => {
      const res = await request(app)
        .post('/api/ai/study-plan')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          goal: 'Become a Cloud & Kubernetes Engineer',
          availableHoursPerWeek: 6,
          currentLevel: 'Beginner',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.studyPlan).toBeTruthy();
    });

    it('should generate personalized recommendations based on student progress', async () => {
      const res = await request(app)
        .get(`/api/ai/recommendations?courseId=${testCourse.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.recommendations).toBeTruthy();
    });
  });
});
