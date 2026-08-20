import { ReportStatus } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { ReportRepository } from './report.repository';
import { logAudit } from '../logging/audit.service';
import { AuditAction } from '../logging/logging.constants';
import type { CreateReportInput } from './report.schema';

export class ReportService {
  private repo = new ReportRepository();

  async create(reporterId: string, input: CreateReportInput) {
    return this.repo.create(reporterId, input);
  }

  async listForAdmin(params: { status?: ReportStatus; targetType?: string; page: number; limit: number }) {
    return this.repo.findAllForAdmin(params);
  }

  async updateStatus(id: string, adminUserId: string, status: 'UNDER_REVIEW' | 'ACTION_TAKEN' | 'DISMISSED', actionNote?: string) {
    const report = await this.repo.findById(id);
    if (!report) throw new AppError('Report not found', 404);

    const updated = await this.repo.updateStatus(id, { status, reviewedBy: adminUserId, actionNote });

    logAudit({
      userId: adminUserId,
      action: AuditAction.REPORT_REVIEWED,
      oldValue: { reportId: id, status: report.status },
      newValue: { reportId: id, status, actionNote },
      performedBy: adminUserId,
    });

    return updated;
  }
}
