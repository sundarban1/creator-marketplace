import { useEffect, useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { getImpersonation } from '../lib/apiClient';
import { useAppAuth } from '../auth/AppAuthContext';

/**
 * Always-visible reminder in a tab opened via the admin "Log in as" action:
 * whose account this is, how long the session has left, and an Exit that ends
 * it (locally only — see logout() in api/auth.ts) and closes the tab.
 */
export function ImpersonationBanner() {
  const info = getImpersonation();
  const { logout } = useAppAuth();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!info) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [info]);

  if (!info) return null;

  const minsLeft = Math.max(0, Math.ceil((new Date(info.expiresAt).getTime() - now) / 60_000));

  const exit = async () => {
    await logout();
    window.close();
    // window.close() is ignored if the tab wasn't script-opened.
    window.location.replace('/admin/businesses');
  };

  return (
    <div className="fixed bottom-20 left-1/2 z-50 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2 rounded-full bg-amber-500 py-2 pl-4 pr-2 text-sm font-medium text-black shadow-lg lg:bottom-4">
      <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">
        Admin acting as <strong>{info.businessName || 'this business'}</strong>
        <span className="opacity-70"> · {minsLeft} min left</span>
      </span>
      <button
        type="button"
        onClick={exit}
        className="ml-1 flex shrink-0 items-center gap-1 rounded-full bg-black/85 px-3 py-1 text-xs font-semibold text-white hover:bg-black"
      >
        <X className="h-3.5 w-3.5" aria-hidden /> Exit
      </button>
    </div>
  );
}
