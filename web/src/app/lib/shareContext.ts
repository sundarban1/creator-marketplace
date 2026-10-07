/**
 * Share Opportunity continuity — keeps a shared opportunity (and its `?ref=`
 * attribution) alive across login, signup, OTP verification, the Google
 * full-page redirect and onboarding, so the recipient lands back on the exact
 * opportunity instead of their dashboard.
 *
 * localStorage (not router state) because several of those hops are full page
 * loads. Everything here is best-effort: storage can be unavailable, and a
 * missing context just means the normal post-auth destination.
 */

const KEY = 'kolab_share_ctx';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface ShareContext {
  /** `?ref=` token from the shared link — null when the visitor arrived without one. */
  token: string | null;
  /** Real campaign id (the creator app routes by id, not slug). */
  campaignId: string;
  /** Signed click receipt — only for anonymous visits, claimed once after signup. */
  receipt: string | null;
  /** Set when the visitor tried to apply — where to send them after auth. */
  returnPending: boolean;
  savedAt: number;
}

function read(): ShareContext | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const ctx = JSON.parse(raw) as ShareContext;
    if (!ctx?.campaignId || Date.now() - ctx.savedAt > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return ctx;
  } catch {
    return null;
  }
}

function write(ctx: ShareContext | null): void {
  try {
    if (ctx) localStorage.setItem(KEY, JSON.stringify(ctx));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — attribution is non-critical */
  }
}

/** Remember the most recent shared opportunity opened in this browser. */
export function rememberSharedOpportunity(token: string, campaignId: string, receipt: string | null): void {
  const prev = read();
  // Same link re-opened → keep any pending return; a new link replaces it
  // ("last valid share before registration").
  const same = prev?.token === token;
  write({
    token,
    campaignId,
    receipt: receipt ?? (same ? prev!.receipt : null),
    returnPending: same ? prev!.returnPending : false,
    savedAt: Date.now(),
  });
}

/**
 * The visitor hit "Apply" while signed out — bring them back to this
 * opportunity after auth. Keeps the share attribution when it's the same
 * opportunity they arrived on via a link.
 */
export function markShareReturnPending(campaignId: string): void {
  const prev = read();
  const same = prev?.campaignId === campaignId;
  write({
    token: same ? prev!.token : null,
    campaignId,
    receipt: prev?.receipt ?? null,
    returnPending: true,
    savedAt: Date.now(),
  });
}

/** `?ref=` token for this campaign, if the creator arrived via a share link. */
export function shareTokenFor(campaignId: string): string | undefined {
  const ctx = read();
  return ctx?.campaignId === campaignId ? ctx.token ?? undefined : undefined;
}

/** Creator-app path for the shared opportunity, with its `?ref=` preserved. */
export function sharedOpportunityPath(ctx: Pick<ShareContext, 'campaignId' | 'token'>): string {
  const path = `/creator/events/${encodeURIComponent(ctx.campaignId)}`;
  return ctx.token ? `${path}?ref=${encodeURIComponent(ctx.token)}` : path;
}

/**
 * One-shot: the pending post-auth destination, if any. Cleared on read so a
 * later, unrelated login goes to the dashboard as usual. Creator-only — a
 * business account has nowhere to apply from.
 */
export function consumeShareReturnPath(role: string): string | null {
  const ctx = read();
  if (!ctx?.returnPending) return null;
  write({ ...ctx, returnPending: false });
  return role === 'CREATOR' ? sharedOpportunityPath(ctx) : null;
}

/** One-shot: the click receipt to claim for a just-created account. */
export function takeShareReceipt(): string | null {
  const ctx = read();
  if (!ctx?.receipt) return null;
  write({ ...ctx, receipt: null });
  return ctx.receipt;
}

