import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { success } from '../../utils/response';
import { AppError } from '../../middleware/error';
import { createHelpArticleSchema, updateHelpArticleSchema } from '../help/help.schema';
import prisma from '../../prisma';

const router = Router();

// ── Public ───────────────────────────────────────────────────────────────────

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const faqs = await prisma.faqArticle.findMany({
      where:   { published: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    success(res, faqs, 'FAQs retrieved');
  } catch (err) { next(err); }
});

// ── Admin ────────────────────────────────────────────────────────────────────

router.get('/all', authenticate, authorize(Role.ADMIN), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const faqs = await prisma.faqArticle.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    success(res, faqs, 'All FAQs retrieved');
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize(Role.ADMIN), validate(createHelpArticleSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const faq = await prisma.faqArticle.create({
      data: {
        question:  req.body.question,
        answer:    req.body.answer,
        category:  req.body.category ?? 'General',
        order:     req.body.order    ?? 0,
        published: req.body.published ?? true,
      },
    });
    success(res, faq, 'FAQ created', 201);
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, authorize(Role.ADMIN), validate(updateHelpArticleSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.faqArticle.findUnique({ where: { id: req.params['id']! } });
    if (!existing) throw new AppError('FAQ not found', 404);
    const faq = await prisma.faqArticle.update({ where: { id: req.params['id']! }, data: { ...req.body, updatedAt: new Date() } });
    success(res, faq, 'FAQ updated');
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize(Role.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.faqArticle.findUnique({ where: { id: req.params['id']! } });
    if (!existing) throw new AppError('FAQ not found', 404);
    await prisma.faqArticle.delete({ where: { id: req.params['id']! } });
    success(res, null, 'FAQ deleted');
  } catch (err) { next(err); }
});

router.patch('/:id/publish', authenticate, authorize(Role.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.faqArticle.findUnique({ where: { id: req.params['id']! } });
    if (!existing) throw new AppError('FAQ not found', 404);
    const { published } = req.body as { published: boolean };
    if (typeof published !== 'boolean') throw new AppError('published must be a boolean', 400);
    const faq = await prisma.faqArticle.update({ where: { id: req.params['id']! }, data: { published, updatedAt: new Date() } });
    success(res, faq, published ? 'FAQ published' : 'FAQ unpublished');
  } catch (err) { next(err); }
});

export default router;
