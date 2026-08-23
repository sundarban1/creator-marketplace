import { Request, Response, NextFunction } from 'express';
import { CampaignStatus, ReferralStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { analyticsService } from '../analytics/analytics.service';
import { success, paginated } from '../../utils/response';
import { AppError } from '../../middleware/error';
import { logActivity } from '../logging/activity.service';
import { logAudit } from '../logging/audit.service';
import { ActivityAction, AuditAction, EntityType } from '../logging/logging.constants';
import {
  sendAccountSuspendedEmail,
  sendAccountReactivatedEmail,
  sendAccountDeletedEmail,
} from '../../utils/email';

const service = new AdminService();

function parsePagination(req: Request): { page: number; limit: number } {
  const page  = Math.max(1, parseInt(req.query['page']  as string) || 1);
  const limit = Math.min(100, parseInt(req.query['limit'] as string) || 20);
  return { page, limit };
}

// GET /api/admin/stats
export async function getStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getStats();
    return success(res, data, 'Stats fetched');
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users
export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req);
    const role   = req.query['role']   as string | undefined;
    const search = req.query['search'] as string | undefined;
    const { users, total } = await service.getUsers(page, limit, role, search);
    return paginated(res, users, total, page, limit);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:id/verify
export async function verifyUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id }       = req.params;
    const { verified } = req.body as { verified: boolean };
    if (typeof verified !== 'boolean') throw new AppError('verified must be a boolean', 400);
    const updated = await service.verifyUser(id, verified);
    return success(res, updated, 'User verification updated');
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:id/suspend
export async function suspendUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id }       = req.params;
    const { isActive } = req.body as { isActive: boolean };
    if (typeof isActive !== 'boolean') throw new AppError('isActive must be a boolean', 400);
    const updated = await service.suspendUser(id!, isActive);

    logAudit({
      userId:      id,
      action:      isActive ? AuditAction.ACCOUNT_REACTIVATED : AuditAction.ACCOUNT_SUSPENDED,
      performedBy: req.user!.id,
    });

    const name = updated.email.split('@')[0]!;
    if (!isActive) {
      sendAccountSuspendedEmail(updated.email, name).catch(() => {});
    } else {
      sendAccountReactivatedEmail(updated.email, name).catch(() => {});
    }
    return success(res, updated, isActive ? 'Account reactivated' : 'Account suspended');
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/users/:id
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = await service.getUser(id!);
    await service.removeUser(id!);

    logAudit({
      userId:      id,
      action:      AuditAction.ACCOUNT_DELETED_BY_ADMIN,
      performedBy: req.user!.id,
      oldValue:    { email: user.email },
    });

    sendAccountDeletedEmail(user.email, user.email.split('@')[0]!).catch(() => {});
    return success(res, null, 'User deleted');
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/creators
export async function getCreators(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req);
    const search = req.query['search'] as string | undefined;
    const { creators, total } = await service.getCreators(page, limit, search);
    return paginated(res, creators, total, page, limit);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/businesses
export async function getBusinesses(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req);
    const search = req.query['search'] as string | undefined;
    const { businesses, total } = await service.getBusinesses(page, limit, search);
    return paginated(res, businesses, total, page, limit);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/activity-logs
export async function getActivityLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req);
    const filters = {
      userId: req.query['userId'] as string | undefined,
      action: req.query['action'] as string | undefined,
      from:   req.query['from'] ? new Date(req.query['from'] as string) : undefined,
      to:     req.query['to']   ? new Date(req.query['to']   as string) : undefined,
    };
    const { logs, total } = await service.getActivityLogs(page, limit, filters);
    return paginated(res, logs, total, page, limit);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/audit-logs
export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req);
    const filters = {
      userId: req.query['userId'] as string | undefined,
      action: req.query['action'] as string | undefined,
      from:   req.query['from'] ? new Date(req.query['from'] as string) : undefined,
      to:     req.query['to']   ? new Date(req.query['to']   as string) : undefined,
    };
    const { logs, total } = await service.getAuditLogs(page, limit, filters);
    return paginated(res, logs, total, page, limit);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/campaigns
export async function getCampaigns(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req);
    const status = req.query['status'] as string | undefined;
    const search = req.query['search'] as string | undefined;
    const { campaigns, total } = await service.getCampaigns(page, limit, status, search);
    return paginated(res, campaigns, total, page, limit);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/campaigns/:id
export async function getCampaignDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const campaign = await service.getCampaignDetail(req.params['id']!);
    if (!campaign) throw new AppError('Campaign not found', 404);
    return success(res, campaign, 'Campaign detail fetched');
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/campaigns/:id
export async function updateCampaign(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updated = await service.updateCampaign(id!, req.body);
    return success(res, updated, 'Campaign updated');
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/campaigns/:id/status
export async function updateCampaignStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id }     = req.params;
    const { status } = req.body as { status: string };
    if (!Object.values(CampaignStatus).includes(status as CampaignStatus)) {
      throw new AppError(`Invalid status. Must be one of: ${Object.values(CampaignStatus).join(', ')}`, 400);
    }
    const updated = await service.setCampaignStatus(id, status as CampaignStatus);
    return success(res, updated, 'Campaign status updated');
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/campaigns/:id/approve
export async function approveCampaign(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const campaign = await service.approveCampaign(id);
    return success(res, campaign, 'Campaign approved');
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/campaigns/:id/reject
export async function rejectCampaign(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };
    if (!reason || !reason.trim()) {
      throw new AppError('Rejection reason is required', 400);
    }
    const campaign = await service.rejectCampaign(id, reason.trim());
    return success(res, campaign, 'Campaign rejected');
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/campaigns/:id — soft-deletes the event, force-cascading
// its applications/requirements/invitations regardless of status (see
// AdminService.deleteCampaign).
export async function deleteCampaign(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await service.deleteCampaign(id!);

    logActivity({
      userId:     req.user!.id,
      action:     ActivityAction.CAMPAIGN_DELETED_BY_ADMIN,
      entityType: EntityType.CAMPAIGN,
      entityId:   id,
      metadata: {
        title:               result.title,
        applicationsDeleted: result.applicationsDeleted,
        requirementsDeleted: result.requirementsDeleted,
        invitationsDeleted:  result.invitationsDeleted,
      },
    });

    return success(res, result.campaign, 'Event deleted');
  } catch (err) {
    next(err);
  }
}

// ── Settings ───────────────────────────────────────────────────────────────────

// GET /api/admin/settings
export async function getSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await service.getSettings();
    return success(res, settings, 'Settings fetched');
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/settings
export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = req.body as Record<string, unknown>;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      throw new AppError('Settings must be a flat key-value object', 400);
    }
    await service.updateSettings(settings);
    const updated = await service.getSettings();
    return success(res, updated, 'Settings updated');
  } catch (err) {
    next(err);
  }
}

// ── Conversations ─────────────────────────────────────────────────────────────

// GET /api/admin/conversations/stats
export async function getConversationStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await service.getConversationStats();
    return success(res, stats, 'Conversation stats fetched');
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/conversations
export async function getConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req);
    const status = req.query['status'] as string | undefined;
    const search = req.query['search'] as string | undefined;
    const { conversations, total } = await service.getConversations(page, limit, status, search);
    return paginated(res, conversations, total, page, limit);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/conversations/:id
export async function deleteConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params['id']!;
    await service.removeConversation(id);

    logActivity({ userId: req.user!.id, action: ActivityAction.CONVERSATION_DELETED_BY_ADMIN, entityType: EntityType.CONVERSATION, entityId: id });

    return success(res, null, 'Conversation deleted');
  } catch (err) {
    next(err);
  }
}

// ── Referrals ─────────────────────────────────────────────────────────────────

// GET /api/admin/referrals
export async function getReferrals(req: Request, res: Response, next: NextFunction) {
  try {
    const statusRaw = req.query['status'] as string | undefined;
    if (statusRaw && !Object.values(ReferralStatus).includes(statusRaw as ReferralStatus)) {
      throw new AppError(`Invalid status. Must be one of: ${Object.values(ReferralStatus).join(', ')}`, 400);
    }
    const referrals = await service.listReferrals(statusRaw as ReferralStatus | undefined);
    return success(res, referrals, 'Referrals fetched');
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/referrals/:id/release
export async function releaseReferral(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updated = await service.releaseReferral(id!, req.user!.id);
    return success(res, updated, 'Referral reward released');
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/applications/:id/release-payment
export async function releasePayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updated = await service.releasePayment(id!, req.user!.id);
    return success(res, updated, 'Payment released');
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/analytics/:userId
export async function getUserAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await analyticsService.getAnalyticsForUser(req.params.userId!, req.query['range']);
    return success(res, result, 'Analytics retrieved');
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/creators/:id/verify
export async function verifyCreator(req: Request, res: Response, next: NextFunction) {
  try {
    const { id }       = req.params;
    const { verified } = req.body as { verified: boolean };
    if (typeof verified !== 'boolean') throw new AppError('verified must be a boolean', 400);
    const updated = await service.setCreatorVerified(id!, verified, req.user!.id);
    return success(res, updated, 'Creator verification badge updated');
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/creators/:id/documents/:doc
export async function setCreatorDocumentStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, doc }  = req.params;
    const { approved } = req.body as { approved: boolean };
    // 'companyReg' is the AGENCY provider's registration document — without it
    // here an agency could upload a document no admin could ever act on,
    // leaving it stuck at PENDING and permanently unverifiable.
    if (doc !== 'citizenship' && doc !== 'pan' && doc !== 'companyReg') {
      throw new AppError('doc must be "citizenship", "pan" or "companyReg"', 400);
    }
    if (typeof approved !== 'boolean') throw new AppError('approved must be a boolean', 400);
    const updated = await service.setCreatorDocumentStatus(id!, doc, approved);
    return success(res, updated, 'Document status updated');
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/businesses/:id/documents/:doc
export async function setBusinessDocumentStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, doc }  = req.params;
    const { approved } = req.body as { approved: boolean };
    if (doc !== 'pan' && doc !== 'companyReg' && doc !== 'identity') {
      throw new AppError('doc must be "pan", "companyReg" or "identity"', 400);
    }
    if (typeof approved !== 'boolean') throw new AppError('approved must be a boolean', 400);
    const updated = await service.setBusinessDocumentStatus(id!, doc, approved);
    return success(res, updated, 'Document status updated');
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/verification/providers
export async function getProviderVerificationQueue(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req);
    const { items, total } = await service.getProviderVerificationQueue(page, limit);
    return paginated(res, items, total, page, limit);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/verification/businesses
export async function getBusinessVerificationQueue(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req);
    const { items, total } = await service.getBusinessVerificationQueue(page, limit);
    return paginated(res, items, total, page, limit);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/creators/:id/reject
export async function rejectCreator(req: Request, res: Response, next: NextFunction) {
  try {
    const { id }     = req.params;
    const { reason } = req.body as { reason: string };
    if (!reason?.trim()) throw new AppError('reason is required', 400);
    const updated = await service.rejectCreator(id!, reason.trim(), req.user!.id);
    return success(res, updated, 'Creator verification rejected');
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/businesses/:id/verify
export async function verifyBusiness(req: Request, res: Response, next: NextFunction) {
  try {
    const { id }       = req.params;
    const { verified } = req.body as { verified: boolean };
    if (typeof verified !== 'boolean') throw new AppError('verified must be a boolean', 400);
    const updated = await service.setBusinessVerified(id!, verified, req.user!.id);
    return success(res, updated, 'Business verification badge updated');
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/businesses/:id/reject
export async function rejectBusiness(req: Request, res: Response, next: NextFunction) {
  try {
    const { id }     = req.params;
    const { reason } = req.body as { reason: string };
    if (!reason?.trim()) throw new AppError('reason is required', 400);
    const updated = await service.rejectBusiness(id!, reason.trim(), req.user!.id);
    return success(res, updated, 'Business verification rejected');
  } catch (err) {
    next(err);
  }
}

// ── Business Referrals ───────────────────────────────────────────────────────

// GET /api/admin/business-referrals
export async function getBusinessReferrals(req: Request, res: Response, next: NextFunction) {
  try {
    const statusRaw = req.query['status'] as string | undefined;
    if (statusRaw && !Object.values(ReferralStatus).includes(statusRaw as ReferralStatus)) {
      throw new AppError(`Invalid status. Must be one of: ${Object.values(ReferralStatus).join(', ')}`, 400);
    }
    const referrals = await service.listBusinessReferrals(statusRaw as ReferralStatus | undefined);
    return success(res, referrals, 'Business referrals fetched');
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/business-referrals/:id/release
export async function releaseBusinessReferral(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updated = await service.releaseBusinessReferral(id!, req.user!.id);
    return success(res, updated, 'Referral reward released');
  } catch (err) {
    next(err);
  }
}

// ── Payments ─────────────────────────────────────────────────────────────────

// GET /api/admin/payments
export async function getPayments(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req);
    const type   = req.query['type']   as string | undefined;
    const search = req.query['search'] as string | undefined;
    const { transactions, total } = await service.getPayments(page, limit, type, search);
    return paginated(res, transactions, total, page, limit);
  } catch (err) {
    next(err);
  }
}
