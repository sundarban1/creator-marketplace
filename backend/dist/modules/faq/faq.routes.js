"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const response_1 = require("../../utils/response");
const error_1 = require("../../middleware/error");
const help_schema_1 = require("../help/help.schema");
const prisma_1 = __importDefault(require("../../prisma"));
const router = (0, express_1.Router)();
// ── Public ───────────────────────────────────────────────────────────────────
router.get('/', async (_req, res, next) => {
    try {
        const faqs = await prisma_1.default.faqArticle.findMany({
            where: { published: true },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        });
        (0, response_1.success)(res, faqs, 'FAQs retrieved');
    }
    catch (err) {
        next(err);
    }
});
// ── Admin ────────────────────────────────────────────────────────────────────
router.get('/all', auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN), async (_req, res, next) => {
    try {
        const faqs = await prisma_1.default.faqArticle.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
        (0, response_1.success)(res, faqs, 'All FAQs retrieved');
    }
    catch (err) {
        next(err);
    }
});
router.post('/', auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN), (0, validate_1.validate)(help_schema_1.createHelpArticleSchema), async (req, res, next) => {
    try {
        const faq = await prisma_1.default.faqArticle.create({
            data: {
                question: req.body.question,
                answer: req.body.answer,
                category: req.body.category ?? 'General',
                order: req.body.order ?? 0,
                published: req.body.published ?? true,
            },
        });
        (0, response_1.success)(res, faq, 'FAQ created', 201);
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN), (0, validate_1.validate)(help_schema_1.updateHelpArticleSchema), async (req, res, next) => {
    try {
        const existing = await prisma_1.default.faqArticle.findUnique({ where: { id: req.params['id'] } });
        if (!existing)
            throw new error_1.AppError('FAQ not found', 404);
        const faq = await prisma_1.default.faqArticle.update({ where: { id: req.params['id'] }, data: { ...req.body, updatedAt: new Date() } });
        (0, response_1.success)(res, faq, 'FAQ updated');
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN), async (req, res, next) => {
    try {
        const existing = await prisma_1.default.faqArticle.findUnique({ where: { id: req.params['id'] } });
        if (!existing)
            throw new error_1.AppError('FAQ not found', 404);
        await prisma_1.default.faqArticle.delete({ where: { id: req.params['id'] } });
        (0, response_1.success)(res, null, 'FAQ deleted');
    }
    catch (err) {
        next(err);
    }
});
router.patch('/:id/publish', auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN), async (req, res, next) => {
    try {
        const existing = await prisma_1.default.faqArticle.findUnique({ where: { id: req.params['id'] } });
        if (!existing)
            throw new error_1.AppError('FAQ not found', 404);
        const { published } = req.body;
        if (typeof published !== 'boolean')
            throw new error_1.AppError('published must be a boolean', 400);
        const faq = await prisma_1.default.faqArticle.update({ where: { id: req.params['id'] }, data: { published, updatedAt: new Date() } });
        (0, response_1.success)(res, faq, published ? 'FAQ published' : 'FAQ unpublished');
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=faq.routes.js.map