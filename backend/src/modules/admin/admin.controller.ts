import { Request, Response, NextFunction } from 'express';
import { CampaignStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { success, paginated } from '../../utils/response';
import { AppError } from '../../middleware/error';

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

// DELETE /api/admin/users/:id
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    await service.removeUser(req.params['id']!);
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
