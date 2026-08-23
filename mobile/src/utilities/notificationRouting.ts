import { router } from 'expo-router';

type PushArg = Parameters<typeof router.push>[0];

export type NotificationRouteInput = {
  type: string;
  refType?: string | null;
  refId?: string | null;
};

// Mirrors the exact routing decisions from (creator)/(tabs)/notifications.tsx's
// in-app tap handler (that screen is shared by both roles — see the re-exports
// at (business)/notifications.tsx). Extracted so a push-notification tap —
// which fires outside that screen, sometimes before it's ever mounted —
// resolves to the same destination as tapping the same notification in-app.
export function resolveNotificationRoute(n: NotificationRouteInput, isCreator: boolean): PushArg | null {
  // Free event notifications
  if (n.refType === 'event' && n.refId) {
    return isCreator
      ? { pathname: '/campaign-detail', params: { campaignId: n.refId } }
      : { pathname: '/(business)/campaign-proposals', params: { campaignId: n.refId, campaignType: 'OPEN_EVENT', campaignTitle: '' } };
  }

  // proposal_received → business sees the proposals list. work_started/
  // work_submitted are business-only notifications for the same workspace
  // flow, so they share this branch's business destination. revision_requested
  // is creator-only, so it routes into Activity Timeline with the feedback
  // modal opened straight to the note.
  if ((n.type === 'proposal_received' || n.type === 'work_started' || n.type === 'work_submitted' || n.type === 'revision_requested') && n.refId) {
    return isCreator
      ? { pathname: '/(business)/activity-timeline', params: { campaignId: n.refId, role: 'CREATOR', openFeedback: 'true' } }
      : { pathname: '/(business)/campaign-proposals', params: { campaignId: n.refId, campaignTitle: '', campaignType: '' } };
  }

  // workspace status notifications → activity timeline
  if (n.refType === 'campaign' && n.refId && ['work_approved', 'payment_released', 'campaign_closed'].includes(n.type)) {
    return { pathname: '/(business)/activity-timeline', params: { campaignId: n.refId, ...(isCreator ? { role: 'CREATOR' } : {}) } };
  }

  if (n.type === 'campaign_invitation') {
    return n.refId ? { pathname: '/campaign-detail', params: { campaignId: n.refId } } : null;
  }
  // Business-only: their own event's deadline passed. campaign-detail.tsx is
  // shared by both roles, so this works whether the campaign was PAID_CAMPAIGN
  // (refType 'campaign', reaches here) or OPEN_EVENT (refType 'event', already
  // caught by the branch above).
  if (n.type === 'event_expired') {
    return n.refId ? { pathname: '/campaign-detail', params: { campaignId: n.refId } } : null;
  }
  // §4 team/agency roster — the invite lands on the invitee, the response on
  // the team owner. Both halves live on the same screen (pending invites at
  // the top, roster below), so either tap opens it. Provider-only screen, so
  // a business account has nowhere to land.
  if (n.type === 'team_invitation' || n.type === 'team_invitation_response') {
    return isCreator ? '/(creator)/team' : null;
  }
  if (n.type === 'creator_saved') return null; // just acknowledge — no deep link needed
  // Service requests (§33/34) — received (provider) routes to the requests
  // inbox; accepted/declined (business) has nowhere richer to land yet, so
  // it's acknowledge-only like creator_saved above.
  if (n.type === 'service_request_received') return isCreator ? '/(creator)/service-requests' : null;
  if (n.type === 'service_request_accepted' || n.type === 'service_request_declined') return null;
  if (n.type === 'message_request_accepted') {
    if (!n.refId) return null;
    if (n.refType === 'creator_profile')  return { pathname: '/(creator)/creator-detail', params: { id: n.refId } };
    if (n.refType === 'business_profile') return { pathname: '/(creator)/business-detail', params: { id: n.refId } };
    return null;
  }
  // Only ever sent to the business owner (the creator who did the favoriting
  // is refId/refType: 'creator_profile') — route to the business-side
  // creator-detail screen, not the creator-side one.
  if (n.type === 'business_favorited') {
    return n.refId ? { pathname: '/(business)/creator-detail', params: { id: n.refId } } : null;
  }
  if (n.type === 'new_campaign') {
    if (n.refId) return { pathname: '/campaign-detail', params: { campaignId: n.refId } };
    // No specific campaign to open — send them to the browse/search screen
    // (Discover), not the dashboard Home, since the actual intent here is
    // "go look at campaigns."
    return isCreator ? '/(creator)/(tabs)/discover' : null;
  }
  if (n.type === 'new_message') {
    return isCreator ? '/(creator)/messages/' : '/(business)/messages/';
  }
  if (['proposal_accepted', 'proposal_rejected', 'proposal_shortlisted', 'proposal_expired', 'campaign_deadline'].includes(n.type)) {
    return isCreator ? '/(creator)/proposals' : null;
  }
  return null;
}
