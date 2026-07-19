import { z } from 'zod';
import { isValidNepaliPhone, toE164NepaliPhone } from '../../utils/phone';

// Optional/nullable — this is the business's public contact number, separate
// from the OTP-verified account phone (see auth.schema.ts's phoneField), but
// still expected to be a Nepal mobile number like everywhere else in the app.
// An empty/absent value is allowed through untouched (clearing the field);
// only a non-empty value gets format-checked and canonicalized.
const businessPhoneField = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((v) => !v || isValidNepaliPhone(v), 'Enter a valid Nepali mobile number (starts with 97 or 98, 10 digits)')
  .transform((v) => (v ? toE164NepaliPhone(v) : v));

export const updateBusinessProfileSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters').optional(),
  description: z.string().max(1000).optional(),
  logoUrl: z.string().url('Invalid logo URL').optional().nullable(),
  coverImageUrl: z.string().url('Invalid cover image URL').optional().nullable(),
  website: z.string().url('Invalid website URL').optional().nullable(),
  categories: z.array(z.string()).optional(),
  panNo: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  phone: businessPhoneField,
  showPublicProfile:   z.boolean().optional(),
  hideContactDetails:  z.boolean().optional(),
  allowDirectMessages: z.boolean().optional(),
  socialLinks: z.object({
    facebook:  z.string().optional(),
    instagram: z.string().optional(),
    tiktok:    z.string().optional(),
    linkedin:  z.string().optional(),
  }).optional(),
  presenceServices:         z.array(z.string()).optional(),
  paymentMethods:           z.array(z.string()).optional(),
  defaultPlatforms:         z.array(z.string()).optional(),
  defaultCreatorCategories: z.array(z.string()).optional(),
  defaultBudgetRange:       z.string().optional().nullable(),
});

export type UpdateBusinessProfileInput = z.infer<typeof updateBusinessProfileSchema>;

// ── Social Accounts (structured table) — mirrors creator.schema.ts's schemas of
// the same name; platform is validated dynamically against the admin-managed
// Platform catalog in BusinessService, not a fixed enum. ──

export const addSocialAccountSchema = z.object({
  platform:   z.string().min(1, 'Platform is required'),
  profileUrl: z.string().url('Invalid profile URL'),
  followers:  z.number().int('Must be a whole number').min(0, 'Cannot be negative'),
});

export const updateSocialAccountSchema = z.object({
  profileUrl: z.string().url('Invalid profile URL').optional(),
  followers:  z.number().int('Must be a whole number').min(0, 'Cannot be negative').optional(),
});

export const connectYoutubeAccountSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().optional(),
  expiresIn: z.number().optional(),
  clientPlatform: z.enum(['ios', 'android', 'web']).optional(),
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

export type AddSocialAccountInput        = z.infer<typeof addSocialAccountSchema>;
export type UpdateSocialAccountInput     = z.infer<typeof updateSocialAccountSchema>;
export type ConnectYoutubeAccountInput   = z.infer<typeof connectYoutubeAccountSchema>;
export type ListFacebookPagesInput       = z.infer<typeof listFacebookPagesSchema>;
export type ConnectFacebookPageInput     = z.infer<typeof connectFacebookPageSchema>;
export type ConnectInstagramAccountInput = z.infer<typeof connectInstagramAccountSchema>;
