import { request } from '@/lib/api';

export type ReportTargetType =
  | 'USER' | 'BUSINESS' | 'SERVICE' | 'OPPORTUNITY' | 'POST' | 'MESSAGE' | 'REVIEW'
  | 'COMPETITION' | 'COMPETITION_SUBMISSION' | 'PORTFOLIO_ITEM' | 'DELIVERABLE';

/** The ten reasons offered in the app (Apple 1.2 — includes the age-rating flag). */
export const REPORT_REASONS = [
  'HARASSMENT', 'HATE_SPEECH', 'INAPPROPRIATE_CONTENT', 'VIOLENCE', 'SPAM',
  'SCAM', 'COPYRIGHT', 'EXPLOITATION', 'AGE_INAPPROPRIATE', 'OTHER',
] as const;
/** Categories a business picks when raising an issue about a creator's
 *  submitted deliverable (targetType DELIVERABLE, targetId = application id). */
export const DELIVERABLE_REPORT_REASONS = [
  'SEXUAL_CONTENT', 'VIOLENCE', 'HATE_SPEECH', 'HARASSMENT', 'SCAM',
  'ILLEGAL_CONTENT', 'COPYRIGHT', 'INAPPROPRIATE_CONTENT',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number] | (typeof DELIVERABLE_REPORT_REASONS)[number];

// User-filed reports against any entity type. Admin review happens in the web
// moderation dashboard; this is the submission side only.
export const reportService = {
  async create(targetType: ReportTargetType, targetId: string, reason: ReportReason, description?: string): Promise<void> {
    await request('POST', '/api/reports', { targetType, targetId, reason, description: description || undefined });
  },
};
