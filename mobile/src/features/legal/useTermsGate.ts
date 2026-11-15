import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { termsService, type AcceptanceStatus } from '@/services/safety';
import { queryClient } from '@/lib/queryClient';
import { termsPending } from './termsPending';
import { logger } from '@/utilities/logger';

/**
 * Signed-in half of the agreement flow. Once per sign-in / app launch:
 *   - already accepted the current versions → nothing to show;
 *   - accepted them on this device before signing in (pre-auth screen) →
 *     recorded on the server silently, nothing to show;
 *   - otherwise (social sign-in on a fresh device, existing account, or a
 *     policy update) → `status.accepted === false` and RootNavigator renders
 *     the full-screen agreement.
 * A failed status call never locks the user out — it's retried next launch.
 * Not persisted to disk (not in PERSISTED_QUERY_ROOTS).
 */
async function loadStatus(): Promise<AcceptanceStatus> {
  const st = await termsService.status();
  if (st.accepted) return st;
  const pending = termsPending.get();
  if (termsPending.matches(pending, st.versions)) {
    try {
      await termsService.accept(st.versions, pending.birthDate, Platform.OS === 'ios' ? 'ios' : 'android');
      return { ...st, accepted: true };
    } catch (err) {
      logger.warn('[terms] replaying device acceptance failed', { err });
    }
  }
  return st;
}

export function useTermsGate(userId: string | null) {
  const key = ['termsStatus', userId] as const;
  const q = useQuery({ queryKey: key, queryFn: loadStatus, enabled: !!userId, staleTime: Infinity, retry: 1 });
  return {
    status: userId ? q.data ?? null : null,
    markAccepted: () => queryClient.setQueryData<AcceptanceStatus>(key, (s) => (s ? { ...s, accepted: true } : s)),
  };
}
