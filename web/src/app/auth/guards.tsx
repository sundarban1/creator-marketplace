import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppAuth } from './AppAuthContext';
import { useT } from '../i18n';
import { paths, roleHome } from '../routes';
import { Button } from '../ui/Button';
import { FullScreenLoader } from '../ui/FullScreenLoader';
import { useAsync } from '../lib/useAsync';
import { getPlatformFlags } from '../api/platformFlags';
import type { AppRole } from '../api/auth';

/** True when the signed-in user's role has onboarding switched on and hasn't finished it. */
function useNeedsOnboarding(): boolean | null {
  const { user } = useAppAuth();
  const flags = useAsync(() => getPlatformFlags(), []);
  if (!user || (user.role !== 'CREATOR' && user.role !== 'BUSINESS')) return false;
  if (user.isOnboarded) return false;
  if (!flags.data) return null; // still loading — caller shows a loader, not a redirect
  return user.role === 'CREATOR' ? flags.data.creatorOnboardingEnabled : flags.data.businessOnboardingEnabled;
}

/**
 * Frontend route protection is UX only — the backend enforces every
 * authorization check on the API (spec §15, §62). These guards just keep the
 * user from *seeing* a shell they can't use.
 */

/** Gate for any signed-in marketplace user. */
export function RequireAuth() {
  const { status } = useAppAuth();
  const location = useLocation();

  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'anonymous') {
    return <Navigate to={paths.login} state={{ from: location }} replace />;
  }
  return <Outlet />;
}

/** Gate for a specific role. Assumes it's nested inside <RequireAuth>. */
export function RequireRole({ role }: { role: AppRole }) {
  const { user } = useAppAuth();
  const t = useT();

  if (!user) return <Navigate to={paths.login} replace />;

  if (user.role !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-xl font-bold text-ink">{t('guard.notAllowedTitle')}</h1>
          <p className="mt-2 text-[15px] text-ink-soft">
            {t('guard.notAllowedBody', {
              role: role === 'BUSINESS' ? t('roles.business') : t('roles.creator'),
            })}
          </p>
          <Button
            className="mt-6"
            onClick={() => {
              window.location.href = roleHome(user.role);
            }}
          >
            {t('guard.goHome')}
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

/**
 * For /login, /signup — bounce already-signed-in users to their dashboard.
 * Deliberately renders the auth screen while the session is still restoring
 * (rather than a spinner): a login page should appear instantly, and if it
 * turns out the visitor is already signed in they get redirected a moment
 * later. Blocking here on `loading` meant a slow/cold API left the auth
 * screens showing nothing.
 */
export function RequireGuest() {
  const { status, user } = useAppAuth();

  if (status === 'authenticated' && user) {
    return <Navigate to={roleHome(user.role)} replace />;
  }
  return <Outlet />;
}

/**
 * Wraps the creator/business `AppShell` route trees. Catches a user who
 * refreshes or deep-links straight into the dashboard before finishing
 * onboarding (or before `VerifyOtpScreen`/`SocialAuth` ever routed them into
 * it) — mirrors mobile's `RootNavigator` re-checking this on every render.
 */
export function RequireOnboarding() {
  const needsOnboarding = useNeedsOnboarding();

  if (needsOnboarding === null) return <FullScreenLoader />;
  if (needsOnboarding) return <Navigate to={paths.onboarding} replace />;
  return <Outlet />;
}

/** Wraps `/onboarding` itself — bounces a user who's already done (or whose
 *  role has the flag off) back to their dashboard instead of showing the flow. */
export function RequireNotOnboarded() {
  const needsOnboarding = useNeedsOnboarding();

  if (needsOnboarding === null) return <FullScreenLoader />;
  return needsOnboarding ? <Outlet /> : <RedirectHome />;
}

function RedirectHome() {
  const { user } = useAppAuth();
  if (!user) return <Navigate to={paths.login} replace />;
  return <Navigate to={roleHome(user.role)} replace />;
}
