/** User-filed reports (§75) — same contract as mobile's reportService. Admin review lives in /admin. */

import { apiRequest } from '../lib/apiClient';

export type ReportTargetType = 'USER' | 'BUSINESS' | 'SERVICE' | 'OPPORTUNITY' | 'POST' | 'MESSAGE' | 'REVIEW' | 'COMPETITION';
export type ReportReason =
  | 'SPAM'
  | 'SCAM'
  | 'FRAUD'
  | 'HARASSMENT'
  | 'INAPPROPRIATE_CONTENT'
  | 'FAKE_PROFILE'
  | 'PAYMENT_ISSUE'
  | 'OTHER';

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
