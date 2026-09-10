import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from './cn';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  hint?: string;
  error?: string;
  /** Right-aligned adornment (e.g. a "Forgot password?" link). */
  labelAccessory?: ReactNode;
  /** Leading icon element. */
  icon?: ReactNode;
}

/**
 * Labelled text input. Always renders a real <label htmlFor>, wires
 * aria-invalid / aria-describedby, and (for type="password") a show/hide toggle.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, labelAccessory, icon, type = 'text', className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  const isPassword = type === 'password';
  const [reveal, setReveal] = useState(false);
  const resolvedType = isPassword && reveal ? 'text' : type;

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="text-[13px] font-semibold text-ink">
          {label}
        </label>
        {labelAccessory}
      </div>

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft [&>svg]:h-[18px] [&>svg]:w-[18px]">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={resolvedType}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(errorId, hintId) || undefined}
          className={cn(
            'h-11 w-full rounded-xl border bg-surface text-[15px] text-ink placeholder:text-ink-soft/60',
            'transition-[border-color,box-shadow] duration-150',
            'focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand',
            icon ? 'pl-10' : 'pl-3.5',
            isPassword ? 'pr-11' : 'pr-3.5',
            error ? 'border-danger' : 'border-line-strong',
            className,
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-soft hover:text-ink"
          >
            {reveal ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error ? (
        <p id={errorId} className="mt-1.5 text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-[13px] text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
