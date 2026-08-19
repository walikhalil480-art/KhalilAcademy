import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/validate-coupon', authenticate, paymentController.validateCoupon);
router.post('/courses/:id/enroll', authenticate, paymentController.enrollFree);

// PAYSTACK
router.post('/paystack/initialize', authenticate, paymentController.initializePaystackCheckout);
router.get('/paystack/verify/:reference', authenticate, paymentController.verifyPaystackCheckout);
router.post('/paystack/webhook', paymentController.handlePaystackWebhook);

// STRIPE
router.post('/stripe/initialize', authenticate, paymentController.initializeStripeCheckout);
router.get('/stripe/verify/:reference', authenticate, paymentController.verifyStripeCheckout);

// History
router.get('/history', authenticate, paymentController.getUserPaymentHistory);

export default router;

