import type { ModActionType, ModReportStatus, ModVerification } from '../../lib/api';

export const REASON_LABEL: Record<string, string> = {
  HARASSMENT: 'Harassment or bullying',
  HATE_SPEECH: 'Hate speech or discrimination',
  INAPPROPRIATE_CONTENT: 'Inappropriate or sexual content',
  VIOLENCE: 'Violence or threats',
  SPAM: 'Spam or misleading',
  SCAM: 'Scam, fraud or impersonation',
  COPYRIGHT: 'Copyright / IP infringement',
  EXPLOITATION: 'Exploitation or unsafe content',
  AGE_INAPPROPRIATE: 'Exceeds age rating',
  OTHER: 'Other',
  FRAUD: 'Fraud',
  FAKE_PROFILE: 'Fake profile',
  PAYMENT_ISSUE: 'Payment issue',
};

export const TARGET_LABEL: Record<string, string> = {
  USER: 'Creator profile',
  BUSINESS: 'Business profile',
  OPPORTUNITY: 'Event',
  COMPETITION: 'Competition',
  COMPETITION_SUBMISSION: 'Competition entry',
  PORTFOLIO_ITEM: 'Portfolio item',
  MESSAGE: 'Chat message',
  SERVICE: 'Service',
  REVIEW: 'Review',
  POST: 'Post',
};

export const STATUS_LABEL: Record<ModReportStatus, string> = {
  NEW: 'Pending',
  UNDER_REVIEW: 'Under review',
  NEEDS_MORE_INFO: 'Needs more info',
  ACTION_TAKEN: 'Action taken',
  DISMISSED: 'Dismissed',
  RESOLVED: 'Resolved',
};



export const VERIFICATION_LABEL: Record<ModVerification, string> = {
  UNVERIFIED: 'Not verified',
  VALID: 'Valid',
  INVALID: 'Invalid',
  NEEDS_MORE_INFORMATION: 'Needs more information',
};

export const ACTION_LABEL: Record<ModActionType, string> = {
  REMOVE_CONTENT: 'Remove content',
  RESTORE_CONTENT: 'Restore content',
  WARN_USER: 'Official warning',
  RESTRICT_MESSAGING: 'Restrict messaging',
  SUSPEND_TEMPORARY: 'Temporary suspension',
  SUSPEND_PERMANENT: 'Permanent suspension',
  LIFT_RESTRICTIONS: 'Lift restrictions',
  NO_ACTION: 'No action',
};

export function fmtDate(iso: string | null | undefined, withTime = true) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}) });
}

export function errMessage(e: unknown, fallback = 'Something went wrong.') {
  return e instanceof Error && e.message ? e.message : fallback;
}
