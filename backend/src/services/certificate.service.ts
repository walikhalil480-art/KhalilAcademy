import QRCode from 'qrcode';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { generateCertificatePdf } from '../utils/pdf';
import { env } from '../config/env';
import { createNotification } from './notification.service';
import { recordAuditLog } from './auditLog.service';
import { EnrollmentStatus } from '@prisma/client';
import { CertificateEligibilityService } from './certificateEligibility.service';

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

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { completed: true, certificate: null, eligibility };

  // Issue Certificate if not already issued (Idempotent lookup & unique constraint safety)
  let cert = await prisma.certificate.findFirst({
    where: { userId, courseId },
  });

  if (!cert) {
    const currentYear = new Date().getFullYear();
    const courseCode =
      (enrollment.course.slug || 'COURSE')
        .replace(/[^a-zA-Z]/g, '')
        .toUpperCase()
        .slice(0, 4) || 'KHA';

    let certNum = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      attempts++;
      const randomSeq = Math.floor(100000 + Math.random() * 900000);
      certNum = `KHA-${currentYear}-${randomSeq}`;
      const dup = await prisma.certificate.findFirst({ where: { certificateNumber: certNum } });
      if (!dup) isUnique = true;
    }

    try {
      cert = await prisma.certificate.create({
        data: {
          certificateNumber: certNum,
          userId,
          courseId,
          studentName: user.name,
          courseTitle: enrollment.course.title,
          instructorName: enrollment.course.instructor?.name || 'Khalil Instructor',
          issueDate: new Date(),
        },
      });

      await createNotification({
        userId,
        title: `Congratulations! Course Completed: ${enrollment.course.title}`,
        message: `You have completed all requirements for "${enrollment.course.title}". Your official Certificate ${cert.certificateNumber} has been issued!`,
        type: 'CERTIFICATE_ISSUED',
        linkUrl: `/certificates/${cert.certificateNumber}`,
      });

      await recordAuditLog({
        userId,
        action: 'CERTIFICATE_ISSUED',
        entity: 'Certificate',
        entityId: cert.id,
        details: { certificateNumber: certNum, courseId },
      });
    } catch (err: any) {
      // If concurrent request created certificate, fetch existing one
      if (err.code === 'P2002') {
        cert = await prisma.certificate.findFirst({
          where: { userId, courseId },
        });
      } else {
        throw err;
      }
    }
  }

  return {
    completed: true,
    certificate: cert
      ? {
          id: cert.id,
          certificateNumber: cert.certificateNumber,
          studentName: cert.studentName,
          courseTitle: cert.courseTitle,
          issueDate: cert.issueDate,
        }
      : null,
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
    },
  });

  if (!cert) {
    throw new AppError('Certificate not found or invalid certificate ID.', 404);
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
    isRevoked: cert.isRevoked,
    revocationReason: cert.revocationReason,
    verificationUrl,
    qrCodeUrl,
  };
};

export const downloadCertificatePdfBuffer = async (certificateNumber: string): Promise<Buffer> => {
  const cert = await getCertificateByNumber(certificateNumber);

  if (cert.isRevoked) {
    throw new AppError('This certificate has been revoked and cannot be generated as a valid PDF.', 400);
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

export const revokeCertificate = async (certificateId: string, adminUserId: string, reason: string) => {
  const cert = await prisma.certificate.findUnique({ where: { id: certificateId } });
  if (!cert) throw new AppError('Certificate not found.', 404);

  const updated = await prisma.certificate.update({
    where: { id: certificateId },
    data: {
      isRevoked: true,
      revocationReason: reason || 'Administrative revocation.',
    },
  });

  await recordAuditLog({
    userId: adminUserId,
    action: 'CERTIFICATE_REVOKED',
    entity: 'Certificate',
    entityId: certificateId,
    details: { certificateNumber: cert.certificateNumber, reason },
  });

  return updated;
};
