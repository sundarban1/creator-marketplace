import type { AppRole } from '../api/auth';
import type { AppNotification } from '../api/creator';

/**
 * Where a notification click should land, for the marketplace web app. Routes
 * by `refType` + `refId`, falling back to the role's dashboard. Messaging isn't
 * in the web V1, so conversation notifications go to the dashboard too.
 */
export function notificationRoute(n: AppNotification, role: AppRole): string {
  const base = role === 'BUSINESS' ? '/business' : '/creator';
  const ref = n.refId ?? undefined;

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
