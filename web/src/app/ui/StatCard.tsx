import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';
import { Skeleton } from './Skeleton';

/** Compact metric tile for dashboards. `value === undefined` renders a skeleton. */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  className,
}: {
  label: string;
  value?: string | number;
  icon?: LucideIcon;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-2xl border border-line bg-surface p-4', className)}>
      <div className="flex items-center gap-2 text-ink-soft">
        {Icon && <Icon size={16} strokeWidth={2} />}
        <span className="text-[13px] font-medium">{label}</span>
      </div>
      {value === undefined ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <p className="mt-1.5 text-2xl font-bold tracking-tight text-ink">{value}</p>
      )}
      {hint && <p className="mt-1 text-[12px] text-ink-soft">{hint}</p>}
    </div>
  );
}
