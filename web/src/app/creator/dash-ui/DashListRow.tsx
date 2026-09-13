import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../ui/cn';

const TONES = {
  neutral: 'bg-surface-dim text-ink-soft',
  violet: 'bg-violet/10 text-violet-dark',
  pink: 'bg-brand-orange/10 text-brand-orange',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-success-soft text-success',
  red: 'bg-danger-soft text-danger',
} as const;

/**
 * Generic icon + label/sublabel + trailing-content row, used for wallet
 * transactions/withdrawals and grouped settings rows.
 */
export function DashListRow({
  icon: Icon,
  tone = 'neutral',
  title,
  subtitle,
  trailing,
  chevron = false,
  onClick,
  as: As = onClick ? 'button' : 'div',
  className,
}: {
  icon?: LucideIcon;
  tone?: keyof typeof TONES;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  as?: 'div' | 'button';
  className?: string;
}) {
  return (
    <As
      onClick={onClick}
      type={As === 'button' ? 'button' : undefined}
      className={cn(
        'flex w-full items-center gap-3 py-3 text-left',
        As === 'button' && 'transition-colors hover:bg-surface-dim focus-visible:outline-none',
        className,
      )}
    >
      {Icon && (
        <span className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full', TONES[tone])}>
          <Icon size={16} strokeWidth={2} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-ink">{title}</p>
        {subtitle && <p className="truncate text-[12px] text-ink-soft">{subtitle}</p>}
      </div>
      {trailing && <div className="flex-shrink-0 text-right">{trailing}</div>}
      {chevron && <ChevronRight size={16} className="flex-shrink-0 text-ink-soft/60" />}
    </As>
  );
}
