import './config/env'; // load and validate env first
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { errorHandler, notFoundHandler } from './middleware/error';
import prisma from './prisma';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import creatorRoutes from './modules/creator/creator.routes';
import businessRoutes from './modules/business/business.routes';
import campaignRoutes from './modules/campaign/campaign.routes';
import messagingRoutes from './modules/messaging/messaging.routes';
import adminRoutes from './modules/admin/admin.routes';
import helpRoutes    from './modules/help/help.routes';
import faqRoutes     from './modules/faq/faq.routes';
import supportRoutes from './modules/support/support.routes';
import legalRoutes   from './modules/legal/legal.routes';

const app = express();

// ── Security & parsing middleware ────────────────────────────────────────────
app.use(helmet());

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
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

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

// Serve raw swagger spec as JSON
app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/creator', creatorRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/help',    helpRoutes);
app.use('/api/faq',     faqRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/legal',   legalRoutes);

// ── 404 & Error handlers ──────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = parseInt(env.PORT, 10);

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 API Docs available at http://localhost:${PORT}/api/docs`);
      console.log(`🌍 Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏳ Shutting down gracefully...');
  await prisma.$disconnect();
  console.log('✅ Database disconnected');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏳ SIGTERM received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

bootstrap();

export default app;
