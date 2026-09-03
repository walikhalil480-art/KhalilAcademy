import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Dedicated Rate Limiter for AI Tutor endpoints.
 * Protects server resources and prevents uncontrolled AI cost spikes.
 */
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: env.AI_RATE_LIMIT_PER_MINUTE || 20,
  skip: () => env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'You have reached the AI question rate limit. Please pause a moment before asking another question.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    // Prefer authenticated student ID, fallback to client IP
    return req.user?.id || req.ip || 'anonymous-ai-user';
  },
});
