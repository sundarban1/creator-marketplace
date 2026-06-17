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
const error_1 = require("../../middleware/error");
const prisma_1 = __importDefault(require("../../prisma"));
const router = (0, express_1.Router)();
const VALID_TYPES = ['PRIVACY_POLICY', 'TERMS', 'GUIDELINES'];
const TYPE_MAP = {
    'privacy-policy': 'PRIVACY_POLICY',
    'terms': 'TERMS',
    'guidelines': 'GUIDELINES',
};
const sectionSchema = zod_1.z.object({
    type: zod_1.z.enum(VALID_TYPES),
    title: zod_1.z.string().min(2, 'Title required'),
    body: zod_1.z.string().min(10, 'Body required'),
    icon: zod_1.z.string().optional().nullable(),
    order: zod_1.z.number().int().min(0).optional(),
    published: zod_1.z.boolean().optional(),
});
const updateSchema = sectionSchema.partial().omit({ type: true });
// ── Public: mobile fetches by type slug ──────────────────────────────────────
router.get('/:typeSlug', async (req, res, next) => {
    try {
        const legalType = TYPE_MAP[req.params['typeSlug']];
        if (!legalType)
            throw new error_1.AppError('Unknown legal document type', 404);
        const sections = await prisma_1.default.legalSection.findMany({
            where: { type: legalType, published: true },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        });
        // Return along with the last-updated timestamp
        const lastUpdated = sections.reduce((max, s) => {
            return !max || s.updatedAt > max ? s.updatedAt : max;
        }, null);
        (0, response_1.success)(res, { sections, lastUpdated }, 'Legal document retrieved');
    }
    catch (err) {
        next(err);
    }
});
// ── Admin: list all sections (any type) ──────────────────────────────────────
router.get('/', auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN), async (req, res, next) => {
    try {
        const type = req.query['type'];
        const where = type ? { type } : {};
        const sections = await prisma_1.default.legalSection.findMany({
            where,
            orderBy: [{ type: 'asc' }, { order: 'asc' }],
        });
        (0, response_1.success)(res, sections, 'Sections retrieved');
    }
    catch (err) {
        next(err);
    }
});
// ── Admin: create ─────────────────────────────────────────────────────────────
router.post('/', auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN), (0, validate_1.validate)(sectionSchema), async (req, res, next) => {
    try {
        const section = await prisma_1.default.legalSection.create({
            data: {
                type: req.body.type,
                title: req.body.title,
                body: req.body.body,
                icon: req.body.icon ?? null,
                order: req.body.order ?? 0,
                published: req.body.published ?? true,
            },
        });
        (0, response_1.success)(res, section, 'Section created', 201);
    }
    catch (err) {
        next(err);
    }
});
// ── Admin: update ─────────────────────────────────────────────────────────────
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN), (0, validate_1.validate)(updateSchema), async (req, res, next) => {
    try {
        const existing = await prisma_1.default.legalSection.findUnique({ where: { id: req.params['id'] } });
        if (!existing)
            throw new error_1.AppError('Section not found', 404);
        const section = await prisma_1.default.legalSection.update({
            where: { id: req.params['id'] },
            data: { ...req.body, updatedAt: new Date() },
        });
        (0, response_1.success)(res, section, 'Section updated');
    }
    catch (err) {
        next(err);
    }
});
// ── Admin: delete ─────────────────────────────────────────────────────────────
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN), async (req, res, next) => {
    try {
        const existing = await prisma_1.default.legalSection.findUnique({ where: { id: req.params['id'] } });
        if (!existing)
            throw new error_1.AppError('Section not found', 404);
        await prisma_1.default.legalSection.delete({ where: { id: req.params['id'] } });
        (0, response_1.success)(res, null, 'Section deleted');
    }
    catch (err) {
        next(err);
    }
});
// ── Admin: toggle published ───────────────────────────────────────────────────
router.patch('/:id/publish', auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN), async (req, res, next) => {
    try {
        const existing = await prisma_1.default.legalSection.findUnique({ where: { id: req.params['id'] } });
        if (!existing)
            throw new error_1.AppError('Section not found', 404);
        const { published } = req.body;
        if (typeof published !== 'boolean')
            throw new error_1.AppError('published must be a boolean', 400);
        const section = await prisma_1.default.legalSection.update({
            where: { id: req.params['id'] },
            data: { published, updatedAt: new Date() },
        });
        (0, response_1.success)(res, section, published ? 'Section published' : 'Section unpublished');
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=legal.routes.js.map