"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSocialLinksSchema = exports.addPortfolioLinkSchema = exports.updateCreatorProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateCreatorProfileSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2).optional(),
    bio: zod_1.z.string().max(500).optional(),
    location: zod_1.z.string().optional(),
    avatarUrl: zod_1.z.string().url('Invalid avatar URL').optional(),
    categories: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.addPortfolioLinkSchema = zod_1.z.object({
    label: zod_1.z.string().min(1, 'Label is required'),
    url: zod_1.z.string().url('Invalid URL'),
});
exports.updateSocialLinksSchema = zod_1.z.object({
    instagram: zod_1.z.string().url('Invalid Instagram URL').optional().nullable(),
    tiktok: zod_1.z.string().url('Invalid TikTok URL').optional().nullable(),
    youtube: zod_1.z.string().url('Invalid YouTube URL').optional().nullable(),
    facebook: zod_1.z.string().url('Invalid Facebook URL').optional().nullable(),
});
//# sourceMappingURL=creator.schema.js.map