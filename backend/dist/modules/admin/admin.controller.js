"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = getStats;
exports.getUsers = getUsers;
exports.verifyUser = verifyUser;
exports.deleteUser = deleteUser;
exports.getCreators = getCreators;
exports.getBusinesses = getBusinesses;
exports.getCampaigns = getCampaigns;
exports.updateCampaignStatus = updateCampaignStatus;
const client_1 = require("@prisma/client");
const admin_service_1 = require("./admin.service");
const response_1 = require("../../utils/response");
const error_1 = require("../../middleware/error");
const service = new admin_service_1.AdminService();
function parsePagination(req) {
    const page = Math.max(1, parseInt(req.query['page']) || 1);
    const limit = Math.min(100, parseInt(req.query['limit']) || 20);
    return { page, limit };
}
// GET /api/admin/stats
async function getStats(_req, res, next) {
    try {
        const data = await service.getStats();
        return (0, response_1.success)(res, data, 'Stats fetched');
    }
    catch (err) {
        next(err);
    }
}
// GET /api/admin/users
async function getUsers(req, res, next) {
    try {
        const { page, limit } = parsePagination(req);
        const role = req.query['role'];
        const search = req.query['search'];
        const { users, total } = await service.getUsers(page, limit, role, search);
        return (0, response_1.paginated)(res, users, total, page, limit);
    }
    catch (err) {
        next(err);
    }
}
// PATCH /api/admin/users/:id/verify
async function verifyUser(req, res, next) {
    try {
        const { id } = req.params;
        const { verified } = req.body;
        if (typeof verified !== 'boolean')
            throw new error_1.AppError('verified must be a boolean', 400);
        const updated = await service.verifyUser(id, verified);
        return (0, response_1.success)(res, updated, 'User verification updated');
    }
    catch (err) {
        next(err);
    }
}
// DELETE /api/admin/users/:id
async function deleteUser(req, res, next) {
    try {
        await service.removeUser(req.params['id']);
        return (0, response_1.success)(res, null, 'User deleted');
    }
    catch (err) {
        next(err);
    }
}
// GET /api/admin/creators
async function getCreators(req, res, next) {
    try {
        const { page, limit } = parsePagination(req);
        const search = req.query['search'];
        const { creators, total } = await service.getCreators(page, limit, search);
        return (0, response_1.paginated)(res, creators, total, page, limit);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/admin/businesses
async function getBusinesses(req, res, next) {
    try {
        const { page, limit } = parsePagination(req);
        const search = req.query['search'];
        const { businesses, total } = await service.getBusinesses(page, limit, search);
        return (0, response_1.paginated)(res, businesses, total, page, limit);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/admin/campaigns
async function getCampaigns(req, res, next) {
    try {
        const { page, limit } = parsePagination(req);
        const status = req.query['status'];
        const search = req.query['search'];
        const { campaigns, total } = await service.getCampaigns(page, limit, status, search);
        return (0, response_1.paginated)(res, campaigns, total, page, limit);
    }
    catch (err) {
        next(err);
    }
}
// PATCH /api/admin/campaigns/:id/status
async function updateCampaignStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!Object.values(client_1.CampaignStatus).includes(status)) {
            throw new error_1.AppError(`Invalid status. Must be one of: ${Object.values(client_1.CampaignStatus).join(', ')}`, 400);
        }
        const updated = await service.setCampaignStatus(id, status);
        return (0, response_1.success)(res, updated, 'Campaign status updated');
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=admin.controller.js.map