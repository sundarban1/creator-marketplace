import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../ui/cn';

export interface ChoiceOption<T extends string> {
  value: T;
  icon: ReactNode;
  title: string;
  description: string;
  /** Third line, smaller/muted — e.g. representingType's examples row. */
  examples?: string;
}

/**
 * Row-card radio picker — icon badge, title + description, trailing check.
 * Used for the provider-type / representing-type steps in both onboarding
 * flows (mirrors mobile's `choiceCard` rows).
 */
export function ChoiceCardGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="grid gap-3">
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
              'flex items-start gap-3.5 rounded-2xl border p-4 text-left transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
              active
                ? 'border-violet/50 bg-violet/[0.08] shadow-[0_14px_34px_-20px_var(--app-glow)]'
                : 'border-line-strong bg-surface hover:border-line-strong hover:bg-surface-dim',
            )}
          >
            <span
              className={cn(
                'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full',
                active ? 'app-active-pill' : 'bg-violet/[0.1] text-violet-dark',
              )}
            >
              {opt.icon}
            </span>
            <span className="min-w-0 flex-1 pt-0.5">
              <span className="block text-[15px] font-semibold text-ink">{opt.title}</span>
              <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-soft">{opt.description}</span>
              {opt.examples && (
                <span className="mt-1 block text-[12px] leading-relaxed text-ink-soft/75">{opt.examples}</span>
              )}
            </span>
            <span
              className={cn(
                'mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border',
                active ? 'border-brand bg-brand text-white' : 'border-line-strong text-transparent',
              )}
              aria-hidden
            >
              <Check size={12} strokeWidth={3} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
