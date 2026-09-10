import { useId, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from './cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  /** Shown as a disabled-looking first option representing "no filter". */
  placeholder?: string;
}

/** Styled native <select> — keyboard + mobile behaviour for free. */
export function Select({ label, options, placeholder, className, id, ...rest }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-[13px] font-semibold text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            'h-11 w-full appearance-none rounded-xl border border-line-strong bg-surface pl-3.5 pr-10 text-[14px] text-ink',
            'transition-[border-color,box-shadow] focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand',
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
    </div>
  );
}
