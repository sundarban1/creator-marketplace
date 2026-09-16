import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Calendar, CheckCircle2, Gift, Rocket, Smartphone, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLandingLanguage, type LandingLang } from '../context/LanguageContext';
import { useSiteInfo } from '../hooks/useSiteInfo';
import type { SiteInfo } from '../../../lib/api';

const LANGUAGE_NAMES: Record<LandingLang, string> = { en: 'English', ne: 'नेपाली' };

// One gradient per highlighted title segment (Kolab / Enter / Lucky Draw) —
// distinct hues so the three read as separate highlights against the
// violet-to-orange hero band, rather than all sharing the same treatment.
const TITLE_GRADIENTS = {
  gold: 'bg-gradient-to-r from-amber-200 to-yellow-400',
  cyan: 'bg-gradient-to-r from-sky-200 to-cyan-300',
  pink: 'bg-gradient-to-r from-pink-200 to-fuchsia-300',
} as const;

// Brand names appear verbatim (untranslated) in the "Like & Follow" step
// copy in both languages — splitting on them here and pointing each at the
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
  const [open, setOpen] = useState(false);

  // Shows on every landing page load (no dismissal persistence) — it's a
  // live-event announcement, not a one-time onboarding tip.
  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="launch-announcement-title"
            className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-2xl dark:border-white/10 dark:bg-ink-elevated"
          >
            {/* Hero band */}
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-violet via-violet to-brand-orange px-7 pb-7 pt-6 text-white">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-white/10 blur-2xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
              />

              <div className="relative flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setLang(lang === 'en' ? 'ne' : 'en')}
                  aria-label={`Switch to ${LANGUAGE_NAMES[lang === 'en' ? 'ne' : 'en']}`}
                  className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full border border-white/30 px-2 text-[11px] font-semibold uppercase tracking-wide text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {lang === 'en' ? 'ने' : 'EN'}
                </button>

                <h2 id="launch-announcement-title" className="text-balance text-center font-serif text-xl font-medium leading-tight sm:text-2xl">
                  {copy.title.map((part, i) =>
                    'gradient' in part ? (
                      <span
                        key={i}
                        className={`${TITLE_GRADIENTS[part.gradient]} bg-clip-text text-transparent`}
                      >
                        {part.text}
                      </span>
                    ) : (
                      <span key={i}>{part.text}</span>
                    ),
                  )}
                </h2>

                <button
                  type="button"
                  onClick={dismiss}
                  aria-label={copy.closeAriaLabel}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/30 text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-7 py-6">
              <p className="text-xs font-bold uppercase tracking-wide text-violet dark:text-brand-orange">
                {copy.stepsHeading}
              </p>

              <ol className="mt-4 space-y-3.5">
                {copy.steps.map((step, i) => (
                  <li key={step.label} className="flex gap-3">
                    <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-violet dark:text-brand-orange" />
                    <p className="text-sm leading-relaxed text-ink dark:text-white">
                      <span className="font-bold">{step.label}</span>{' '}
                      {i === 2 ? renderWithPlatformLinks(step.rest, siteInfo?.social) : step.rest}
                    </p>
                  </li>
                ))}
              </ol>

              <p className="mt-4 text-xs leading-relaxed text-ink-soft dark:text-white/70">{copy.eligibilityNote}</p>

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-violet/20 bg-violet/5 p-4 dark:border-white/10 dark:bg-white/5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-violet shadow-sm dark:bg-ink-elevated dark:text-white">
                  <Gift size={16} />
                </span>
                <p className="text-sm font-semibold leading-relaxed text-ink dark:text-white">{copy.prizesNote}</p>
              </div>

              <div className="mt-3 flex items-start gap-3 px-1">
                <Rocket size={18} className="mt-0.5 shrink-0 text-violet dark:text-brand-orange" />
                <p className="text-xs leading-relaxed text-ink-soft dark:text-white/70">{copy.earlyAccessNote}</p>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-violet/20 bg-violet/5 p-4 dark:border-white/10 dark:bg-white/5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-violet shadow-sm dark:bg-ink-elevated dark:text-white">
                  <Smartphone size={16} />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-violet dark:text-brand-orange">
                    {copy.appNoteEyebrow}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-ink dark:text-white">{copy.appNoteTitle}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft dark:text-white/70">{copy.appNoteBody}</p>
                </div>
              </div>

              <div className="mt-5 flex justify-center">
                <p className="inline-flex items-center gap-2 rounded-full border border-violet/20 bg-violet/5 px-3.5 py-1.5 text-center text-xs font-semibold text-ink dark:border-white/10 dark:bg-white/5 dark:text-white">
                  <Calendar size={13} className="shrink-0 text-violet dark:text-brand-orange" />
                  {copy.launchDateNote}
                </p>
              </div>
            </div>

            {/* Footer CTA */}
            <div className="shrink-0 border-t border-ink/10 px-7 py-5 dark:border-white/10">
              <Link
                to="/signup"
                onClick={dismiss}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-violet to-brand-orange px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-[0_10px_24px_-10px_rgba(123,92,245,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
              >
                {copy.cta}
                <ArrowRight size={14} />
              </Link>
              <p className="mt-3 text-center text-xs text-ink-soft dark:text-white/70">
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
