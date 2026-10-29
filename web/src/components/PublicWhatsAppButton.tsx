import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa6';
import { getSupportSiteInfo } from '../app/api/siteInfo';
import { getRefreshToken, onSessionChange } from '../app/lib/apiClient';
import { buildWhatsAppUrl, getSupportContext, supportWhatsAppMessage } from '../app/lib/supportContact';
import { useDraggableFab } from '../app/lib/useDraggableFab';
import { cn } from '../app/ui/cn';

/**
 * Signed-in app areas, admin, and transient handoff pages — never show here.
 * (AppShell mounts its own FloatingSupportWidget for creators/businesses.)
 */
const APP_ROUTES = /^\/(admin|creator|business|onboarding|oauth|auth|payment-result)(\/|$)/;

/**
 * Public marketplace pages wrapped by PublicLayout — signed-in visitors there
 * already get the full FloatingSupportWidget, so this button steps aside.
 */
const PUBLIC_LAYOUT_ROUTES = /^\/(events|creators|businesses|community)(\/|$)/;

/**
 * Floating WhatsApp-only support button for every pre-login page (landing,
 * marketing/SEO pages, public marketplace, login/signup/verify/forgot
 * password). The number is the admin's WhatsApp Support Number, falling back
 * to the Inquiry & Customer Support Phone (`whatsapp` on
 * `GET /api/public/site-info`); nothing renders until a valid one loads.
 * Mounted once in App.tsx, outside AppProviders, so it reads the session from
 * the token store rather than the auth context. Draggable; snaps to the
 * nearest side edge on release.
 */
export function PublicWhatsAppButton() {
  const { pathname } = useLocation();
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  // Re-render on sign-in/out in another tab; route changes re-render anyway.
  const [, setSessionTick] = useState(0);
  useEffect(() => onSessionChange(() => setSessionTick((n) => n + 1)), []);
  const signedIn = !!getRefreshToken();
  const fab = useDraggableFab<HTMLAnchorElement>('public-whatsapp');

  const hidden = APP_ROUTES.test(pathname) || (signedIn && PUBLIC_LAYOUT_ROUTES.test(pathname));

  useEffect(() => {
    if (hidden || whatsapp !== null) return;
    let cancelled = false;
    getSupportSiteInfo()
      .then((info) => { if (!cancelled) setWhatsapp(info.whatsapp); })
      .catch(() => { /* no number → no button */ });
    return () => { cancelled = true; };
  }, [hidden, whatsapp]);

  const href = buildWhatsAppUrl(whatsapp, supportWhatsAppMessage(getSupportContext(null, pathname)));
  if (hidden || !href) return null;

  return (
    <a
      ref={fab.rootRef}
      {...fab.handleProps}
      style={{ ...fab.style, ...fab.handleProps.style }}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Kolab on WhatsApp"
      title="Chat with us on WhatsApp"
      className={cn(
        'fixed bottom-5 z-50 flex h-14 w-14 select-none items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40',
        fab.side === 'left' ? 'left-5' : 'right-5',
      )}
    >
      <FaWhatsapp className="h-7 w-7" aria-hidden />
    </a>
  );
}
