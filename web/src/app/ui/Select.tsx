import { useId, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from './cn';
import { FieldError, FieldLabel } from './FieldError';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  /** Shown as a disabled-looking first option representing "no filter". */
  placeholder?: string;
  hint?: string;
  error?: string;
}

/** Styled native <select> — keyboard + mobile behaviour for free. */
export function Select({ label, options, placeholder, hint, error, className, id, ...rest }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <FieldLabel htmlFor={selectId} required={rest.required} className="mb-1.5 block">
          {label}
        </FieldLabel>
      )}
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${selectId}-error` : undefined}
          className={cn(
            'h-11 w-full appearance-none rounded-xl border bg-surface pl-3.5 pr-10 text-[14px] text-ink',
            'transition-[border-color,box-shadow] focus:outline-none focus:ring-2',
            error ? 'border-danger focus:border-danger focus:ring-danger/25' : 'border-line-strong focus:ring-brand/35 focus:border-brand',
          )}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
        />
      </div>
      {error ? <FieldError id={`${selectId}-error`} message={error} /> : hint ? <p className="mt-1.5 text-[13px] text-ink-soft">{hint}</p> : null}
    </div>
  );
}
