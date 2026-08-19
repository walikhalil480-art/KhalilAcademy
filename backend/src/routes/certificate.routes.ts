import { Router } from 'express';
import * as certController from '../controllers/certificate.controller';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/rbac';

const router = Router();

router.get('/my', authenticate, certController.getUserCertificates);
router.get('/my-certificates', authenticate, certController.getUserCertificates);
router.get('/me/certificates', authenticate, certController.getUserCertificates);

router.get('/courses/:courseId/eligibility', authenticate, certController.checkEligibility);
router.post('/courses/:courseId/claim', authenticate, certController.claimCertificate);

router.get('/verify/certificate/:id', certController.verifyCertificate);
router.get('/verify/:id', certController.verifyCertificate);
router.get('/:id', authenticate, certController.getCertificate);
router.get('/:id/download', authenticate, certController.downloadCertificatePdf);
router.post('/:id/revoke', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), certController.revokeCert);

export default router;
