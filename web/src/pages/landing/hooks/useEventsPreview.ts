import { useEffect, useState } from 'react';
import { fetchEventsShowcase, type EventCard } from '../../../app/api/publicMarketplace';

/**
 * Fetches a small sample of live events for the landing page's events preview
 * section — up to 3 paid campaigns + 1 open (free) event, so the row reads as
 * mostly paid work with one free event mixed in. Single round trip to
 * /api/public/events/showcase, so an empty or failing side can't blank out
 * the other. Falls back to `null` (the section renders its static i18n
 * fallback) on failure, mirrors useMarketplacePreview.
 */
export function useEventsPreview() {
  const [events, setEvents] = useState<EventCard[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEventsShowcase({ paidLimit: 3, openLimit: 1 })
      .then(({ paid, open }) => {
        if (cancelled) return;
        setEvents([...paid, ...open].slice(0, 4));
      })
      .catch(() => { /* section falls back to static copy */ });
    return () => { cancelled = true; };
  }, []);

  return { events };
}
