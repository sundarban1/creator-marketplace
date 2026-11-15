/** User-filed reports — same contract as mobile's reportService. Admin review lives in /admin/moderation. */

import { apiRequest } from '../lib/apiClient';

export type ReportTargetType =
  | 'USER' | 'BUSINESS' | 'SERVICE' | 'OPPORTUNITY' | 'POST' | 'MESSAGE' | 'REVIEW'
  | 'COMPETITION' | 'COMPETITION_SUBMISSION' | 'PORTFOLIO_ITEM';

/** The ten reasons offered in the UI (the API also accepts legacy values). */
export const REPORT_REASONS = [
  'HARASSMENT', 'HATE_SPEECH', 'INAPPROPRIATE_CONTENT', 'VIOLENCE', 'SPAM',
  'SCAM', 'COPYRIGHT', 'EXPLOITATION', 'AGE_INAPPROPRIATE', 'OTHER',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export function submitReport(
  targetType: ReportTargetType,
  targetId: string,
  reason: ReportReason,
  description?: string,
): Promise<void> {
  return apiRequest('POST', '/api/reports', { targetType, targetId, reason, description: description || undefined }).then(
    () => undefined,
  );
}
