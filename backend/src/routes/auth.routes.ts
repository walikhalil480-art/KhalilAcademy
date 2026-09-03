import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';
import { authRateLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/me', authenticate, authController.getMe);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authRateLimiter, authController.resendVerification);
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);
router.post('/reset-password', authRateLimiter, authController.resetPassword);

export default router;
