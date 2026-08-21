import { Router } from 'express';
import * as atRiskCtrl from '../controllers/atRiskStudent.controller';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/rbac';
import { Role } from '@prisma/client';

const router = Router();

// Protect all routes: only instructors and administrators can access risk analytics
router.use(authenticate, authorize(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN));

router.get('/', atRiskCtrl.getSummary);
router.get('/summary', atRiskCtrl.getSummary);
router.post(
  '/analyze',
  authorize(Role.ADMIN, Role.SUPER_ADMIN),
  atRiskCtrl.triggerAnalysis
);
router.get('/:studentId', atRiskCtrl.getStudentDetails);
router.post('/:studentId/analyze', atRiskCtrl.analyzeSingleStudent);
router.post('/:studentId/intervene', atRiskCtrl.sendIntervention);
router.patch('/records/:id/dismiss', atRiskCtrl.dismissRiskRecord);

export default router;
