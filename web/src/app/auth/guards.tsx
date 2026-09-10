import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppAuth } from './AppAuthContext';
import { useT } from '../i18n';
import { paths, roleHome } from '../routes';
import { Button } from '../ui/Button';
import { FullScreenLoader } from '../ui/FullScreenLoader';
import type { AppRole } from '../api/auth';

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
