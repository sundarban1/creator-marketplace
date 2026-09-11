import type { ComponentType, ReactNode } from 'react';
import {
  Inbox,
  SearchX,
  WifiOff,
  AlertTriangle,
  CalendarX,
  FileQuestion,
  type LucideProps,
} from 'lucide-react';
import { cn } from './cn';
import { Button } from './Button';

/**
 * One reusable empty/edge state for every "there's nothing here" condition
 * across the marketplace app (spec §58, §86) — no results, no data yet,
 * offline, load error. Screens pass copy + an action; the `variant` only picks
 * a default icon + tint.
 *
 *   <EmptyState
 *     variant="no-results"
 *     title={t('events.noResultsTitle')}
 *     description={t('events.noResultsBody')}
 *     action={{ label: t('common.clearFilters'), onClick: reset }}
 *   />
 */
export type EmptyVariant =
  | 'empty' // nothing created yet
  | 'no-results' // search/filter returned nothing
  | 'offline'
  | 'error'
  | 'no-events'
  | 'not-found';

interface EmptyAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

const VARIANTS: Record<EmptyVariant, { Icon: ComponentType<LucideProps>; tint: string }> = {
  empty: { Icon: Inbox, tint: 'text-violet bg-violet/10' },
  'no-results': { Icon: SearchX, tint: 'text-ink-soft bg-surface-dim' },
  offline: { Icon: WifiOff, tint: 'text-warning bg-warning-soft' },
  error: { Icon: AlertTriangle, tint: 'text-danger bg-danger-soft' },
  'no-events': { Icon: CalendarX, tint: 'text-violet bg-violet/10' },
  'not-found': { Icon: FileQuestion, tint: 'text-ink-soft bg-surface-dim' },
};

export function EmptyState({
  variant = 'empty',
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className,
}: {
  variant?: EmptyVariant;
  /** Override the variant's default icon. */
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: EmptyAction;
  secondaryAction?: EmptyAction;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const { Icon, tint } = VARIANTS[variant];

  return (
    <div
      className={cn(
        'mx-auto flex max-w-sm flex-col items-center text-center',
        size === 'md' ? 'py-14' : 'py-8',
        className,
      )}
      role="status"
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl',
          size === 'md' ? 'h-14 w-14' : 'h-11 w-11',
          tint,
        )}
        aria-hidden
      >
        {icon ?? <Icon size={size === 'md' ? 26 : 20} strokeWidth={1.75} />}
      </div>

      <h3 className={cn('mt-4 font-semibold text-ink', size === 'md' ? 'text-[17px]' : 'text-[15px]')}>
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{description}</p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {action &&
            (action.href ? (
              <a href={action.href}>
                <Button size="sm">{action.label}</Button>
              </a>
            ) : (
              <Button size="sm" onClick={action.onClick}>
                {action.label}
              </Button>
            ))}
          {secondaryAction &&
            (secondaryAction.href ? (
              <a href={secondaryAction.href}>
                <Button size="sm" variant="secondary">
                  {secondaryAction.label}
                </Button>
              </a>
            ) : (
              <Button size="sm" variant="secondary" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
