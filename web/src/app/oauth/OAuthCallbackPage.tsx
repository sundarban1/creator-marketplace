import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

/**
 * Landing page for OAuth providers whose flow round-trips through our backend
 * (TikTok's authorization-code exchange needs a server-side redirect target —
 * see creator.controller.ts's tiktokCallback). Google/Facebook hand a token
 * straight to the opener via their own JS SDKs and never reach this page.
 *
 * Opened in a popup by lib/oauthPopup.ts's openOAuthPopup(); reads the
 * success/error the backend appended to the query string, posts it back to
 * the opener, and closes itself. No auth/i18n needed, so this is intentionally
 * outside AppProviders — it renders for a fraction of a second at most.
 */
export function OAuthCallbackPage() {
  const { platform = '' } = useParams();
  const [params] = useSearchParams();

  useEffect(() => {
    const success = params.get('success') === 'true';
    const error = params.get('error') ?? undefined;
    if (window.opener) {
      window.opener.postMessage({ source: 'kolab-oauth', platform, success, error }, window.location.origin);
      window.close();
    }
  }, [platform, params]);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        color: '#57534e',
        padding: '0 16px',
        textAlign: 'center',
      }}
    >
      <p>You can close this window.</p>
    </div>
  );
}
