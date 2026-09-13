/**
 * Help & Support — public FAQ list plus the authed contact-us submission
 * (mirrors the landing page's Support form, but tied to the signed-in user
 * instead of collecting name/email).
 */

import { apiRequest } from '../lib/apiClient';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export function fetchFaqs(signal?: AbortSignal): Promise<FaqItem[]> {
  return apiRequest<FaqItem[]>('GET', '/api/faq', undefined, { anonymous: true, signal }).then((r) => r.data);
}

export function submitSupportContact(topic: string, message: string): Promise<void> {
  return apiRequest('POST', '/api/support/contact', { topic, message }).then(() => undefined);
}
