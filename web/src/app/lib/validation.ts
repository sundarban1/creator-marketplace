/**
 * Shared form validation — rules + the useFormValidation hook.
 *
 * Mirrors mobile `src/utilities/validation.ts` + `src/hooks/useFormValidation.ts`.
 * Same rules, same messages (i18n `validation.*`), same behaviour:
 *   1. Nothing is red until the user first presses Submit.
 *   2. Submit with errors → every invalid field shows its message, and the
 *      first one (top of the page) is scrolled into view and focused.
 *   3. After that, errors update live as the user types and clear when fixed.
 *   4. Server / multi-field errors go in <FormErrorBanner> above the submit button.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { useOptionalT } from '../i18n';

export type Rule<T = unknown> = (value: T) => string | undefined;

// ── Pure checks (no i18n) ────────────────────────────────────────────────
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEPAL_MOBILE_RE = /^(97|98)\d{8}$/;
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i;

export const isEmpty = (v: unknown) =>
  v == null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
export const isEmail = (v: string) => EMAIL_RE.test(v.trim());
export const isNepaliPhone = (v: string) =>
  NEPAL_MOBILE_RE.test(v.trim().replace(/^\+?977/, '').replace(/[\s\-()]/g, ''));
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

/** Rule builders bound to the current language. Optional rules skip empty values —
 *  combine with `required()` when the field must be filled. */
export function useValidators() {
  const t = useOptionalT();
  return useMemo(() => {
    const skip = (v: unknown) => isEmpty(v);
    return {
      required: (message?: string): Rule => (v) => (isEmpty(v) ? message ?? t('validation.required') : undefined),
      choose: (message?: string): Rule => (v) => (isEmpty(v) ? message ?? t('validation.choose') : undefined),
      email: (message?: string): Rule<string> => (v) => (skip(v) || isEmail(v) ? undefined : message ?? t('validation.email')),
      phone: (message?: string): Rule<string> => (v) => (skip(v) || isNepaliPhone(v) ? undefined : message ?? t('validation.phone')),
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
  }, [t]);
}

// ── Hook ────────────────────────────────────────────────────────────────
type Schema<V> = { [K in keyof V]?: Rule<V[K]> | Rule<any> };
type Errors<V> = Partial<Record<keyof V, string>>;

export function useFormValidation<V extends Record<string, any>>(values: V, schema: Schema<V>) {
  const [submitted, setSubmitted] = useState(false);
  const [extra, setExtra] = useState<Errors<V>>({});
  const extraFor = useRef<Partial<Record<keyof V, unknown>>>({});
  const formRef = useRef<HTMLFormElement | HTMLDivElement | null>(null);

  const computed = useMemo(() => {
    const out: Errors<V> = {};
    for (const key of Object.keys(schema) as (keyof V)[]) {
      const msg = schema[key]?.(values[key]);
      if (msg) out[key] = msg;
    }
    return out;
  }, [values, schema]);

  // Server-set field errors stay until that field's value changes.
  const live: Errors<V> = {};
  for (const key of Object.keys(extra) as (keyof V)[]) {
    if (extra[key] && extraFor.current[key] === values[key]) live[key] = extra[key];
  }
  const errors: Errors<V> = submitted ? { ...computed, ...live } : live;

  const focusFirstInvalid = useCallback(() => {
    requestAnimationFrame(() => {
      const root: ParentNode = formRef.current ?? document;
      const el = root.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]');
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
    });
  }, []);

  /** Call at the top of submit. Returns true when the form is valid. */
  const validate = useCallback(() => {
    setSubmitted(true);
    const ok = Object.keys(computed).length === 0;
    if (!ok) focusFirstInvalid();
    return ok;
  }, [computed, focusFirstInvalid]);

  /** Attach a server-side error to a field (e.g. "Email already in use"). */
  const setFieldError = useCallback((key: keyof V, message: string) => {
    extraFor.current[key] = values[key];
    setExtra((e) => ({ ...e, [key]: message }));
    focusFirstInvalid();
  }, [values, focusFirstInvalid]);

  const reset = useCallback(() => { setSubmitted(false); setExtra({}); }, []);

  return {
    errors,
    error: (key: keyof V) => errors[key],
    hasErrors: Object.keys(errors).length > 0,
    submitted,
    validate,
    setFieldError,
    reset,
    /** Put on the <form> (or wrapper) so "first invalid" is scoped to it. */
    formRef: formRef as React.RefObject<any>,
  };
}
