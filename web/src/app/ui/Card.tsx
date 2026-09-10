import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

/**
 * Surface container for the app. `interactive` adds hover affordance for cards
 * that are themselves links/buttons (creator cards, event cards).
 */
export function Card({
  as: As = 'div',
  interactive = false,
  padded = true,
  className,
  children,
  ...rest
}: {
  as?: 'div' | 'article' | 'section' | 'li';
  interactive?: boolean;
  padded?: boolean;
  className?: string;
  children?: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  return (
    <As
      className={cn(
        'rounded-2xl border border-line bg-surface',
        padded && 'p-5',
        interactive &&
          'transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-[0_1px_3px_rgba(20,17,16,0.06),0_8px_24px_-12px_rgba(20,17,16,0.12)]',
        className,
      )}
      {...rest}
    >
      {children}
    </As>
  );
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}
