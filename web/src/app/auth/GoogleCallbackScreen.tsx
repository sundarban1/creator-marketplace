import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppAuth } from './AppAuthContext';
import { postAuthPath } from './postAuthNav';
import { paths } from '../routes';
import {
  classifyGoogleAuthError,
  consumeGoogleReturnPath,
  peekGoogleReturnPath,
  startGoogleRedirect,
  storeGoogleReturnPath,
  type GoogleAuthModalKind,
} from '../lib/googleAuth';
import { GoogleAuthErrorModal } from './GoogleAuthErrorModal';
import { GoogleRoleModal } from './GoogleRoleModal';
import { FullScreenLoader } from '../ui/FullScreenLoader';

type Role = 'CREATOR' | 'BUSINESS';

function redirectUri(): string {
  return `${window.location.origin}${paths.googleCallback}`;
}

/**
 * Landing page for mobile web's Google redirect flow (spec §3) — the
 * counterpart to SocialAuth's desktop popup. Google redirects the whole page
 * back here with `?code=` (or `?error=`) after the user finishes on Google's
 * own consent screen; this exchanges the code for a session and sends the
 * user on to wherever they were headed (spec §14) or, on a brand-new
 * account, into the same role-picker SocialAuth uses.
 *
 * Not gated by RequireGuest/RequireAuth — it has to work regardless of
 * whatever the current session state happens to be.
 */
export function GoogleCallbackScreen() {
  const navigate = useNavigate();
  const { googleAuthWithCode } = useAppAuth();

  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [modalKind, setModalKind] = useState<GoogleAuthModalKind | null>(null);
  const [modalDetail, setModalDetail] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const startedRef = useRef(false);

  const runExchange = async (code: string, role?: Role) => {
    setBusy(true);
    setModalKind(null);
    try {
      const res = await googleAuthWithCode(code, redirectUri(), role);
      if (res.needsRole) {
        setPendingCode(code);
      } else {
        setPendingCode(null);
        navigate(consumeGoogleReturnPath() ?? (await postAuthPath(res.user)), { replace: true });
      }
    } catch (err) {
      const { kind, detail } = classifyGoogleAuthError(err);
      setModalKind(kind);
      setModalDetail(detail);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    // Dev StrictMode runs effects twice — a ref (not state) guard so the
    // second run can't resubmit the code the first run already consumed.
    if (startedRef.current) return;
    startedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    // Strip the query string immediately, before anything async — a refresh
    // of this page must not resubmit the same code (spec §26).
    window.history.replaceState(null, '', window.location.pathname);

    if (error === 'access_denied') {
      // The user declined on Google's consent screen — a normal outcome, not
      // a failure (spec §10). Return quietly, no error modal.
      navigate(paths.login, { replace: true });
      return;
    }
    if (error || !code) {
      void Promise.resolve().then(() => setModalKind('unavailable'));
      return;
    }
    void Promise.resolve().then(() => runExchange(code));
    // Intentionally run-once (see startedRef) — this reads the URL exactly once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <FullScreenLoader />

      <GoogleRoleModal
        open={pendingCode != null}
        onClose={() => navigate(paths.login, { replace: true })}
        onConfirm={(role) => {
          if (pendingCode) void runExchange(pendingCode, role);
        }}
        busy={busy}
      />

      <GoogleAuthErrorModal
        kind={modalKind}
        detail={modalDetail}
        retrying={busy}
        onClose={() => navigate(paths.login, { replace: true })}
        onRetry={() => {
          // Full reset per spec §24 — fresh redirect, not a reused code.
          setModalKind(null);
          storeGoogleReturnPath(peekGoogleReturnPath());
          setBusy(true);
          startGoogleRedirect(redirectUri()).catch((err) => {
            setBusy(false);
            const { kind, detail } = classifyGoogleAuthError(err);
            setModalKind(kind);
            setModalDetail(detail);
          });
        }}
      />
    </>
  );
}
