import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChevronRight, X } from 'lucide-react';
import { cn } from './cn';

/**
 * A single "needs your attention" nudge — pending work or an incomplete
 * profile. Mirrors the mobile home screen's AttentionBanner (one shown at a
 * time, most time-sensitive wins), reskinned to the site's warning token.
 */
export function AttentionBanner({
  icon: Icon,
  title,
  subtitle,
  to,
  onDismiss,
  className,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  to: string;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Link
        to={to}
        className="flex items-start gap-3 rounded-2xl border border-warning/25 bg-warning-soft/50 p-4 pr-9 transition-colors hover:border-warning/40"
      >
        <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
          <Icon size={17} strokeWidth={2.25} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-semibold text-ink">{title}</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-soft">{subtitle}</span>
        </span>
        <ChevronRight size={18} className="flex-shrink-0 self-center text-warning/70" />
      </Link>
      {onDismiss && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss();
          }}
          aria-label="Dismiss"
          className="absolute right-2.5 top-2.5 rounded-full p-1 text-ink-soft/50 hover:bg-black/[0.05] hover:text-ink-soft"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
