/**
 * Campaign endpoints shared by both roles (or creator-side extras that sit on
 * an event) — same backend contract mobile's campaignService uses.
 */

import { apiRequest } from '../lib/apiClient';
import type { EventCard } from './publicMarketplace';

// ── Free-event Q&A ("Ask Organizer") ─────────────────────────────────────────
// Readable by the owning business and every accepted creator; only accepted
// creators ask, only the business answers. 403 for anyone else. `askerName`
// is nulled by the backend for creator viewers.

export interface EventQuestion {
  id: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  isMine: boolean;
  askerName: string | null;
}

export function fetchEventQuestions(campaignId: string, signal?: AbortSignal): Promise<EventQuestion[]> {
  return apiRequest<EventQuestion[]>('GET', `/api/campaigns/${campaignId}/questions`, undefined, { signal }).then(
    (r) => r.data,
  );
}

export function askEventQuestion(campaignId: string, question: string): Promise<void> {
  return apiRequest('POST', `/api/campaigns/${campaignId}/questions`, { question }).then(() => undefined);
}

export function answerEventQuestion(campaignId: string, questionId: string, answer: string): Promise<void> {
  return apiRequest('PUT', `/api/campaigns/${campaignId}/questions/${questionId}/answer`, { answer }).then(
    () => undefined,
  );
}

// ── Free-event invitation card ───────────────────────────────────────────────
// 404 unless the caller is an ACCEPTED creator on this OPEN_EVENT. Rendered
// on demand the first time, so it can be slow.

export interface EventInvitationImage {
  imageUrl: string;
  format: string;
  width: number;
  height: number;
  version: number;
}

export function fetchEventInvitation(campaignId: string, signal?: AbortSignal): Promise<EventInvitationImage> {
  return apiRequest<{ invitation: EventInvitationImage }>('GET', `/api/campaigns/${campaignId}/invitation`, undefined, {
    signal,
  }).then((r) => r.data.invitation);
}

// ── Creator's saved events (shortlist) ───────────────────────────────────────

export function fetchSavedEventIds(signal?: AbortSignal): Promise<string[]> {
  return apiRequest<{ ids: string[] }>('GET', '/api/creator/campaigns/shortlist', undefined, { signal }).then(
    (r) => r.data.ids,
  );
}

export function fetchSavedEvents(signal?: AbortSignal): Promise<EventCard[]> {
  return apiRequest<{ campaigns: EventCard[] }>('GET', '/api/creator/campaigns/shortlist/list', undefined, {
    signal,
  }).then((r) => r.data.campaigns);
}

/** Toggles the event in/out of the creator's saved list; resolves to the new state. */
export function toggleSavedEvent(campaignId: string): Promise<boolean> {
  return apiRequest<{ isShortlisted: boolean }>('POST', `/api/creator/campaigns/${campaignId}/shortlist`).then(
    (r) => r.data.isShortlisted,
  );
}

// ── AI description suggestion (event creation) ───────────────────────────────

export function suggestEventDescription(input: {
  title?: string;
  category?: string;
  platform?: string;
  deliverables?: string;
}): Promise<string> {
  return apiRequest<{ description: string }>('POST', '/api/campaigns/ai/suggest-description', input).then(
    (r) => r.data.description,
  );
}
