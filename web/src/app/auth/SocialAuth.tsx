import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { useAppAuth } from './AppAuthContext';
import { postAuthPath } from './postAuthNav';
import { paths } from '../routes';
import { useT } from '../i18n';
import { isMobileWebBrowser } from '../lib/platform';
import {
  classifyGoogleAuthError,
  preloadGoogleSignIn,
  requestGoogleAccessToken,
  startGoogleRedirect,
  storeGoogleReturnPath,
  type GoogleAuthModalKind,
} from '../lib/googleAuth';
import { GoogleAuthErrorModal } from './GoogleAuthErrorModal';
import { GoogleRoleModal } from './GoogleRoleModal';
import { Button } from '../ui/Button';

type Role = 'CREATOR' | 'BUSINESS';

/**
 * Google (+ Apple) sign-in for the auth screens. On a brand-new Google account
 * the backend asks for a role first — GoogleRoleModal collects it and retries.
 *
 * Mobile web (per spec §3) never opens the desktop popup — embedded/in-app
 * browsers routinely block it — it does a full-page redirect through
 * GoogleCallbackScreen instead (see lib/googleAuth.ts's startGoogleRedirect).
 */
export function SocialAuth({ onError }: { onError: (msg: string) => void }) {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { googleAuth } = useAppAuth();

  const [busy, setBusy] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [modalKind, setModalKind] = useState<GoogleAuthModalKind | null>(null);
  const [modalDetail, setModalDetail] = useState<string | undefined>(undefined);

  // Warm up the GIS script as soon as this screen mounts, rather than on
  // click — starting the popup outside a click's synchronous call stack
  // gets it blocked with a "popup_failed_to_open" error.
  useEffect(() => {
    preloadGoogleSignIn();
  }, []);

  const fromRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const state = location.state as { from?: { pathname?: string } } | null;
    fromRef.current = state?.from?.pathname;
  }, [location.state]);

  const finish = async (r: { needsRole: false; user: Parameters<typeof postAuthPath>[0] }) => {
    const from = fromRef.current;
    navigate(from && from.startsWith('/') ? from : await postAuthPath(r.user), { replace: true });
  };

  const handleGoogle = async () => {
    if (busy) return; // duplicate-tap guard beyond the Button's own `disabled`
    onError('');
    setModalKind(null);

    if (isMobileWebBrowser()) {
      // Full-page redirect — this navigates away, nothing after it runs.
      storeGoogleReturnPath(fromRef.current);
      setBusy(true);
      try {
        await startGoogleRedirect(`${window.location.origin}${paths.googleCallback}`);
      } catch (err) {
        // requestCode() itself only fails if GIS never loaded — a real
        // "cancelled" outcome only shows up after the round trip, in
        // GoogleCallbackScreen (Google redirects back with ?error=access_denied).
        setBusy(false);
        const { kind, detail } = classifyGoogleAuthError(err);
        setModalKind(kind);
        setModalDetail(detail);
      }
      return;
    }

    setBusy(true);
    try {
      const token = await requestGoogleAccessToken();
      const res = await googleAuth(token);
      if (res.needsRole) {
        setPendingToken(token);
      } else {
        await finish(res);
      }
    } catch (err) {
      const { kind, detail } = classifyGoogleAuthError(err);
      setModalKind(kind);
      setModalDetail(detail);
    } finally {
      setBusy(false);
    }
  };

  const confirmRole = async (role: Role) => {
    if (!pendingToken) return;
    setBusy(true);
    try {
      const res = await googleAuth(pendingToken, role);
      if (!res.needsRole) {
        setPendingToken(null);
        await finish(res);
      }
    } catch (err) {
      const { kind, detail } = classifyGoogleAuthError(err);
      setModalKind(kind);
      setModalDetail(detail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="secondary" fullWidth size="lg" loading={busy} onClick={handleGoogle}>
        <FcGoogle size={18} />
        {t('auth.continueGoogle')}
      </Button>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[12px] font-medium uppercase tracking-wide text-ink-soft">
          {t('auth.or')}
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <GoogleRoleModal open={pendingToken != null} onClose={() => setPendingToken(null)} onConfirm={confirmRole} busy={busy} />

      <GoogleAuthErrorModal
        kind={modalKind}
        detail={modalDetail}
        retrying={busy}
        onClose={() => setModalKind(null)}
        onRetry={() => {
          setModalKind(null);
          void handleGoogle();
        }}
      />
    </>
  );
}
