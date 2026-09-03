import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/database';
import { generateAccessToken } from '../utils/jwt';
import { CertificateEligibilityService } from '../services/certificateEligibility.service';
import { checkAndProcessCourseCompletion } from '../services/certificate.service';
import { SubmissionStatus } from '@prisma/client';

describe('Learning Completion & Certificate Validation System', () => {
  let studentUser: any;
  let instructorUser: any;
  let adminUser: any;
  let studentToken: string;
  let instructorToken: string;
  let category: any;
  let testCourse: any;
  let testModule: any;
  let requiredLesson1: any;
  let requiredLesson2: any;
  let optionalLesson: any;
  let requiredQuiz: any;
  let requiredAssignment: any;
  let finalAssessmentQuiz: any;

  beforeAll(async () => {
    // Clean up previous test artifacts
    await prisma.certificate.deleteMany({ where: { courseTitle: { contains: 'Cert Test Course' } } });
    await prisma.course.deleteMany({ where: { title: { contains: 'Cert Test Course' } } });

    // Seed test users
    studentUser = await prisma.user.upsert({
      where: { email: 'student_cert_test@example.com' },
      update: {},
      create: {
        email: 'student_cert_test@example.com',
        name: 'Student Certificate Test',
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
      where: { email: 'instructor_cert_test@example.com' },
      update: {},
      create: {
        email: 'instructor_cert_test@example.com',
        name: 'Instructor Certificate Test',
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

    adminUser = await prisma.user.upsert({
      where: { email: 'admin_cert_test@example.com' },
      update: {},
      create: {
        email: 'admin_cert_test@example.com',
        name: 'Admin Certificate Test',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEF',
        role: 'ADMIN',
        emailVerified: true,
        status: 'ACTIVE',
      },
    });

    category = await prisma.category.findFirst();
    if (!category) {
      category = await prisma.category.create({
        data: { name: 'Cert Test Category', slug: `cert-cat-${Date.now()}` },
      });
    }

    // Create a course with strict requirements:
    // requireAllLessons: true, requireQuizzes: true, requireAssignments: true, requireFinalAssessment: true
    testCourse = await prisma.course.create({
      data: {
        title: `Cert Test Course ${Date.now()}`,
        slug: `cert-test-course-${Date.now()}`,
        description: 'Comprehensive test course for verified certification requirements',
        instructorId: instructorUser.id,
        categoryId: category.id,
        certificateEnabled: true,
        requireAllLessons: true,
        requireQuizzes: true,
        quizPassingScore: 70.0,
        requireAssignments: true,
        assignmentPassingScore: 70.0,
        requireFinalAssessment: true,
        finalAssessmentPassingScore: 80.0,
        minimumProgressPercentage: 100.0,
      },
    });

    testModule = await prisma.module.create({
      data: {
        title: 'Module 1: Foundations',
        order: 1,
        courseId: testCourse.id,
      },
    });

    requiredLesson1 = await prisma.lesson.create({
      data: {
        title: 'Lesson 1: Introduction (Required)',
        moduleId: testModule.id,
        order: 1,
        isRequired: true,
        durationMinutes: 10,
        isPublished: true,
      },
    });

    requiredLesson2 = await prisma.lesson.create({
      data: {
        title: 'Lesson 2: Core Concepts (Required)',
        moduleId: testModule.id,
        order: 2,
        isRequired: true,
        durationMinutes: 15,
        isPublished: true,
      },
    });

    optionalLesson = await prisma.lesson.create({
      data: {
        title: 'Lesson 3: Bonus Material (Optional)',
        moduleId: testModule.id,
        order: 3,
        isRequired: false,
        durationMinutes: 5,
        isPublished: true,
      },
    });

    requiredQuiz = await prisma.quiz.create({
      data: {
        title: 'Midterm Quiz (Required)',
        moduleId: testModule.id,
        courseId: testCourse.id,
        passingScore: 70.0,
        maxAttempts: 3,
        isRequired: true,
        isFinalAssessment: false,
        questions: {
          create: [
            {
              questionText: 'What is 2 + 2?',
              points: 10,
              order: 1,
              options: {
                create: [
                  { optionText: '4', isCorrect: true },
                  { optionText: '5', isCorrect: false },
                ],
              },
            },
          ],
        },
      },
    });

    requiredAssignment = await prisma.assignment.create({
      data: {
        title: 'Project Submission (Required)',
        instructions: 'Submit your GitHub repo link and architectural explanation.',
        maxScore: 100.0,
        passingScore: 70.0,
        isRequired: true,
        moduleId: testModule.id,
        courseId: testCourse.id,
      },
    });

    finalAssessmentQuiz = await prisma.quiz.create({
      data: {
        title: 'Comprehensive Final Exam (Required)',
        moduleId: testModule.id,
        courseId: testCourse.id,
        passingScore: 80.0,
        maxAttempts: 3,
        isRequired: true,
        isFinalAssessment: true,
        questions: {
          create: [
            {
              questionText: 'Is security verification essential?',
              points: 20,
              order: 1,
              options: {
                create: [
                  { optionText: 'Yes, absolutely', isCorrect: true },
                  { optionText: 'No', isCorrect: false },
                ],
              },
            },
          ],
        },
      },
    });

    // Link final assessment to course
    await prisma.course.update({
      where: { id: testCourse.id },
      data: { finalAssessmentQuizId: finalAssessmentQuiz.id },
    });

    // Enroll student
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: studentUser.id, courseId: testCourse.id } },
      update: {},
      create: {
        userId: studentUser.id,
        courseId: testCourse.id,
        progressPercentage: 0,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.certificate.deleteMany({ where: { courseId: testCourse?.id } });
    await prisma.assignmentSubmission.deleteMany({ where: { assignment: { courseId: testCourse?.id } } });
    await prisma.quizAttempt.deleteMany({ where: { quiz: { courseId: testCourse?.id } } });
    await prisma.lessonProgress.deleteMany({ where: { lesson: { module: { courseId: testCourse?.id } } } });
    await prisma.enrollment.deleteMany({ where: { courseId: testCourse?.id } });
    await prisma.assignment.deleteMany({ where: { courseId: testCourse?.id } });
    await prisma.quiz.deleteMany({ where: { courseId: testCourse?.id } });
    await prisma.lesson.deleteMany({ where: { module: { courseId: testCourse?.id } } });
    await prisma.module.deleteMany({ where: { courseId: testCourse?.id } });
    await prisma.course.deleteMany({ where: { id: testCourse?.id } });
  });

  it('1. Should report student is INELIGIBLE when required lessons are not completed', async () => {
    const result = await CertificateEligibilityService.evaluateEligibility(studentUser.id, testCourse.id);
    expect(result.eligible).toBe(false);
    expect(result.requirements.lessons.satisfied).toBe(false);
    expect(result.missingRequirements.length).toBeGreaterThan(0);
    expect(result.certificate).toBeNull();
  });

  it('2. Should block certification if 100% lessons watched but required quiz and assignment are incomplete', async () => {
    // Complete required lessons
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: studentUser.id, lessonId: requiredLesson1.id } },
      update: { isCompleted: true, progressPercentage: 100 },
      create: { userId: studentUser.id, lessonId: requiredLesson1.id, isCompleted: true, progressPercentage: 100 },
    });
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: studentUser.id, lessonId: requiredLesson2.id } },
      update: { isCompleted: true, progressPercentage: 100 },
      create: { userId: studentUser.id, lessonId: requiredLesson2.id, isCompleted: true, progressPercentage: 100 },
    });

    const result = await CertificateEligibilityService.evaluateEligibility(studentUser.id, testCourse.id);
    expect(result.requirements.lessons.satisfied).toBe(true);
    expect(result.requirements.quizzes.satisfied).toBe(false);
    expect(result.requirements.assignments.satisfied).toBe(false);
    expect(result.eligible).toBe(false);

    // Verify checkAndProcessCourseCompletion does NOT issue certificate
    const completionRes = await checkAndProcessCourseCompletion(studentUser.id, testCourse.id);
    expect(completionRes.completed).toBe(false);
    expect(completionRes.certificate).toBeNull();
  });

  it('3. Should evaluate quiz attempts and require passing score', async () => {
    // Record a failed quiz attempt (score: 50% < 70%)
    await prisma.quizAttempt.create({
      data: {
        quizId: requiredQuiz.id,
        userId: studentUser.id,
        score: 5,
        maxScore: 10,
        percentage: 50.0,
        passed: false,
      },
    });

    let result = await CertificateEligibilityService.evaluateEligibility(studentUser.id, testCourse.id);
    expect(result.requirements.quizzes.satisfied).toBe(false);

    // Record a passing quiz attempt (score: 100% >= 70%)
    await prisma.quizAttempt.create({
      data: {
        quizId: requiredQuiz.id,
        userId: studentUser.id,
        score: 10,
        maxScore: 10,
        percentage: 100.0,
        passed: true,
      },
    });

    result = await CertificateEligibilityService.evaluateEligibility(studentUser.id, testCourse.id);
    expect(result.requirements.quizzes.satisfied).toBe(true);
    expect(result.eligible).toBe(false); // Still missing assignment & final assessment
  });

  it('4. Should handle assignment review workflow (SUBMITTED -> NEEDS_REVISION -> PASSED)', async () => {
    // 4a. Student submits assignment -> status SUBMITTED (under review)
    const submitRes = await request(app)
      .post(`/api/assignments/${requiredAssignment.id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        submissionText: 'Initial draft submission',
        fileUrl: 'https://github.com/student/project',
      });
    expect(submitRes.status).toBe(200);

    let result = await CertificateEligibilityService.evaluateEligibility(studentUser.id, testCourse.id);
    expect(result.requirements.assignments.satisfied).toBe(false);
    expect(result.missingRequirements.some((m) => m.includes('under instructor review'))).toBe(true);

    const submissionId = submitRes.body.submission.id;

    // 4b. Instructor marks NEEDS_REVISION
    const revisionRes = await request(app)
      .post(`/api/assignments/submissions/${submissionId}/grade`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        status: SubmissionStatus.NEEDS_REVISION,
        feedback: 'Please include architecture diagram and unit test coverage.',
      });
    expect(revisionRes.status).toBe(200);

    result = await CertificateEligibilityService.evaluateEligibility(studentUser.id, testCourse.id);
    expect(result.requirements.assignments.satisfied).toBe(false);
    expect(result.missingRequirements.some((m) => m.includes('needs revision'))).toBe(true);

    // 4c. Student resubmits assignment
    const resubmitRes = await request(app)
      .post(`/api/assignments/${requiredAssignment.id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        submissionText: 'Updated submission with architecture diagrams and 100% test coverage.',
        fileUrl: 'https://github.com/student/project-v2',
      });
    expect(resubmitRes.status).toBe(200);
    expect(resubmitRes.body.submission.submissionAttempts).toBe(2);

    // 4d. Instructor grades with score 95/100 -> marks PASSED
    const gradeRes = await request(app)
      .post(`/api/assignments/submissions/${submissionId}/grade`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        score: 95.0,
        feedback: 'Outstanding work! Architecture is solid.',
        status: SubmissionStatus.PASSED,
      });
    expect(gradeRes.status).toBe(200);

    result = await CertificateEligibilityService.evaluateEligibility(studentUser.id, testCourse.id);
    expect(result.requirements.assignments.satisfied).toBe(true);
    expect(result.eligible).toBe(false); // Still missing final assessment
  });

  it('5. Should require passing the Final Assessment before issuing certificate', async () => {
    let result = await CertificateEligibilityService.evaluateEligibility(studentUser.id, testCourse.id);
    expect(result.requirements.finalAssessment.satisfied).toBe(false);

    // Student passes final exam with 100%
    await prisma.quizAttempt.create({
      data: {
        quizId: finalAssessmentQuiz.id,
        userId: studentUser.id,
        score: 20,
        maxScore: 20,
        percentage: 100.0,
        passed: true,
      },
    });

    result = await CertificateEligibilityService.evaluateEligibility(studentUser.id, testCourse.id);
    expect(result.requirements.finalAssessment.satisfied).toBe(true);
    expect(result.eligible).toBe(true);
    expect(result.missingRequirements.length).toBe(0);
  });

  it('6. Should issue unique official certificate upon verified course completion', async () => {
    const completionRes = await checkAndProcessCourseCompletion(studentUser.id, testCourse.id);
    expect(completionRes.completed).toBe(true);
    expect(completionRes.certificate).not.toBeNull();
    expect(completionRes.certificate?.certificateNumber).toMatch(/^KHA-\d{4}-\d{6}$/);

    // Verify enrollment status is COMPLETED
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: studentUser.id, courseId: testCourse.id } },
    });
    expect(enrollment?.status).toBe('COMPLETED');
  });

  it('7. Should verify certificate authenticity through public verification API', async () => {
    const cert = await prisma.certificate.findFirst({
      where: { userId: studentUser.id, courseId: testCourse.id },
    });
    expect(cert).not.toBeNull();

    const verifyRes = await request(app).get(`/api/certificates/verify/${cert?.certificateNumber}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.isValid).toBe(true);
    expect(verifyRes.body.certificate.studentName).toBe('Student Certificate Test');
    expect(verifyRes.body.certificate.courseTitle).toBe(testCourse.title);
  });

  it('8. Should return structured eligibility breakdown from eligibility endpoint', async () => {
    const res = await request(app)
      .get(`/api/certificates/courses/${testCourse.id}/eligibility`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.eligible).toBe(true);
    expect(res.body.requirements.lessons.satisfied).toBe(true);
    expect(res.body.requirements.quizzes.satisfied).toBe(true);
    expect(res.body.requirements.assignments.satisfied).toBe(true);
    expect(res.body.requirements.finalAssessment.satisfied).toBe(true);
    expect(res.body.certificate).not.toBeNull();
  });
});
