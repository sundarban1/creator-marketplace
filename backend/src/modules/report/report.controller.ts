import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { ReportService } from './report.service';
import { getDict } from '../../i18n';

const reportService = new ReportService();

export class ReportController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await reportService.create(req.user!.id, req.body);
      success(res, report, getDict().report.reportSubmitted, 201);
    } catch (err) { next(err); }
  }
}
