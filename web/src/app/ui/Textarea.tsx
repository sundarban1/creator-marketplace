import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';
import { FieldError, FieldLabel } from './FieldError';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  /** Show a live character count against `maxLength` / a min. */
  showCount?: boolean;
  /** Right-aligned adornment next to the label (e.g. an "AI regenerate" button). */
  labelAccessory?: ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, showCount, labelAccessory, className, id, value, maxLength, rows = 4, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const count = typeof value === 'string' ? value.length : 0;

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <FieldLabel htmlFor={fieldId} required={rest.required}>
          {label}
        </FieldLabel>
        {labelAccessory}
      </div>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={cn(
          'w-full rounded-xl border bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-soft/60',
          'transition-[border-color,box-shadow] focus:outline-none focus:ring-2',
          error ? 'border-danger focus:border-danger focus:ring-danger/25' : 'border-line-strong focus:ring-brand/35 focus:border-brand',
          className,
        )}
        {...rest}
      />
      <div className="flex items-start justify-between gap-3">
        {error ? (
          <FieldError id={`${fieldId}-error`} message={error} />
        ) : (
          <p id={hint ? `${fieldId}-hint` : undefined} className="mt-1.5 text-[13px] text-ink-soft">{hint}</p>
        )}
        {showCount && (
          <span className={cn('mt-1.5 text-[12px] tabular-nums', maxLength && count >= maxLength ? 'text-danger' : 'text-ink-soft')}>
            {count}
            {maxLength ? ` / ${maxLength}` : ''}
          </span>
        )}
      </div>
    </div>
  );
});
