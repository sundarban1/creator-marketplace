import { Check } from 'lucide-react';
import type { Category } from '../api/catalog';
import { makeCategoryLookup } from '../public/categoryLookup';
import { cn } from '../ui/cn';

/**
 * Bounded multi-select pill grid — the creator categories step and both
 * business category steps (industry / interests) all use this. Selecting past
 * `max` is a no-op rather than an error state, matching mobile's picker.
 */
export function CategoryPicker({
  categories,
  selected,
  onToggle,
  max,
}: {
  categories: Category[];
  selected: string[];
  onToggle: (name: string) => void;
  max: number;
}) {
  const lookup = makeCategoryLookup(categories);
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => {
        const active = selected.includes(c.name);
        const disabled = !active && selected.length >= max;
        const { Icon, color } = lookup(c.name);
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onToggle(c.name)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[14px] font-semibold transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
              active
                ? 'border-transparent bg-gradient-to-br from-violet to-violet-dark text-white shadow-sm'
                : 'border-line-strong bg-surface text-ink hover:bg-surface-dim',
              disabled && 'cursor-not-allowed opacity-40',
            )}
          >
            {active ? (
              <Check size={13} strokeWidth={3} />
            ) : (
              <Icon size={13} style={{ color }} className="flex-shrink-0" />
            )}
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
