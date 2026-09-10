import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from './cn';

/**
 * 6-box numeric code entry. Controlled via a single `value` string; emits the
 * joined value on every change. Handles paste, backspace-to-previous, and
 * arrow-key movement.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus = true,
  disabled = false,
  invalid = false,
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split('').slice(0, length);

  const setAt = (index: number, digit: string) => {
    const next = value.split('');
    next[index] = digit;
    onChange(next.join('').replace(/\D/g, '').slice(0, length));
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    if (!digit) return;
    setAt(index, digit);
    if (index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setAt(index, '');
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
        setAt(index - 1, '');
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      onChange(pasted);
      refs.current[Math.min(pasted.length, length - 1)]?.focus();
    }
  };

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="Verification code">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          value={digits[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={cn(
            'h-14 w-full min-w-0 rounded-xl border bg-surface text-center text-xl font-semibold text-ink',
            'transition-[border-color,box-shadow] focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand',
            'disabled:opacity-50',
            invalid ? 'border-danger' : 'border-line-strong',
          )}
        />
      ))}
    </div>
  );
}
