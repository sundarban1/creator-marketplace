import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

type Variant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const VARIANT_CLASSES: Record<Variant, string> = {
  neutral: 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50',
  primary: 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100',
  warning: 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100',
  danger:  'bg-red-50 border-red-200 text-red-500 hover:bg-red-100',
};

interface ActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  variant?: Variant;
  icon: LucideIcon;
  title: string;
}

export function ActionButton({ variant = 'neutral', icon: Icon, title, className = '', ...props }: ActionButtonProps) {
  return (
    <button
      title={title}
      aria-label={title}
      className={`p-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      <Icon size={15} />
    </button>
  );
}
