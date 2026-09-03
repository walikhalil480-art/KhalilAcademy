import QRCode from 'qrcode';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { generateCertificatePdf } from '../utils/pdf';
import { env } from '../config/env';
import { createNotification } from './notification.service';
import { recordAuditLog } from './auditLog.service';
import {
  EnrollmentStatus,
  CertificateStatus,
  CertificateAuditAction,
  RecertificationScope,
  RevocationReasonCategory,
  NotificationType,
  StudentRiskStatus,
  SubmissionStatus,
} from '@prisma/client';
import { CertificateEligibilityService } from './certificateEligibility.service';
import { appEventBus, AcademyEvent } from '../events/eventBus';

export interface RevokeCertificateDto {
  reason: string;
  category: RevocationReasonCategory;
  recertificationScope: RecertificationScope;
  notes?: string;
  requiredLessonIds?: string[];
  requiredQuizIds?: string[];
  requiredAssignmentIds?: string[];
  requireFinalAssignment?: boolean;
}

export const checkAndProcessCourseCompletion = async (userId: string, courseId: string) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    include: { course: { include: { instructor: true } } },
  });

  if (!enrollment) {
    return { completed: false, certificate: null, eligibility: null };
  }

  // Authoritative server-side evaluation of all course completion requirements
  const eligibility = await CertificateEligibilityService.evaluateEligibility(userId, courseId);

  // Update enrollment progress percentage based on actual lesson progress
  const updatedProgress = eligibility.learningProgressPercentage;

  if (enrollment.progressPercentage !== updatedProgress && !eligibility.eligible) {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { progressPercentage: updatedProgress },
    });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  // 1. Trigger Course Completion Email if all lessons and required coursework are completed
  if (user && eligibility.requirements.lessons.satisfied && eligibility.requirements.assignments.satisfied) {
    const emailSent = await prisma.auditLog.findFirst({
      where: {
        userId,
        action: 'COURSE_COMPLETION_EMAIL_SENT',
        entityId: courseId,
      },
    });

    if (!emailSent) {
      appEventBus.emitEvent(AcademyEvent.COURSE_COMPLETED, {
        userId,
        email: user.email,
        name: user.name,
        courseId,
        courseTitle: enrollment.course.title,
        completedAt: new Date(),
      });

      await recordAuditLog({
        userId,
        action: 'COURSE_COMPLETION_EMAIL_SENT',
        entity: 'Course',
        entityId: courseId,
        details: { courseTitle: enrollment.course.title },
      });
    }
  }

  if (!eligibility.eligible) {
    return { completed: false, certificate: null, eligibility };
  }

  // All requirements satisfied! Update enrollment status to COMPLETED
  if (enrollment.status !== EnrollmentStatus.COMPLETED || enrollment.progressPercentage !== 100) {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        status: EnrollmentStatus.COMPLETED,
        completedAt: enrollment.completedAt || new Date(),
        progressPercentage: 100.0,
      },
    });
  }

  // Check course level setting: certificateEnabled (default: true)
  if (enrollment.course.certificateEnabled === false) {
    return { completed: true, certificate: null, eligibility };
  }

  if (!user) return { completed: true, certificate: null, eligibility };

  // 1. Check if user already has an ACTIVE certificate
  const activeCert = await prisma.certificate.findFirst({
    where: { userId, courseId, status: CertificateStatus.ACTIVE },
    include: { replacedBy: true },
  });

  if (activeCert) {
    return {
      completed: true,
      certificate: {
        id: activeCert.id,
        certificateNumber: activeCert.certificateNumber,
        studentName: activeCert.studentName,
        courseTitle: activeCert.courseTitle,
        issueDate: activeCert.issueDate,
        status: activeCert.status,
      },
      eligibility,
    };
  }

  // 2. Check if user's certificate is SUSPENDED
  const suspendedCert = await prisma.certificate.findFirst({
    where: { userId, courseId, status: CertificateStatus.SUSPENDED },
  });

  if (suspendedCert) {
    throw new AppError(
      'Your certificate for this course is currently suspended under administrative review and cannot be issued.',
      403
    );
  }

  // 3. Check for previous REVOKED certificate requiring re-certification
  const revokedCert = await prisma.certificate.findFirst({
    where: { userId, courseId, status: CertificateStatus.REVOKED },
    orderBy: { createdAt: 'desc' },
  });

  const activeRecertReq = revokedCert
    ? await prisma.recertificationRequirement.findFirst({
        where: { certificateId: revokedCert.id, isCompleted: false },
        orderBy: { createdAt: 'desc' },
      })
    : null;

  // Generate unique certificate number
  const currentYear = new Date().getFullYear();
  let certNum = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 15) {
    attempts++;
    const randomSeq = Math.floor(100000 + Math.random() * 900000);
    certNum = `KHA-${currentYear}-${randomSeq}`;
    const dup = await prisma.certificate.findFirst({ where: { certificateNumber: certNum } });
    if (!dup) isUnique = true;
  }

  let cert: any = null;

  if (revokedCert && activeRecertReq) {
    // RE-CERTIFICATION TRANSACTION WORKFLOW
    cert = await prisma.$transaction(async (tx) => {
      // 1. Create brand new certificate
      const newCert = await tx.certificate.create({
        data: {
          certificateNumber: certNum,
          userId,
          courseId,
          studentName: user.name,
          courseTitle: enrollment.course.title,
          instructorName: enrollment.course.instructor?.name || 'Khalil Instructor',
          issueDate: new Date(),
          status: CertificateStatus.ACTIVE,
          previousCertificateId: revokedCert.id,
        },
      });

      // 2. Mark old certificate as REPLACED and establish reciprocal link
      await tx.certificate.update({
        where: { id: revokedCert.id },
        data: {
          status: CertificateStatus.REPLACED,
          replacedByCertificateId: newCert.id,
        },
      });

      // 3. Mark recertification requirement completed
      await tx.recertificationRequirement.update({
        where: { id: activeRecertReq.id },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          newCertificateId: newCert.id,
        },
      });

      // 4. Record immutable audit logs
      await tx.certificateAuditLog.create({
        data: {
          certificateId: revokedCert.id,
          action: CertificateAuditAction.RE_CERTIFICATION_COMPLETED,
          performedBy: userId,
          performerName: user.name,
          performerRole: user.role,
          reason: 'Student successfully satisfied all required re-certification activities.',
          previousStatus: CertificateStatus.REVOKED,
          newStatus: CertificateStatus.REPLACED,
          metadata: { newCertificateId: newCert.id, newCertificateNumber: certNum },
        },
      });

      await tx.certificateAuditLog.create({
        data: {
          certificateId: revokedCert.id,
          action: CertificateAuditAction.REPLACED,
          performedBy: userId,
          performerName: user.name,
          performerRole: user.role,
          reason: `Replaced by new credential ${certNum}`,
          previousStatus: CertificateStatus.REVOKED,
          newStatus: CertificateStatus.REPLACED,
          metadata: { replacedByCertificateId: newCert.id },
        },
      });

      await tx.certificateAuditLog.create({
        data: {
          certificateId: newCert.id,
          action: CertificateAuditAction.ISSUED,
          performedBy: userId,
          performerName: user.name,
          performerRole: user.role,
          reason: 'Initial issuance following successful re-certification.',
          previousStatus: null,
          newStatus: CertificateStatus.ACTIVE,
          metadata: { previousCertificateId: revokedCert.id, previousCertificateNumber: revokedCert.certificateNumber },
        },
      });

      return newCert;
    });

    appEventBus.emitEvent(AcademyEvent.CERTIFICATE_REPLACED, {
      oldCertificateNumber: revokedCert.certificateNumber,
      newCertificateNumber: cert.certificateNumber,
      userId,
      studentEmail: user.email,
      studentName: user.name,
      courseId,
      courseTitle: enrollment.course.title,
    });
  } else {
    // STANDARD INITIAL ISSUANCE
    cert = await prisma.$transaction(async (tx) => {
      const newCert = await tx.certificate.create({
        data: {
          certificateNumber: certNum,
          userId,
          courseId,
          studentName: user.name,
          courseTitle: enrollment.course.title,
          instructorName: enrollment.course.instructor?.name || 'Khalil Instructor',
          issueDate: new Date(),
          status: CertificateStatus.ACTIVE,
        },
      });

      await tx.certificateAuditLog.create({
        data: {
          certificateId: newCert.id,
          action: CertificateAuditAction.ISSUED,
          performedBy: userId,
          performerName: user.name,
          performerRole: user.role,
          reason: 'Initial course completion credential issued.',
          previousStatus: null,
          newStatus: CertificateStatus.ACTIVE,
        },
      });

      return newCert;
    });
  }

  await createNotification({
    userId,
    title: `Congratulations! Course Completed: ${enrollment.course.title}`,
    message: `You have completed all requirements for "${enrollment.course.title}". Your official Certificate ${cert.certificateNumber} has been issued!`,
    type: NotificationType.CERTIFICATE_ISSUED,
    linkUrl: `/certificates/${cert.certificateNumber}`,
  });

  const verificationUrl = `${env.APP_URL}/verify-certificate/${cert.certificateNumber}`;
  try {
    const pdfBuffer = await generateCertificatePdf({
      certificateNumber: cert.certificateNumber,
      studentName: cert.studentName,
      courseTitle: cert.courseTitle,
      instructorName: cert.instructorName,
      issueDate: new Date(cert.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      verificationUrl,
    });

    appEventBus.emitEvent(AcademyEvent.CERTIFICATE_ISSUED, {
      userId,
      email: user.email,
      name: user.name,
      courseId,
      courseTitle: enrollment.course.title,
      certificateNumber: cert.certificateNumber,
      verificationUrl: `${env.APP_URL}/certificates/${cert.certificateNumber}`,
      pdfBuffer,
    });
  } catch (pdfEmailErr: any) {
    console.error('[EMAIL] Failed to generate/dispatch certificate PDF email:', pdfEmailErr);
  }

  return {
    completed: true,
    certificate: {
      id: cert.id,
      certificateNumber: cert.certificateNumber,
      studentName: cert.studentName,
      courseTitle: cert.courseTitle,
      issueDate: cert.issueDate,
      status: cert.status,
    },
    eligibility,
  };
};

export const verifyCertificateEligibility = async (userId: string, courseIdOrSlug: string) => {
  const eligibility = await CertificateEligibilityService.evaluateEligibility(userId, courseIdOrSlug);

  if (!eligibility.eligible) {
    const mainBlocker =
      eligibility.missingRequirements[0] ||
      'You are not yet eligible for this certificate. Complete all required lessons and assessments first.';
    throw new AppError(mainBlocker, 403);
  }

  return eligibility;
};

export const syncUserCertificates = async (userId: string) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      select: { courseId: true, status: true, progressPercentage: true },
    });

    for (const e of enrollments) {
      const eligibility = await CertificateEligibilityService.evaluateEligibility(userId, e.courseId);
      if (eligibility.eligible) {
        await checkAndProcessCourseCompletion(userId, e.courseId);
      }
    }
  } catch (err) {
    console.warn('syncUserCertificates warning:', err);
  }
};

export const getCertificateByNumber = async (certificateNumber: string) => {
  const cert = await prisma.certificate.findFirst({
    where: {
      OR: [
        { certificateNumber },
        { id: certificateNumber },
      ],
      status: { not: CertificateStatus.DELETED },
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          instructorId: true,
          instructor: { select: { id: true, name: true, email: true } },
        },
      },
      user: {
        select: { id: true, name: true, email: true, avatar: true },
      },
      replacedBy: {
        select: { id: true, certificateNumber: true, status: true, issueDate: true },
      },
      recertificationRequirements: {
        where: { isCompleted: false },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!cert) {
    throw new AppError('Certificate record not found in the official registry.', 404);
  }

  const verificationUrl = `https://khalilacademy.com/verify/${cert.certificateNumber}`;
  let qrCodeUrl = '';
  try {
    qrCodeUrl = await QRCode.toDataURL(verificationUrl, {
      margin: 1,
      width: 200,
      color: {
        dark: '#0A1322',
        light: '#FFFFFF',
      },
    });
  } catch (qrErr) {}

  return {
    id: cert.id,
    certificateNumber: cert.certificateNumber,
    userId: cert.userId,
    courseId: cert.courseId,
    studentName: cert.studentName,
    courseTitle: cert.courseTitle,
    instructorName: cert.instructorName,
    issueDate: cert.issueDate,
    status: cert.status,
    isRevoked: cert.status === CertificateStatus.REVOKED || cert.status === CertificateStatus.REPLACED || cert.isRevoked,
    revocationReason: cert.revocationReason,
    revocationCategory: cert.revocationCategory,
    revokedAt: cert.revokedAt,
    revokedBy: cert.revokedBy,
    suspendedAt: cert.suspendedAt,
    suspendedBy: cert.suspendedBy,
    suspensionReason: cert.suspensionReason,
    replacedByCertificateId: cert.replacedByCertificateId,
    replacedByCertificateNumber: cert.replacedBy?.certificateNumber || null,
    previousCertificateId: cert.previousCertificateId,
    course: cert.course,
    user: cert.user,
    activeRecertificationRequirement: cert.recertificationRequirements[0] || null,
    verificationUrl,
    qrCodeUrl,
  };
};

export const downloadCertificatePdfBuffer = async (certificateNumber: string): Promise<Buffer> => {
  const cert = await getCertificateByNumber(certificateNumber);

  if (cert.status === CertificateStatus.REVOKED) {
    throw new AppError('This certificate has been revoked and cannot be generated as a valid PDF credential.', 400);
  }

  if (cert.status === CertificateStatus.SUSPENDED) {
    throw new AppError('This certificate is suspended under administrative review and cannot be generated as a PDF.', 400);
  }

  if (cert.status === CertificateStatus.REPLACED) {
    throw new AppError(
      `This certificate was replaced by ${cert.replacedByCertificateNumber || 'a newer certificate'}. Please download the active replacement credential.`,
      400
    );
  }

  return generateCertificatePdf({
    certificateNumber: cert.certificateNumber,
    studentName: cert.studentName,
    courseTitle: cert.courseTitle,
    instructorName: cert.instructorName,
    issueDate: new Date(cert.issueDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    verificationUrl: cert.verificationUrl,
  });
};

/**
 * Suspend a certificate temporarily while under administrative review.
 */
export const suspendCertificate = async (
  certificateId: string,
  actorUserId: string,
  actorRole: string,
  reason: string
) => {
  if (!reason || !reason.trim()) {
    throw new AppError('A valid suspension reason is required.', 400);
  }

  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: { course: true, user: true },
  });

  if (!cert) throw new AppError('Certificate not found.', 404);

  if (actorRole === 'INSTRUCTOR' && cert.course.instructorId !== actorUserId) {
    throw new AppError('You are only authorized to suspend certificates for courses you instruct.', 403);
  }

  if (cert.status !== CertificateStatus.ACTIVE) {
    throw new AppError(`Cannot suspend a certificate that is currently ${cert.status}. Only ACTIVE certificates can be suspended.`, 400);
  }

  const actor = await prisma.user.findUnique({ where: { id: actorUserId } });

  const updatedCert = await prisma.$transaction(async (tx) => {
    const updated = await tx.certificate.update({
      where: { id: certificateId },
      data: {
        status: CertificateStatus.SUSPENDED,
        suspendedAt: new Date(),
        suspendedBy: actorUserId,
        suspensionReason: reason.trim(),
      },
    });

    await tx.certificateAuditLog.create({
      data: {
        certificateId,
        action: CertificateAuditAction.SUSPENDED,
        performedBy: actorUserId,
        performerName: actor?.name,
        performerRole: actorRole,
        reason: reason.trim(),
        previousStatus: CertificateStatus.ACTIVE,
        newStatus: CertificateStatus.SUSPENDED,
      },
    });

    return updated;
  });

  await createNotification({
    userId: cert.userId,
    title: `⚠️ Certificate Suspended: ${cert.courseTitle}`,
    message: `Your certificate ${cert.certificateNumber} has been temporarily suspended while under review. Reason: ${reason}`,
    type: NotificationType.CERTIFICATE_SUSPENDED,
    linkUrl: `/certificates/${cert.certificateNumber}`,
  });

  appEventBus.emitEvent(AcademyEvent.CERTIFICATE_SUSPENDED, {
    certificateId: cert.id,
    certificateNumber: cert.certificateNumber,
    userId: cert.userId,
    studentEmail: cert.user.email,
    studentName: cert.user.name,
    courseId: cert.courseId,
    courseTitle: cert.courseTitle,
    reason,
    suspendedAt: new Date(),
  });

  return updatedCert;
};

/**
 * Restore a suspended certificate back to ACTIVE.
 */
export const restoreCertificate = async (
  certificateId: string,
  actorUserId: string,
  actorRole: string,
  reason: string
) => {
  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: { course: true, user: true },
  });

  if (!cert) throw new AppError('Certificate not found.', 404);

  if (actorRole === 'INSTRUCTOR' && cert.course.instructorId !== actorUserId) {
    throw new AppError('You are only authorized to restore certificates for courses you instruct.', 403);
  }

  if (cert.status !== CertificateStatus.SUSPENDED) {
    throw new AppError(`Only SUSPENDED certificates can be restored. Current status is ${cert.status}.`, 400);
  }

  const actor = await prisma.user.findUnique({ where: { id: actorUserId } });
  const restoreReason = reason?.trim() || 'Administrative review completed. Credential restored.';

  const updatedCert = await prisma.$transaction(async (tx) => {
    const updated = await tx.certificate.update({
      where: { id: certificateId },
      data: {
        status: CertificateStatus.ACTIVE,
        suspendedAt: null,
        suspendedBy: null,
        suspensionReason: null,
      },
    });

    await tx.certificateAuditLog.create({
      data: {
        certificateId,
        action: CertificateAuditAction.RESTORED,
        performedBy: actorUserId,
        performerName: actor?.name,
        performerRole: actorRole,
        reason: restoreReason,
        previousStatus: CertificateStatus.SUSPENDED,
        newStatus: CertificateStatus.ACTIVE,
      },
    });

    return updated;
  });

  await createNotification({
    userId: cert.userId,
    title: `✅ Certificate Restored: ${cert.courseTitle}`,
    message: `Your certificate ${cert.certificateNumber} has been verified and restored to ACTIVE status.`,
    type: NotificationType.CERTIFICATE_RESTORED,
    linkUrl: `/certificates/${cert.certificateNumber}`,
  });

  appEventBus.emitEvent(AcademyEvent.CERTIFICATE_RESTORED, {
    certificateId: cert.id,
    certificateNumber: cert.certificateNumber,
    userId: cert.userId,
    studentEmail: cert.user.email,
    studentName: cert.user.name,
    courseId: cert.courseId,
    courseTitle: cert.courseTitle,
    restoredAt: new Date(),
  });

  return updatedCert;
};

/**
 * Revoke a certificate permanently and initialize a re-certification requirement.
 */
export const revokeCertificateWithRequirements = async (
  certificateId: string,
  actorUserId: string,
  actorRole: string,
  payload: RevokeCertificateDto
) => {
  if (!payload.reason || !payload.reason.trim()) {
    throw new AppError('A detailed revocation reason explanation is required.', 400);
  }

  if (!payload.category) {
    throw new AppError('A revocation category must be selected.', 400);
  }

  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: { course: true, user: true },
  });

  if (!cert) throw new AppError('Certificate not found.', 404);

  if (actorRole === 'INSTRUCTOR' && cert.course.instructorId !== actorUserId) {
    throw new AppError('You are only authorized to revoke certificates for courses you instruct.', 403);
  }

  if (cert.status === CertificateStatus.REVOKED) {
    throw new AppError('This certificate is already revoked. A revoked certificate can never become ACTIVE again.', 400);
  }

  if (cert.status === CertificateStatus.REPLACED) {
    throw new AppError('This certificate has already been replaced by an updated credential.', 400);
  }

  const actor = await prisma.user.findUnique({ where: { id: actorUserId } });

  const result = await prisma.$transaction(async (tx) => {
    // 1. Mark certificate as REVOKED
    const updated = await tx.certificate.update({
      where: { id: certificateId },
      data: {
        status: CertificateStatus.REVOKED,
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy: actorUserId,
        revocationReason: payload.reason.trim(),
        revocationCategory: payload.category,
      },
    });

    // 2. Create Re-Certification Requirement
    const requireFinal =
      payload.requireFinalAssignment ??
      (payload.recertificationScope === RecertificationScope.FINAL_ASSIGNMENT ||
        payload.recertificationScope === RecertificationScope.FULL_COURSE);

    const recertReq = await tx.recertificationRequirement.create({
      data: {
        certificateId,
        courseId: cert.courseId,
        userId: cert.userId,
        scope: payload.recertificationScope,
        notes: payload.notes || payload.reason,
        requiredLessonIds: payload.requiredLessonIds || [],
        requiredQuizIds: payload.requiredQuizIds || [],
        requiredAssignmentIds: payload.requiredAssignmentIds || [],
        requireFinalAssignment: requireFinal,
        isCompleted: false,
      },
    });

    // 3. Record Audit Logs
    await tx.certificateAuditLog.create({
      data: {
        certificateId,
        action: CertificateAuditAction.REVOKED,
        performedBy: actorUserId,
        performerName: actor?.name,
        performerRole: actorRole,
        reason: payload.reason.trim(),
        previousStatus: cert.status,
        newStatus: CertificateStatus.REVOKED,
        metadata: {
          category: payload.category,
          recertificationScope: payload.recertificationScope,
        },
      },
    });

    await tx.certificateAuditLog.create({
      data: {
        certificateId,
        action: CertificateAuditAction.RE_CERTIFICATION_CREATED,
        performedBy: actorUserId,
        performerName: actor?.name,
        performerRole: actorRole,
        reason: `Re-certification requirement initialized (${payload.recertificationScope})`,
        previousStatus: CertificateStatus.REVOKED,
        newStatus: CertificateStatus.REVOKED,
        metadata: {
          recertificationRequirementId: recertReq.id,
          scope: payload.recertificationScope,
        },
      },
    });

    // 4. Update enrollment status so the student sees re-certification required
    await tx.enrollment.updateMany({
      where: { userId: cert.userId, courseId: cert.courseId },
      data: {
        status: EnrollmentStatus.ACTIVE,
      },
    });

    // 5. Clear anti-cheating lockouts & reset student attempts so they can complete re-certification
    // A. Resolve active student risk records for this user and course
    await tx.studentRiskRecord.updateMany({
      where: {
        userId: cert.userId,
        courseId: cert.courseId,
        status: StudentRiskStatus.ACTIVE,
      },
      data: {
        status: StudentRiskStatus.RESOLVED,
        resolvedAt: new Date(),
        resolutionReason: 'Certificate revoked - student granted re-certification opportunity to complete coursework legally',
      },
    });

    // B. Clear assignment submission anti-cheating lockout and reset attempts
    const courseAssignments = await tx.assignment.findMany({
      where: {
        OR: [
          { courseId: cert.courseId },
          { module: { courseId: cert.courseId } },
        ],
      },
      select: { id: true },
    });
    const assignmentIds = courseAssignments.map((a) => a.id);
    if (assignmentIds.length > 0) {
      await tx.assignmentSubmission.deleteMany({
        where: {
          userId: cert.userId,
          assignmentId: { in: assignmentIds },
        },
      });
    }

    // C. Reset previous quiz attempts so student has fresh attempts for re-certification
    const courseQuizzes = await tx.quiz.findMany({
      where: { courseId: cert.courseId },
      select: { id: true },
    });
    const quizIds = courseQuizzes.map((q) => q.id);
    if (quizIds.length > 0) {
      await tx.quizAttempt.deleteMany({
        where: {
          userId: cert.userId,
          quizId: { in: quizIds },
        },
      });
    }

    return { certificate: updated, recertificationRequirement: recertReq };
  });

  await createNotification({
    userId: cert.userId,
    title: `🚫 Certificate Revoked: ${cert.courseTitle}`,
    message: `Your certificate ${cert.certificateNumber} has been revoked. Reason: ${payload.reason}. You must complete re-certification activities to earn an updated credential.`,
    type: NotificationType.CERTIFICATE_REVOKED,
    linkUrl: `/dashboard`,
  });

  appEventBus.emitEvent(AcademyEvent.CERTIFICATE_REVOKED, {
    certificateId: cert.id,
    certificateNumber: cert.certificateNumber,
    userId: cert.userId,
    studentEmail: cert.user.email,
    studentName: cert.user.name,
    courseId: cert.courseId,
    courseTitle: cert.courseTitle,
    reason: payload.reason,
    revocationCategory: payload.category,
    recertificationScope: payload.recertificationScope,
    revokedAt: new Date(),
  });

  return result;
};

/**
 * Soft delete a certificate (Administrators only; never physically deletes history).
 */
export const softDeleteCertificate = async (
  certificateId: string,
  actorUserId: string,
  actorRole: string,
  reason?: string
) => {
  if (actorRole !== 'ADMIN' && actorRole !== 'SUPER_ADMIN') {
    throw new AppError('Only system administrators are authorized to soft-delete certificate records.', 403);
  }

  const cert = await prisma.certificate.findUnique({ where: { id: certificateId } });
  if (!cert) throw new AppError('Certificate not found.', 404);

  const actor = await prisma.user.findUnique({ where: { id: actorUserId } });

  const updated = await prisma.$transaction(async (tx) => {
    const deleted = await tx.certificate.update({
      where: { id: certificateId },
      data: {
        status: CertificateStatus.DELETED,
        deletedAt: new Date(),
        deletedBy: actorUserId,
      },
    });

    await tx.certificateAuditLog.create({
      data: {
        certificateId,
        action: CertificateAuditAction.DELETED,
        performedBy: actorUserId,
        performerName: actor?.name,
        performerRole: actorRole,
        reason: reason?.trim() || 'Administrative soft-deletion.',
        previousStatus: cert.status,
        newStatus: CertificateStatus.DELETED,
      },
    });

    // Reset enrollment to ACTIVE so student can retake the course cleanly
    await tx.enrollment.updateMany({
      where: { userId: cert.userId, courseId: cert.courseId },
      data: { status: EnrollmentStatus.ACTIVE },
    });

    // Resolve any active anti-cheating risk records
    await tx.studentRiskRecord.updateMany({
      where: {
        userId: cert.userId,
        courseId: cert.courseId,
        status: StudentRiskStatus.ACTIVE,
      },
      data: {
        status: StudentRiskStatus.RESOLVED,
        resolvedAt: new Date(),
        resolutionReason: 'Certificate deleted/archived - lockouts cleared for retake',
      },
    });

    // Clear assignment submission attempts
    const courseAssignments = await tx.assignment.findMany({
      where: {
        OR: [
          { courseId: cert.courseId },
          { module: { courseId: cert.courseId } },
        ],
      },
      select: { id: true },
    });
    const assignmentIds = courseAssignments.map((a) => a.id);
    if (assignmentIds.length > 0) {
      await tx.assignmentSubmission.deleteMany({
        where: {
          userId: cert.userId,
          assignmentId: { in: assignmentIds },
        },
      });
    }

    // Reset quiz attempts
    const courseQuizzes = await tx.quiz.findMany({
      where: { courseId: cert.courseId },
      select: { id: true },
    });
    const quizIds = courseQuizzes.map((q) => q.id);
    if (quizIds.length > 0) {
      await tx.quizAttempt.deleteMany({
        where: {
          userId: cert.userId,
          quizId: { in: quizIds },
        },
      });
    }

    return deleted;
  });

  return updated;
};

/**
 * Retrieve immutable audit history for a certificate.
 */
export const getCertificateAuditLogs = async (
  certificateId: string,
  actorUserId: string,
  actorRole: string
) => {
  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: { course: true },
  });

  if (!cert) throw new AppError('Certificate not found.', 404);

  if (
    actorRole !== 'ADMIN' &&
    actorRole !== 'SUPER_ADMIN' &&
    (actorRole === 'INSTRUCTOR' ? cert.course.instructorId !== actorUserId : cert.userId !== actorUserId)
  ) {
    throw new AppError('You are not authorized to view audit logs for this certificate.', 403);
  }

  const logs = await prisma.certificateAuditLog.findMany({
    where: { certificateId },
    orderBy: { createdAt: 'desc' },
  });

  return logs;
};

/**
 * Paginated admin and instructor listing of certificates with granular filters.
 */
export const listCertificatesAdmin = async (
  filters: {
    search?: string;
    status?: string;
    courseId?: string;
    studentId?: string;
    page?: number;
    limit?: number;
  },
  actorUserId: string,
  actorRole: string
) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
  const skip = (page - 1) * limit;

  const where: any = {
    status: { not: CertificateStatus.DELETED },
  };

  // RBAC scope: Instructors can only view certificates for their courses
  if (actorRole === 'INSTRUCTOR') {
    where.course = { instructorId: actorUserId };
  }

  if (filters.status && filters.status !== 'ALL') {
    where.status = filters.status as CertificateStatus;
  }

  if (filters.courseId) {
    where.courseId = filters.courseId;
  }

  if (filters.studentId) {
    where.userId = filters.studentId;
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { certificateNumber: { contains: q, mode: 'insensitive' } },
      { studentName: { contains: q, mode: 'insensitive' } },
      { courseTitle: { contains: q, mode: 'insensitive' } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [total, certificates] = await Promise.all([
    prisma.certificate.count({ where }),
    prisma.certificate.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        course: { select: { id: true, title: true, slug: true, instructorId: true } },
        replacedBy: { select: { id: true, certificateNumber: true, status: true } },
        recertificationRequirements: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    }),
  ]);

  return {
    certificates: certificates.map((c) => ({
      id: c.id,
      certificateNumber: c.certificateNumber,
      userId: c.userId,
      studentName: c.studentName,
      studentEmail: c.user?.email,
      courseId: c.courseId,
      courseTitle: c.courseTitle,
      instructorName: c.instructorName,
      issueDate: c.issueDate,
      status: c.status,
      isRevoked: c.status === CertificateStatus.REVOKED || c.status === CertificateStatus.REPLACED || c.isRevoked,
      revokedAt: c.revokedAt,
      revokedBy: c.revokedBy,
      revocationReason: c.revocationReason,
      revocationCategory: c.revocationCategory,
      suspendedAt: c.suspendedAt,
      suspendedBy: c.suspendedBy,
      suspensionReason: c.suspensionReason,
      replacedByCertificateId: c.replacedByCertificateId,
      replacedByCertificateNumber: c.replacedBy?.certificateNumber || null,
      previousCertificateId: c.previousCertificateId,
      recertificationRequirement: c.recertificationRequirements[0] || null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
