import type { Express } from 'express';
import { createServer } from 'http';
import { env } from './config/env';
import { logger } from './config/logger';
import prisma from './prisma';
import { getRedis } from './config/redis';
import { initSocket } from './socket';
import { startCampaignExpiryJob } from './jobs/expireCampaigns';
import { startSocialFollowerRefreshJob } from './jobs/refreshSocialFollowers';

const PORT = parseInt(env.PORT, 10);

export async function startServer(app: Express): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected');

    // Warm the shared app-level Redis connection (rate-limit store + response
    // cache). Non-blocking and best-effort — getRedis() resolves to null and
    // every caller degrades gracefully if Redis is unconfigured or down, so a
    // failure here must never stop the server booting.
    void getRedis();

    const httpServer = createServer(app);
    await initSocket(httpServer);
    startCampaignExpiryJob();
    startSocialFollowerRefreshJob();

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
