import { cn } from './cn';

interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
}

/**
 * Accessible segmented control. Two layouts: `pill` (compact inline toggle) and
 * `cards` (stacked options with a description — used for role selection).
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
      <div role="radiogroup" aria-label={ariaLabel} className="grid gap-2.5">
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
                'rounded-xl border p-3.5 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                active ? 'border-brand bg-brand/[0.05]' : 'border-line-strong hover:border-line-strong hover:bg-surface-dim',
              )}
            >
              <span className="flex items-center justify-between">
                <span className="text-[15px] font-semibold text-ink">{opt.label}</span>
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full border',
                    active ? 'border-brand' : 'border-line-strong',
                  )}
                  aria-hidden
                >
                  {active && <span className="h-2 w-2 rounded-full bg-brand" />}
                </span>
              </span>
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
