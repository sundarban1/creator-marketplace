"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const response_1 = require("../../utils/response");
const prisma_1 = __importDefault(require("../../prisma"));
const router = (0, express_1.Router)();
const contactSchema = zod_1.z.object({
    topic: zod_1.z.string().min(1, 'Topic is required'),
    message: zod_1.z.string().min(10, 'Message must be at least 10 characters'),
});
const reportSchema = zod_1.z.object({
    type: zod_1.z.string().min(1, 'Type is required'),
    description: zod_1.z.string().min(10, 'Description must be at least 10 characters'),
});
const statusSchema = zod_1.z.object({
    status: zod_1.z.string().min(1),
});
// ── Creator: submit contact request ─────────────────────────────────────────
router.post('/contact', auth_1.authenticate, (0, validate_1.validate)(contactSchema), async (req, res, next) => {
    try {
        const request = await prisma_1.default.supportRequest.create({
            data: { userId: req.user.id, topic: req.body.topic, message: req.body.message },
        });
        (0, response_1.success)(res, request, 'Support request submitted', 201);
    }
    catch (err) {
        next(err);
    }
});
// ── Creator: submit issue report ─────────────────────────────────────────────
router.post('/report', auth_1.authenticate, (0, validate_1.validate)(reportSchema), async (req, res, next) => {
    try {
        const report = await prisma_1.default.issueReport.create({
            data: { userId: req.user.id, type: req.body.type, description: req.body.description },
        });
        (0, response_1.success)(res, report, 'Issue reported', 201);
    }
    catch (err) {
        next(err);
    }
});
// ── Admin: list contact requests ─────────────────────────────────────────────
router.get('/contacts', auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN), async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query['page']) || 1);
        const limit = Math.min(100, parseInt(req.query['limit']) || 20);
        const status = req.query['status'];
        const where = status ? { status } : {};
        const [items, total] = await Promise.all([
            prisma_1.default.supportRequest.findMany({
                where,
                include: { user: { select: { email: true, role: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma_1.default.supportRequest.count({ where }),
        ]);
        (0, response_1.paginated)(res, items, total, page, limit);
    }
    catch (err) {
        next(err);
    }
});
// ── Admin: list issue reports ─────────────────────────────────────────────────
router.get('/reports', auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN), async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query['page']) || 1);
        const limit = Math.min(100, parseInt(req.query['limit']) || 20);
        const status = req.query['status'];
        const where = status ? { status } : {};
        const [items, total] = await Promise.all([
            prisma_1.default.issueReport.findMany({
                where,
                include: { user: { select: { email: true, role: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma_1.default.issueReport.count({ where }),
        ]);
        (0, response_1.paginated)(res, items, total, page, limit);
    }
    catch (err) {
        next(err);
    }
});
// ── Admin: update contact status ─────────────────────────────────────────────
router.patch('/contacts/:id/status', auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN), (0, validate_1.validate)(statusSchema), async (req, res, next) => {
    try {
        const item = await prisma_1.default.supportRequest.update({
            where: { id: req.params['id'] },
            data: { status: req.body.status, updatedAt: new Date() },
        });
        (0, response_1.success)(res, item, 'Status updated');
    }
    catch (err) {
        next(err);
    }
});
// ── Admin: update report status ───────────────────────────────────────────────
router.patch('/reports/:id/status', auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN), (0, validate_1.validate)(statusSchema), async (req, res, next) => {
    try {
        const item = await prisma_1.default.issueReport.update({
            where: { id: req.params['id'] },
            data: { status: req.body.status, updatedAt: new Date() },
        });
        (0, response_1.success)(res, item, 'Status updated');
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=support.routes.js.map