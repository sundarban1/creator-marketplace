"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCampaignPrefsSchema = exports.updatePaymentMethodsSchema = exports.updateSocialAccountSchema = exports.addSocialAccountSchema = exports.updateSocialLinksSchema = exports.addPortfolioLinkSchema = exports.updateCreatorProfileSchema = void 0;
const zod_1 = require("zod");
const VALID_PLATFORMS = [
    'instagram', 'tiktok', 'youtube', 'facebook',
    'twitter', 'linkedin', 'pinterest', 'snapchat', 'twitch',
];
exports.updateCreatorProfileSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed').optional(),
    fullName: zod_1.z.string().min(2).optional(),
    bio: zod_1.z.string().max(500).optional(),
    location: zod_1.z.string().optional(),
    locationLat: zod_1.z.number().optional(),
    locationLng: zod_1.z.number().optional(),
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
exports.addSocialAccountSchema = zod_1.z.object({
    platform: zod_1.z.enum(VALID_PLATFORMS, { errorMap: () => ({ message: 'Invalid platform' }) }),
    profileUrl: zod_1.z.string().url('Invalid profile URL'),
    followers: zod_1.z.number().int('Must be a whole number').min(0, 'Cannot be negative'),
});
exports.updateSocialAccountSchema = zod_1.z.object({
    profileUrl: zod_1.z.string().url('Invalid profile URL').optional(),
    followers: zod_1.z.number().int('Must be a whole number').min(0, 'Cannot be negative').optional(),
});
const VALID_PAYMENT_METHODS = ['esewa', 'khalti', 'fonepay'];
exports.updatePaymentMethodsSchema = zod_1.z.object({
    methods: zod_1.z.array(zod_1.z.enum(VALID_PAYMENT_METHODS)).min(0),
});
const VALID_PREF_PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Facebook'];
const VALID_LOCATIONS = ['Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur', 'Butwal', 'Biratnagar', 'Remote'];
exports.updateCampaignPrefsSchema = zod_1.z.object({
    categories: zod_1.z.array(zod_1.z.string()).max(5, 'Max 5 categories').optional(),
    prefPlatforms: zod_1.z.array(zod_1.z.enum(VALID_PREF_PLATFORMS)).optional(),
    prefLocations: zod_1.z.array(zod_1.z.enum(VALID_LOCATIONS)).max(3, 'Max 3 locations').optional(),
    prefBudgetMin: zod_1.z.number().min(0).optional(),
    prefBudgetMax: zod_1.z.number().min(0).optional(),
});
//# sourceMappingURL=creator.schema.js.map