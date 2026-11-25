import { useEffect, useState } from 'react';
import { beginImpersonation, setTokens, writeStoredUser } from '../lib/apiClient';

/**
 * Landing page for the admin dashboard's "Log in as" action. The admin tab
 * opens this in a new tab with the impersonation session in the URL fragment
 * (never sent to any server), and this page moves it into this tab's
 * sessionStorage — see beginImpersonation in apiClient.ts — then strips the
 * fragment and loads the business home with a full reload, so the auth
 * context bootstraps from the new session.
 */
export interface ImpersonationHandoff {
  accessToken: string;
  expiresAt: string;
  businessName: string | null;
  user: unknown;
}

export function encodeHandoff(h: ImpersonationHandoff): string {
  const bytes = new TextEncoder().encode(JSON.stringify(h));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeHandoff(raw: string): ImpersonationHandoff | null {
  try {
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    const h = JSON.parse(json) as ImpersonationHandoff;
    return h && typeof h.accessToken === 'string' && h.user ? h : null;
  } catch {
    return null;
  }
}

export function ImpersonationHandoffScreen() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const handoff = decodeHandoff(window.location.hash.slice(1));
    // Drop the token from the address bar and history right away.
    window.history.replaceState(null, '', window.location.pathname);
    if (!handoff) {
      setFailed(true);
      return;
    }
    beginImpersonation({ businessName: handoff.businessName, expiresAt: handoff.expiresAt });
    setTokens(handoff.accessToken);
    writeStoredUser(handoff.user);
    window.location.replace('/business');
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 text-center text-sm text-gray-600">
      {failed
        ? 'This "Log in as" link is invalid or was already used. Start again from the admin Businesses page.'
        : 'Opening business account…'}
    </div>
  );
}
