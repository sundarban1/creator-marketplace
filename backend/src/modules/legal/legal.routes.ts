import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { success } from '../../utils/response';
import { AppError } from '../../middleware/error';
import prisma from '../../prisma';

const router = Router();

const VALID_TYPES = ['PRIVACY_POLICY', 'TERMS', 'GUIDELINES'] as const;
type LegalType = typeof VALID_TYPES[number];

const TYPE_MAP: Record<string, LegalType> = {
  'privacy-policy': 'PRIVACY_POLICY',
  'terms':          'TERMS',
  'guidelines':     'GUIDELINES',
};

const sectionSchema = z.object({
  type:      z.enum(VALID_TYPES),
  title:     z.string().min(2, 'Title required'),
  body:      z.string().min(10, 'Body required'),
  icon:      z.string().optional().nullable(),
  order:     z.number().int().min(0).optional(),
  published: z.boolean().optional(),
});

const updateSchema = sectionSchema.partial().omit({ type: true });

// ── Public: mobile fetches by type slug ──────────────────────────────────────

router.get('/:typeSlug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const legalType = TYPE_MAP[req.params['typeSlug']!];
    if (!legalType) throw new AppError('Unknown legal document type', 404);

    const sections = await prisma.legalSection.findMany({
      where:   { type: legalType, published: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    // Return along with the last-updated timestamp
    const lastUpdated = sections.reduce<Date | null>((max, s) => {
      return !max || s.updatedAt > max ? s.updatedAt : max;
    }, null);

    success(res, { sections, lastUpdated }, 'Legal document retrieved');
  } catch (err) { next(err); }
});

// ── Admin: list all sections (any type) ──────────────────────────────────────

router.get('/', authenticate, authorize(Role.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = req.query['type'] as LegalType | undefined;
    const where = type ? { type } : {};
    const sections = await prisma.legalSection.findMany({
      where,
      orderBy: [{ type: 'asc' }, { order: 'asc' }],
    });
    success(res, sections, 'Sections retrieved');
  } catch (err) { next(err); }
});

// ── Admin: create ─────────────────────────────────────────────────────────────

router.post('/', authenticate, authorize(Role.ADMIN), validate(sectionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const section = await prisma.legalSection.create({
      data: {
        type:      req.body.type,
        title:     req.body.title,
        body:      req.body.body,
        icon:      req.body.icon ?? null,
        order:     req.body.order    ?? 0,
        published: req.body.published ?? true,
      },
    });
    success(res, section, 'Section created', 201);
  } catch (err) { next(err); }
});

// ── Admin: update ─────────────────────────────────────────────────────────────

router.put('/:id', authenticate, authorize(Role.ADMIN), validate(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.legalSection.findUnique({ where: { id: req.params['id']! } });
    if (!existing) throw new AppError('Section not found', 404);
    const section = await prisma.legalSection.update({
      where: { id: req.params['id']! },
      data:  { ...req.body, updatedAt: new Date() },
    });
    success(res, section, 'Section updated');
  } catch (err) { next(err); }
});

// ── Admin: delete ─────────────────────────────────────────────────────────────

router.delete('/:id', authenticate, authorize(Role.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.legalSection.findUnique({ where: { id: req.params['id']! } });
    if (!existing) throw new AppError('Section not found', 404);
    await prisma.legalSection.delete({ where: { id: req.params['id']! } });
    success(res, null, 'Section deleted');
  } catch (err) { next(err); }
});

// ── Admin: toggle published ───────────────────────────────────────────────────

router.patch('/:id/publish', authenticate, authorize(Role.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.legalSection.findUnique({ where: { id: req.params['id']! } });
    if (!existing) throw new AppError('Section not found', 404);
    const { published } = req.body as { published: boolean };
    if (typeof published !== 'boolean') throw new AppError('published must be a boolean', 400);
    const section = await prisma.legalSection.update({
      where: { id: req.params['id']! },
      data:  { published, updatedAt: new Date() },
    });
    success(res, section, published ? 'Section published' : 'Section unpublished');
  } catch (err) { next(err); }
});

export default router;
