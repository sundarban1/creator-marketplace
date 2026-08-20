import type { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { logger } from '../../config/logger';
import { getRequestContext } from '../../middleware/requestContext';
import type { ActivityActionValue, EntityTypeValue } from './logging.constants';

interface LogActivityInput {
  userId?: string | null;
  action: ActivityActionValue;
  entityType?: EntityTypeValue;
  entityId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

// No dedicated client header distinguishes web/mobile yet, so platform is a
// best-effort guess from User-Agent — good enough for V1 admin/analytics use,
// not meant to be authoritative.
function derivePlatform(userAgent?: string): string | undefined {
  if (!userAgent) return undefined;
  return /expo|okhttp|cfnetwork|dalvik/i.test(userAgent) ? 'mobile' : 'web';
}

// Fire-and-forget by design — call sites do `logActivity(...)`, not
// `await logActivity(...)`. Failures are caught here (not left to each of the
// ~19 call sites to remember a .catch()) so a logging outage can never fail
// the request that triggered it; they're still visible via logger.error.
export function logActivity(input: LogActivityInput): void {
  const ctx = getRequestContext();
  prisma.activityLog
    .create({
      data: {
        userId:      input.userId ?? undefined,
        action:      input.action,
        entityType:  input.entityType,
        entityId:    input.entityId,
        description: input.description,
        metadata:    input.metadata as Prisma.InputJsonValue | undefined,
        ipAddress:   ctx?.ip,
        device:      ctx?.userAgent,
        platform:    derivePlatform(ctx?.userAgent),
      },
    })
    .catch((err) => {
      logger.error({ err, action: input.action }, 'Failed to write activity log');
    });
}

// Newest first, per the Activity Timeline UI convention — a job/application
// detail page's Activity tab, not the admin activity feed (which has its own
// unscoped listing in admin.repository.ts).
export function getActivityForEntity(entityType: EntityTypeValue, entityId: string) {
  return prisma.activityLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
  });
}
