import { Request, Response, NextFunction } from 'express';
import { CampaignStatus, ReferralStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { analyticsService } from '../analytics/analytics.service';
import { success, paginated } from '../../utils/response';
import { AppError } from '../../middleware/error';
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
    await service.removeConversation(req.params['id']!);
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
    const updated = await service.setCreatorVerified(id!, verified);
    return success(res, updated, 'Creator verification badge updated');
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
    const updated = await service.setBusinessVerified(id!, verified);
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
    const updated = await service.rejectBusiness(id!, reason.trim());
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
