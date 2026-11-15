// /api/blocks           — any signed-in user manages their own blocks.
// /api/admin/moderation — ADMIN-only report queue, investigation + actions.
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { success } from '../../utils/response';
import { blockService } from './block.service';
import { moderationAdminService, type ReportListQuery } from './moderation.admin.service';

type H = (req: Request, res: Response) => Promise<unknown>;
const wrap = (fn: H, message = 'OK') => async (req: Request, res: Response, next: NextFunction) => {
  try { success(res, await fn(req, res), message); } catch (err) { next(err); }
};

// ── User: blocks ──────────────────────────────────────────────────────────
export const blockRoutes = Router();
blockRoutes.use(authenticate);

const blockSchema = z.object({
  userId: z.string().trim().min(1).max(64),
  source: z.enum(['profile', 'chat', 'competition', 'event', 'other']).optional(),
  conversationId: z.string().max(64).optional(),
});

blockRoutes.get('/', wrap((req) => blockService.list(req.user!.id), 'Blocked users'));
blockRoutes.get('/ids', wrap((req) => blockService.blockedIds(req.user!.id)));
blockRoutes.get('/status/:userId', wrap((req) => blockService.status(req.user!.id, req.params.userId!)));
blockRoutes.post('/', validate(blockSchema), wrap((req) =>
  blockService.block(req.user!.id, req.body.userId, { source: req.body.source, conversationId: req.body.conversationId }), 'User blocked'));
blockRoutes.delete('/:userId', wrap((req) => blockService.unblock(req.user!.id, req.params.userId!), 'User unblocked'));

// ── Admin: moderation ─────────────────────────────────────────────────────
export const moderationAdminRoutes = Router();
moderationAdminRoutes.use(authenticate, authorize('ADMIN'));

const STATUSES = ['NEW', 'UNDER_REVIEW', 'NEEDS_MORE_INFO', 'ACTION_TAKEN', 'DISMISSED', 'RESOLVED'] as const;
const TARGETS = ['USER', 'BUSINESS', 'SERVICE', 'OPPORTUNITY', 'POST', 'MESSAGE', 'REVIEW', 'COMPETITION', 'COMPETITION_SUBMISSION', 'PORTFOLIO_ITEM', 'DELIVERABLE'] as const;
const REASONS = ['HARASSMENT', 'HATE_SPEECH', 'INAPPROPRIATE_CONTENT', 'VIOLENCE', 'SPAM', 'SCAM', 'COPYRIGHT', 'EXPLOITATION', 'AGE_INAPPROPRIATE', 'OTHER', 'FRAUD', 'FAKE_PROFILE', 'PAYMENT_ISSUE', 'SEXUAL_CONTENT', 'ILLEGAL_CONTENT'] as const;

const listQuery = z.object({
  view: z.enum(['open', 'closed', 'all']).optional(),
  status: z.enum(STATUSES).optional(),
  reason: z.enum(REASONS).optional(),
  targetType: z.enum(TARGETS).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  assigned: z.string().max(64).optional(),
  reportedUserId: z.string().max(64).optional(),
  reporterId: z.string().max(64).optional(),
  q: z.string().trim().max(120).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
const note = z.string().trim().max(2000);

moderationAdminRoutes.get('/stats', wrap(() => moderationAdminService.stats()));
moderationAdminRoutes.get('/moderators', wrap(() => moderationAdminService.moderators()));
moderationAdminRoutes.get('/reports', validate(listQuery, 'query'), wrap((req) =>
  moderationAdminService.listReports(req.query as unknown as ReportListQuery, req.user!.id)));
moderationAdminRoutes.get('/reports/:id', wrap((req) => moderationAdminService.getReport(req.params.id!, req.user!.id)));

moderationAdminRoutes.post('/reports/:id/assign', validate(z.object({ assigneeId: z.string().max(64).nullable().optional() })), wrap((req) =>
  // Omitted = assign to me; explicit null = unassign.
  moderationAdminService.assign(req.params.id!, req.user!.id, req.body.assigneeId === undefined ? req.user!.id : req.body.assigneeId), 'Report assigned'));
moderationAdminRoutes.post('/reports/:id/start-review', wrap((req) => moderationAdminService.startReview(req.params.id!, req.user!.id), 'Review started'));
moderationAdminRoutes.post('/reports/:id/verify', validate(z.object({
  decision: z.enum(['VALID', 'INVALID', 'NEEDS_MORE_INFORMATION']),
  note: note.min(3, 'Add a short note explaining the decision'),
})), wrap((req) => moderationAdminService.verify(req.params.id!, req.user!.id, req.body.decision, req.body.note), 'Decision recorded'));
moderationAdminRoutes.post('/reports/:id/actions', validate(z.object({
  action: z.enum(['REMOVE_CONTENT', 'RESTORE_CONTENT', 'WARN_USER', 'RESTRICT_MESSAGING', 'SUSPEND_TEMPORARY', 'SUSPEND_PERMANENT', 'LIFT_RESTRICTIONS', 'NO_ACTION']),
  reason: z.string().trim().min(3, 'A reason is required').max(500),
  notes: note.optional(),
  durationDays: z.number().int().min(1).max(365).optional(),
  interim: z.boolean().optional(),
  confirm: z.boolean().optional(),
})), wrap((req) => moderationAdminService.takeAction(req.params.id!, req.user!.id, req.body), 'Action applied'));
moderationAdminRoutes.post('/reports/:id/dismiss', validate(z.object({ note: note.min(3) })), wrap((req) =>
  moderationAdminService.dismiss(req.params.id!, req.user!.id, req.body.note), 'Report dismissed'));
moderationAdminRoutes.post('/reports/:id/resolve', validate(z.object({ note: note.optional(), notifyReporter: z.boolean().default(true) })), wrap((req) =>
  moderationAdminService.resolve(req.params.id!, req.user!.id, req.body.note, req.body.notifyReporter), 'Report resolved'));

moderationAdminRoutes.get('/events', validate(z.object({
  type: z.enum(['USER_BLOCKED', 'USER_UNBLOCKED', 'CONTENT_AUTO_REJECTED', 'CONTENT_HELD_FOR_REVIEW', 'MODERATION_SERVICE_ERROR']).optional(),
  reviewed: z.enum(['yes', 'no']).optional(),
  targetUserId: z.string().max(64).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}), 'query'), wrap((req) => moderationAdminService.listEvents(req.query as never)));
moderationAdminRoutes.post('/events/:id/review', validate(z.object({ note: note.optional() })), wrap((req) =>
  moderationAdminService.reviewEvent(req.params.id!, req.user!.id, req.body.note), 'Marked reviewed'));
moderationAdminRoutes.get('/users/:userId/history', wrap((req) => moderationAdminService.userHistory(req.params.userId!)));
