import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';
import { Skeleton } from './Skeleton';

/**
 * Compact metric tile for dashboards — matches the admin dashboard's
 * `StatCard` (icon in a tinted rounded tile, value stacked below the label).
 * `value === undefined` renders a skeleton.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'brand',
  className,
  labelClassName,
  /** Below `sm`: hides the label, centers icon+value together, and shrinks
   * both to a matching size so the tile reads as one compact unit. Reverts
   * to the normal layout at `sm` and up. */
  compact,
}: {
  label: string;
  value?: string | number;
  icon?: LucideIcon;
  hint?: string;
  tone?: 'brand' | 'blue' | 'amber' | 'emerald' | 'orange';
  className?: string;
  labelClassName?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-xl border border-line bg-surface p-5 transition-shadow hover:shadow-md',
        compact && 'flex-col items-center gap-1.5 p-3 text-center sm:flex-row sm:items-start sm:gap-4 sm:p-5 sm:text-left',
        className,
      )}
    >
      {Icon && (
        <span className={cn('flex-shrink-0 rounded-lg p-3', compact && 'p-2 sm:p-3', TONE_BG[tone])}>
          <Icon className={cn('h-5 w-5', compact && 'h-4 w-4 sm:h-5 sm:w-5', TONE_ICON[tone])} />
        </span>
      )}
      <div className={cn('min-w-0 flex-1', compact && 'flex flex-col items-center sm:items-stretch')}>
        <p className={cn('truncate text-sm font-medium text-ink-soft', compact && 'hidden sm:block', labelClassName)}>{label}</p>
        {value === undefined ? (
          <Skeleton className="mt-1.5 h-7 w-16" />
        ) : (
          <p
            className={cn(
              'mt-0.5 text-2xl font-bold leading-none tracking-tight text-ink',
              compact && 'mt-0 text-base font-semibold sm:mt-0.5 sm:text-2xl sm:font-bold',
            )}
          >
            {value}
          </p>
        )}
        {hint && <p className="mt-1.5 text-xs text-ink-soft">{hint}</p>}
      </div>
    </div>
  );
}

const TONE_BG: Record<string, string> = {
  brand: 'bg-brand/10',
  blue: 'bg-blue-50',
  amber: 'bg-amber-50',
  emerald: 'bg-emerald-50',
  orange: 'bg-orange-50',
};

const TONE_ICON: Record<string, string> = {
  brand: 'text-brand',
  blue: 'text-blue-600',
  amber: 'text-amber-600',
  emerald: 'text-emerald-600',
  orange: 'text-orange-600',
};
