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
  if (n.type === 'creator_saved') return null; // just acknowledge — no deep link needed
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
    return isCreator ? '/(creator)/' : null;
  }
  if (n.type === 'new_message') {
    return isCreator ? '/(creator)/messages/' : '/(business)/messages/';
  }
  if (['proposal_accepted', 'proposal_rejected', 'campaign_deadline'].includes(n.type)) {
    return isCreator ? '/(creator)/proposals' : null;
  }
  return null;
}
