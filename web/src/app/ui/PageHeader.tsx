import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * Standard page title block for authed screens. Carries the same editorial
 * language as the public marketplace pages — an italic serif eyebrow pill, a
 * Fraunces serif title and a short violet→orange gradient rule — so the app
 * reads as one continuous site with the marketing pages.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  /** Small italic serif label above the title (violet pill). */
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-7 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet/20 bg-violet/[0.06] px-3 py-1 font-serif text-[12px] italic text-violet">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-violet to-brand-orange" />
            {eyebrow}
          </span>
        )}
        <h1 className="font-serif text-[26px] font-medium leading-tight tracking-tight text-ink sm:text-3xl">
          {title}
        </h1>
        <span className="mt-2.5 block h-0.5 w-9 rounded-full bg-gradient-to-r from-violet to-brand-orange" />
        {description && <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
