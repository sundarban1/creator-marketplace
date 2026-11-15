// "Return here after login" for guest browsing.
//
// When a signed-out visitor taps something that needs an account (Apply,
// Join, Message…), the screen they were on is recorded here before the login
// / signup flow opens. Once a session exists, RootNavigator routes them to
// their normal home and then re-opens this screen on top of it, with an
// optional `resume` hint so the screen can pick the action back up.
//
// Deliberately in-memory only: it holds a route + ids, never anything
// sensitive, and a cold restart mid-signup should land on a clean home rather
// than resurrecting a stale action. Expires after a while so an abandoned
// prompt can't hijack a much later, unrelated login.

export type ResumeAction = 'apply' | 'join';

export type PendingAuthIntent = {
  pathname: '/campaign-detail' | '/competition-detail' | '/creator-profile' | '/business-profile';
  params: Record<string, string>;
  resume?: ResumeAction;
};

const TTL_MS = 30 * 60 * 1000;

let pending: (PendingAuthIntent & { at: number }) | null = null;

export function setPendingAuthIntent(intent: PendingAuthIntent | null): void {
  pending = intent ? { ...intent, at: Date.now() } : null;
}

export function hasPendingAuthIntent(): boolean {
  if (pending && Date.now() - pending.at > TTL_MS) pending = null;
  return pending !== null;
}

/** Returns the intent (if still fresh) and clears it — it is used at most once. */
export function consumePendingAuthIntent(): PendingAuthIntent | null {
  if (!hasPendingAuthIntent()) return null;
  const { at: _at, ...intent } = pending!;
  pending = null;
  return intent;
}
