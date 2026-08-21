import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgrespassword2026@localhost:5432/khalil_academy_db?schema=public'),
  JWT_ACCESS_SECRET: z.string().default('khalil_academy_super_secret_access_jwt_key_2026_prod'),
  JWT_REFRESH_SECRET: z.string().default('khalil_academy_super_secret_refresh_jwt_key_2026_prod'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  PAYMENT_PROVIDER: z.string().default('PAYSTACK'),
  PAYMENT_WEBHOOK_SECRET: z.string().default(''),
  PAYSTACK_SECRET_KEY: z.string().default(process.env.PAYSTACK_SECRET_KEY || ''),
  PAYSTACK_PUBLIC_KEY: z.string().default(process.env.PAYSTACK_PUBLIC_KEY || ''),
  PAYSTACK_WEBHOOK_SECRET: z.string().default(process.env.PAYSTACK_WEBHOOK_SECRET || ''),
  PAYSTACK_CALLBACK_URL: z.string().default(process.env.PAYSTACK_CALLBACK_URL || ''),
  
  // Mail & SMTP Configuration (Supports both Laravel & Node standard env variables)
  MAIL_MAILER: z.string().default('smtp'),
  MAIL_HOST: z.string().default(process.env.SMTP_HOST || ''),
  MAIL_PORT: z.string().default(process.env.SMTP_PORT || '587'),
  MAIL_USERNAME: z.string().default(process.env.SMTP_USER || ''),
  MAIL_PASSWORD: z.string().default(process.env.SMTP_PASS || ''),
  MAIL_ENCRYPTION: z.string().default(process.env.SMTP_SECURE === 'true' ? 'ssl' : 'tls'),
  MAIL_FROM_ADDRESS: z.string().default(process.env.EMAIL_FROM || 'no-reply@khalilacademy.com'),
  MAIL_FROM_NAME: z.string().default('Khalil Academy'),

  STORAGE_PROVIDER: z.string().default('LOCAL'),
  UPLOAD_DIR: z.string().default('./uploads'),
  APP_URL: z.string().default('http://localhost:5173'),

  // AI Learning Assistant Configuration
  AI_API_KEY: z.string().default(process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || ''),
  OPENAI_API_KEY: z.string().default(process.env.OPENAI_API_KEY || ''),
  GEMINI_API_KEY: z.string().default(process.env.GEMINI_API_KEY || ''),
  GROQ_API_KEY: z.string().default(process.env.GROQ_API_KEY || ''),
  AI_MODEL: z.string().default(process.env.AI_MODEL || 'gpt-4o-mini'),
  AI_PROVIDER: z.string().default(process.env.AI_PROVIDER || 'openai'),
  AI_BASE_URL: z.string().default(process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || ''),
  AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().default(20),
  AI_MAX_CONTEXT_TOKENS: z.coerce.number().default(4000),
});

export const env = envSchema.parse(process.env);
