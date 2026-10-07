import { z } from 'zod';

export const SHARE_PLATFORMS = ['WHATSAPP', 'SMS', 'COPY_LINK', 'NATIVE_SHARE', 'OTHER'] as const;

// Share tokens are base64url (see OpportunityShareService.newToken). Checked
// before any DB lookup so junk `?ref=` values never reach Postgres.
export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export const createShareSchema = z.object({
  // Events and campaigns are both Campaign rows — one id covers either.
  campaignId: z.string().min(1).max(64),
  platform: z.enum(SHARE_PLATFORMS).default('OTHER'),
});

export const claimSignupSchema = z.object({
  receipt: z.string().min(1).max(256),
});

export const summaryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type CreateShareInput = z.infer<typeof createShareSchema>;
export type ClaimSignupInput = z.infer<typeof claimSignupSchema>;
