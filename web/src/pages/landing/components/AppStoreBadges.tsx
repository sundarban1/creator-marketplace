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
    ? 'bg-ink text-white hover:bg-ink/85'
    : 'bg-transparent text-white border border-white/30 hover:border-white/60';

  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
      <a
        href={APP_STORE_URL}
        className={`flex items-center gap-2.5 rounded-md px-5 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${badgeClass}`}
      >
        <FaApple size={17} />
        <span className="flex flex-col items-start leading-none">
          <span className="text-[9px] font-medium uppercase tracking-wide opacity-70">Download on the</span>
          <span>App Store</span>
        </span>
      </a>
      <a
        href={PLAY_STORE_URL}
        className={`flex items-center gap-2.5 rounded-md px-5 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${badgeClass}`}
      >
        <FaGooglePlay size={15} />
        <span className="flex flex-col items-start leading-none">
          <span className="text-[9px] font-medium uppercase tracking-wide opacity-70">Get it on</span>
          <span>Google Play</span>
        </span>
      </a>
    </div>
  );
}
