import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { success } from '../../utils/response';
import { AppError } from '../../middleware/error';
import { HelpRepository } from './help.repository';
import { createHelpArticleSchema, updateHelpArticleSchema } from './help.schema';

const router = Router();
const repo   = new HelpRepository();

// ── Public: mobile app fetches this ─────────────────────────────────────────

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const articles = await repo.listPublished();
    success(res, articles, 'Help articles retrieved');
  } catch (err) { next(err); }
});

// ── Admin: all mutations require ADMIN role ──────────────────────────────────

router.get('/all', authenticate, authorize(Role.ADMIN), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const articles = await repo.listAll();
    success(res, articles, 'All help articles retrieved');
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize(Role.ADMIN), validate(createHelpArticleSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const article = await repo.create(req.body);
    success(res, article, 'Help article created', 201);
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, authorize(Role.ADMIN), validate(updateHelpArticleSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await repo.findById(req.params['id']!);
    if (!existing) throw new AppError('Help article not found', 404);
    const article = await repo.update(req.params['id']!, req.body);
    success(res, article, 'Help article updated');
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize(Role.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await repo.findById(req.params['id']!);
    if (!existing) throw new AppError('Help article not found', 404);
    await repo.delete(req.params['id']!);
    success(res, null, 'Help article deleted');
  } catch (err) { next(err); }
});

router.patch('/:id/publish', authenticate, authorize(Role.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await repo.findById(req.params['id']!);
    if (!existing) throw new AppError('Help article not found', 404);
    const { published } = req.body as { published: boolean };
    if (typeof published !== 'boolean') throw new AppError('published must be a boolean', 400);
    const article = await repo.togglePublished(req.params['id']!, published);
    success(res, article, `Help article ${published ? 'published' : 'unpublished'}`);
  } catch (err) { next(err); }
});

export default router;
