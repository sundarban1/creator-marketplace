import { Request, Response, NextFunction } from 'express';
import { ReportStatus } from '@prisma/client';
import { success } from '../../utils/response';
import { AppError } from '../../middleware/error';
import { ReportService } from './report.service';
import { getDict } from '../../i18n';

import { HttpStatus } from '../../constants/httpStatus';

const reportService = new ReportService();

function parsePage(req: Request) {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));
  return { page, limit };
}

export class ReportController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await reportService.create(req.user!.id, req.body);
      success(res, report, getDict().report.reportSubmitted, 201);
    } catch (err) { next(err); }
  }

  async listForAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePage(req);
      const statusRaw = req.query.status as string | undefined;
      if (statusRaw && !Object.values(ReportStatus).includes(statusRaw as ReportStatus)) {
        throw new AppError(`Invalid status. Must be one of: ${Object.values(ReportStatus).join(', ')}`, HttpStatus.BAD_REQUEST);
      }
      const targetType = req.query.targetType as string | undefined;
      const result = await reportService.listForAdmin({ status: statusRaw as ReportStatus | undefined, targetType, page, limit });
      success(res, result, 'Reports retrieved');
    } catch (err) { next(err); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, actionNote } = req.body;
      const report = await reportService.updateStatus(req.params.id, req.user!.id, status, actionNote);
      success(res, report, 'Report updated');
    } catch (err) { next(err); }
  }
}
