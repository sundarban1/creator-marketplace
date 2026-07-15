import { FaApple, FaGooglePlay } from 'react-icons/fa6';

// Real store URLs aren't published yet — badges link to '#' as placeholders
// until the app is live, so update APP_STORE_URL/PLAY_STORE_URL then.
const APP_STORE_URL = '#';
const PLAY_STORE_URL = '#';

interface AppStoreBadgesProps {
  variant?: 'dark' | 'light';
  className?: string;
}

export function AppStoreBadges({ variant = 'dark', className = '' }: AppStoreBadgesProps) {
  const isDark = variant === 'dark';
  const badgeClass = isDark
    ? 'bg-ink text-white hover:bg-ink/90'
    : 'bg-white text-ink border border-ink/15 hover:border-ink/30';

  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
      <a
        href={APP_STORE_URL}
        className={`flex items-center gap-2.5 rounded-full px-5 py-3 text-sm font-bold shadow-sm transition-colors ${badgeClass}`}
      >
        <FaApple size={18} />
        <span className="flex flex-col items-start leading-none">
          <span className="text-[9px] font-medium uppercase tracking-wide opacity-70">Download on the</span>
          <span>App Store</span>
        </span>
      </a>
      <a
        href={PLAY_STORE_URL}
        className={`flex items-center gap-2.5 rounded-full px-5 py-3 text-sm font-bold shadow-sm transition-colors ${badgeClass}`}
      >
        <FaGooglePlay size={16} />
        <span className="flex flex-col items-start leading-none">
          <span className="text-[9px] font-medium uppercase tracking-wide opacity-70">Get it on</span>
          <span>Google Play</span>
        </span>
      </a>
    </div>
  );
}
