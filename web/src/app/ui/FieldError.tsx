import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from './cn';

/**
 * The one way a field shows it's invalid — icon + short message directly
 * under the field. Mirrors mobile `components/FieldError.tsx`; keep the two
 * visually identical (14px icon, 13px medium danger text, 6px gap).
 */
export function FieldError({ id, message, className }: { id?: string; message?: string | null; className?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className={cn('mt-1.5 flex items-start gap-1.5 text-[13px] font-medium leading-snug text-danger', className)}>
      <AlertCircle size={14} className="mt-[2px] flex-shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  );
}

/** Field label with the shared red required asterisk. */
export function FieldLabel({
  htmlFor,
  required,
  children,
  className,
}: {
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn('text-[13px] font-semibold text-ink', className)}>
      {children}
      {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
    </label>
  );
}

/**
 * Form-level error (server rejection, or a rule spanning several fields).
 * Sits directly above the submit button. Field errors never go here or in a toast.
 */
export function FormErrorBanner({ message, className }: { message?: string | string[] | null; className?: string }) {
  const list = (Array.isArray(message) ? message : message ? [message] : []).filter(Boolean);
  if (!list.length) return null;
  return (
    <div role="alert" className={cn('flex items-start gap-2.5 rounded-xl bg-danger-soft px-3.5 py-3 text-[13px] font-medium text-danger', className)}>
      <AlertCircle size={16} className="mt-px flex-shrink-0" aria-hidden />
      {list.length === 1 ? <span>{list[0]}</span> : (
        <ul className="list-disc space-y-0.5 pl-4">{list.map((m) => <li key={m}>{m}</li>)}</ul>
      )}
    </div>
  );
}
