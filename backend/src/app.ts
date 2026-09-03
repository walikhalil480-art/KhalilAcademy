import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
import { prisma } from './config/database';
import { errorHandler } from './middlewares/errorHandler';
import { apiRateLimiter } from './middlewares/rateLimiter';
import apiRouter from './routes';
import { register, httpRequestCounter, httpRequestDurationMicroseconds } from './utils/metrics';
import { registerEmailEventSubscribers } from './events/emailEventSubscriber';
import { registerGamificationSubscribers } from './events/gamificationSubscriber';

// Initialize central email & gamification event subscribers
registerEmailEventSubscribers();
registerGamificationSubscribers();

export const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false, // Managed per frontend client config
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: { action: 'sameorigin' },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  })
);

app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static file serving for uploaded videos, thumbnails & lesson resources with byte-range and CORS support
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');
    next();
  },
  express.static(path.resolve(process.cwd(), env.UPLOAD_DIR || './uploads'), {
    acceptRanges: true,
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
    },
  })
);

// Request metrics middleware
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    httpRequestCounter.inc({ method: req.method, route, status: res.statusCode });
    end({ method: req.method, route, status: res.statusCode });
  });
  next();
});

// Health check with real database connectivity verification
const healthHandler = async (_req: express.Request, res: express.Response) => {
  try {
    await prisma.$queryRaw`SELECT 1;`;
    res.json({
      status: 'ok',
      database: 'connected',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error.message,
    });
  }
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Prometheus metrics
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// API Routes with global API rate limiter protection
app.use('/api', apiRateLimiter, apiRouter);

// Centralized error handling
app.use(errorHandler);
