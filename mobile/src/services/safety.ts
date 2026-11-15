import { request } from '@/lib/api';

// Account-level blocking + mandatory agreement acceptance
// (backend modules/moderation + modules/legal/terms.service).

export interface BlockedUser {
  userId: string;
  role: 'CREATOR' | 'BUSINESS' | 'ADMIN';
  profileId: string | null;
  name: string;
  avatarUrl: string | null;
  blockedAt: string;
}

export type BlockSource = 'profile' | 'chat' | 'competition' | 'event' | 'other';

export const blockService = {
  async list(): Promise<BlockedUser[]> {
    return (await request<BlockedUser[]>('GET', '/api/blocks')).data;
  },
  async ids(): Promise<string[]> {
    return (await request<string[]>('GET', '/api/blocks/ids')).data;
  },
  async status(userIdOrProfileId: string) {
    return (await request<{ userId: string | null; blockedByMe: boolean; blockedByThem: boolean }>('GET', `/api/blocks/status/${encodeURIComponent(userIdOrProfileId)}`)).data;
  },
  /** Accepts a userId OR a creator/business profile id — the server resolves it. */
  async block(userIdOrProfileId: string, source: BlockSource = 'profile', conversationId?: string) {
    return (await request<{ blocked: boolean; userId: string }>('POST', '/api/blocks', { userId: userIdOrProfileId, source, conversationId })).data;
  },
  async unblock(userIdOrProfileId: string) {
    return (await request<{ blocked: boolean; userId: string }>('DELETE', `/api/blocks/${encodeURIComponent(userIdOrProfileId)}`)).data;
  },
};

export interface LegalVersions { terms: string; guidelines: string; privacy: string; minimumAge: number }
export interface AcceptanceStatus { accepted: boolean; ageRequired: boolean; versions: LegalVersions; acceptedAt: string | null }

export const termsService = {
  async versions(): Promise<LegalVersions> {
    return (await request<LegalVersions>('GET', '/api/legal/versions')).data;
  },
  async status(): Promise<AcceptanceStatus> {
    return (await request<AcceptanceStatus>('GET', '/api/legal/acceptance')).data;
  },
  async accept(v: LegalVersions, birthDate: string | undefined, platform: 'ios' | 'android') {
    return (await request('POST', '/api/legal/acceptance', {
      termsVersion: v.terms, guidelinesVersion: v.guidelines, privacyVersion: v.privacy,
      birthDate, platform, agreed: true,
    })).data;
  },
};

export const SUPPORT_EMAIL = 'info@kolab.com.np';
export const SUPPORT_WEBSITE = 'https://kolab.com.np/';
