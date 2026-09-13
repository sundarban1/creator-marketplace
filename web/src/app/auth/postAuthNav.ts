import { getPlatformFlags } from '../api/platformFlags';
import type { AuthUser } from '../api/auth';
import { paths, roleHome } from '../routes';

/**
 * Where a just-authenticated user belongs — role home, or onboarding first if
 * their profile isn't set up yet and the admin hasn't disabled it for their
 * role. Shared by `VerifyOtpScreen` and `SocialAuth`'s role-completion path so
 * the two entry points can't drift on this decision.
 */
export async function postAuthPath(user: AuthUser): Promise<string> {
  if (user.role !== 'CREATOR' && user.role !== 'BUSINESS') return roleHome(user.role);
  if (user.isOnboarded) return roleHome(user.role);

  const flags = await getPlatformFlags();
  const enabled =
    user.role === 'CREATOR' ? flags.creatorOnboardingEnabled : flags.businessOnboardingEnabled;
  return enabled ? paths.onboarding : roleHome(user.role);
}
