import cron from 'node-cron';
import { logger } from '../config/logger';
import { env } from '../config/env';
import prisma from '../prisma';
import { getRedis, getQueueRedis } from '../config/redis';
import { sendResourceAlertEmail } from '../utils/email/resourceAlert';

// Watches the plan limits called out in render.yaml (Postgres storage/
// connections, both Redis instances' 25 MB cap, kolab-api's 512 MB) and
// emails ALERT_EMAIL the first time any of them crosses its threshold, so
// there's a warning before something like an OOM-restart or a rejected
// Redis write rather than only finding out after the fact.
//
// Single-instance-friendly by design: the cooldown map is in-memory, not
// shared via Redis. Fine while kolab-api runs as one instance (today); if it
// ever scales to multiple, move this map into Redis so instances don't each
// fire their own alert.

type ThresholdCheck = {
  key: string;
  label: string;
  usedLabel: string;
  usedValue: number;
  limitValue: number;
  unit: string;
  thresholdPercent: number;
};

const lastAlertedAt = new Map<string, number>();

function parseUsedMemoryBytes(info: string): number | null {
  const match = info.match(/used_memory:(\d+)/);
  return match ? Number(match[1]) : null;
}

function checkProcessMemory(): ThresholdCheck[] {
  const limitMb = Number(env.WEB_MEMORY_LIMIT_MB ?? '512');
  const usedMb = process.memoryUsage().rss / (1024 * 1024);
  return [{
    key: 'web-memory',
    label: 'kolab-api process memory',
    usedLabel: `${usedMb.toFixed(0)} MB`,
    usedValue: usedMb,
    limitValue: limitMb,
    unit: 'MB',
    thresholdPercent: 80,
  }];
}

async function checkDatabase(): Promise<ThresholdCheck[]> {
  const checks: ThresholdCheck[] = [];

  try {
    const [{ size }] = await prisma.$queryRaw<{ size: bigint }[]>`
      SELECT pg_database_size(current_database()) AS size
    `;
    const usedMb = Number(size) / (1024 * 1024);
    const limitMb = Number(env.DB_STORAGE_ALERT_LIMIT_MB ?? '1024');
    checks.push({
      key: 'db-storage',
      label: 'kolab-db Postgres storage',
      usedLabel: `${usedMb.toFixed(0)} MB`,
      usedValue: usedMb,
      limitValue: limitMb,
      unit: 'MB',
      thresholdPercent: 80,
    });
  } catch (err) {
    logger.warn({ err }, 'Resource alert: failed to read Postgres storage size');
  }

  try {
    const [{ count }] = await prisma.$queryRaw<{ count: number }[]>`
      SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname = current_database()
    `;
    const connLimit = Number(env.DB_MAX_CONNECTIONS ?? '97');
    checks.push({
      key: 'db-connections',
      label: 'kolab-db Postgres connections',
      usedLabel: `${count}`,
      usedValue: count,
      limitValue: connLimit,
      unit: 'connections',
      thresholdPercent: 80,
    });
  } catch (err) {
    logger.warn({ err }, 'Resource alert: failed to read Postgres connection count');
  }

  return checks;
}

async function checkRedis(): Promise<ThresholdCheck[]> {
  const checks: ThresholdCheck[] = [];

  const cacheClient = await getRedis();
  if (cacheClient) {
    try {
      const usedBytes = parseUsedMemoryBytes(await cacheClient.info('memory'));
      if (usedBytes != null) {
        const usedMb = usedBytes / (1024 * 1024);
        checks.push({
          key: 'redis-cache',
          label: 'kolab-cache Redis memory',
          usedLabel: `${usedMb.toFixed(1)} MB`,
          usedValue: usedMb,
          limitValue: Number(env.REDIS_CACHE_LIMIT_MB ?? '25'),
          unit: 'MB',
          // volatile-lru: full just means it evicts the oldest TTL'd key and
          // degrades cache-hit rate, so this can run hotter before alerting.
          thresholdPercent: 90,
        });
      }
    } catch (err) {
      logger.warn({ err }, 'Resource alert: failed to read kolab-cache Redis memory');
    }
  }

  const queueClient = await getQueueRedis();
  if (queueClient) {
    try {
      const usedBytes = parseUsedMemoryBytes(await queueClient.info('memory'));
      if (usedBytes != null) {
        const usedMb = usedBytes / (1024 * 1024);
        checks.push({
          key: 'redis-queue',
          label: 'kolab-queue Redis memory',
          usedLabel: `${usedMb.toFixed(1)} MB`,
          usedValue: usedMb,
          limitValue: Number(env.REDIS_QUEUE_LIMIT_MB ?? '25'),
          unit: 'MB',
          // noeviction: once full it starts REJECTING writes (breaks BullMQ
          // enqueue + the OTP fast path), so this alerts sooner than the cache.
          thresholdPercent: 75,
        });
      }
    } catch (err) {
      logger.warn({ err }, 'Resource alert: failed to read kolab-queue Redis memory');
    }
  }

  return checks;
}

async function runChecks(): Promise<void> {
  const cooldownMs = Number(env.RESOURCE_ALERT_COOLDOWN_MINUTES ?? '60') * 60_000;
  const checks = [
    ...checkProcessMemory(),
    ...(await checkDatabase()),
    ...(await checkRedis()),
  ];

  for (const check of checks) {
    const percent = (check.usedValue / check.limitValue) * 100;

    if (percent < check.thresholdPercent) {
      // Back under threshold — clear the cooldown so the next breach alerts
      // right away instead of waiting out a stale window.
      lastAlertedAt.delete(check.key);
      continue;
    }

    const last = lastAlertedAt.get(check.key) ?? 0;
    if (Date.now() - last < cooldownMs) continue;
    lastAlertedAt.set(check.key, Date.now());

    logger.warn({ ...check, percent: percent.toFixed(1) }, 'Resource threshold alert triggered');
    await sendResourceAlertEmail({
      to: env.ALERT_EMAIL,
      label: check.label,
      usedLabel: check.usedLabel,
      limitLabel: `${check.limitValue} ${check.unit}`,
      percent,
    }).catch((err) => logger.error({ err }, 'Resource alert email failed to send'));
  }
}

export function startResourceAlertsJob(): void {
  const intervalMinutes = Math.max(1, Number(env.RESOURCE_ALERT_CHECK_MINUTES ?? '10'));
  cron.schedule(`*/${intervalMinutes} * * * *`, () => {
    runChecks().catch((err) => logger.error({ err }, 'Resource alert job failed'));
  });
}
