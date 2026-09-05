import type { Express } from 'express';
import { createServer } from 'http';
import { env } from './config/env';
import { logger } from './config/logger';
import prisma from './prisma';
import { getRedis, getQueueRedis } from './config/redis';
import { initSocket } from './socket';
import { startCampaignExpiryJob } from './jobs/expireCampaigns';
import { startSocialFollowerRefreshJob } from './jobs/refreshSocialFollowers';
import { startCounterFlushJob } from './jobs/flushCounters';
import { startEscrowStateMachineJob } from './jobs/escrowStateMachine';
import { startResourceAlertsJob } from './jobs/resourceAlerts';
import { startPushWorker, stopPushWorker } from './workers/pushWorker';
import { closeQueues } from './config/queue';

const PORT = parseInt(env.PORT, 10);

export async function startServer(app: Express): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected');

    // Warm both app-level Redis connections (cache/rate-limit, and the queue).
    // Non-blocking and best-effort — the accessors resolve to null and every
    // caller degrades gracefully if Redis is unconfigured or down, so a failure
    // here must never stop the server booting.
    void getRedis();
    void getQueueRedis();

    const httpServer = createServer(app);
    await initSocket(httpServer);
    startCampaignExpiryJob();
    startSocialFollowerRefreshJob();
    startCounterFlushJob();
    startEscrowStateMachineJob();
    startResourceAlertsJob();
    startPushWorker();

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
async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down...`);
  // Stop consuming/holding queue jobs before the DB closes so an in-flight push
  // job isn't killed mid-write; both are best-effort and never block exit long.
  await Promise.race([
    Promise.all([stopPushWorker(), closeQueues()]),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  await prisma.$disconnect();
  logger.info('Database disconnected');
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
