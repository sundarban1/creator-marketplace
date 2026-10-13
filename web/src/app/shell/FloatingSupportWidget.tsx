import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Headset, X, Phone, Mail } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa6';
import { useAppAuth } from '../auth/AppAuthContext';
import { useT } from '../i18n';
import { cn } from '../ui/cn';
import { getSupportSiteInfo, invalidateSupportSiteInfo, type SupportSiteInfo } from '../api/siteInfo';
import { useLiveRefresh } from '../lib/liveUpdates';
import {
  buildMailtoUrl,
  buildTelUrl,
  buildWhatsAppUrl,
  formatSupportPhone,
  getPhoneSupportStatus,
  getSupportContext,
  normalizeSupportPhone,
  supportEmailBody,
  supportWhatsAppMessage,
  SUPPORT_EMAIL_SUBJECT,
} from '../lib/supportContact';

/** Chat has its own composer pinned to the bottom edge — never cover it. */
const HIDDEN_ON = /\/messages(\/|$)/;

/**
 * Bottom-right "Help Needed? ↘ (headset)" prompt for signed-in creators and
 * businesses. Clicking it opens one row of channel icons: WhatsApp (24/7) →
 * phone (9–5 Kathmandu) → email. Contact details come from the admin's
 * site-info settings, never hardcoded. Mounted inside AppShell and
 * PublicLayout so it inherits that layout's theme; `aboveBottomNav` lifts it
 * over AppShell's mobile tab bar.
 */
export function FloatingSupportWidget({ aboveBottomNav = false }: { aboveBottomNav?: boolean }) {
  const t = useT();
  const { user } = useAppAuth();
  const { pathname } = useLocation();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const reopenRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusPanelNext = useRef(false);

  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<SupportSiteInfo | null>(null);
  const [failed, setFailed] = useState(false);
  const [phoneStatus, setPhoneStatus] = useState(() => getPhoneSupportStatus());
  const visible = !!user && !HIDDEN_ON.test(pathname);

  // Fetch contacts once the panel is actually on screen (cached app-wide; a
  // failure isn't cached, so minimizing + reopening retries).
  useEffect(() => {
    if (!visible || !open || info) return;
    let cancelled = false;
    getSupportSiteInfo()
      .then((res) => { if (!cancelled) { setInfo(res); setFailed(false); } })
      .catch((err: unknown) => {
        // Panel stays usable; each channel shows itself as unavailable.
        if (import.meta.env.DEV) console.warn('[support-widget] site-info failed', err);
        if (!cancelled) setFailed(true);
      });
    return () => { cancelled = true; };
  }, [visible, open, info]);

  // Admin saved settings (socket 'settings:updated' → 'platformFlags'): drop
  // the cache and, if contacts were already shown, swap in the new ones.
  useLiveRefresh(['platformFlags'], () => {
    invalidateSupportSiteInfo();
    if (!info) return;
    getSupportSiteInfo().then(setInfo).catch(() => { /* keep showing the last good copy */ });
  });

  // Focus moves only after an explicit user action — never on page load.
  useEffect(() => {
    if (!focusPanelNext.current) return;
    focusPanelNext.current = false;
    if (open) panelRef.current?.focus();
    else reopenRef.current?.focus();
  }, [open]);

  const minimize = () => {
    focusPanelNext.current = true;
    setOpen(false);
  };

  const expand = () => {
    focusPanelNext.current = true;
    setPhoneStatus(getPhoneSupportStatus());
    setOpen(true);
  };

  // Escape (focus anywhere) or a click outside closes it; the outside click
  // still reaches its target, so the page behind works as normal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') minimize();
    };
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  });

  // While shown: one timer that fires exactly at the next 9:00/17:00 Kathmandu
  // boundary (re-armed by the state change), plus a re-check when the tab
  // comes back from the background — no polling.
  useEffect(() => {
    if (!visible || !open) return;
    const refresh = () => setPhoneStatus(getPhoneSupportStatus());
    const timer = window.setTimeout(refresh, phoneStatus.msUntilChange + 250);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [visible, open, phoneStatus]);

  // Signed-in creators/businesses only — guests on public pages never see it.
  if (!visible) return null;

  const context = getSupportContext(user?.role, pathname);
  const phone = normalizeSupportPhone(info?.supportPhone);
  // Dedicated WhatsApp number when the admin set one, else the support line.
  const whatsappUrl = buildWhatsAppUrl(info?.whatsapp || info?.supportPhone, supportWhatsAppMessage(context));
  const telUrl = buildTelUrl(info?.supportPhone);
  const mailtoUrl = buildMailtoUrl(info?.email, SUPPORT_EMAIL_SUBJECT, supportEmailBody(context));
  const loading = !info && !failed;

  const canCall = !!telUrl && phoneStatus.available;
  const phoneTitle = !telUrl
    ? t('supportWidget.phoneUnavailable')
    : canCall && phone
      ? `${t('supportWidget.phoneOpenNow')} · ${formatSupportPhone(phone)}`
      : t('supportWidget.phoneOpensAt9');

  return (
    <div
      ref={rootRef}
      className={cn(
        'pointer-events-none fixed right-4 z-[35] flex flex-col items-end gap-3 sm:right-6',
        aboveBottomNav
          ? 'bottom-[calc(env(safe-area-inset-bottom)_+_76px)] lg:bottom-6'
          : 'bottom-[calc(env(safe-area-inset-bottom)_+_16px)] sm:bottom-6',
      )}
    >
      {open && (
        <section
          ref={panelRef}
          id={panelId}
          aria-label={t('supportWidget.title')}
          tabIndex={-1}
          className="support-pop pointer-events-auto relative w-[min(272px,calc(100vw-2rem))] origin-bottom-right overflow-hidden rounded-[20px] border border-line bg-surface text-ink shadow-[0_24px_64px_-24px_rgba(10,16,51,0.45)] outline-none"
        >
          {/* Icons only; the × sits in the corner. */}
          <button
            type="button"
            onClick={minimize}
            aria-label={t('supportWidget.closeLabel')}
            aria-expanded
            aria-controls={panelId}
            className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-dim hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-orange"
          >
            <X size={15} />
          </button>

          <div className="px-2 pb-3 pt-4" aria-busy={loading}>
            {loading ? (
              <>
                <span className="sr-only" role="status">{t('supportWidget.loading')}</span>
                <div aria-hidden className="grid grid-cols-3 gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-2 py-1">
                      <div className="h-12 w-12 animate-pulse rounded-full bg-surface-dim" />
                      <div className="h-3 w-12 animate-pulse rounded bg-surface-dim" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              // WhatsApp → Call → Email, always in this order.
              <ul className="grid grid-cols-3 gap-1">
                <li>
                  <ChannelButton
                    href={whatsappUrl}
                    external
                    label={t('supportWidget.channelWhatsapp')}
                    note={whatsappUrl ? t('supportWidget.whatsappShort') : t('supportWidget.unavailableShort')}
                    title={whatsappUrl ? t('supportWidget.whatsappStatus') : t('supportWidget.whatsappUnavailable')}
                    newTabLabel={t('supportWidget.opensInNewTab')}
                    circleClass="bg-[#25D366] text-white"
                    icon={<FaWhatsapp size={23} />}
                  />
                </li>
                <li>
                  <ChannelButton
                    href={canCall ? telUrl : null}
                    label={t('supportWidget.channelCall')}
                    note={
                      !telUrl
                        ? t('supportWidget.unavailableShort')
                        : phoneStatus.available ? t('supportWidget.phoneShortOpen') : t('supportWidget.phoneShortClosed')
                    }
                    title={phoneTitle}
                    circleClass="bg-lp-brinjal text-white"
                    icon={<Phone size={19} />}
                  />
                </li>
                <li>
                  <ChannelButton
                    href={mailtoUrl}
                    label={t('supportWidget.channelEmail')}
                    note={mailtoUrl ? '' : t('supportWidget.unavailableShort')}
                    title={mailtoUrl ? t('supportWidget.emailDesc') : t('supportWidget.emailUnavailable')}
                    circleClass="bg-lp-orange text-white"
                    icon={<Mail size={19} />}
                  />
                </li>
              </ul>
            )}
          </div>
        </section>
      )}

      {!open && (
        <button
          ref={reopenRef}
          type="button"
          onClick={expand}
          aria-expanded={false}
          aria-controls={panelId}
          className="group pointer-events-auto flex flex-col items-end gap-0.5 rounded-full focus-visible:outline-none"
        >
          {/* Label + arrow bob together (so the arrow keeps pointing at the
              icon); the tip lands on the top of the headset icon below. */}
          <span className="support-nudge mr-[18px] flex items-start gap-0.5">
            <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink shadow-[0_8px_24px_-12px_rgba(10,16,51,0.45)] group-focus-visible:ring-2 group-focus-visible:ring-lp-orange">
              {t('supportWidget.helpNeeded')}
            </span>
            <svg
              aria-hidden
              viewBox="0 0 30 30"
              className="mt-3 h-7 w-7 flex-shrink-0 text-lp-orange"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 4 C 14 2, 23 9, 24 26" />
              <path d="M19 21 L 24 27 L 28.5 20.5" />
            </svg>
          </span>
          <span
            aria-hidden
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-lp-orange to-[#EA580C] text-white shadow-[0_12px_32px_-12px_rgba(10,16,51,0.5)] transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0"
          >
            <Headset size={20} />
          </span>
        </button>
      )}
    </div>
  );
}

/** One round channel icon with its label + a tiny status line. Disabled
 *  channels render as a non-interactive, faded element — never a dead link. */
function ChannelButton({
  href, external = false, label, note, title, newTabLabel, circleClass, icon,
}: {
  href: string | null;
  external?: boolean;
  label: string;
  note: string;
  title: string;
  newTabLabel?: string;
  circleClass: string;
  icon: ReactNode;
}) {
  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full shadow-[0_8px_20px_-10px_rgba(10,16,51,0.5)] transition-transform duration-150 group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0',
          circleClass,
        )}
      >
        {icon}
      </span>
      <span className="text-[12.5px] font-semibold leading-none text-ink">{label}</span>
      {note && <span className="-mt-1 text-[11px] leading-tight text-ink-soft">{note}</span>}
    </>
  );
  const base = 'group flex w-full flex-col items-center gap-1.5 rounded-xl px-1 py-1.5 text-center';
  if (!href) {
    return (
      <span role="link" aria-disabled="true" title={title} aria-label={`${label}, ${title}`} className={cn(base, 'cursor-not-allowed opacity-45 grayscale')}>
        {body}
      </span>
    );
  }
  return (
    <a
      href={href}
      title={title}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={cn(base, 'transition-colors hover:bg-surface-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-orange')}
    >
      {body}
      <span className="sr-only">, {title}{external && newTabLabel ? ` ${newTabLabel}` : ''}</span>
    </a>
  );
}
