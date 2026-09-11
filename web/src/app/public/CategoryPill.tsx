import type { CategoryMeta } from './categoryLookup';
import { cn } from '../ui/cn';

interface Props {
  label: string;
  meta: CategoryMeta;
  className?: string;
  /** When set, appends a "+N" counter inside the pill (for "1 shown, N more"). */
  moreCount?: number;
}

/**
 * Category chip in the mobile app's style — a colored FontAwesome icon + label
 * in a rounded-full pill, tinted with the category's own color. Used on the
 * creator / business browse cards.
 */
export function CategoryPill({ label, meta, className, moreCount }: Props) {
  const { Icon, color } = meta;
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold text-ink',
        className,
      )}
      style={{ backgroundColor: `${color}14`, borderColor: `${color}33` }}
    >
      <Icon size={11} style={{ color }} className="flex-shrink-0" />
      <span className="truncate">{label}</span>
      {moreCount != null && moreCount > 0 && (
        <span className="flex-shrink-0 font-medium text-ink-soft">+{moreCount}</span>
      )}
    </span>
  );
}
