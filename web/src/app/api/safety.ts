/** Blocking + mandatory agreement acceptance — backend modules/moderation + modules/legal. */

import { apiRequest } from '../lib/apiClient';

export interface BlockedUser {
  userId: string;
  role: 'CREATOR' | 'BUSINESS' | 'ADMIN';
  profileId: string | null;
  name: string;
  avatarUrl: string | null;
  blockedAt: string;
}

export const blocksApi = {
  list: () => apiRequest<BlockedUser[]>('GET', '/api/blocks').then((r) => r.data),
  status: (userIdOrProfileId: string) =>
    apiRequest<{ userId: string | null; blockedByMe: boolean; blockedByThem: boolean }>('GET', `/api/blocks/status/${encodeURIComponent(userIdOrProfileId)}`).then((r) => r.data),
  block: (userIdOrProfileId: string, source: 'profile' | 'chat' | 'competition' | 'event' | 'other' = 'profile', conversationId?: string) =>
    apiRequest<{ blocked: boolean; userId: string }>('POST', '/api/blocks', { userId: userIdOrProfileId, source, conversationId }).then((r) => r.data),
  unblock: (userIdOrProfileId: string) =>
    apiRequest<{ blocked: boolean; userId: string }>('DELETE', `/api/blocks/${encodeURIComponent(userIdOrProfileId)}`).then((r) => r.data),
};

export interface LegalVersions { terms: string; guidelines: string; privacy: string; minimumAge: number }
export interface AcceptanceStatus { accepted: boolean; ageRequired: boolean; versions: LegalVersions; acceptedAt: string | null }

export const termsApi = {
  status: () => apiRequest<AcceptanceStatus>('GET', '/api/legal/acceptance').then((r) => r.data),
  accept: (v: LegalVersions, birthDate?: string) =>
    apiRequest('POST', '/api/legal/acceptance', {
      termsVersion: v.terms, guidelinesVersion: v.guidelines, privacyVersion: v.privacy,
      birthDate, platform: 'web', agreed: true,
    }).then((r) => r.data),
};

export const SUPPORT_EMAIL = 'info@kolab.com.np';
export const SUPPORT_WEBSITE = 'https://kolab.com.np/';
