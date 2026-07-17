import { motion } from 'framer-motion';
import { FaApple, FaGooglePlay } from 'react-icons/fa6';

interface ComingSoonBadgeProps {
  variant?: 'dark' | 'light';
  className?: string;
}

// Drop-in replacement for <AppStoreBadges /> while the app isn't live yet —
// same pill language and icon set so the page doesn't visually jump when
// Coming Soon mode is toggled off later, but muted and non-interactive
// (no href, no hover-lift) so it never reads as a broken/dead button.
export function ComingSoonBadge({ variant = 'dark', className = '' }: ComingSoonBadgeProps) {
  const isDark = variant === 'dark';

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-full border px-5 py-3 ${
        isDark ? 'border-ink/15 bg-ink/[0.03] text-ink-soft' : 'border-white/20 bg-white/5 text-white/70'
      } ${className}`}
    >
      <span className="flex items-center gap-2.5 opacity-70">
        <FaApple size={17} />
        <FaGooglePlay size={15} />
      </span>
      <span className={`h-4 w-px ${isDark ? 'bg-ink/15' : 'bg-white/20'}`} />
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <motion.span
          className="h-1.5 w-1.5 rounded-full bg-brand-orange"
          animate={{ opacity: [1, 0.35, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        Coming Soon
      </span>
    </div>
  );
}
