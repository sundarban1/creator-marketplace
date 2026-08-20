import { request } from '@/lib/api';

export type ReportTargetType = 'USER' | 'BUSINESS' | 'SERVICE' | 'OPPORTUNITY' | 'POST' | 'MESSAGE' | 'REVIEW';
export type ReportReason = 'SPAM' | 'SCAM' | 'FRAUD' | 'HARASSMENT' | 'INAPPROPRIATE_CONTENT' | 'FAKE_PROFILE' | 'PAYMENT_ISSUE' | 'OTHER';

// §75 — user-filed reports against any entity type. Admin review happens
// entirely in the web dashboard; this is the submission side only.
export const reportService = {
  async create(targetType: ReportTargetType, targetId: string, reason: ReportReason, description?: string): Promise<void> {
    await request('POST', '/api/reports', { targetType, targetId, reason, description: description || undefined });
  },
};
