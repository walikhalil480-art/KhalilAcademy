import { Router } from 'express';
import * as certController from '../controllers/certificate.controller';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/rbac';

const router = Router();

router.get('/my', authenticate, certController.getUserCertificates);
router.get('/my-certificates', authenticate, certController.getUserCertificates);
router.get('/me/certificates', authenticate, certController.getUserCertificates);

// Administrative and Instructor management endpoints
router.get('/manage/list', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR'), certController.listCertificates);
router.get('/:id/audit-logs', authenticate, certController.getAuditHistory);
router.post('/:id/suspend', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR'), certController.suspendCert);
router.post('/:id/restore', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR'), certController.restoreCert);
router.post('/:id/revoke', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR'), certController.revokeCert);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), certController.softDeleteCert);

router.get('/courses/:courseId/eligibility', authenticate, certController.checkEligibility);
router.post('/courses/:courseId/claim', authenticate, certController.claimCertificate);

// Public verification endpoints
router.get('/verify/certificate/:id', certController.verifyCertificate);
router.get('/verify/:id', certController.verifyCertificate);
router.get('/:id', authenticate, certController.getCertificate);
router.get('/:id/download', authenticate, certController.downloadCertificatePdf);

export default router;
