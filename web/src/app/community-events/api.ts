import { api } from '../lib/apiClient';
import type { CommunityEventCard, CommunityEventDetail } from '../../lib/api';

/** Public, unauthenticated — only published events come back. */
export function fetchCommunityEvents(signal?: AbortSignal) {
  return api<{ upcoming: CommunityEventCard[]; past: CommunityEventCard[] }>('GET', '/api/community-events', undefined, {
    signal,
    anonymous: true,
  });
}

export function fetchCommunityEvent(slug: string, signal?: AbortSignal) {
  return api<CommunityEventDetail>('GET', `/api/community-events/${encodeURIComponent(slug)}`, undefined, {
    signal,
    anonymous: true,
  });
}
