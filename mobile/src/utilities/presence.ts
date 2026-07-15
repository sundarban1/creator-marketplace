type TFn = (key: string, params?: Record<string, string | number>) => string;

/** Messenger-style presence text: "Active now" while online, else a relative
 *  "Active Xm/h/d ago" derived from the last time we know they disconnected.
 *  Returns null when we don't know either (still waiting on the initial
 *  presence:update from the socket) — callers should render nothing then. */
export function formatPresence(t: TFn, online: boolean, lastSeenAt: string | null): string | null {
  if (online) return t('messages.active');
  if (!lastSeenAt) return null;

  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1)   return t('messages.activeJustNow');
  if (minutes < 60)  return t('messages.activeMinutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24)    return t('messages.activeHoursAgo', { n: hours });
  const days = Math.floor(hours / 24);
  return t('messages.activeDaysAgo', { n: days });
}
