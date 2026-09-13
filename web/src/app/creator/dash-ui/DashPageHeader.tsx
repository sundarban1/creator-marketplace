import type { ReactNode } from 'react';
import { cn } from '../../ui/cn';

/**
 * Page title block for the creator dashboard — same editorial treatment as
 * the site's `ui/PageHeader` (Fraunces serif title, violet→orange gradient
 * rule) so Creator and Business read as one system.
 */
export function DashPageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-7 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
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
