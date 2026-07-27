import type { Express } from 'express';
import { env } from '../config/env';
import prisma from '../prisma';

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
export function registerHealthCheck(app: Express): void {
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
}
