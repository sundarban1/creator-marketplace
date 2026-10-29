import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { success } from '../../utils/response';
import { deliverableDeadlineService } from './deliverable-deadline.service';

// Creator / business endpoints for overdue deliverables. Mounted under
// /api/campaigns (see campaign.routes.ts). Every rule is enforced in the
// service under a row lock — these only validate shape and role.

const requestExtensionSchema = z.object({
  reason:           z.string().trim().min(10, 'Please explain why you missed the deadline').max(2000),
  proposedDeadline: z.string().datetime({ message: 'Choose a valid date and time' }),
  previewUrl:       z.string().trim().max(2000).optional().nullable(),
});
const approveExtensionSchema = z.object({
  note:     z.string().trim().max(1000).optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
});
const rejectExtensionSchema = z.object({ note: z.string().trim().min(3, 'Please give a reason').max(1000) });
const cancelOverdueSchema = z.object({ reason: z.string().trim().max(1000).optional().nullable() });

const wrap = (fn: (req: Request) => Promise<unknown>, message: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await fn(req), message);
    } catch (err) {
      next(err);
    }
  };

export function registerDeliverableDeadlineRoutes(router: Router): void {
  router.post(
    '/applications/:appId/extension-requests',
    authenticate, authorize('CREATOR'), validate(requestExtensionSchema),
    wrap((req) => deliverableDeadlineService.requestExtension(req.params.appId, req.user!.id, req.body), 'Extension requested'),
  );
  router.post(
    '/applications/:appId/extension-requests/:extensionId/approve',
    authenticate, authorize('BUSINESS'), validate(approveExtensionSchema),
    wrap((req) => deliverableDeadlineService.approveExtension(req.params.appId, req.params.extensionId, req.user!.id, req.body), 'Extension approved'),
  );
  router.post(
    '/applications/:appId/extension-requests/:extensionId/reject',
    authenticate, authorize('BUSINESS'), validate(rejectExtensionSchema),
    wrap((req) => deliverableDeadlineService.rejectExtension(req.params.appId, req.params.extensionId, req.user!.id, req.body), 'Extension rejected'),
  );
  router.post(
    '/applications/:appId/cancel-overdue',
    authenticate, authorize('BUSINESS'), validate(cancelOverdueSchema),
    wrap((req) => deliverableDeadlineService.cancelOverdue(req.params.appId, req.user!.id, req.body), 'Deliverable cancelled'),
  );
}
