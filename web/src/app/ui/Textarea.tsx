import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  /** Show a live character count against `maxLength` / a min. */
  showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, showCount, className, id, value, maxLength, rows = 4, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const count = typeof value === 'string' ? value.length : 0;

  return (
    <div className="w-full">
      <label htmlFor={fieldId} className="mb-1.5 block text-[13px] font-semibold text-ink">
        {label}
      </label>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        className={cn(
          'w-full rounded-xl border bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-soft/60',
          'transition-[border-color,box-shadow] focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand',
          error ? 'border-danger' : 'border-line-strong',
          className,
        )}
        {...rest}
      />
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <p className={cn('text-[13px]', error ? 'font-medium text-danger' : 'text-ink-soft')}>
          {error || hint}
        </p>
        {showCount && (
          <span className="text-[12px] tabular-nums text-ink-soft">
            {count}
            {maxLength ? ` / ${maxLength}` : ''}
          </span>
        )}
      </div>
    </div>
  );
});
