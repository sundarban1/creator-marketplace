import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronRight, Gift, PartyPopper, Sparkles, Ticket, TicketPercent, Wallet } from 'lucide-react';
import { FaApple, FaGooglePlay } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { useLandingLanguage, type LandingLang } from '../context/LanguageContext';
import { useSiteInfo } from '../hooks/useSiteInfo';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useComingSoon } from '../hooks/useComingSoon';
import type { SiteInfo } from '../../../lib/api';

const LANGUAGE_NAMES: Record<LandingLang, string> = { en: 'English', ne: 'नेपाली' };

const PRIZE_ICONS = [Gift, Wallet, TicketPercent, Sparkles];

// Brand names appear verbatim (untranslated) in the "Follow Kolab" step copy
// in both languages — splitting on them here and pointing each at the
// admin-managed URL (useSiteInfo, same source as SocialRail.tsx) turns them
// into real links without needing per-language markup in the i18n dict.
const PLATFORM_KEYS: Record<string, keyof SiteInfo['social']> = {
  Facebook: 'facebook',
  Instagram: 'instagram',
  TikTok: 'tiktok',
};
const PLATFORM_SPLIT = /(Facebook|Instagram|TikTok)/g;

function renderWithPlatformLinks(text: string, social: SiteInfo['social'] | undefined) {
  return text.split(PLATFORM_SPLIT).map((part, i) => {
    const key = PLATFORM_KEYS[part];
    if (!key) return part;
    const url = social?.[key];
    return url ? (
      <a
        key={i}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-violet underline-offset-2 hover:underline dark:text-brand-orange"
      >
        {part}
      </a>
    ) : (
      <span key={i} className="font-semibold">
        {part}
      </span>
    );
  });
}

export function LaunchAnnouncementModal() {
  const { lang, setLang, d } = useLandingLanguage();
  const copy = d.launchAnnouncement;
  const siteInfo = useSiteInfo();
  const comingSoon = useComingSoon();
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Shows on every landing page load (no dismissal persistence) — it's a
  // live-event announcement, not a one-time onboarding tip.
  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  function dismiss() {
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          data-lenis-prevent
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(10,10,15,0.55)] p-3 backdrop-blur-sm sm:p-4"
          onClick={dismiss}
        >
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="launch-announcement-title"
            tabIndex={-1}
            className="relative flex max-h-[90vh] w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[24px] border border-ink/10 bg-white shadow-2xl outline-none sm:max-h-[85vh] sm:w-[calc(100vw-40px)] sm:max-w-[720px] sm:rounded-[28px] dark:border-white/10 dark:bg-ink-elevated"
          >
            {/* Ambient background tint */}
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet/[0.05] via-transparent to-brand-orange/[0.04]" />
            <div
              aria-hidden
              className="mesh-blob pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet/[0.08] blur-[80px]"
            />
            <div
              aria-hidden
              className="mesh-blob pointer-events-none absolute -left-14 top-24 h-44 w-44 rounded-full bg-brand-orange/[0.07] blur-[80px]"
              style={{ animationDelay: '3s' }}
            />

            {/* Header: badge + language toggle + close */}
            <div className="relative flex flex-wrap items-center justify-between gap-2 px-5 pt-4 sm:px-7 sm:pt-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet/10 to-brand-orange/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-violet dark:text-brand-orange">
                  {copy.badge}
                </span>
                {(comingSoon.ios || comingSoon.android) && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-ink/[0.03] px-3 py-1.5 text-[11px] font-semibold text-ink-soft dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                    <FaApple size={11} aria-hidden />
                    {copy.appsComingSoonIos}
                    <span className="opacity-70">{copy.appsComingSoonMid}</span>
                    <FaGooglePlay size={10} aria-hidden />
                    {copy.appsComingSoonAndroid}{' '}
                    {copy.appsComingSoonSuffix}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLang(lang === 'en' ? 'ne' : 'en')}
                  aria-label={`Switch to ${LANGUAGE_NAMES[lang === 'en' ? 'ne' : 'en']}`}
                  className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full border border-ink/10 px-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  {lang === 'en' ? 'ने' : 'EN'}
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  aria-label={copy.closeAriaLabel}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/5 text-lg leading-none text-ink-soft transition-colors hover:bg-ink/10 hover:text-ink dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15 dark:hover:text-white"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="relative overflow-y-auto px-5 pb-5 pt-1 sm:px-7">
              {/* Hero */}
              <div className="relative text-center">
                <div
                  aria-hidden
                  className={`absolute left-3 top-2 hidden h-10 w-10 items-center justify-center rounded-2xl border border-violet/15 bg-white text-violet shadow-[0_8px_20px_-8px_rgba(123,92,245,0.35)] dark:border-white/10 dark:bg-ink-elevated-2 sm:flex ${reducedMotion ? '' : 'float-slow'}`}
                >
                  <Gift size={18} />
                </div>
                <div
                  aria-hidden
                  className={`absolute right-3 top-8 hidden h-10 w-10 items-center justify-center rounded-2xl border border-brand-orange/15 bg-white text-brand-orange shadow-[0_8px_20px_-8px_rgba(249,115,22,0.35)] dark:border-white/10 dark:bg-ink-elevated-2 sm:flex ${reducedMotion ? '' : 'float-slow'}`}
                  style={{ animationDelay: '1.5s' }}
                >
                  <Ticket size={18} />
                </div>

                <h2
                  id="launch-announcement-title"
                  className="text-balance font-serif text-[26px] font-medium leading-[1.1] text-ink sm:text-[36px] dark:text-white"
                >
                  {copy.titleTop}
                  <br />
                  {copy.titleBottomPre}
                  <span className="bg-gradient-to-r from-violet to-brand-orange bg-clip-text text-transparent">
                    {copy.titleHighlight}
                  </span>
                </h2>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft sm:text-[15px] dark:text-white/70">
                  {copy.description}
                </p>
              </div>

              {/* Steps */}
              <div className="mt-5">
                <p className="text-center text-sm font-bold text-ink dark:text-white">{copy.stepsHeading}</p>
                <p className="mt-1 text-center text-xs text-ink-soft dark:text-white/70">{copy.stepsSubheading}</p>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch sm:gap-1.5">
                  {copy.steps.map((step, i) => (
                    <div key={step.title} className="contents">
                      <div className="flex flex-col items-center rounded-2xl border border-ink/10 bg-paper-dim/50 px-3.5 py-3 text-center transition-colors hover:border-violet/30 dark:border-white/10 dark:bg-white/[0.04]">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-brand-orange text-[11px] font-bold text-white">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <p className="mt-2 text-[13px] font-bold text-ink dark:text-white">{step.title}</p>
                        <p className="mt-0.5 text-xs leading-snug text-ink-soft dark:text-white/70">
                          {i === 1 ? renderWithPlatformLinks(step.description, siteInfo?.social) : step.description}
                        </p>
                      </div>
                      {i < copy.steps.length - 1 && (
                        <div className="hidden shrink-0 items-center justify-center sm:flex">
                          <ArrowRight size={16} className="text-ink dark:text-white" aria-hidden />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Eligibility confirmation */}
              <div className="mt-2.5 flex items-start gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] px-4 py-3 dark:border-emerald-400/20 dark:bg-emerald-400/[0.08]">
                <PartyPopper size={17} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm leading-snug text-ink dark:text-white">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{copy.eligibleTitle}</span>{' '}
                  {copy.eligibleBody}
                </p>
              </div>

              {/* Attendance note */}
              <div className="mt-2.5 rounded-2xl border border-violet/20 bg-violet/5 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-sm font-bold text-ink dark:text-white">{copy.attendanceTitle}</p>
                <p className="mt-0.5 text-xs leading-snug text-ink-soft dark:text-white/70">
                  {copy.attendanceBody} {copy.attendanceNote}
                </p>
              </div>

              {/* Prizes */}
              <div className="mt-3.5 text-center">
                <p className="text-xs font-bold text-ink dark:text-white">{copy.prizesHeading}</p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  {copy.prizes.map((prize, i) => {
                    const Icon = PRIZE_ICONS[i % PRIZE_ICONS.length];
                    return (
                      <span
                        key={prize}
                        className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-paper-dim/60 px-3 py-1.5 text-xs font-semibold text-ink dark:border-white/10 dark:bg-white/5 dark:text-white"
                      >
                        <Icon size={13} className="shrink-0 text-violet dark:text-brand-orange" />
                        {prize}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer CTA */}
            <div className="relative shrink-0 border-t border-ink/10 px-5 py-3.5 sm:px-7 sm:py-4 dark:border-white/10">
              <Link
                to="/signup"
                onClick={dismiss}
                className="flex h-[52px] w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-violet to-brand-orange text-[15px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(123,92,245,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 active:translate-y-0"
              >
                {copy.cta}
                <ChevronRight size={17} aria-hidden />
              </Link>
              <p className="mt-2.5 text-center text-xs text-ink-soft dark:text-white/70">
                {copy.loginPrompt}{' '}
                <Link
                  to="/login"
                  onClick={dismiss}
                  className="font-semibold text-violet underline-offset-2 hover:underline dark:text-white"
                >
                  {copy.login}
                </Link>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
