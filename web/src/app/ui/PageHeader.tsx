import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * Standard page title block for authed screens — the landing's thin display
 * headline with the closing word in the role's brand gradient
 * (`.app-gradient-text`), a tracked uppercase eyebrow and a light subtitle.
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
  const words = title.split(' ');
  const lead = words.slice(0, -1).join(' ');
  const last = words[words.length - 1];

  return (
    <div className={cn('mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-violet-dark">{eyebrow}</span>
        )}
        <h1 className="lp-display text-[2rem] leading-tight text-ink sm:text-[2.25rem]">
          {lead && <>{lead} </>}
          <span className="app-gradient-text">{last}</span>
        </h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] font-light leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
