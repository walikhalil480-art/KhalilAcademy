import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/rbac';

const router = Router();

router.get('/profile', authenticate, userController.getProfile);
router.patch('/profile', authenticate, userController.updateProfile);
router.post('/change-password', authenticate, userController.changePassword);
router.get('/student-dashboard', authenticate, authorize('STUDENT', 'INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), userController.getStudentDashboardData);
router.get('/instructor-dashboard', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), userController.getInstructorDashboardData);

export default router;
