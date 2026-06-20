"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyToCampaignSchema = exports.campaignListQuerySchema = exports.updateCampaignSchema = exports.createCampaignSchema = void 0;
const zod_1 = require("zod");
exports.createCampaignSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, 'Title must be at least 3 characters'),
    description: zod_1.z.string().default(''),
    template: zod_1.z.string().optional(),
    category: zod_1.z.string().min(1, 'Category is required'),
    goals: zod_1.z.array(zod_1.z.string()).default([]),
    platform: zod_1.z.string().min(1, 'Platform is required'),
    minFollowers: zod_1.z.number().int().min(0).default(0),
    contentType: zod_1.z.string().default(''),
    deliverables: zod_1.z.string().default(''),
    deadline: zod_1.z.string().datetime({ message: 'Invalid deadline date' }),
    location: zod_1.z.string().optional(),
    budgetMin: zod_1.z.number().min(0, 'Budget minimum must be non-negative'),
    budgetMax: zod_1.z.number().min(0, 'Budget maximum must be non-negative'),
    paymentType: zod_1.z.string().min(1, 'Payment type is required'),
    creatorsNeeded: zod_1.z.number().int().positive().default(1),
    isFeatured: zod_1.z.boolean().optional().default(false),
}).refine((data) => data.budgetMax >= data.budgetMin, {
    message: 'Budget maximum must be greater than or equal to budget minimum',
    path: ['budgetMax'],
});
exports.updateCampaignSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).optional(),
    description: zod_1.z.string().min(10).optional(),
    template: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    goals: zod_1.z.array(zod_1.z.string()).optional(),
    platform: zod_1.z.string().optional(),
    minFollowers: zod_1.z.number().int().min(0).optional(),
    contentType: zod_1.z.string().optional(),
    deliverables: zod_1.z.string().optional(),
    deadline: zod_1.z.string().datetime().optional(),
    location: zod_1.z.string().optional().nullable(),
    budgetMin: zod_1.z.number().min(0).optional(),
    budgetMax: zod_1.z.number().min(0).optional(),
    paymentType: zod_1.z.string().optional(),
    creatorsNeeded: zod_1.z.number().int().positive().optional(),
    status: zod_1.z.enum(['ACTIVE', 'PAUSED', 'CLOSED']).optional(),
    isFeatured: zod_1.z.boolean().optional(),
});
exports.campaignListQuerySchema = zod_1.z.object({
    category: zod_1.z.string().optional(),
    platform: zod_1.z.string().optional(),
    minBudget: zod_1.z.string().optional().transform((v) => (v ? parseFloat(v) : undefined)),
    maxBudget: zod_1.z.string().optional().transform((v) => (v ? parseFloat(v) : undefined)),
    status: zod_1.z.enum(['ACTIVE', 'PAUSED', 'CLOSED']).optional(),
    isFeatured: zod_1.z.string().optional().transform((v) => v === 'true' ? true : v === 'false' ? false : undefined),
    deadlineFrom: zod_1.z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
    deadlineTo: zod_1.z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
    page: zod_1.z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
    limit: zod_1.z.string().optional().transform((v) => (v ? parseInt(v) : 10)),
});
exports.applyToCampaignSchema = zod_1.z.object({
    coverLetter: zod_1.z.string().min(50, 'Cover letter must be at least 50 characters'),
    proposedRate: zod_1.z.number().positive('Proposed rate must be positive'),
    timeline: zod_1.z.string().min(1, 'Timeline is required'),
    socialHandles: zod_1.z.record(zod_1.z.string()).default({}),
    portfolioUrl: zod_1.z.string().url('Invalid portfolio URL').optional(),
});
//# sourceMappingURL=campaign.schema.js.map