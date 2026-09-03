import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/database';
import { generateAccessToken } from '../utils/jwt';
import {
  CertificateStatus,
  CertificateAuditAction,
  RecertificationScope,
  RevocationReasonCategory,
  SubmissionStatus,
} from '@prisma/client';
import * as certService from '../services/certificate.service';

describe('Professional Certificate Revocation & Re-Certification Lifecycle', () => {
  let adminUser: any;
  let instructorUser: any;
  let otherInstructorUser: any;
  let studentUser: any;
  let adminToken: string;
  let instructorToken: string;
  let otherInstructorToken: string;
  let studentToken: string;
  let testCourse: any;
  let testModule: any;
  let testLesson: any;
  let testAssignment: any;
  let initialCertificate: any;

  beforeAll(async () => {
    // Seed users
    adminUser = await prisma.user.upsert({
      where: { email: 'admin_cert_rev@example.com' },
      update: {},
      create: {
        email: 'admin_cert_rev@example.com',
        name: 'Super Administrator',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEF',
        role: 'ADMIN',
        emailVerified: true,
        status: 'ACTIVE',
      },
    });
    adminToken = generateAccessToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });

    instructorUser = await prisma.user.upsert({
      where: { email: 'instructor_cert_rev@example.com' },
      update: {},
      create: {
        email: 'instructor_cert_rev@example.com',
        name: 'Course Lead Instructor',
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

    otherInstructorUser = await prisma.user.upsert({
      where: { email: 'other_instructor_cert_rev@example.com' },
      update: {},
      create: {
        email: 'other_instructor_cert_rev@example.com',
        name: 'Unrelated Instructor',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEF',
        role: 'INSTRUCTOR',
        emailVerified: true,
        status: 'ACTIVE',
      },
    });
    otherInstructorToken = generateAccessToken({
      userId: otherInstructorUser.id,
      email: otherInstructorUser.email,
      role: otherInstructorUser.role,
    });

    studentUser = await prisma.user.upsert({
      where: { email: 'student_cert_rev@example.com' },
      update: {},
      create: {
        email: 'student_cert_rev@example.com',
        name: 'Certified Student',
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

    const category = await prisma.category.upsert({
      where: { slug: 'cert-rev-cat' },
      update: {},
      create: {
        name: 'Certification Test Category',
        slug: 'cert-rev-cat',
        description: 'Testing certificate revocations',
      },
    });

    // Create test course
    testCourse = await prisma.course.create({
      data: {
        title: 'Cybersecurity Master Certification Course',
        slug: `cyber-master-${Date.now()}`,
        description: 'Advanced defensive security and audit trail verification.',
        instructorId: instructorUser.id,
        categoryId: category.id,
        status: 'PUBLISHED',
        price: 99,
        certificateEnabled: true,
        requireAllLessons: true,
        requireAssignments: true,
      },
    });

    testModule = await prisma.module.create({
      data: {
        courseId: testCourse.id,
        title: 'Module 1: Foundations',
        order: 1,
      },
    });

    testLesson = await prisma.lesson.create({
      data: {
        moduleId: testModule.id,
        title: 'Lesson 101: Cryptography',
        order: 1,
        isPublished: true,
        isRequired: true,
      },
    });

    testAssignment = await prisma.assignment.create({
      data: {
        courseId: testCourse.id,
        moduleId: testModule.id,
        title: 'Final Capstone Project',
        instructions: 'Practical security audit project.',
        maxScore: 100,
        passingScore: 80,
        isRequired: true,
      },
    });

    // Enroll student and complete course requirements
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: studentUser.id, courseId: testCourse.id } },
      update: {},
      create: {
        userId: studentUser.id,
        courseId: testCourse.id,
        status: 'COMPLETED',
        progressPercentage: 100,
      },
    });

    await prisma.lessonProgress.create({
      data: {
        userId: studentUser.id,
        lessonId: testLesson.id,
        isCompleted: true,
        completedAt: new Date(Date.now() - 3600000),
      },
    });

    await prisma.assignmentSubmission.create({
      data: {
        assignmentId: testAssignment.id,
        userId: studentUser.id,
        status: SubmissionStatus.PASSED,
        score: 95,
        submittedAt: new Date(Date.now() - 3600000),
      },
    });

    // Issue initial active certificate
    const completion = await certService.checkAndProcessCourseCompletion(studentUser.id, testCourse.id);
    initialCertificate = completion.certificate;
    expect(initialCertificate).toBeDefined();
    expect(initialCertificate.status).toBe(CertificateStatus.ACTIVE);
  });

  afterAll(async () => {
    await prisma.certificateAuditLog.deleteMany({
      where: { certificate: { courseId: testCourse.id } },
    });
    await prisma.recertificationRequirement.deleteMany({
      where: { courseId: testCourse.id },
    });
    await prisma.certificate.deleteMany({
      where: { courseId: testCourse.id },
    });
    await prisma.assignmentSubmission.deleteMany({
      where: { assignmentId: testAssignment.id },
    });
    await prisma.assignment.deleteMany({
      where: { courseId: testCourse.id },
    });
    await prisma.lessonProgress.deleteMany({
      where: { lessonId: testLesson.id },
    });
    await prisma.lesson.deleteMany({
      where: { moduleId: testModule.id },
    });
    await prisma.module.deleteMany({
      where: { courseId: testCourse.id },
    });
    await prisma.enrollment.deleteMany({
      where: { courseId: testCourse.id },
    });
    await prisma.course.deleteMany({
      where: { id: testCourse.id },
    });
  });

  // ---------------------------------------------------------------------------
  // TEST 1: SUSPEND & RESTORE LIFECYCLE
  // ---------------------------------------------------------------------------
  describe('Suspension and Restoration Workflow', () => {
    it('should reject unauthorized instructor from suspending a course certificate they do not instruct', async () => {
      const res = await request(app)
        .post(`/api/certificates/${initialCertificate.id}/suspend`)
        .set('Authorization', `Bearer ${otherInstructorToken}`)
        .send({ reason: 'Suspicious assignment activity' });

      expect(res.status).toBe(403);
    });

    it('should allow the course instructor to suspend an ACTIVE certificate with reason', async () => {
      const res = await request(app)
        .post(`/api/certificates/${initialCertificate.id}/suspend`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ reason: 'Academic integrity review under investigation.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.certificate.status).toBe(CertificateStatus.SUSPENDED);
      expect(res.body.certificate.suspensionReason).toBe('Academic integrity review under investigation.');

      // Verify immutable audit log recorded
      const logs = await prisma.certificateAuditLog.findMany({
        where: { certificateId: initialCertificate.id },
      });
      const suspendLog = logs.find((l) => l.action === CertificateAuditAction.SUSPENDED);
      expect(suspendLog).toBeDefined();
      expect(suspendLog?.performedBy).toBe(instructorUser.id);
      expect(suspendLog?.previousStatus).toBe(CertificateStatus.ACTIVE);
      expect(suspendLog?.newStatus).toBe(CertificateStatus.SUSPENDED);
    });

    it('should prevent PDF generation while certificate is SUSPENDED', async () => {
      const res = await request(app)
        .get(`/api/certificates/${initialCertificate.certificateNumber}/download`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/suspended/i);
    });

    it('should display SUSPENDED status in public verification endpoint', async () => {
      const res = await request(app)
        .get(`/api/certificates/verify/${initialCertificate.certificateNumber}`);

      expect(res.status).toBe(200);
      expect(res.body.isValid).toBe(false);
      expect(res.body.certificate.status).toBe(CertificateStatus.SUSPENDED);
      expect(res.body.certificate.suspendedReason).toMatch(/integrity review/i);
    });

    it('should allow admin or course instructor to restore a SUSPENDED certificate to ACTIVE', async () => {
      const res = await request(app)
        .post(`/api/certificates/${initialCertificate.id}/restore`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ reason: 'Review cleared with distinction. Restored to active.' });

      expect(res.status).toBe(200);
      expect(res.body.certificate.status).toBe(CertificateStatus.ACTIVE);
      expect(res.body.certificate.suspendedAt).toBeNull();

      // Verify public verification is now valid again
      const verifyRes = await request(app)
        .get(`/api/certificates/verify/${initialCertificate.certificateNumber}`);

      expect(verifyRes.body.isValid).toBe(true);
      expect(verifyRes.body.certificate.status).toBe(CertificateStatus.ACTIVE);
    });
  });

  // ---------------------------------------------------------------------------
  // TEST 2: PERMANENT REVOCATION & RE-CERTIFICATION REQUIREMENT CREATION
  // ---------------------------------------------------------------------------
  describe('Permanent Revocation and Re-certification Initiation', () => {
    it('should reject revocation without a reason explanation or category', async () => {
      const res = await request(app)
        .post(`/api/certificates/${initialCertificate.id}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '' });

      expect(res.status).toBe(400);
    });

    it('should revoke certificate permanently and create re-certification requirement', async () => {
      const res = await request(app)
        .post(`/api/certificates/${initialCertificate.id}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Plagiarism detected in capstone submission via automated code audit.',
          category: RevocationReasonCategory.ACADEMIC_MISCONDUCT,
          recertificationScope: RecertificationScope.FINAL_ASSIGNMENT,
          requireFinalAssignment: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.certificate.status).toBe(CertificateStatus.REVOKED);
      expect(res.body.certificate.isRevoked).toBe(true);
      expect(res.body.recertificationRequirement).toBeDefined();
      expect(res.body.recertificationRequirement.scope).toBe(RecertificationScope.FINAL_ASSIGNMENT);

      // Verify database persistence: Certificate is NEVER deleted!
      const dbCert = await prisma.certificate.findUnique({
        where: { id: initialCertificate.id },
      });
      expect(dbCert).toBeDefined();
      expect(dbCert?.status).toBe(CertificateStatus.REVOKED);
      expect(dbCert?.revocationCategory).toBe(RevocationReasonCategory.ACADEMIC_MISCONDUCT);

      // Verify immutable audit logs
      const logs = await prisma.certificateAuditLog.findMany({
        where: { certificateId: initialCertificate.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(logs.some((l) => l.action === CertificateAuditAction.REVOKED)).toBe(true);
      expect(logs.some((l) => l.action === CertificateAuditAction.RE_CERTIFICATION_CREATED)).toBe(true);
    });

    it('should reflect REVOKED permanently on public verification page with safe reason category', async () => {
      const res = await request(app)
        .get(`/api/certificates/verify/${initialCertificate.certificateNumber}`);

      expect(res.status).toBe(200);
      expect(res.body.isValid).toBe(false);
      expect(res.body.certificate.status).toBe(CertificateStatus.REVOKED);
      expect(res.body.certificate.revocationReason).toMatch(/Plagiarism detected/i);
    });

    it('should reject attempts to revoke an already REVOKED certificate again', async () => {
      const res = await request(app)
        .post(`/api/certificates/${initialCertificate.id}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Duplicate revocation attempt.',
          category: RevocationReasonCategory.OTHER,
          recertificationScope: RecertificationScope.FULL_COURSE,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already revoked/i);
    });
  });

  // ---------------------------------------------------------------------------
  // TEST 3: RE-CERTIFICATION COMPLETION & NEW CREDENTIAL ISSUANCE
  // ---------------------------------------------------------------------------
  describe('Re-Certification Completion and Credential Replacement', () => {
    it('should show student has pending re-certification activities when eligibility is evaluated', async () => {
      // Because the final assignment submission was submitted BEFORE the revocation cutoff timestamp,
      // the eligibility check must mark it as not satisfied.
      const eligibility = await certService.verifyCertificateEligibility(studentUser.id, testCourse.id).catch((err) => err);
      expect(eligibility).toBeInstanceOf(Error);
    });

    it('should issue new certificate and update old certificate to REPLACED upon satisfying requirement', async () => {
      // Simulate student resubmitting and passing the final assignment AFTER revocation
      await prisma.assignmentSubmission.create({
        data: {
          assignmentId: testAssignment.id,
          userId: studentUser.id,
          status: SubmissionStatus.PASSED,
          score: 98,
          submittedAt: new Date(Date.now() + 5000), // after revocation
        },
      });

      // Claim / process completion
      const completionResult = await certService.checkAndProcessCourseCompletion(studentUser.id, testCourse.id);
      expect(completionResult.completed).toBe(true);
      expect(completionResult.certificate).toBeDefined();

      const newCert = completionResult.certificate!;
      expect(newCert.id).not.toBe(initialCertificate.id);
      expect(newCert.certificateNumber).not.toBe(initialCertificate.certificateNumber);
      expect(newCert.status).toBe(CertificateStatus.ACTIVE);

      // Verify the old certificate was transitioned to REPLACED with reciprocal link
      const oldCertAfter = await prisma.certificate.findUnique({
        where: { id: initialCertificate.id },
      });
      expect(oldCertAfter?.status).toBe(CertificateStatus.REPLACED);
      expect(oldCertAfter?.replacedByCertificateId).toBe(newCert.id);

      // Verify the new certificate links back to previous certificate
      const newCertDb = await prisma.certificate.findUnique({
        where: { id: newCert.id },
      });
      expect(newCertDb?.previousCertificateId).toBe(initialCertificate.id);

      // Verify the recertification requirement is marked completed
      const recertReq = await prisma.recertificationRequirement.findFirst({
        where: { certificateId: initialCertificate.id },
      });
      expect(recertReq?.isCompleted).toBe(true);
      expect(recertReq?.newCertificateId).toBe(newCert.id);

      // Public verification of old certificate now shows REPLACED and links to new certificate number
      const oldVerifyRes = await request(app)
        .get(`/api/certificates/verify/${initialCertificate.certificateNumber}`);

      expect(oldVerifyRes.body.isValid).toBe(false);
      expect(oldVerifyRes.body.certificate.status).toBe(CertificateStatus.REPLACED);
      expect(oldVerifyRes.body.certificate.replacedByCertificateNumber).toBe(newCert.certificateNumber);

      // Public verification of new certificate is VALID & ACTIVE
      const newVerifyRes = await request(app)
        .get(`/api/certificates/verify/${newCert.certificateNumber}`);

      expect(newVerifyRes.body.isValid).toBe(true);
      expect(newVerifyRes.body.certificate.status).toBe(CertificateStatus.ACTIVE);
    });
  });

  // ---------------------------------------------------------------------------
  // TEST 4: AUDIT LOG RETRIEVAL & SOFT DELETION
  // ---------------------------------------------------------------------------
  describe('Audit Log History and Soft Deletion Safeguards', () => {
    it('should retrieve full immutable audit history for the replaced certificate', async () => {
      const res = await request(app)
        .get(`/api/certificates/${initialCertificate.id}/audit-logs`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.auditLogs).toBeDefined();
      expect(res.body.auditLogs.length).toBeGreaterThanOrEqual(4);

      const actions = res.body.auditLogs.map((l: any) => l.action);
      expect(actions).toContain(CertificateAuditAction.ISSUED);
      expect(actions).toContain(CertificateAuditAction.SUSPENDED);
      expect(actions).toContain(CertificateAuditAction.RESTORED);
      expect(actions).toContain(CertificateAuditAction.REVOKED);
      expect(actions).toContain(CertificateAuditAction.RE_CERTIFICATION_COMPLETED);
      expect(actions).toContain(CertificateAuditAction.REPLACED);
    });

    it('should reject non-admin instructors from soft-deleting certificates', async () => {
      const res = await request(app)
        .delete(`/api/certificates/${initialCertificate.id}`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow admin to soft-delete without physically dropping record', async () => {
      const res = await request(app)
        .delete(`/api/certificates/${initialCertificate.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Admin archiving old superseded record.' });

      expect(res.status).toBe(200);

      const dbCert = await prisma.certificate.findUnique({
        where: { id: initialCertificate.id },
      });
      expect(dbCert).toBeDefined();
      expect(dbCert?.status).toBe(CertificateStatus.DELETED);
      expect(dbCert?.deletedAt).toBeDefined();
      expect(dbCert?.deletedBy).toBe(adminUser.id);
    });
  });
});