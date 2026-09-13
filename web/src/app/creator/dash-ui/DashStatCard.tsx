import type { LucideIcon } from 'lucide-react';
import { cn } from '../../ui/cn';
import { Skeleton } from '../../ui/Skeleton';

const TONES = {
  violet: 'text-violet-dark',
  pink: 'text-brand-orange',
  blue: 'text-blue-600',
  green: 'text-success',
  amber: 'text-warning',
} as const;

/**
 * Dashboard metric tile — same editorial treatment as the site's `ui/StatCard`
 * (violet→orange gradient hairline, Fraunces serif value), with a per-stat
 * tone-colored icon.
 */
export function DashStatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'violet',
  className,
}: {
  label: string;
  value?: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-line bg-surface p-4', className)}>
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-violet/60 to-brand-orange/50"
      />
      <div className="flex items-center gap-2 text-ink-soft">
        <Icon size={16} strokeWidth={2} className={TONES[tone]} />
        <span className="text-[13px] font-medium">{label}</span>
      </div>
      {value === undefined ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <p className="mt-1.5 font-serif text-[26px] font-medium leading-none tracking-tight text-ink">{value}</p>
      )}
      {hint && <p className="mt-1.5 text-[12px] text-ink-soft">{hint}</p>}
    </div>
  );
}
