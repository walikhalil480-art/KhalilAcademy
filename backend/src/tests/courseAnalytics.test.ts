import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/database';
import { generateAccessToken } from '../utils/jwt';
import { SubmissionStatus, EnrollmentStatus } from '@prisma/client';

describe('Course Analytics & Student Performance Access Control & Metrics', () => {
  const timestamp = Date.now();
  const student1Id = `student_ca1_${timestamp}`;
  const student2Id = `student_ca2_${timestamp}`;
  const instructorId = `instructor_ca_${timestamp}`;
  const otherInstructorId = `instructor_other_${timestamp}`;
  const adminId = `admin_ca_${timestamp}`;

  const categoryId = `cat_ca_${timestamp}`;
  const courseId = `course_ca_${timestamp}`;
  const moduleId = `mod_ca_${timestamp}`;
  const lesson1Id = `lesson1_ca_${timestamp}`;
  const lesson2Id = `lesson2_ca_${timestamp}`;
  const quizId = `quiz_ca_${timestamp}`;
  const assignmentId = `assignment_ca_${timestamp}`;

  let student1Token: string;
  let instructorToken: string;
  let otherInstructorToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // 1. Create Users
    await prisma.user.createMany({
      data: [
        {
          id: student1Id,
          email: `student1_${timestamp}@khalilacademy.com`,
          name: 'Student One',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
          role: 'STUDENT',
          status: 'ACTIVE',
        },
        {
          id: student2Id,
          email: `student2_${timestamp}@khalilacademy.com`,
          name: 'Student Two',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
          role: 'STUDENT',
          status: 'ACTIVE',
        },
        {
          id: instructorId,
          email: `instructor_${timestamp}@khalilacademy.com`,
          name: 'Course Instructor',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
          role: 'INSTRUCTOR',
          status: 'ACTIVE',
        },
        {
          id: otherInstructorId,
          email: `other_instructor_${timestamp}@khalilacademy.com`,
          name: 'Other Instructor',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
          role: 'INSTRUCTOR',
          status: 'ACTIVE',
        },
        {
          id: adminId,
          email: `admin_${timestamp}@khalilacademy.com`,
          name: 'Platform Admin',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      ],
    });

    student1Token = generateAccessToken({ userId: student1Id, email: `student1_${timestamp}@khalilacademy.com`, role: 'STUDENT' });
    instructorToken = generateAccessToken({ userId: instructorId, email: `instructor_${timestamp}@khalilacademy.com`, role: 'INSTRUCTOR' });
    otherInstructorToken = generateAccessToken({ userId: otherInstructorId, email: `other_instructor_${timestamp}@khalilacademy.com`, role: 'INSTRUCTOR' });
    adminToken = generateAccessToken({ userId: adminId, email: `admin_${timestamp}@khalilacademy.com`, role: 'ADMIN' });

    // 2. Create Category & Course
    await prisma.category.create({
      data: {
        id: categoryId,
        name: `Analytics Category ${timestamp}`,
        slug: `analytics-category-${timestamp}`,
      },
    });

    await prisma.course.create({
      data: {
        id: courseId,
        title: `PowerPoint Mastery ${timestamp}`,
        slug: `powerpoint-mastery-${timestamp}`,
        description: 'Comprehensive presentation skills',
        instructorId,
        categoryId,
        status: 'PUBLISHED',
        isFree: true,
        price: 0,
        requireAssignments: true,
        assignmentPassingScore: 70.0,
        requireQuizzes: true,
        quizPassingScore: 80.0,
      },
    });

    // 3. Create Module, Lessons, Quiz, and Assignment
    await prisma.module.create({
      data: {
        id: moduleId,
        courseId,
        title: 'Module 1: Foundations',
        order: 1,
      },
    });

    await prisma.lesson.createMany({
      data: [
        {
          id: lesson1Id,
          moduleId,
          title: 'Lesson 1: Intro',
          isPublished: true,
          order: 1,
          durationMinutes: 10,
        },
        {
          id: lesson2Id,
          moduleId,
          title: 'Lesson 2: Animations',
          isPublished: true,
          order: 2,
          durationMinutes: 15,
        },
      ],
    });

    await prisma.quiz.create({
      data: {
        id: quizId,
        moduleId,
        courseId,
        title: 'PowerPoint Final Quiz',
        passingScore: 80.0,
        isFinalAssessment: true,
        questions: {
          create: [
            {
              questionText: 'What is Slide Transition?',
              points: 10,
              order: 1,
              options: {
                create: [
                  { optionText: 'Motion effect between slides', isCorrect: true },
                  { optionText: 'Audio recording', isCorrect: false },
                ],
              },
            },
          ],
        },
      },
    });

    await prisma.assignment.create({
      data: {
        id: assignmentId,
        moduleId,
        courseId,
        title: 'Pitch Deck Creation',
        instructions: 'Design a 5-slide investor pitch deck.',
        maxScore: 100.0,
        passingScore: 70.0,
        isRequired: true,
      },
    });

    // 4. Enroll Students: Student 1 (Completed 100%), Student 2 (In-Progress 50%)
    await prisma.enrollment.createMany({
      data: [
        {
          userId: student1Id,
          courseId,
          status: EnrollmentStatus.COMPLETED,
          progressPercentage: 100.0,
          completedAt: new Date(),
        },
        {
          userId: student2Id,
          courseId,
          status: EnrollmentStatus.ACTIVE,
          progressPercentage: 50.0,
        },
      ],
    });

    // Student 1 completed both lessons; Student 2 completed Lesson 1
    await prisma.lessonProgress.createMany({
      data: [
        { userId: student1Id, lessonId: lesson1Id, isCompleted: true, watchTime: 600, progressPercentage: 100 },
        { userId: student1Id, lessonId: lesson2Id, isCompleted: true, watchTime: 900, progressPercentage: 100 },
        { userId: student2Id, lessonId: lesson1Id, isCompleted: true, watchTime: 600, progressPercentage: 100 },
      ],
    });

    // Quiz Attempts: Student 1 scored 90%, Student 2 scored 70%
    await prisma.quizAttempt.createMany({
      data: [
        {
          quizId,
          userId: student1Id,
          score: 9.0,
          maxScore: 10.0,
          percentage: 90.0,
          passed: true,
        },
        {
          quizId,
          userId: student2Id,
          score: 7.0,
          maxScore: 10.0,
          percentage: 70.0,
          passed: false,
        },
      ],
    });

    // Assignment Submissions: Student 1 PASSED (95/100), Student 2 SUBMITTED (pending)
    await prisma.assignmentSubmission.createMany({
      data: [
        {
          assignmentId,
          userId: student1Id,
          submissionText: 'Here is my pitch deck link: https://pitch.example.com',
          score: 95.0,
          status: SubmissionStatus.PASSED,
          feedback: 'Outstanding presentation structure!',
          gradedByUserId: instructorId,
          gradedAt: new Date(),
        },
        {
          assignmentId,
          userId: student2Id,
          submissionText: 'Draft submission for review.',
          status: SubmissionStatus.SUBMITTED,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.assignmentSubmission.deleteMany({ where: { assignmentId } });
    await prisma.quizAttempt.deleteMany({ where: { quizId } });
    await prisma.lessonProgress.deleteMany({ where: { lessonId: { in: [lesson1Id, lesson2Id] } } });
    await prisma.enrollment.deleteMany({ where: { courseId } });
    await prisma.assignment.deleteMany({ where: { id: assignmentId } });
    await prisma.quizOption.deleteMany({ where: { question: { quizId } } });
    await prisma.quizQuestion.deleteMany({ where: { quizId } });
    await prisma.quiz.deleteMany({ where: { id: quizId } });
    await prisma.lesson.deleteMany({ where: { id: { in: [lesson1Id, lesson2Id] } } });
    await prisma.module.deleteMany({ where: { id: moduleId } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.user.deleteMany({ where: { id: { in: [student1Id, student2Id, instructorId, otherInstructorId, adminId] } } });
  });

  it('1. Should block unauthenticated request from accessing analytics (401 Unauthorized)', async () => {
    const res = await request(app).get(`/api/courses/${courseId}/analytics`);
    expect(res.status).toBe(401);
  });

  it('2. Should prevent STUDENT role from accessing course analytics (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/courses/${courseId}/analytics`)
      .set('Authorization', `Bearer ${student1Token}`);
    expect(res.status).toBe(403);
  });

  it('3. Should prevent an unrelated instructor from accessing another instructor\'s course analytics (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/courses/${courseId}/analytics`)
      .set('Authorization', `Bearer ${otherInstructorToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/only the course instructor/i);
  });

  it('4. Should allow the COURSE INSTRUCTOR to view complete metrics, student progress, quiz scores, and assignment results', async () => {
    const res = await request(app)
      .get(`/api/courses/${courseId}/analytics`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Course Summary Stats
    expect(res.body.stats.totalEnrolled).toBe(2);
    expect(res.body.stats.completedStudents).toBe(1);
    expect(res.body.stats.completionRate).toBe(50.0); // 1 of 2 students completed = 50.0%
    expect(res.body.stats.averageQuizScore).toBe(80.0); // (90 + 70) / 2 = 80.0%
    expect(res.body.stats.totalQuizAttempts).toBe(2);
    expect(res.body.stats.totalAssignmentSubmissions).toBe(2);
    expect(res.body.stats.pendingGradingCount).toBe(1);

    // Detailed Student Breakdown
    expect(res.body.students.length).toBe(2);
    const s1 = res.body.students.find((s: any) => s.studentId === student1Id);
    expect(s1).toBeDefined();
    expect(s1.progressPercentage).toBe(100.0);
    expect(s1.completedLessonsCount).toBe(2);
    expect(s1.averageQuizScore).toBe(90.0);
    expect(s1.assignments[0].status).toBe('PASSED');
    expect(s1.assignments[0].score).toBe(95.0);

    const s2 = res.body.students.find((s: any) => s.studentId === student2Id);
    expect(s2).toBeDefined();
    expect(s2.progressPercentage).toBe(50.0);
    expect(s2.completedLessonsCount).toBe(1);
    expect(s2.averageQuizScore).toBe(70.0);
    expect(s2.assignments[0].status).toBe('SUBMITTED');

    // Submissions table
    expect(res.body.submissions.length).toBe(2);
  });

  it('5. Should allow ADMIN to view full analytics and student performance data for any course', async () => {
    const res = await request(app)
      .get(`/api/courses/${courseId}/analytics`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats.completionRate).toBe(50.0);
    expect(res.body.stats.averageQuizScore).toBe(80.0);
    expect(res.body.students.length).toBe(2);
  });
});
