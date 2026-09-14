import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * Standard page title block for authed screens — matches the admin
 * dashboard's plain header (bold sans title, muted subtitle, no rule/pill).
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  /** Small label above the title. */
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand">{eyebrow}</span>
        )}
        <h1 className="text-2xl font-bold leading-tight text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
