import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadImage } from '../../middleware/upload';
import { success } from '../../utils/response';
import { refundAdminService, TRANSFER_METHODS } from './refund.admin.service';
import { listAdminProposals, PROPOSAL_FILTERS, type ProposalFilter } from './proposals.admin.service';
import { deliverableDeadlineService } from '../campaign/deliverable-deadline.service';
import { reopenApplications } from '../campaign/proposal-deadline.service';

// Admin-only. Mounted at /api/admin/refunds and /api/admin/deadlines
// (routes/index.ts). Every financial rule lives in the services; these only
// check role and shape.

const wrap = (fn: (req: Request) => Promise<unknown>, message: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await fn(req), message);
    } catch (err) {
      next(err);
    }
  };

const page = (req: Request) => Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
const limit = (req: Request) => Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10) || 20));
const str = (req: Request, k: string) => (typeof req.query[k] === 'string' && req.query[k] ? String(req.query[k]) : undefined);

const recipientSchema = z.object({
  recipientName:   z.string().trim().min(2).max(200),
  recipientMethod: z.enum(TRANSFER_METHODS),
  account:         z.record(z.string().trim().max(200)).refine((a) => Object.values(a).some((v) => v), 'Account details are required'),
  verified:        z.literal(true, { errorMap: () => ({ message: 'Confirm the recipient has been verified' }) }),
});
const approveSchema = z.object({
  note:   z.string().trim().max(1000).optional().nullable(),
  amount: z.coerce.number().positive().optional().nullable(),
});
const reasonSchema = z.object({ reason: z.string().trim().min(3, 'A reason is required').max(1000) });
const noteSchema = z.object({ note: z.string().trim().max(1000).optional().nullable() });
const completeSchema = z.object({
  transferMethod:    z.enum(TRANSFER_METHODS),
  amount:            z.coerce.number().positive('Amount must be greater than zero'),
  currency:          z.string().trim().default('NPR'),
  transferredAt:     z.coerce.date({ errorMap: () => ({ message: 'A valid transfer date is required' }) }),
  transferReference: z.string().trim().min(1, 'The transaction reference is required').max(200),
  adminNotes:        z.string().trim().max(2000).optional().nullable(),
});
const exceptionalSchema = z.object({
  newDeadline:     z.string().datetime({ message: 'Choose a valid date and time' }),
  reason:          z.string().trim().min(5, 'A reason is required').max(2000),
  businessConsent: z.literal(true, { errorMap: () => ({ message: 'The business must consent to an exceptional extension' }) }),
});
const reopenSchema = z.object({
  applicationDeadline: z.string().datetime({ message: 'Choose a valid date and time' }),
  reason:              z.string().trim().min(5, 'A reason is required').max(2000),
});

export const refundAdminRoutes = Router();
refundAdminRoutes.use(authenticate, authorize(Role.ADMIN));
refundAdminRoutes.get('/', wrap((req) => refundAdminService.list({
  page: page(req), limit: limit(req), status: str(req, 'status'), search: str(req, 'search'),
  reasonCode: str(req, 'reasonCode'), paymentMethod: str(req, 'paymentMethod'), from: str(req, 'from'), to: str(req, 'to'),
  sort: str(req, 'sort') === 'amount' ? 'amount' : 'createdAt', order: str(req, 'order') === 'asc' ? 'asc' : 'desc',
}), 'Refund requests retrieved'));
refundAdminRoutes.get('/:id', wrap((req) => refundAdminService.detail(req.params.id), 'Refund request retrieved'));
refundAdminRoutes.post('/:id/recipient', validate(recipientSchema), wrap((req) => refundAdminService.setRecipient(req.params.id, req.user!.id, req.body), 'Recipient verified'));
refundAdminRoutes.post('/:id/approve', validate(approveSchema), wrap((req) => refundAdminService.approve(req.params.id, req.user!.id, req.body), 'Refund approved'));
refundAdminRoutes.post('/:id/reject', validate(reasonSchema), wrap((req) => refundAdminService.reject(req.params.id, req.user!.id, req.body), 'Refund rejected'));
refundAdminRoutes.post('/:id/process', validate(noteSchema), wrap((req) => refundAdminService.startProcessing(req.params.id, req.user!.id, req.body), 'Refund moved to processing'));
refundAdminRoutes.post('/:id/fail', validate(reasonSchema), wrap((req) => refundAdminService.fail(req.params.id, req.user!.id, req.body), 'Refund marked as failed'));
// multer first so text fields land in req.body; the proof image is optional.
refundAdminRoutes.post('/:id/complete', uploadImage.single('proof'), validate(completeSchema),
  wrap((req) => refundAdminService.complete(req.params.id, req.user!.id, req.body, req.file?.buffer), 'Refund completed'));

export const deadlineAdminRoutes = Router();
deadlineAdminRoutes.use(authenticate, authorize(Role.ADMIN));
deadlineAdminRoutes.get('/proposals', wrap((req) => {
  const f = str(req, 'filter');
  const sort = str(req, 'sort');
  return listAdminProposals({
    filter: (PROPOSAL_FILTERS as readonly string[]).includes(f ?? '') ? (f as ProposalFilter) : 'all',
    search: str(req, 'search'),
    sort: sort === 'deadline' || sort === 'createdAt' ? sort : 'submittedAt',
    order: str(req, 'order') === 'asc' ? 'asc' : 'desc',
    page: page(req), limit: limit(req),
  });
}, 'Proposals retrieved'));
deadlineAdminRoutes.post('/deliverables/:appId/exceptional-extension', validate(exceptionalSchema),
  wrap((req) => deliverableDeadlineService.grantExceptionalExtension(req.params.appId, req.user!.id, req.body), 'Exceptional extension granted'));
deadlineAdminRoutes.post('/campaigns/:id/reopen-applications', validate(reopenSchema),
  wrap((req) => reopenApplications(req.params.id, req.user!.id, req.body), 'Applications reopened'));
