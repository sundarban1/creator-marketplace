import type { TFn } from '../i18n';
import type { MyCampaign } from '../api/business';
import type { BadgeTone } from '../ui/StatusBadge';

// Event review (moderation) status presentation shared by every business event
// list and the review banner (EventReviewBanner.tsx).

export const EVENT_STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: 'success',
  DRAFT: 'neutral',
  PENDING_APPROVAL: 'warning',
  CHANGES_REQUESTED: 'warning',
  REJECTED: 'danger',
  PAUSED: 'warning',
  CLOSED: 'neutral',
  CANCELLED: 'danger',
  EXPIRED: 'neutral',
};

export function eventStatusLabel(t: TFn, status: string): string {
  const key = `eventReview.status${status}`;
  const label = t(key);
  return label === key ? status : label;
}

/** Whether the business can (re)submit this event: edit-and-resubmit or resubmit as-is. */
export function canResubmitEvent(c: Pick<MyCampaign, 'status' | 'review'>): boolean {
  if (c.status === 'CHANGES_REQUESTED') return true;
  return c.status === 'REJECTED' && c.review?.resubmissionAllowed !== false;
}
