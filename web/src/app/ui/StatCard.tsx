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
}: {
  label: string;
  value?: string | number;
  icon?: LucideIcon;
  hint?: string;
  tone?: 'brand' | 'blue' | 'amber' | 'emerald' | 'orange';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-xl border border-line bg-surface p-5 transition-shadow hover:shadow-md',
        className,
      )}
    >
      {Icon && (
        <span className={cn('flex-shrink-0 rounded-lg p-3', TONE_BG[tone])}>
          <Icon size={20} className={TONE_ICON[tone]} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-soft">{label}</p>
        {value === undefined ? (
          <Skeleton className="mt-1.5 h-7 w-16" />
        ) : (
          <p className="mt-0.5 text-2xl font-bold leading-none tracking-tight text-ink">{value}</p>
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
