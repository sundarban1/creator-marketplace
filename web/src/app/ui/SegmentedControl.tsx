import type { ReactNode } from 'react';
import { cn } from './cn';

interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
}

/**
 * Accessible segmented control. Two layouts: `pill` (compact inline toggle) and
 * `cards` (side-by-side options with a description — used for role selection).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  variant = 'pill',
  ariaLabel,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: 'pill' | 'cards';
  ariaLabel: string;
}) {
  if (variant === 'cards') {
    return (
      <div role="radiogroup" aria-label={ariaLabel} className="grid grid-cols-2 gap-6">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                'relative rounded-xl border p-3.5 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                active ? 'border-brand bg-brand/[0.05]' : 'border-line-strong hover:border-line-strong hover:bg-surface-dim',
              )}
            >
              <span
                className={cn(
                  'absolute right-3 top-3 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border',
                  active ? 'border-brand' : 'border-line-strong',
                )}
                aria-hidden
              >
                {active && <span className="h-2 w-2 rounded-full bg-brand" />}
              </span>
              {opt.icon && (
                <span
                  className={cn(
                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                    active ? 'bg-brand text-white' : 'bg-surface-dim text-ink-soft',
                  )}
                  aria-hidden
                >
                  {opt.icon}
                </span>
              )}
              <span className="mt-2 block pr-4 text-[15px] font-semibold text-ink">{opt.label}</span>
              {opt.description && (
                <span className="mt-0.5 block text-[13px] text-ink-soft">{opt.description}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex w-full rounded-xl border border-line-strong bg-surface-dim p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-[14px] font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
              active ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
