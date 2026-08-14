import type { ButtonHTMLAttributes, ReactNode } from 'react';

// Shared CTA primitive — before this, ChatWidget's "Start chat"/send buttons
// and ContactForm's submit button each hand-rolled their own gradient/outline
// + focus-visible + disabled incantations independently. Two variants cover
// what's actually used on the landing page: `primary` (solid violet->orange
// gradient, for the one or two most important actions on a surface) and
// `outline` (a quieter bordered button, for secondary/form-submit actions).
// Both carry their own `dark:` handling so they read correctly regardless of
// which section or ContactForm's own `dark` surface prop they land on.
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
  size?: 'sm' | 'md' | 'icon';
  loading?: boolean;
  children?: ReactNode;
}

const SIZE_CLASSES = {
  sm: 'px-4 py-2 text-xs gap-1.5',
  md: 'px-5 py-2.5 text-xs gap-2',
  icon: 'h-10 w-10 flex-shrink-0 p-0',
} as const;

const VARIANT_CLASSES = {
  primary:
    'bg-gradient-to-br from-violet to-brand-orange text-white shadow-sm hover:opacity-90 disabled:opacity-50',
  outline:
    'border border-ink/30 text-ink hover:border-ink dark:border-white/30 dark:text-white dark:hover:border-white',
} as const;

export function Button({ variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-md font-semibold uppercase tracking-wide transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet disabled:cursor-not-allowed disabled:opacity-60 ${
        size === 'icon' ? 'rounded-full' : ''
      } ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : children}
    </button>
  );
}
