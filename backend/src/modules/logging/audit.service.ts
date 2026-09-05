import type { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { logger } from '../../config/logger';
import { getRequestContext } from '../../middleware/requestContext';
import type { AuditActionValue, EntityTypeValue } from './logging.constants';

interface LogAuditInput {
  userId?: string | null;
  actorType?: 'USER' | 'ADMIN' | 'SYSTEM';
  action: AuditActionValue;
  entityType?: EntityTypeValue;
  entityId?: string;
  campaignId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  performedBy?: string;
}

// Fire-and-forget, same reasoning as activity.service.ts's logActivity(). Rows
// written here are immutable by convention — there is deliberately no update
// or delete method anywhere in this module, matching the spec's "must never
// be automatically deleted" / "not editable through the application."
// userAgent/requestId are pulled from the same AsyncLocalStorage request
// context logActivity() already reads for ipAddress — no new plumbing needed.
export function logAudit(input: LogAuditInput): void {
  const ctx = getRequestContext();
  prisma.auditLog
    .create({
      data: {
        userId:      input.userId ?? undefined,
        actorType:   input.actorType,
        action:      input.action,
        entityType:  input.entityType,
        entityId:    input.entityId,
        campaignId:  input.campaignId,
        oldValue:    input.oldValue as Prisma.InputJsonValue | undefined,
        newValue:    input.newValue as Prisma.InputJsonValue | undefined,
        metadata:    input.metadata as Prisma.InputJsonValue | undefined,
        performedBy: input.performedBy,
        ipAddress:   ctx?.ip,
        userAgent:   ctx?.userAgent,
        requestId:   ctx?.requestId,
      },
    })
    .catch((err) => {
      logger.error({ err, action: input.action }, 'Failed to write audit log');
    });
}
