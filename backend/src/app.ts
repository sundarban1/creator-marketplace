import './config/env'; // load and validate env first
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { logger } from './config/logger';
import { swaggerSpec } from './config/swagger';
import { errorHandler, notFoundHandler } from './middleware/error';
import { timezoneMiddleware } from './middleware/timezone';
import { languageMiddleware } from './middleware/language';
import prisma from './prisma';
import { initSocket } from './socket';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import creatorRoutes from './modules/creator/creator.routes';
import referralRoutes from './modules/referral/referral.routes';
import businessReferralRoutes from './modules/business-referral/business-referral.routes';
import walletRoutes from './modules/wallet/wallet.routes';
import businessRoutes from './modules/business/business.routes';
import campaignRoutes from './modules/campaign/campaign.routes';
import campaignAiRoutes from './modules/campaign-ai/campaign-ai.routes';
import messagingRoutes from './modules/messaging/messaging.routes';
import adminRoutes from './modules/admin/admin.routes';
import categoryRoutes from './modules/category/category.routes';
import categoryAdminRoutes from './modules/category/category.admin.routes';
import helpRoutes         from './modules/help/help.routes';
import faqRoutes          from './modules/faq/faq.routes';
import supportRoutes      from './modules/support/support.routes';
import legalRoutes        from './modules/legal/legal.routes';
import notificationRoutes from './modules/notifications/notification.routes';

const app = express();

// ── Trust proxy (required when behind nginx / load balancer in production) ───
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ── Compression ──────────────────────────────────────────────────────────────
app.use(compression());

// ── Security headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  })
);

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = env.FRONTEND_URL
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((o) => origin.startsWith(o))) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Timezone', 'X-Language'],
  })
);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Logging ──────────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const existing = req.headers['x-request-id'];
      const id = existing ? String(existing) : randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.url} completed with ${res.statusCode}`,
    customErrorMessage: (req, res, err) => `${req.method} ${req.url} failed with ${res.statusCode}: ${err.message}`,
    customProps: (req) => ({ userId: req.user?.id }),
    autoLogging: {
      ignore: (req) => req.url === '/health',
    },
  })
);

// ── Locale ───────────────────────────────────────────────────────────────────
app.use(timezoneMiddleware);
app.use(languageMiddleware);

// ── Rate limiters ─────────────────────────────────────────────────────────────
// Strict limiter for authentication endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Tighter OTP limiter
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10 minutes
  max: 5,
  message: { success: false, message: 'Too many OTP requests. Please wait 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limiter (prevents abuse but allows normal traffic)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 120,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip health checks and messaging routes — chat needs high-frequency polling
  skip: (req) => req.path === '/health' || req.path.startsWith('/api/messaging/'),
});

// Messaging routes need a much higher ceiling for real-time chat
const messagingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  message: { success: false, message: 'Too many requests. Please slow down in chat.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload endpoints need a higher limit (multipart payloads)
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many upload requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI generation is slow/costly — keep this tight
const aiGenerateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many AI generation requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general limiter to all /api/* routes (messaging is excluded via skip above)
app.use('/api/', apiLimiter);
app.use('/api/messaging/', messagingLimiter);

// Apply auth-specific limiters
app.use('/api/auth/login',        authLimiter);
app.use('/api/auth/register',     authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/verify-otp',   otpLimiter);
app.use('/api/auth/resend-otp',   otpLimiter);

// Upload endpoints
app.use('/api/creator/avatar',  uploadLimiter);
app.use('/api/business/logo',   uploadLimiter);

// AI generation
app.use('/api/campaigns/ai/generate', aiGenerateLimiter);
app.use('/api/campaigns/ai/suggest-description', aiGenerateLimiter);

// ── Health check ─────────────────────────────────────────────────────────────
/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check endpoint
 *     description: Returns server status and database connectivity
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: development
 *                 database:
 *                   type: string
 *                   example: connected
 *       503:
 *         description: Service unavailable (database connection failed)
 */
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      database: 'connected',
    });
  } catch {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      database: 'disconnected',
    });
  }
});

// ── Swagger documentation ─────────────────────────────────────────────────────
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Creator Marketplace API Docs',
  })
);

app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/creator', creatorRoutes);
app.use('/api/creator/referral', referralRoutes);
app.use('/api/creator/wallet', walletRoutes);
app.use('/api/business/referral', businessReferralRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/campaigns/ai', campaignAiRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/admin/categories', categoryAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/help',          helpRoutes);
app.use('/api/faq',           faqRoutes);
app.use('/api/support',       supportRoutes);
app.use('/api/legal',         legalRoutes);
app.use('/api/notifications', notificationRoutes);

// ── 404 & Error handlers ──────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = parseInt(env.PORT, 10);

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('Database connected');

    const httpServer = createServer(app);
    initSocket(httpServer);

    httpServer.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`API Docs available at http://localhost:${PORT}/api/docs`);
      logger.info(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  logger.info('Database disconnected');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

bootstrap();

export default app;
