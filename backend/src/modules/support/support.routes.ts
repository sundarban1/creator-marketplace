import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { success, paginated } from '../../utils/response';
import prisma from '../../prisma';

const router = Router();

const contactSchema = z.object({
  topic:   z.string().min(1, 'Topic is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

const reportSchema = z.object({
  type:        z.string().min(1, 'Type is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
});

const statusSchema = z.object({
  status: z.string().min(1),
});

// ── Creator: submit contact request ─────────────────────────────────────────

router.post('/contact', authenticate, validate(contactSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = await prisma.supportRequest.create({
      data: { userId: req.user!.id, topic: req.body.topic, message: req.body.message },
    });
    success(res, request, 'Support request submitted', 201);
  } catch (err) { next(err); }
});

// ── Creator: submit issue report ─────────────────────────────────────────────

router.post('/report', authenticate, validate(reportSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await prisma.issueReport.create({
      data: { userId: req.user!.id, type: req.body.type, description: req.body.description },
    });
    success(res, report, 'Issue reported', 201);
  } catch (err) { next(err); }
});

// ── Admin: list contact requests ─────────────────────────────────────────────

router.get('/contacts', authenticate, authorize(Role.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page  = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(100, parseInt(req.query['limit'] as string) || 20);
    const status = req.query['status'] as string | undefined;

    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      prisma.supportRequest.findMany({
        where,
        include: { user: { select: { email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supportRequest.count({ where }),
    ]);
    paginated(res, items, total, page, limit);
  } catch (err) { next(err); }
});

// ── Admin: list issue reports ─────────────────────────────────────────────────

router.get('/reports', authenticate, authorize(Role.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page  = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(100, parseInt(req.query['limit'] as string) || 20);
    const status = req.query['status'] as string | undefined;

    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      prisma.issueReport.findMany({
        where,
        include: { user: { select: { email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.issueReport.count({ where }),
    ]);
    paginated(res, items, total, page, limit);
  } catch (err) { next(err); }
});

// ── Admin: update contact status ─────────────────────────────────────────────

router.patch('/contacts/:id/status', authenticate, authorize(Role.ADMIN), validate(statusSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.supportRequest.update({
      where: { id: req.params['id']! },
      data:  { status: req.body.status, updatedAt: new Date() },
    });
    success(res, item, 'Status updated');
  } catch (err) { next(err); }
});

// ── Admin: update report status ───────────────────────────────────────────────

router.patch('/reports/:id/status', authenticate, authorize(Role.ADMIN), validate(statusSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.issueReport.update({
      where: { id: req.params['id']! },
      data:  { status: req.body.status, updatedAt: new Date() },
    });
    success(res, item, 'Status updated');
  } catch (err) { next(err); }
});

export default router;
