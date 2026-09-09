import type { ComponentType } from 'react';
import { motion } from 'framer-motion';
import { FaApple, FaGooglePlay } from 'react-icons/fa6';
import { useLandingLanguage } from '../context/LanguageContext';
import { useComingSoon } from '../hooks/useComingSoon';
import { APP_STORE_URL, PLAY_STORE_URL } from './appStoreLinks';

interface AppStoreBadgesProps {
  variant?: 'dark' | 'light';
  className?: string;
}

// One row of two download badges — Apple and Google Play — where each store is
// independently either a real link or a muted, non-interactive "Coming Soon"
// pill, driven by the admin's per-store Coming Soon toggles. Same footprint in
// both states so the page doesn't jump when a toggle flips.
export function AppStoreBadges({ variant = 'dark', className = '' }: AppStoreBadgesProps) {
  const { d } = useLandingLanguage();
  const comingSoon = useComingSoon();
  const isDark = variant === 'dark';

  // The 'dark' variant (a solid ink-colored badge) is used on light sections
  // like Hero — needs its own `dark:` flip so it doesn't blend into the page
  // background when the page's own theme switches to dark. The 'light' variant
  // is only ever used on sections that are already permanently dark (Audience,
  // Security), so it doesn't need one.
  const liveClass = isDark
    ? 'bg-ink text-white hover:bg-ink/85 dark:bg-white dark:text-ink dark:hover:bg-white/85'
    : 'bg-transparent text-white border border-white/30 hover:border-white/60';
  const soonClass = isDark
    ? 'border border-ink/15 bg-ink/[0.03] text-ink-soft dark:border-white/15 dark:bg-white/[0.05] dark:text-white/60'
    : 'border border-white/20 bg-white/5 text-white/60';
  const base = 'flex w-44 items-center justify-center gap-2.5 rounded-md px-4 py-3 text-sm font-semibold';
  const liveLink = `${base} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet ${liveClass}`;

  function badge(
    isComingSoon: boolean,
    href: string,
    Icon: ComponentType<{ size?: number; className?: string }>,
    iconSize: number,
    topLabel: string,
    name: string,
  ) {
    if (isComingSoon) {
      return (
        <div className={`${base} ${soonClass}`}>
          <Icon size={iconSize} className="opacity-70" />
          <span className="flex flex-col items-start leading-none">
            <span className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide opacity-80">
              <motion.span
                className="h-1 w-1 rounded-full bg-brand-orange"
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              {d.comingSoonBadge.label}
            </span>
            <span>{name}</span>
          </span>
        </div>
      );
    }
    return (
      <a href={href} className={liveLink}>
        <Icon size={iconSize} />
        <span className="flex flex-col items-start leading-none">
          <span className="text-[9px] font-medium uppercase tracking-wide opacity-70">{topLabel}</span>
          <span>{name}</span>
        </span>
      </a>
    );
  }

  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
      {badge(comingSoon.ios, APP_STORE_URL, FaApple, 17, d.appStoreBadges.downloadOnThe, d.appStoreBadges.appStore)}
      {badge(comingSoon.android, PLAY_STORE_URL, FaGooglePlay, 15, d.appStoreBadges.getItOn, d.appStoreBadges.googlePlay)}
    </div>
  );
}
