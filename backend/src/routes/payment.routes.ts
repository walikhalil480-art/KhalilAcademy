import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Coupons and Free Enrollment
router.post('/validate-coupon', authenticate, paymentController.validateCoupon);
router.post('/courses/:id/enroll', authenticate, paymentController.enrollFree);

// Standard & Paystack-Specific Checkout Initialization
router.post('/initialize', authenticate, paymentController.initializePaystackCheckout);
router.post('/paystack/initialize', authenticate, paymentController.initializePaystackCheckout);

// Standard & Paystack-Specific Payment Verification
router.get('/verify/:reference', authenticate, paymentController.verifyPaystackCheckout);
router.get('/paystack/verify/:reference', authenticate, paymentController.verifyPaystackCheckout);

// Standard & Paystack-Specific Webhooks (Signature verified inside controller)
router.post('/webhook', paymentController.handlePaystackWebhook);
router.post('/paystack/webhook', paymentController.handlePaystackWebhook);

// Student Payment History
router.get('/history', authenticate, paymentController.getUserPaymentHistory);

export default router;
