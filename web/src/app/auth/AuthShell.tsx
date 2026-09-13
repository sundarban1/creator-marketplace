import type { ReactNode } from 'react';
import { Sparkles, Wallet, ShieldCheck } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { useT } from '../i18n';

/**
 * Two-pane auth layout: a warm brand panel on the left (desktop only) and the
 * form on the right. On mobile it collapses to a single centred column with a
 * small logo — "the mobile website should not feel like a broken desktop
 * website" (spec §54).
 */
export function AuthShell({
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
  return (
    <div className="flex min-h-screen bg-paper text-ink">
      {/* Brand panel */}
      <aside className="relative hidden w-[46%] max-w-[620px] flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-indigo via-violet-dark to-brand-orange p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #fff 1.5px, transparent 0)',
            backgroundSize: '26px 26px',
          }}
          aria-hidden
        />
        <div className="relative">
          <Logo invert className="h-8" />

          <div className="mt-20 inline-flex flex-col gap-1.5 rounded-2xl bg-white/15 px-4 py-3">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-white">
              {t('auth.recommendedBadge')}
            </span>
            <p className="font-serif text-[16px] italic leading-snug text-white">{t('auth.mobileAppBetter')}</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-serif text-[2.4rem] leading-[1.15] text-balance">
            {t('auth.brandHeadline')}
          </h2>

          <ul className="mt-8 space-y-4 text-[15px] text-white/90">
            <ValueRow icon={<Sparkles size={18} />}>{t('auth.brandPoint1')}</ValueRow>
            <ValueRow icon={<Wallet size={18} />}>{t('auth.brandPoint2')}</ValueRow>
            <ValueRow icon={<ShieldCheck size={18} />}>{t('auth.brandPoint3')}</ValueRow>
          </ul>
        </div>

        <p className="relative text-[13px] text-white/70">{t('auth.brandFooter')}</p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8">
          <Logo className="h-7 lg:invisible" />
          <LanguageSwitcher />
        </header>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 pt-2 sm:px-8">
          <div className="w-full max-w-[400px]">
            <h1 className="text-[26px] font-bold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-1.5 text-[15px] text-ink-soft">{subtitle}</p>}

            <div className="mt-7">{children}</div>

            {footer && <div className="mt-7 text-center text-[14px] text-ink-soft">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}

function ValueRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/15">
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}
