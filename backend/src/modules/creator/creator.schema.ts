import { z } from 'zod';

const VALID_PLATFORMS = [
  'instagram', 'tiktok', 'youtube', 'facebook',
  'twitter', 'linkedin', 'pinterest', 'snapchat', 'twitch',
] as const;

export const updateCreatorProfileSchema = z.object({
  username:    z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed').optional(),
  fullName:    z.string().min(2).optional(),
  bio:         z.string().max(500).optional(),
  location:    z.string().optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  avatarUrl:   z.string().url('Invalid avatar URL').optional(),
  categories:  z.array(z.string()).optional(),
  nearbyRadiusKm:        z.number().int().min(1).max(200).optional(),
  nearbyUseHomeLocation: z.boolean().optional(),
});

export const addPortfolioLinkSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  url:   z.string().url('Invalid URL'),
});

export const updateSocialLinksSchema = z.object({
  instagram: z.string().url('Invalid Instagram URL').optional().nullable(),
  tiktok:    z.string().url('Invalid TikTok URL').optional().nullable(),
  youtube:   z.string().url('Invalid YouTube URL').optional().nullable(),
  facebook:  z.string().url('Invalid Facebook URL').optional().nullable(),
});

export const addSocialAccountSchema = z.object({
  platform:   z.enum(VALID_PLATFORMS, { errorMap: () => ({ message: 'Invalid platform' }) }),
  profileUrl: z.string().url('Invalid profile URL'),
  followers:  z.number().int('Must be a whole number').min(0, 'Cannot be negative'),
});

export const updateSocialAccountSchema = z.object({
  profileUrl: z.string().url('Invalid profile URL').optional(),
  followers:  z.number().int('Must be a whole number').min(0, 'Cannot be negative').optional(),
});

export const connectYoutubeAccountSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
});

export const listFacebookPagesSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
});

export const connectFacebookPageSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  pageId:      z.string().min(1, 'Page id is required'),
});

export const connectInstagramAccountSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  pageId:      z.string().min(1, 'Page id is required'),
});

const VALID_PAYMENT_METHODS = ['esewa', 'khalti', 'fonepay'] as const;

export const updatePaymentMethodsSchema = z.object({
  methods: z.array(z.enum(VALID_PAYMENT_METHODS)).min(0),
});

const VALID_PREF_PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Facebook'] as const;
const VALID_LOCATIONS = ['Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur', 'Butwal', 'Biratnagar', 'Remote'] as const;

export const updateCampaignPrefsSchema = z.object({
  categories:   z.array(z.string()).max(5, 'Max 5 categories').optional(),
  prefPlatforms: z.array(z.enum(VALID_PREF_PLATFORMS)).optional(),
  prefLocations: z.array(z.enum(VALID_LOCATIONS)).max(3, 'Max 3 locations').optional(),
  prefBudgetMin: z.number().min(0).optional(),
  prefBudgetMax: z.number().min(0).optional(),
});

export type UpdateCreatorProfileInput  = z.infer<typeof updateCreatorProfileSchema>;
export type AddPortfolioLinkInput      = z.infer<typeof addPortfolioLinkSchema>;
export type UpdateSocialLinksInput     = z.infer<typeof updateSocialLinksSchema>;
export type AddSocialAccountInput      = z.infer<typeof addSocialAccountSchema>;
export type UpdateSocialAccountInput   = z.infer<typeof updateSocialAccountSchema>;
export type ConnectYoutubeAccountInput   = z.infer<typeof connectYoutubeAccountSchema>;
export type ListFacebookPagesInput       = z.infer<typeof listFacebookPagesSchema>;
export type ConnectFacebookPageInput     = z.infer<typeof connectFacebookPageSchema>;
export type ConnectInstagramAccountInput = z.infer<typeof connectInstagramAccountSchema>;
export type UpdatePaymentMethodsInput  = z.infer<typeof updatePaymentMethodsSchema>;
export type UpdateCampaignPrefsInput   = z.infer<typeof updateCampaignPrefsSchema>;
