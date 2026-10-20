/**
 * Shared form-validation behaviour. Mirrors web `useFormValidation`:
 *   1. Nothing is red until the user first presses Submit.
 *   2. Submit with errors → every invalid field shows its message, and the
 *      ScrollView scrolls to the first one (schema key order = top-to-bottom).
 *   3. After that, errors update live as the user types and clear when fixed.
 *   4. Server / multi-field errors go in <FormErrorBanner> above the submit button.
 *
 * Usage:
 *   const v = useValidators();
 *   const form = useFormValidation({ name, email }, { name: v.required(), email: compose(v.required(), v.email()) });
 *   <ScrollView ref={form.scrollRef}> … <TextInputWithLabel containerRef={form.fieldRef('email')} error={form.error('email')} />
 *   onSubmit: if (!form.validate()) return;
 */
import { useRef, useState } from 'react';
import { AccessibilityInfo, type ScrollView, type View } from 'react-native';
import { useLanguage } from '@/context/LanguageContext';
import { makeValidators, type Rule } from '@/utilities/validation';

export function useValidators() {
  const { t } = useLanguage();
  return makeValidators(t);
}

type Schema<V> = { [K in keyof V]?: Rule<V[K]> | Rule<any> };
type Errors<V> = Partial<Record<keyof V, string>>;

export function useFormValidation<V extends Record<string, any>>(values: V, schema: Schema<V>) {
  const [submitted, setSubmitted] = useState(false);
  const [extra, setExtra] = useState<Errors<V>>({});
  const extraFor = useRef<Partial<Record<keyof V, unknown>>>({});
  const scrollRef = useRef<ScrollView | null>(null);
  const fields = useRef<Partial<Record<keyof V, View | null>>>({});
  const fieldRefFns = useRef<Partial<Record<keyof V, (n: View | null) => void>>>({});

  const keys = Object.keys(schema) as (keyof V)[];
  const computed: Errors<V> = {};
  for (const key of keys) {
    const msg = schema[key]?.(values[key]);
    if (msg) computed[key] = msg;
  }
  // Server-set field errors stay until that field's value changes.
  const live: Errors<V> = {};
  for (const key of Object.keys(extra) as (keyof V)[]) {
    if (extra[key] && extraFor.current[key] === values[key]) live[key] = extra[key];
  }
  const errors: Errors<V> = submitted ? { ...computed, ...live } : live;

  function scrollTo(key: keyof V | undefined, message?: string) {
    if (message) AccessibilityInfo.announceForAccessibility(message);
    const node = key != null ? fields.current[key] : null;
    const sv = scrollRef.current as any;
    if (!node || !sv) return;
    const inner = sv.getInnerViewRef?.() ?? sv.getNativeScrollRef?.();
    if (!inner) return;
    node.measureLayout(
      inner,
      (_x: number, y: number) => sv.scrollTo({ y: Math.max(0, y - 24), animated: true }),
      () => {},
    );
  }

  /** Call at the top of submit. Returns true when the form is valid. */
  function validate() {
    setSubmitted(true);
    const first = keys.find((k) => computed[k]);
    if (first == null) return true;
    scrollTo(first, computed[first]);
    return false;
  }

  /** Attach a server-side error to a field (e.g. "Email already in use"). */
  function setFieldError(key: keyof V, message: string) {
    extraFor.current[key] = values[key];
    setExtra((e) => ({ ...e, [key]: message }));
    scrollTo(key, message);
  }

  /** Stable callback ref for the field's wrapper View (used to scroll to it). */
  function fieldRef(key: keyof V) {
    if (!fieldRefFns.current[key]) {
      fieldRefFns.current[key] = (n: View | null) => { fields.current[key] = n; };
    }
    return fieldRefFns.current[key]!;
  }

  function reset() { setSubmitted(false); setExtra({}); }

  return {
    errors,
    error: (key: keyof V) => errors[key],
    hasErrors: Object.keys(errors).length > 0,
    submitted,
    validate,
    setFieldError,
    reset,
    scrollRef,
    fieldRef,
  };
}
