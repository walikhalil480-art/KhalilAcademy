import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/database';
import { generateAccessToken } from '../utils/jwt';
import { CertificateStatus, RecertificationScope, RevocationReasonCategory, StudentRiskStatus } from '@prisma/client';

describe('Anti-Cheating Assessment Unlock on Certificate Revocation & Re-Certification', () => {
  let adminToken: string;
  let instructorToken: string;
  let studentToken: string;
  let studentUserId: string;
  let instructorUserId: string;
  let courseId: string;
  let quizId: string;
  let assignmentId: string;
  let certId: string;

  beforeAll(async () => {
    // 1. Create Instructor
    const instructor = await prisma.user.create({
      data: {
        name: 'Prof. Proctor Lead',
        email: `proctor_lead_${Date.now()}@example.com`,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEF',
        role: 'INSTRUCTOR',
        emailVerified: true,
        status: 'ACTIVE',
      },
    });
    instructorUserId = instructor.id;
    instructorToken = generateAccessToken({
      userId: instructor.id,
      email: instructor.email,
      role: instructor.role,
    });

    // 2. Create Admin
    const admin = await prisma.user.create({
      data: {
        name: 'Academy Admin',
        email: `academy_admin_${Date.now()}@example.com`,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEF',
        role: 'ADMIN',
        emailVerified: true,
        status: 'ACTIVE',
      },
    });
    adminToken = generateAccessToken({
      userId: admin.id,
      email: admin.email,
      role: admin.role,
    });

    // 3. Create Student
    const student = await prisma.user.create({
      data: {
        name: 'Retake Student',
        email: `retake_student_${Date.now()}@example.com`,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEF',
        role: 'STUDENT',
        emailVerified: true,
        status: 'ACTIVE',
      },
    });
    studentUserId = student.id;
    studentToken = generateAccessToken({
      userId: student.id,
      email: student.email,
      role: student.role,
    });

    // 4. Create Category, Course, Module, Assignment, Quiz
    const category = await prisma.category.upsert({
      where: { slug: 'retake-unlock-cat' },
      update: {},
      create: {
        name: 'Retake Category',
        slug: 'retake-unlock-cat',
        description: 'Test category',
      },
    });

    const course = await prisma.course.create({
      data: {
        title: 'Integrity Retake Verification Course',
        slug: `integrity-retake-${Date.now()}`,
        description: 'Testing assessment unlock on revocation',
        price: 0,
        status: 'PUBLISHED',
        instructorId: instructor.id,
        categoryId: category.id,
      },
    });
    courseId = course.id;

    const moduleRecord = await prisma.module.create({
      data: {
        courseId: course.id,
        title: 'Module 1: Proctored Core',
        order: 1,
      },
    });

    const assignment = await prisma.assignment.create({
      data: {
        moduleId: moduleRecord.id,
        courseId: course.id,
        title: 'Final Capstone Project',
        instructions: 'Complete with no tab switching.',
        passingScore: 80,
      },
    });
    assignmentId = assignment.id;

    const quiz = await prisma.quiz.create({
      data: {
        courseId: course.id,
        moduleId: moduleRecord.id,
        title: 'Comprehensive Knowledge Quiz',
        passingScore: 80,
        maxAttempts: 3,
        timeLimitMinutes: 30,
        questions: {
          create: [
            {
              questionText: 'Is academic integrity strictly enforced?',
              order: 1,
              points: 100,
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
    quizId = quiz.id;

    // Enroll student
    await prisma.enrollment.create({
      data: {
        userId: student.id,
        courseId: course.id,
        status: 'ACTIVE',
      },
    });

    // Create Initial Certificate
    const cert = await prisma.certificate.create({
      data: {
        certificateNumber: `KHA-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        userId: student.id,
        courseId: course.id,
        studentName: student.name,
        courseTitle: course.title,
        instructorName: instructor.name,
        status: CertificateStatus.ACTIVE,
      },
    });
    certId = cert.id;
  });

  afterAll(async () => {
    await prisma.recertificationRequirement.deleteMany({ where: { userId: studentUserId } });
    await prisma.certificateAuditLog.deleteMany({ where: { certificate: { userId: studentUserId } } });
    await prisma.certificate.deleteMany({ where: { userId: studentUserId } });
    await prisma.quizAttempt.deleteMany({ where: { userId: studentUserId } });
    await prisma.studentRiskRecord.deleteMany({ where: { userId: studentUserId } });
    await prisma.assignmentSubmission.deleteMany({ where: { userId: studentUserId } });
    await prisma.enrollment.deleteMany({ where: { userId: studentUserId } });
    await prisma.quizOption.deleteMany({ where: { question: { quizId } } });
    await prisma.quizQuestion.deleteMany({ where: { quizId } });
    await prisma.quiz.deleteMany({ where: { id: quizId } });
    await prisma.assignment.deleteMany({ where: { id: assignmentId } });
    await prisma.module.deleteMany({ where: { courseId } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { id: { in: [studentUserId, instructorUserId] } } });
  });

  it('1. Should disqualify student on both quiz and assignment, establishing active cheating lock', async () => {
    // Disqualify on assignment
    const assignDisq = await request(app)
      .post(`/api/assignments/${assignmentId}/disqualify`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(assignDisq.status).toBe(200);
    expect(assignDisq.body.isCheatingLocked).toBe(true);

    // Disqualify on quiz
    const quizDisq = await request(app)
      .post(`/api/quizzes/${quizId}/disqualify`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(quizDisq.status).toBe(200);
    expect(quizDisq.body.isCheatingLocked).toBe(true);

    // Verify GET assignment reports locked
    const getAssign = await request(app)
      .get(`/api/assignments/${assignmentId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(getAssign.status).toBe(200);
    expect(getAssign.body.isCheatingLocked).toBe(true);

    // Verify GET quiz reports locked
    const getQuiz = await request(app)
      .get(`/api/quizzes/${quizId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(getQuiz.status).toBe(200);
    expect(getQuiz.body.quiz.isCheatingLocked).toBe(true);
  });

  it('2. Should automatically unlock assignment & quiz and reset attempts when certificate is revoked for re-certification', async () => {
    // Revoke certificate with requirement
    const res = await request(app)
      .post(`/api/certificates/${certId}/revoke`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        reason: 'Tab switching violations identified during proctoring audit.',
        category: RevocationReasonCategory.ACADEMIC_MISCONDUCT,
        recertificationScope: RecertificationScope.FULL_COURSE,
      });

    expect(res.status).toBe(200);
    expect(res.body.certificate.status).toBe(CertificateStatus.REVOKED);
    expect(res.body.recertificationRequirement).toBeDefined();

    // Student Risk Records should now be RESOLVED
    const activeRisks = await prisma.studentRiskRecord.findMany({
      where: {
        userId: studentUserId,
        courseId,
        status: StudentRiskStatus.ACTIVE,
      },
    });
    expect(activeRisks.length).toBe(0);

    // GET Assignment must now be UNLOCKED
    const getAssign = await request(app)
      .get(`/api/assignments/${assignmentId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(getAssign.status).toBe(200);
    expect(getAssign.body.isCheatingLocked).toBe(false);
    expect(getAssign.body.hasActiveRecertification).toBe(true);

    // GET Quiz must now be UNLOCKED
    const getQuiz = await request(app)
      .get(`/api/quizzes/${quizId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(getQuiz.status).toBe(200);
    expect(getQuiz.body.quiz.isCheatingLocked).toBe(false);
    expect(getQuiz.body.quiz.hasActiveRecertification).toBe(true);
    expect(getQuiz.body.quiz.isUnlocked).toBe(true);
  });

  it('3. Should permit the student to submit retake coursework successfully', async () => {
    // Student submits assignment
    const assignSubmit = await request(app)
      .post(`/api/assignments/${assignmentId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        submissionText: 'I have strictly adhered to the honor code with zero tab switching.',
      });
    expect(assignSubmit.status).toBe(200);
    expect(assignSubmit.body.submission.status).toBe('SUBMITTED');

    // Student submits quiz attempt
    const questions = await prisma.quizQuestion.findMany({
      where: { quizId },
      include: { options: true },
    });
    const correctOption = questions[0].options.find((o) => o.isCorrect)!;

    const quizSubmit = await request(app)
      .post(`/api/quizzes/${quizId}/attempt`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        quizId,
        answers: [{ questionId: questions[0].id, selectedOptionId: correctOption.id }],
      });
    expect(quizSubmit.status).toBe(200);
    expect(quizSubmit.body.passed).toBe(true);
  });
});
