import { storage } from '@/utilities/storage';
import { TERMS_PENDING_KEY } from '@/utilities/constants';
import type { LegalVersions } from '@/services/safety';

// What the user agreed to on the pre-sign-in agreement screen. Kept on the
// device (SecureStore) and replayed to POST /api/legal/acceptance once an
// account is signed in — the server is the record of acceptance.
export interface PendingTerms {
  versions: LegalVersions;
  birthDate?: string; // YYYY-MM-DD — legacy; DOB is no longer collected
  agreedAt: string;
}

export const termsPending = {
  get(): PendingTerms | null {
    try { return storage.getJSON<PendingTerms>(TERMS_PENDING_KEY); } catch { return null; }
  },
  async set(p: PendingTerms) {
    await storage.setJSON(TERMS_PENDING_KEY, p);
  },
  matches(p: PendingTerms | null, v: LegalVersions): p is PendingTerms {
    return !!p && p.versions.terms === v.terms && p.versions.guidelines === v.guidelines;
  },
};
