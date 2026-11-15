// User-side report submission. Admin review lives in
// modules/moderation/moderation.admin.service.ts.
//
// Order matters: the report row is committed FIRST; admin alerts (bell + push
// + urgent email) are best-effort afterwards, so a notification failure can
// never lose a report — the moderation dashboard reads the reports table.
import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../middleware/error';
import { HttpStatus } from '../../constants/httpStatus';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { notificationService } from '../notifications/notification.service';
import { resolveReportTarget } from '../moderation/report.targets';
import { OPEN_STATUSES, priorityForReason } from '../moderation/moderation.rules';
import { ADMIN_NOTIFICATION_TYPE } from '../moderation/block.service';
import { sendUrgentReportAlert } from '../../utils/email/moderation';
import type { CreateReportInput } from './report.schema';

export class ReportService {
  async create(reporterId: string, input: CreateReportInput) {
    const target = await resolveReportTarget(input.targetType, input.targetId, reporterId);
    if (!target) throw new AppError('This content is no longer available to report.', HttpStatus.NOT_FOUND, true, { code: 'REPORT_TARGET_NOT_FOUND' });
    if (target.ownerUserId === reporterId) {
      throw new AppError('You can’t report your own content.', HttpStatus.BAD_REQUEST, true, { code: 'REPORT_SELF' });
    }

    // One open report per reporter per item — repeats add nothing for the
    // moderator and are the main abuse vector (mass-reporting).
    const duplicate = await prisma.report.findFirst({
      where: { reporterId, targetType: input.targetType, targetId: input.targetId, status: { in: OPEN_STATUSES } },
      select: { id: true },
    });
    if (duplicate) {
      throw new AppError('You’ve already reported this. Our moderation team is reviewing it.', HttpStatus.CONFLICT, true, { code: 'REPORT_DUPLICATE' });
    }

    const priority = priorityForReason(input.reason);
    const report = await prisma.report.create({
      data: {
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        reportedUserId: target.ownerUserId,
        conversationId: target.conversationId,
        messageId: target.messageId,
        reason: input.reason,
        description: input.description || null,
        priority,
        evidence: { title: target.title, ...target.snapshot, capturedAt: new Date().toISOString() } as Prisma.InputJsonValue,
      },
      select: { id: true, status: true, createdAt: true },
    });

    this.alertAdmins(report.id, input.reason, priority, target.title);

    // Only what the reporter needs — nothing internal.
    return { id: report.id, status: 'SUBMITTED' as const, createdAt: report.createdAt };
  }

  private alertAdmins(reportId: string, reason: string, priority: string, targetLabel: string) {
    const urgent = priority === 'URGENT';
    const reasonLabel = reason.replace(/_/g, ' ').toLowerCase();
    void notificationService
      .createForAdmins({
        type: urgent ? ADMIN_NOTIFICATION_TYPE.REPORT_URGENT : ADMIN_NOTIFICATION_TYPE.REPORT,
        title: urgent ? 'URGENT report needs review' : 'New report',
        body: `${targetLabel} — ${reasonLabel}`,
        refId: reportId,
        refType: 'report',
      })
      .catch((err) => logger.error({ err, reportId }, 'Failed to alert admins of report (report is saved)'));

    const inboxes = (env.MODERATION_ALERT_EMAILS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (urgent && inboxes.length) {
      void sendUrgentReportAlert(inboxes, {
        reportId, reason, targetLabel,
        dashboardUrl: `${env.FRONTEND_URL.replace(/\/$/, '')}/admin/moderation/reports/${reportId}`,
      }).catch((err) => logger.error({ err, reportId }, 'Failed to email urgent report alert (report is saved)'));
    }
  }
}
