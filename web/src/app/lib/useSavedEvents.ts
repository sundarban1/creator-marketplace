import { useEffect, useState } from 'react';
import { fetchSavedEventIds, toggleSavedEvent } from '../api/campaigns';

/**
 * The creator's saved-event ids, shared across every mounted bookmark button —
 * web twin of mobile's useShortlistedCampaigns. Loaded once per session;
 * toggles are optimistic and roll back on failure. Creator-only: callers must
 * not mount this for a business session.
 */
let ids = new Set<string>();
let loaded = false;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: Set<string>) {
  ids = next;
  listeners.forEach((l) => l());
}

function loadIds(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (inFlight) return inFlight;
  inFlight = fetchSavedEventIds()
    .then((list) => {
      loaded = true;
      publish(new Set(list));
    })
    .catch(() => {
      /* unreachable shortlist renders as "none saved" */
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Drop the cache (sign-out / account switch). */
export function resetSavedEvents(): void {
  loaded = false;
  publish(new Set());
}

export function useSavedEvents() {
  const [, bump] = useState(0);

  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    void loadIds();
    return () => {
      listeners.delete(l);
    };
  }, []);

  async function toggle(campaignId: string): Promise<boolean> {
    const wasIn = ids.has(campaignId);
    const optimistic = new Set(ids);
    if (wasIn) optimistic.delete(campaignId);
    else optimistic.add(campaignId);
    publish(optimistic);
    try {
      const isSaved = await toggleSavedEvent(campaignId);
      const synced = new Set(ids);
      if (isSaved) synced.add(campaignId);
      else synced.delete(campaignId);
      publish(synced);
      return isSaved;
    } catch (err) {
      const rolledBack = new Set(ids);
      if (wasIn) rolledBack.add(campaignId);
      else rolledBack.delete(campaignId);
      publish(rolledBack);
      throw err;
    }
  }

  return { isSaved: (id: string) => ids.has(id), toggle };
}
