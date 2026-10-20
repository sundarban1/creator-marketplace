/**
 * Shared form validation rules. Mirrors web `src/app/lib/validation.ts` —
 * same rules, same `validation.*` i18n messages. Pair with
 * `useFormValidation` (`@/hooks/useFormValidation`) and show errors with
 * `TextInputWithLabel error=` / `<FieldError>` — never a toast or Alert.
 */
import { isValidNepaliPhone } from './phone';

export type Rule<T = unknown> = (value: T) => string | undefined;
type TFn = (key: string, vars?: Record<string, string | number>) => string;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i;

export const isEmpty = (v: unknown) =>
  v == null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
export const isEmail = (v: string) => EMAIL_RE.test(v.trim());
export const isUrl = (v: string) => URL_RE.test(v.trim());

/** Run rules in order; first failure wins. */
export function compose<T>(...rules: Rule<T>[]): Rule<T> {
  return (value) => {
    for (const r of rules) {
      const m = r(value);
      if (m) return m;
    }
    return undefined;
  };
}

/** Rule builders bound to `t`. Optional rules skip empty values —
 *  combine with `required()` when the field must be filled. */
export function makeValidators(t: TFn) {
  const skip = (v: unknown) => isEmpty(v);
  return {
    required: (message?: string): Rule => (v) => (isEmpty(v) ? message ?? t('validation.required') : undefined),
    choose: (message?: string): Rule => (v) => (isEmpty(v) ? message ?? t('validation.choose') : undefined),
    email: (message?: string): Rule<string> => (v) => (skip(v) || isEmail(v) ? undefined : message ?? t('validation.email')),
    phone: (message?: string): Rule<string> => (v) => (skip(v) || isValidNepaliPhone(v) ? undefined : message ?? t('validation.phone')),
    url: (message?: string): Rule<string> => (v) => (skip(v) || isUrl(v) ? undefined : message ?? t('validation.url')),
    minLength: (min: number, message?: string): Rule<string> => (v) =>
      skip(v) || v.trim().length >= min ? undefined : message ?? t('validation.minLength', { min }),
    maxLength: (max: number, message?: string): Rule<string> => (v) =>
      skip(v) || v.length <= max ? undefined : message ?? t('validation.maxLength', { max }),
    number: (opts: { min?: number; max?: number; integer?: boolean } = {}, message?: string): Rule<string | number> => (v) => {
      if (skip(v)) return undefined;
      const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
      if (!Number.isFinite(n) || (opts.integer && !Number.isInteger(n))) return message ?? t('validation.number');
      if (opts.min != null && n < opts.min) return message ?? t('validation.min', { min: opts.min });
      if (opts.max != null && n > opts.max) return message ?? t('validation.max', { max: opts.max });
      return undefined;
    },
    password: (message?: string): Rule<string> => (v) =>
      skip(v) || v.length >= 8 ? undefined : message ?? t('validation.password'),
    matches: (other: () => string, message?: string): Rule<string> => (v) =>
      skip(v) || v === other() ? undefined : message ?? t('validation.mismatch'),
  };
}
