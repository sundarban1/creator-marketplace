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
  // "\"X\" is now full" — sent only to applicants the capacity check just
  // auto-rejected (free event, paid campaign, or a single role). They want the
  // rejection, not the workspace, so this lands on Proposals ▸ Rejected. Must
  // be tested before the refType branches below: a campaign_closed with
  // refType 'campaign' is a *cancellation* and still belongs in the timeline.
  if (n.refType === 'campaign_full') {
    return isCreator ? { pathname: '/(creator)/(tabs)/proposals', params: { tab: 'rejected' } } : null;
  }

  // Free-event Q&A ("Ask Organizer") — both the "new question" (business) and
  // "organizer answered" (accepted creators) notifications open the same shared
  // page. Checked before the generic event branch below, which would otherwise
  // send creators to campaign-detail instead.
  if ((n.type === 'event_question_asked' || n.type === 'event_question_answered') && n.refId) {
    return { pathname: '/event-questions', params: { campaignId: n.refId } };
  }

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

  // review_received (either role) → the rated party's own profile, scrolled to
  // the Reviews section at the bottom where the new rating + comment now shows.
  if (n.type === 'review_received') {
    return isCreator
      ? { pathname: '/(creator)/(tabs)/profile', params: { focus: 'reviews' } }
      : { pathname: '/(business)/(tabs)/profile', params: { focus: 'reviews' } };
  }

  // workspace status notifications → activity timeline. project_completed is
  // the business-only "Project Complete" row sent when escrow payment is
  // released; it opens the same timeline the creator lands on for payment_released.
  if (n.refType === 'campaign' && n.refId && ['work_approved', 'payment_released', 'campaign_closed', 'project_completed'].includes(n.type)) {
    return { pathname: '/(business)/activity-timeline', params: { campaignId: n.refId, ...(isCreator ? { role: 'CREATOR' } : {}) } };
  }

  if (n.type === 'campaign_invitation') {
    return n.refId ? { pathname: '/campaign-detail', params: { campaignId: n.refId } } : null;
  }
  // "<Creator> accepted/declined your invitation" — only ever sent to the
  // business, refId/refType pointing at the campaign the creator was invited
  // to. Open that event's proposals screen on the Invited tab, where the
  // response now shows. Invitations are an event-only feature, so campaignType
  // is safely 'OPEN_EVENT'.
  if (n.type === 'invitation_response') {
    return isCreator || !n.refId
      ? null
      : {
          pathname: '/(business)/campaign-proposals',
          params: { campaignId: n.refId, campaignTitle: '', campaignType: 'OPEN_EVENT', initialTab: 'invited' },
        };
  }
  // Business-only: their own event's deadline passed. campaign-detail.tsx is
  // shared by both roles, so this works whether the campaign was PAID_CAMPAIGN
  // (refType 'campaign', reaches here) or OPEN_EVENT (refType 'event', already
  // caught by the branch above).
  if (n.type === 'event_expired') {
    return n.refId ? { pathname: '/campaign-detail', params: { campaignId: n.refId } } : null;
  }
  // §4 team roster — the invite lands on the invitee, the response on
  // the team owner. Both halves live on the same screen (pending invites at
  // the top, roster below), so either tap opens it. Provider-only screen, so
  // a business account has nowhere to land.
  if (n.type === 'team_invitation' || n.type === 'team_invitation_response') {
    return isCreator ? '/(creator)/team' : null;
  }
  // "<Business> saved your profile" — only ever sent to a creator, with
  // refId/refType pointing at the business that saved them. Open that business's
  // profile page so the creator can look them up.
  if (n.type === 'creator_saved') {
    return isCreator && n.refId
      ? { pathname: '/(creator)/business-detail', params: { id: n.refId } }
      : null;
  }
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
  // Proposals screen honours ?tab=, so open the one the notification is about
  // instead of always landing on "All" and making them hunt for it.
  const PROPOSAL_TAB: Record<string, string> = {
    proposal_accepted:    'accepted',
    proposal_rejected:    'rejected',
    proposal_shortlisted: 'shortlisted',
    proposal_expired:     'expired',
  };
  if (n.type in PROPOSAL_TAB) {
    return isCreator ? { pathname: '/(creator)/(tabs)/proposals', params: { tab: PROPOSAL_TAB[n.type] } } : null;
  }
  if (n.type === 'campaign_deadline') {
    return isCreator ? '/(creator)/(tabs)/proposals' : null;
  }
  // Withdrawal lifecycle (processing / paid / rejected) — all land on the
  // creator's wallet, where the request's status and any admin note live.
  if (n.refType === 'withdrawal' || n.type.startsWith('withdrawal_')) {
    return isCreator ? '/(creator)/wallet' : null;
  }
  return null;
}
