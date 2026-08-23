import axios from 'axios';
import crypto from 'crypto';
import { env } from '../config/env';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../config/logger';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export interface PaystackInitParams {
  email: string;
  amount: number; // Major unit (e.g. 50.00 KES/USD)
  currency?: string;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaystackInitResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyResult {
  status: string; // 'success' | 'failed' | 'abandoned'
  amount: number; // Major unit
  currency: string;
  reference: string;
  paidAt?: string;
  channel?: string;
  gatewayResponse?: string;
  metadata?: Record<string, any>;
}

/**
 * Get configured Paystack secret key
 */
export const getPaystackSecretKey = (): string => {
  const key = process.env.PAYSTACK_SECRET_KEY || env.PAYSTACK_SECRET_KEY || '';
  return key.trim();
};

/**
 * Initialize a Paystack checkout transaction
 */
export const initializePaystackTransaction = async (params: PaystackInitParams): Promise<PaystackInitResult> => {
  const secretKey = getPaystackSecretKey();

  if (!secretKey) {
    logger.error('[PAYSTACK_ERROR] PAYSTACK_SECRET_KEY is not configured in environment variables.');
    throw new AppError('Payment provider is currently unconfigured. Please contact support.', 503);
  }

  const callbackUrl = params.callbackUrl || 
                      process.env.PAYSTACK_CALLBACK_URL || 
                      env.PAYSTACK_CALLBACK_URL || 
                      `${env.APP_URL}/checkout?reference=${params.reference}`;

  // Amount in minor currency units (e.g. KES 1000 = 100000 kobo/cents)
  const minorAmount = Math.round(params.amount * 100);

  if (minorAmount <= 0) {
    throw new AppError('Invalid payment amount.', 400);
  }

  // Normalize currency for Paystack Kenyan merchant account (KES)
  const rawCurrency = (params.currency || 'KES').trim().toUpperCase();
  const currency = rawCurrency === 'USD' || rawCurrency === 'KSH' ? 'KES' : rawCurrency;

  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email: params.email,
        amount: minorAmount,
        currency,
        reference: params.reference,
        callback_url: callbackUrl,
        metadata: params.metadata || {},
      },
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    if (response.data?.status && response.data?.data) {
      return {
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        reference: response.data.data.reference || params.reference,
      };
    }

    logger.error('[PAYSTACK_INIT_RESPONSE_INVALID]', response.data);
    throw new AppError('Unable to initialize payment with Paystack.', 502);
  } catch (err: any) {
    if (err instanceof AppError) throw err;

    const errorDetails = err.response?.data || err.message;
    logger.error('[PAYSTACK_INIT_FAILED]', {
      reference: params.reference,
      status: err.response?.status,
      details: errorDetails,
    });

    const userMessage = err.response?.data?.message || 'Unable to initialize payment. Please try again.';
    throw new AppError(userMessage, err.response?.status && err.response.status < 500 ? err.response.status : 502);
  }
};

/**
 * Verify a Paystack transaction directly from Paystack API
 */
export const verifyPaystackTransaction = async (reference: string): Promise<PaystackVerifyResult> => {
  const secretKey = getPaystackSecretKey();

  if (!secretKey) {
    logger.error('[PAYSTACK_ERROR] PAYSTACK_SECRET_KEY is missing during verification.');
    throw new AppError('Payment verification service is unavailable. Please contact support.', 503);
  }

  if (!reference || typeof reference !== 'string') {
    throw new AppError('A valid payment reference is required.', 400);
  }

  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference.trim())}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        timeout: 15000,
      }
    );

    if (response.data?.status && response.data?.data) {
      const data = response.data.data;
      return {
        status: data.status, // 'success', 'failed', 'abandoned', etc.
        amount: data.amount ? data.amount / 100 : 0, // Convert minor to major unit
        currency: data.currency || 'KES',
        reference: data.reference,
        paidAt: data.paid_at,
        channel: data.channel,
        gatewayResponse: data.gateway_response,
        metadata: data.metadata,
      };
    }

    logger.error('[PAYSTACK_VERIFY_RESPONSE_INVALID]', response.data);
    throw new AppError('Invalid response received from Paystack.', 502);
  } catch (err: any) {
    if (err instanceof AppError) throw err;

    const errorDetails = err.response?.data || err.message;
    logger.error('[PAYSTACK_VERIFY_FAILED]', {
      reference,
      status: err.response?.status,
      details: errorDetails,
    });

    const userMessage = err.response?.data?.message || 'Paystack payment verification failed.';
    throw new AppError(userMessage, err.response?.status && err.response.status < 500 ? err.response.status : 502);
  }
};

/**
 * Validates the HMAC SHA512 signature of incoming Paystack webhook requests
 */
export const verifyPaystackWebhookSignature = (signatureHeader: string | undefined, rawPayload: string): boolean => {
  const secretKey = process.env.PAYSTACK_WEBHOOK_SECRET || getPaystackSecretKey();

  if (!secretKey || !signatureHeader || !rawPayload) {
    return false;
  }

  try {
    const computedSignature = crypto
      .createHmac('sha512', secretKey)
      .update(rawPayload)
      .digest('hex');

    const signatureBuffer = Buffer.from(signatureHeader, 'utf8');
    const computedBuffer = Buffer.from(computedSignature, 'utf8');

    if (signatureBuffer.length !== computedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, computedBuffer);
  } catch (err) {
    logger.error('[PAYSTACK_WEBHOOK_SIG_ERROR]', err);
    return false;
  }
};
