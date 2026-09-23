import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { FaTiktok } from 'react-icons/fa6';
import { useAppAuth } from './AppAuthContext';
import { postAuthPath } from './postAuthNav';
import { paths } from '../routes';
import { useT } from '../i18n';
import { isMobileWebBrowser } from '../lib/platform';
import { openOAuthPopup } from '../lib/oauthPopup';
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
type Provider = 'google' | 'tiktok';

/**
 * Google + TikTok sign-in for the auth screens. On a brand-new account of
 * either provider the backend asks for a role first — GoogleRoleModal (shared
 * by both, its props are already provider-agnostic) collects it and retries.
 *
 * Mobile web (per spec §3) never opens the desktop Google popup — embedded/
 * in-app browsers routinely block it — it does a full-page redirect through
 * GoogleCallbackScreen instead (see lib/googleAuth.ts's startGoogleRedirect).
 * TikTok always uses the popup (openOAuthPopup, reused from the existing
 * "connect my TikTok profile" feature) — its OAuth is entirely backend-
 * mediated regardless of desktop/mobile-web, so there's no redirect variant
 * to build.
 */
export function SocialAuth({ onError }: { onError: (msg: string) => void }) {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { googleAuth, tiktokLoginUrl, tiktokAuth } = useAppAuth();

  const [busyProvider, setBusyProvider] = useState<Provider | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [pendingTiktokToken, setPendingTiktokToken] = useState<string | null>(null);
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
    if (busyProvider) return; // duplicate-tap guard beyond the Button's own `disabled`
    onError('');
    setModalKind(null);

    if (isMobileWebBrowser()) {
      // Full-page redirect — this navigates away, nothing after it runs.
      storeGoogleReturnPath(fromRef.current);
      setBusyProvider('google');
      try {
        await startGoogleRedirect(`${window.location.origin}${paths.googleCallback}`);
      } catch (err) {
        // requestCode() itself only fails if GIS never loaded — a real
        // "cancelled" outcome only shows up after the round trip, in
        // GoogleCallbackScreen (Google redirects back with ?error=access_denied).
        setBusyProvider(null);
        const { kind, detail } = classifyGoogleAuthError(err);
        setModalKind(kind);
        setModalDetail(detail);
      }
      return;
    }

    setBusyProvider('google');
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
      setBusyProvider(null);
    }
  };

  const confirmGoogleRole = async (role: Role) => {
    if (!pendingToken) return;
    setBusyProvider('google');
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
      setBusyProvider(null);
    }
  };

  const handleTiktok = async () => {
    if (busyProvider) return;
    onError('');
    setBusyProvider('tiktok');
    try {
      const url = await tiktokLoginUrl();
      const popup = await openOAuthPopup(url, 'tiktok-login');
      if (!popup.success) throw new Error(popup.error || t('auth.tiktokCancelled'));
      const handoff = popup.extra?.handoff;
      if (!handoff) throw new Error(t('common.somethingWrong'));

      const res = await tiktokAuth({ handoff });
      if (res.needsRole) {
        setPendingTiktokToken(res.tiktokPendingToken ?? null);
      } else {
        await finish(res);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setBusyProvider(null);
    }
  };

  const confirmTiktokRole = async (role: Role) => {
    if (!pendingTiktokToken) return;
    setBusyProvider('tiktok');
    try {
      const res = await tiktokAuth({ tiktokPendingToken: pendingTiktokToken, role });
      if (!res.needsRole) {
        setPendingTiktokToken(null);
        await finish(res);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        fullWidth
        size="lg"
        loading={busyProvider === 'google'}
        disabled={busyProvider === 'tiktok'}
        onClick={handleGoogle}
      >
        <FcGoogle size={18} />
        {t('auth.continueGoogle')}
      </Button>

      <Button
        variant="secondary"
        fullWidth
        size="lg"
        className="mt-3"
        loading={busyProvider === 'tiktok'}
        disabled={busyProvider === 'google'}
        onClick={handleTiktok}
      >
        <FaTiktok size={18} />
        {t('auth.continueTiktok')}
      </Button>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[12px] font-medium uppercase tracking-wide text-ink-soft">
          {t('auth.or')}
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <GoogleRoleModal
        open={pendingToken != null || pendingTiktokToken != null}
        onClose={() => {
          setPendingToken(null);
          setPendingTiktokToken(null);
        }}
        onConfirm={pendingTiktokToken != null ? confirmTiktokRole : confirmGoogleRole}
        busy={busyProvider != null}
      />

      <GoogleAuthErrorModal
        kind={modalKind}
        detail={modalDetail}
        retrying={busyProvider === 'google'}
        onClose={() => setModalKind(null)}
        onRetry={() => {
          setModalKind(null);
          void handleGoogle();
        }}
      />
    </>
  );
}
