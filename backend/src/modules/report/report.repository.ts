import { ReportStatus } from '@prisma/client';
import prisma from '../../prisma';
import type { CreateReportInput } from './report.schema';

export class ReportRepository {
  async create(reporterId: string, input: CreateReportInput) {
    return prisma.report.create({
      data: { reporterId, ...input },
    });
  }

  async findById(id: string) {
    return prisma.report.findUnique({ where: { id } });
  }

  async findAllForAdmin(params: { status?: ReportStatus; targetType?: string; page: number; limit: number }) {
    const where = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.targetType ? { targetType: params.targetType as never } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          reporter: { select: { id: true, email: true, role: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);
    return { items, total };
  }

  async updateStatus(id: string, data: { status: ReportStatus; reviewedBy: string; actionNote?: string }) {
    return prisma.report.update({
      where: { id },
      data: { status: data.status, reviewedBy: data.reviewedBy, reviewedAt: new Date(), actionNote: data.actionNote },
    });
  }
}
