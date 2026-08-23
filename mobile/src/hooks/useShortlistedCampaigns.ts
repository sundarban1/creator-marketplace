import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { request } from '@/lib/api';

// A creator's private shortlist of events ("save for later"), the campaign
// counterpart to useFavoriteBusinesses.
//
// The ids live in module scope rather than in the hook, because unlike
// favorites — read once per screen — this is read by every CampaignCard in a
// list. A per-hook copy would fire one GET per card and let two cards for the
// same event disagree after a toggle; one shared Set with subscribers gives
// every mounted card the same answer off a single request.
let cachedUserId: string | null = null;
let ids: Set<string> = new Set();
let inFlight: Promise<void> | null = null;

const listeners = new Set<() => void>();

function publish(next: Set<string>) {
  ids = next;
  listeners.forEach((l) => l());
}

function loadIds(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = request<{ ids: string[] }>('GET', '/api/creator/campaigns/shortlist')
    .then((res) => { publish(new Set(res.data.ids)); })
    .catch(() => { /* an unreachable shortlist just renders as "none saved" */ })
    .finally(() => { inFlight = null; });
  return inFlight;
}

export function useShortlistedCampaigns() {
  const { user } = useAuth();
  // Read the two fields the effect actually depends on, so it re-runs on a
  // sign-in/role switch and not on every unrelated user-object update.
  const userId = user?.id ?? null;
  const role   = user?.role ?? null;
  const [, bumpRender] = useState(0);

  useEffect(() => {
    const listener = () => bumpRender((n) => n + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  useEffect(() => {
    // Creator-only endpoint — a business/client session must not call it, and
    // a different creator signing in must never inherit the previous one's ids.
    if (!userId || role !== 'CREATOR') {
      if (cachedUserId !== null) { cachedUserId = null; publish(new Set()); }
      return;
    }
    if (cachedUserId === userId) return;
    cachedUserId = userId;
    publish(new Set());
    void loadIds();
  }, [userId, role]);

  async function toggle(campaignId: string): Promise<boolean> {
    const wasIn = ids.has(campaignId);

    // Optimistic — the icon flips on tap, not on the round trip.
    const optimistic = new Set(ids);
    if (wasIn) optimistic.delete(campaignId); else optimistic.add(campaignId);
    publish(optimistic);

    try {
      const res = await request<{ isShortlisted: boolean }>(
        'POST',
        `/api/creator/campaigns/${campaignId}/shortlist`,
      );
      const synced = new Set(ids);
      if (res.data.isShortlisted) synced.add(campaignId); else synced.delete(campaignId);
      publish(synced);
      return res.data.isShortlisted;
    } catch (err) {
      const rolledBack = new Set(ids);
      if (wasIn) rolledBack.add(campaignId); else rolledBack.delete(campaignId);
      publish(rolledBack);
      throw err;
    }
  }

  return {
    shortlistedIds: ids,
    isShortlisted:  (campaignId: string) => ids.has(campaignId),
    toggle,
    reloadIds:      () => (userId && role === 'CREATOR' ? loadIds() : Promise.resolve()),
  };
}
