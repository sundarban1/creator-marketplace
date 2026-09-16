import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

/**
 * Surface container for the app — matches the admin dashboard's plain white/
 * bordered card (`rounded-xl border border-gray-200`). `interactive` adds
 * admin's flat `hover:shadow-md` lift for cards that are themselves links/
 * buttons (creator cards, event cards). `accent` is a no-op kept for call-site
 * compatibility — the admin reference has no gradient hairlines.
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
  void accent;
  return (
    <As
      className={cn(
        'relative min-w-0 rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)]',
        padded && 'p-5',
        interactive &&
          'transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_8px_24px_rgba(16,24,40,0.08)]',
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
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}
