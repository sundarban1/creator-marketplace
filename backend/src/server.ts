import type { Express } from 'express';
import { createServer } from 'http';
import { env } from './config/env';
import { logger } from './config/logger';
import prisma from './prisma';
import { initSocket } from './socket';
import { startCampaignExpiryJob } from './jobs/expireCampaigns';
import { startSocialFollowerRefreshJob } from './jobs/refreshSocialFollowers';

const PORT = parseInt(env.PORT, 10);

export async function startServer(app: Express): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected');

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
