import { z } from 'zod';

// Every reason the API accepts. The apps show the first ten (see
// moderation.rules.ts USER_REPORT_REASONS); FRAUD/FAKE_PROFILE/PAYMENT_ISSUE
// stay valid for older app builds.
const REASONS = [
  'HARASSMENT', 'HATE_SPEECH', 'INAPPROPRIATE_CONTENT', 'VIOLENCE', 'SPAM', 'SCAM',
  'COPYRIGHT', 'EXPLOITATION', 'AGE_INAPPROPRIATE', 'OTHER',
  'FRAUD', 'FAKE_PROFILE', 'PAYMENT_ISSUE',
] as const;

export const createReportSchema = z.object({
  targetType:  z.enum(['USER', 'BUSINESS', 'SERVICE', 'OPPORTUNITY', 'POST', 'MESSAGE', 'REVIEW', 'COMPETITION', 'COMPETITION_SUBMISSION', 'PORTFOLIO_ITEM']),
  targetId:    z.string().trim().min(1, 'Target is required').max(64),
  reason:      z.enum(REASONS),
  description: z.string().trim().max(1000).optional(),
}).superRefine((v, ctx) => {
  if (v.reason === 'OTHER' && (v.description ?? '').length < 5) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['description'], message: 'Please tell us what’s wrong (at least a few words).' });
  }
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
