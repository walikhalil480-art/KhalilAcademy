import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Generous capacity
  skip: () => env.NODE_ENV !== 'production',
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // Generous capacity
  skip: () => env.NODE_ENV !== 'production',
  message: {
    success: false,
    message: 'Rate limit exceeded. Please slow down your requests.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
