import { request } from '@/lib/api';

export type ReportTargetType =
  | 'USER' | 'BUSINESS' | 'SERVICE' | 'OPPORTUNITY' | 'POST' | 'MESSAGE' | 'REVIEW'
  | 'COMPETITION' | 'COMPETITION_SUBMISSION' | 'PORTFOLIO_ITEM';

/** The ten reasons offered in the app (Apple 1.2 — includes the age-rating flag). */
export const REPORT_REASONS = [
  'HARASSMENT', 'HATE_SPEECH', 'INAPPROPRIATE_CONTENT', 'VIOLENCE', 'SPAM',
  'SCAM', 'COPYRIGHT', 'EXPLOITATION', 'AGE_INAPPROPRIATE', 'OTHER',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

// User-filed reports against any entity type. Admin review happens in the web
// moderation dashboard; this is the submission side only.
export const reportService = {
  async create(targetType: ReportTargetType, targetId: string, reason: ReportReason, description?: string): Promise<void> {
    await request('POST', '/api/reports', { targetType, targetId, reason, description: description || undefined });
  },
};
