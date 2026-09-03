import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import * as certService from '../services/certificate.service';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { env } from '../config/env';

export const getCertificate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const cert = await certService.getCertificateByNumber(req.params.id);
    
    // Authorization check: Only certificate owner or Admin can view full private certificate
    if (req.user && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && cert.userId !== req.user.id) {
      throw new AppError('You are not authorized to view this certificate.', 403);
    }

    res.json({ success: true, certificate: cert });
  } catch (error) {
    next(error);
  }
};

export const verifyCertificate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cert = await certService.getCertificateByNumber(req.params.id);
    
    // Public verification payload: Only safe public fields, no internal notes or sensitive data
    const isValid = cert.status === 'ACTIVE' && !cert.isRevoked;

    res.json({
      success: true,
      isValid,
      certificate: {
        certificateNumber: cert.certificateNumber,
        studentName: cert.studentName,
        courseTitle: cert.courseTitle,
        instructorName: cert.instructorName,
        issueDate: cert.issueDate,
        status: cert.status,
        revokedAt: cert.revokedAt,
        revocationReason:
          cert.status === 'REVOKED'
            ? cert.revocationReason || 'Certification requirements were not legitimately satisfied.'
            : null,
        revocationCategory: cert.revocationCategory || null,
        suspendedAt: cert.suspendedAt,
        suspendedReason:
          cert.status === 'SUSPENDED'
            ? cert.suspensionReason || 'Credential is under administrative review.'
            : null,
        replacedByCertificateNumber: cert.replacedByCertificateNumber || null,
        verificationUrl: cert.verificationUrl,
        qrCodeUrl: cert.qrCodeUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const downloadCertificatePdf = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const cert = await certService.getCertificateByNumber(req.params.id);

    // Authorization check if user is authenticated
    if (req.user && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && cert.userId !== req.user.id) {
      throw new AppError('You are not authorized to download this certificate.', 403);
    }

    const pdfBuffer = await certService.downloadCertificatePdfBuffer(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Certificate_${cert.certificateNumber}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

export const getUserCertificates = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await certService.syncUserCertificates(req.user!.id);

    const certs = await prisma.certificate.findMany({
      where: {
        userId: req.user!.id,
        status: { not: 'DELETED' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, title: true, slug: true, thumbnail: true } },
        replacedBy: { select: { id: true, certificateNumber: true, status: true } },
        recertificationRequirements: {
          where: { isCompleted: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const formattedCerts = certs.map((c) => ({
      id: c.id,
      certificateNumber: c.certificateNumber,
      userId: c.userId,
      courseId: c.courseId,
      studentName: c.studentName,
      courseTitle: c.courseTitle,
      instructorName: c.instructorName,
      issueDate: c.issueDate,
      status: c.status,
      isRevoked: c.status === 'REVOKED' || c.status === 'REPLACED' || c.isRevoked,
      revokedAt: c.revokedAt,
      revocationReason: c.revocationReason,
      revocationCategory: c.revocationCategory,
      suspendedAt: c.suspendedAt,
      suspensionReason: c.suspensionReason,
      replacedByCertificateId: c.replacedByCertificateId,
      replacedByCertificateNumber: c.replacedBy?.certificateNumber || null,
      previousCertificateId: c.previousCertificateId,
      course: c.course,
      activeRecertificationRequirement: c.recertificationRequirements[0] || null,
      verificationUrl: `${env.APP_URL}/certificates/verify/${c.certificateNumber}`,
    }));

    res.json({ success: true, certificates: formattedCerts });
  } catch (error) {
    next(error);
  }
};

export const checkEligibility = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.courseId;
    const result = await certService.verifyCertificateEligibility(req.user!.id, courseId);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const claimCertificate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.courseId;
    // Strictly verify eligibility server-side before issuing
    await certService.verifyCertificateEligibility(req.user!.id, courseId);
    const completionResult = await certService.checkAndProcessCourseCompletion(req.user!.id, courseId);
    if (!completionResult?.certificate) {
      throw new AppError('Unable to generate certificate at this time.', 400);
    }
    res.json({ success: true, message: 'Certificate issued successfully.', certificate: completionResult.certificate });
  } catch (error) {
    next(error);
  }
};

export const listCertificates = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await certService.listCertificatesAdmin(req.query, req.user!.id, req.user!.role);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const suspendCert = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await certService.suspendCertificate(
      req.params.id,
      req.user!.id,
      req.user!.role,
      req.body.reason
    );
    res.json({ success: true, message: 'Certificate suspended successfully.', certificate: result });
  } catch (error) {
    next(error);
  }
};

export const restoreCert = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await certService.restoreCertificate(
      req.params.id,
      req.user!.id,
      req.user!.role,
      req.body.reason
    );
    res.json({ success: true, message: 'Certificate restored successfully to ACTIVE.', certificate: result });
  } catch (error) {
    next(error);
  }
};

export const revokeCert = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await certService.revokeCertificateWithRequirements(
      req.params.id,
      req.user!.id,
      req.user!.role,
      req.body
    );
    res.json({
      success: true,
      message: 'Certificate revoked and re-certification requirements initialized.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const softDeleteCert = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await certService.softDeleteCertificate(
      req.params.id,
      req.user!.id,
      req.user!.role,
      req.body.reason
    );
    res.json({ success: true, message: 'Certificate archived and soft-deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const getAuditHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const logs = await certService.getCertificateAuditLogs(req.params.id, req.user!.id, req.user!.role);
    res.json({ success: true, auditLogs: logs });
  } catch (error) {
    next(error);
  }
};
