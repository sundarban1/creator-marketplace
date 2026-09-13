import { useEffect, useState } from 'react';
import { fetchPublicEvents, type EventCard } from '../../../app/api/publicMarketplace';

/**
 * Fetches a small sample of live events for the landing page's events preview
 * section — up to 3 paid campaigns + 1 open (free) event, so the row reads as
 * mostly paid work with one free event mixed in. Falls back to `null` (the
 * section renders its static i18n fallback) if either request fails, mirrors
 * useMarketplacePreview.
 */
export function useEventsPreview() {
  const [events, setEvents] = useState<EventCard[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchPublicEvents({ campaignType: 'PAID_CAMPAIGN', limit: 3 }),
      fetchPublicEvents({ campaignType: 'OPEN_EVENT', limit: 1 }),
    ])
      .then(([paid, open]) => {
        if (cancelled) return;
        setEvents([...paid.items, ...open.items].slice(0, 4));
      })
      .catch(() => { /* section falls back to static copy */ });
    return () => { cancelled = true; };
  }, []);

  return { events };
}
