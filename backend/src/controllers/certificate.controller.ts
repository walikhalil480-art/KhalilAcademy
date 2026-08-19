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
    
    // Public verification payload: Only safe public fields, no sensitive data or user IDs
    res.json({
      success: true,
      isValid: !cert.isRevoked,
      certificate: {
        certificateNumber: cert.certificateNumber,
        studentName: cert.studentName,
        courseTitle: cert.courseTitle,
        instructorName: cert.instructorName,
        issueDate: cert.issueDate,
        status: cert.isRevoked ? 'REVOKED' : 'VALID',
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
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { course: { select: { id: true, title: true, slug: true, thumbnail: true } } },
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
      isRevoked: c.isRevoked,
      course: c.course,
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

export const revokeCert = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const cert = await certService.revokeCertificate(req.params.id, req.user!.id, req.body.reason);
    res.json({ success: true, message: 'Certificate revoked successfully.', certificate: cert });
  } catch (error) {
    next(error);
  }
};
