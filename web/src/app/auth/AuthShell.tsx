import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Wallet, ShieldCheck } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { useT } from '../i18n';
import { LandingThemeProvider } from '../../pages/landing/context/ThemeContext';
import { ThemeToggle } from '../../pages/landing/components/ThemeToggle';

/**
 * Two-pane auth layout in the landing page's design language (similarweb-
 * style): the theme-aware navy/lavender base with brand glows (+ a starfield
 * in dark), a thin headline with its closing phrase in the brand gradient on
 * the left (desktop only), and the form in a glass card on the right. On
 * mobile it collapses to a single centred column — "the mobile website should
 * not feel like a broken desktop website" (spec §54).
 *
 * `.auth-scope` (index.css) re-points the shared app UI tokens so the
 * Button/TextField/Alert/SegmentedControl inside the forms match this look in
 * both themes; the landing theme provider/toggle is mounted here so the theme
 * can be switched from the auth pages too (same stored preference).
 */
export function AuthShell(props: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <LandingThemeProvider>
      <AuthShellInner {...props} />
    </LandingThemeProvider>
  );
}

function AuthShellInner({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useT();
  const headline = t('auth.brandHeadline');
  // Key phrase = the headline's last two words, set bold in the brand
  // gradient — the landing hero's "thin line + gradient phrase" treatment.
  const words = headline.split(' ');
  const splitAt = Math.max(0, words.length - 2);
  const lead = words.slice(0, splitAt).join(' ');
  const phrase = words.slice(splitAt).join(' ');

  return (
    <div className="auth-scope lp-stars relative isolate flex min-h-screen flex-col overflow-hidden bg-lp-navy text-lp-fg">
      {/* Brand glows — a brinjal wash top-left behind the story, a saffron
          ember bottom-right behind the form. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 h-[620px] w-[620px] rounded-full bg-lp-brinjal/30 blur-[140px]" />
        <div className="absolute -bottom-40 -right-32 h-[460px] w-[460px] rounded-full bg-lp-orange/15 blur-[130px]" />
      </div>

      <header className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link to="/" aria-label="Kolab home">
          <Logo className="h-8" />
        </Link>
        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />
          <ThemeToggle dark className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink-soft transition-colors hover:text-ink" />
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-5 pb-14 pt-4 sm:px-8 lg:grid-cols-[1fr_440px] lg:gap-16 lg:px-12">
        {/* Brand story — desktop only */}
        <aside className="hidden max-w-lg lg:block">
          <span className="lp-glass inline-flex flex-col gap-1 rounded-2xl px-4 py-3">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-lp-accent-ink">{t('auth.recommendedBadge')}</span>
            <span className="text-[15px] leading-snug text-lp-fg/85">{t('auth.mobileAppBetter')}</span>
          </span>

          <h2 className="lp-display mt-10 text-balance text-[2.9rem] leading-[1.08] text-lp-fg">
            {lead && <>{lead} </>}
            <span className="lp-gradient-text">{phrase}</span>
          </h2>

          <ul className="mt-9 space-y-3.5">
            <ValueRow icon={<Sparkles size={17} />}>{t('auth.brandPoint1')}</ValueRow>
            <ValueRow icon={<Wallet size={17} />}>{t('auth.brandPoint2')}</ValueRow>
            <ValueRow icon={<ShieldCheck size={17} />}>{t('auth.brandPoint3')}</ValueRow>
          </ul>

          <p className="mt-10 text-[13px] text-lp-fg/55">{t('auth.brandFooter')}</p>
        </aside>

        {/* Form card */}
        <main className="lp-glass mx-auto w-full max-w-[440px] rounded-[28px] p-7 shadow-[0_0_60px_-20px_rgba(99,102,241,0.55)] sm:p-9">
          <h1 className="lp-display text-[2rem] leading-tight text-lp-fg">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] font-light text-lp-fg/65">{subtitle}</p>}

          <div className="mt-7">{children}</div>

          {footer && <div className="mt-7 text-center text-[14px] text-lp-fg/65">{footer}</div>}
        </main>
      </div>
    </div>
  );
}

function ValueRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3.5 text-[15px] text-lp-fg/85">
      <span className="lp-glass flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lp-accent-ink">{icon}</span>
      <span>{children}</span>
    </li>
  );
}
