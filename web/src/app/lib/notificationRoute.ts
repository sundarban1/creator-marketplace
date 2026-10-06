import type { AppRole } from '../api/auth';
import type { AppNotification } from '../api/creator';

const BUSINESS_REVIEW_TYPES = new Set(['work_submitted', 'revision_submitted', 'review_reminder']);
const COLLAB_TYPES = new Set([
  ...BUSINESS_REVIEW_TYPES,
  'proposal_accepted', 'work_started', 'revision_requested', 'work_approved', 'payment_released', 'project_completed',
  'confirmation_pending', 'deliverable_due_24h', 'deliverable_due_3h', 'payment_pending',
  'collaboration_inactive', 'content_overdue', 'payment_expired', 'payment_refunded',
  'reliability_warning', 'dispute_opened', 'dispute_resolved', 'review_pending', 'deadline_risk',
]);

/**
 * Where a notification click should land, for the marketplace web app. Routes
 * by `refType` + `refId`, falling back to the role's dashboard. Messaging isn't
 * in the web V1, so conversation notifications go to the dashboard too.
 */
export function notificationRoute(n: AppNotification, role: AppRole): string {
  const base = role === 'BUSINESS' ? '/business' : '/creator';
  const ref = n.refId ?? undefined;

  // Collaboration updates/reminders open the page where the requested action
  // lives. Keep in sync with collaborationWebPath() in backend notify.ts, which
  // builds the same links for reminder emails.
  // Unanswered chat → that campaign's conversation (ChatPage resolves ?campaign=).
  if (ref && n.type === 'response_pending') return `${base}/messages?campaign=${ref}`;

  if (ref && n.refType === 'campaign' && COLLAB_TYPES.has(n.type)) {
    if (role === 'CREATOR') return `${base}/work/${ref}`;
    return BUSINESS_REVIEW_TYPES.has(n.type)
      ? `${base}/deliverables?campaign=${ref}`
      : `${base}/events/${ref}`;
  }

  switch (n.refType) {
    case 'application':
      if (!ref) return `${base}/applications`;
      return role === 'BUSINESS' ? `${base}/applications` : `${base}/work/${ref}`;
    case 'campaign':
    case 'campaign_full':
    case 'event':
      return ref ? `${base}/events/${ref}` : `${base}/events`;
    case 'dispute':
      return role === 'BUSINESS' ? `${base}/deliverables` : ref ? `${base}/work/${ref}` : `${base}/work`;
    case 'withdrawal':
      return role === 'BUSINESS' ? `${base}/payments` : `${base}/wallet`;
    case 'creator_profile':
    case 'business_profile':
      return `${base}/profile`;
    case 'team_invitation':
    case 'team_member':
      return `${base}`;
    default:
      return base;
  }
}
