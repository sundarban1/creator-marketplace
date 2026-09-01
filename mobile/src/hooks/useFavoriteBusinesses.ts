import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { request } from '@/lib/api';

// A creator's set of favourited ("hearted") businesses.
//
// The ids live in module scope with a subscriber list rather than in per-hook
// useState, because this is read from several places at once — the Profile tab's
// "Saved Businesses" stat, the Discover → Businesses list, business-detail, the
// standalone favourites screen. A per-hook copy let those disagree: favouriting
// a business on the Discover list left the Profile tab (mounted the whole time)
// showing its stale count until it happened to remount. One shared Set with
// subscribers gives every mounted consumer the same answer off a single request
// and keeps them in sync after any toggle. Mirrors useShortlistedCampaigns.
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
  inFlight = request<{ ids: string[] }>('GET', '/api/creator/businesses/favorites')
    .then((res) => { publish(new Set(res.data.ids)); })
    .catch(() => { /* an unreachable list just renders as "none saved" */ })
    .finally(() => { inFlight = null; });
  return inFlight;
}

export function useFavoriteBusinesses() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const role   = user?.role ?? null;
  const [, bumpRender] = useState(0);

  useEffect(() => {
    const listener = () => bumpRender((n) => n + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  useEffect(() => {
    // Creator-only endpoint — a business session must not call it, and a
    // different creator signing in must never inherit the previous one's ids.
    if (!userId || role !== 'CREATOR') {
      if (cachedUserId !== null) { cachedUserId = null; publish(new Set()); }
      return;
    }
    if (cachedUserId === userId) return;
    cachedUserId = userId;
    publish(new Set());
    void loadIds();
  }, [userId, role]);

  async function toggle(businessId: string): Promise<boolean> {
    const wasIn = ids.has(businessId);

    // Optimistic — the icon flips on tap, not on the round trip.
    const optimistic = new Set(ids);
    if (wasIn) optimistic.delete(businessId); else optimistic.add(businessId);
    publish(optimistic);

    try {
      const res = await request<{ isFavorited: boolean }>(
        'POST',
        `/api/creator/businesses/${businessId}/favorite`,
      );
      const synced = new Set(ids);
      if (res.data.isFavorited) synced.add(businessId); else synced.delete(businessId);
      publish(synced);
      return res.data.isFavorited;
    } catch (err) {
      const rolledBack = new Set(ids);
      if (wasIn) rolledBack.add(businessId); else rolledBack.delete(businessId);
      publish(rolledBack);
      throw err; // Let caller handle the error
    }
  }

  return {
    favoriteIds: ids,
    toggle,
    reloadIds: () => (userId && role === 'CREATOR' ? loadIds() : Promise.resolve()),
  };
}
