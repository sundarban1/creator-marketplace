import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

/**
 * Surface container for the app. `interactive` adds a violet hover-lift for
 * cards that are themselves links/buttons (creator cards, event cards) —
 * matched to the public marketplace cards. `accent` draws a violet→orange
 * gradient hairline across the top for cards that lead a section.
 */
export function Card({
  as: As = 'div',
  interactive = false,
  accent = false,
  padded = true,
  className,
  children,
  ...rest
}: {
  as?: 'div' | 'article' | 'section' | 'li';
  interactive?: boolean;
  accent?: boolean;
  padded?: boolean;
  className?: string;
  children?: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  return (
    <As
      className={cn(
        'relative min-w-0 rounded-2xl border border-line bg-surface',
        accent && 'overflow-hidden',
        padded && 'p-5',
        interactive &&
          'transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-violet/30 hover:shadow-[0_10px_28px_-16px_rgba(123,92,245,0.4)]',
        className,
      )}
      {...rest}
    >
      {accent && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-violet/60 to-brand-orange/50"
        />
      )}
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
      <h2 className="font-serif text-[16px] font-medium tracking-tight text-ink">{title}</h2>
      {action}
    </div>
  );
}
