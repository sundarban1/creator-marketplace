"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const response_1 = require("../../utils/response");
const error_1 = require("../../middleware/error");
const help_repository_1 = require("./help.repository");
const help_schema_1 = require("./help.schema");
const router = (0, express_1.Router)();
const repo = new help_repository_1.HelpRepository();
// ── Public: mobile app fetches this ─────────────────────────────────────────
router.get('/', async (_req, res, next) => {
    try {
        const articles = await repo.listPublished();
        (0, response_1.success)(res, articles, 'Help articles retrieved');
    }
    catch (err) {
        next(err);
    }
});
// ── Admin: all mutations require ADMIN role ──────────────────────────────────
router.get('/all', auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN), async (_req, res, next) => {
    try {
        const articles = await repo.listAll();
        (0, response_1.success)(res, articles, 'All help articles retrieved');
    }
    catch (err) {
        next(err);
    }
});
router.post('/', auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN), (0, validate_1.validate)(help_schema_1.createHelpArticleSchema), async (req, res, next) => {
    try {
        const article = await repo.create(req.body);
        (0, response_1.success)(res, article, 'Help article created', 201);
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN), (0, validate_1.validate)(help_schema_1.updateHelpArticleSchema), async (req, res, next) => {
    try {
        const existing = await repo.findById(req.params['id']);
        if (!existing)
            throw new error_1.AppError('Help article not found', 404);
        const article = await repo.update(req.params['id'], req.body);
        (0, response_1.success)(res, article, 'Help article updated');
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN), async (req, res, next) => {
    try {
        const existing = await repo.findById(req.params['id']);
        if (!existing)
            throw new error_1.AppError('Help article not found', 404);
        await repo.delete(req.params['id']);
        (0, response_1.success)(res, null, 'Help article deleted');
    }
    catch (err) {
        next(err);
    }
});
router.patch('/:id/publish', auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN), async (req, res, next) => {
    try {
        const existing = await repo.findById(req.params['id']);
        if (!existing)
            throw new error_1.AppError('Help article not found', 404);
        const { published } = req.body;
        if (typeof published !== 'boolean')
            throw new error_1.AppError('published must be a boolean', 400);
        const article = await repo.togglePublished(req.params['id'], published);
        (0, response_1.success)(res, article, `Help article ${published ? 'published' : 'unpublished'}`);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=help.routes.js.map