import type { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { logger } from '../../config/logger';
import { getRequestContext } from '../../middleware/requestContext';
import type { AuditActionValue } from './logging.constants';

interface LogAuditInput {
  userId?: string | null;
  action: AuditActionValue;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  performedBy?: string;
}

// Fire-and-forget, same reasoning as activity.service.ts's logActivity(). Rows
// written here are immutable by convention — there is deliberately no update
// or delete method anywhere in this module, matching the spec's "must never
// be automatically deleted" / "not editable through the application."
export function logAudit(input: LogAuditInput): void {
  const ctx = getRequestContext();
  prisma.auditLog
    .create({
      data: {
        userId:      input.userId ?? undefined,
        action:      input.action,
        oldValue:    input.oldValue as Prisma.InputJsonValue | undefined,
        newValue:    input.newValue as Prisma.InputJsonValue | undefined,
        performedBy: input.performedBy,
        ipAddress:   ctx?.ip,
      },
    })
    .catch((err) => {
      logger.error({ err, action: input.action }, 'Failed to write audit log');
    });
}
