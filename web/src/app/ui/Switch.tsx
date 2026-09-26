import { cn } from './cn';

/** Small on/off toggle for boolean settings. */
export function Switch({
  checked,
  onChange,
  disabled,
  label,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40 focus-visible:ring-offset-2',
        checked ? 'bg-brand' : 'bg-ink/[0.12]',
        disabled && 'cursor-not-allowed opacity-55',
        className,
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150',
          checked ? 'translate-x-[22px]' : 'translate-x-0',
        )}
      />
    </button>
  );
}
