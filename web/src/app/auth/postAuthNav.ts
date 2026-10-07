import { getPlatformFlags } from '../api/platformFlags';
import type { AuthUser } from '../api/auth';
import { paths, roleHome } from '../routes';
import { consumeShareReturnPath } from '../lib/shareContext';

/**
 * Where a just-authenticated user belongs — role home, or onboarding first if
 * their profile isn't set up yet and the admin hasn't disabled it for their
 * role. Shared by `VerifyOtpScreen` and `SocialAuth`'s role-completion path so
 * the two entry points can't drift on this decision.
 */
export async function postAuthPath(user: AuthUser): Promise<string> {
  if (user.role !== 'CREATOR' && user.role !== 'BUSINESS') return roleHome(user.role);
  if (user.isOnboarded) return afterAuthHome(user.role);

  const flags = await getPlatformFlags();
  const enabled =
    user.role === 'CREATOR' ? flags.creatorOnboardingEnabled : flags.businessOnboardingEnabled;
  // Onboarding first — it hands off to the shared opportunity itself when done.
  return enabled ? paths.onboarding : afterAuthHome(user.role);
}

/**
 * Role home — unless the user started auth from an opportunity (Share
 * Opportunity / "Apply" while signed out), in which case straight back to it,
 * `?ref=` attribution intact. One-shot: consumed here.
 */
export function afterAuthHome(role: AuthUser['role']): string {
  return consumeShareReturnPath(role) ?? roleHome(role);
}
