import type { Identifier } from '../api/auth';

/**
 * The backend accepts an email OR a Nepali phone number as the identifier for
 * login / signup / OTP. This mirrors its rule (`utils/phone.isValidNepaliPhone`
 * — starts 97/98, 10 digits, tolerant of +977 and separators) just well enough
 * to route the input to the right field; the server does the authoritative
 * validation and canonicalisation.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function looksLikeEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function looksLikeNepaliPhone(value: string): boolean {
  const digits = value.replace(/[^\d]/g, '').replace(/^977/, '');
  return /^9[78]\d{8}$/.test(digits);
}

/** Returns the `{ email }` or `{ phone }` payload, or `null` if it's neither. */
export function toIdentifier(value: string): Identifier | null {
  const trimmed = value.trim();
  if (looksLikeEmail(trimmed)) return { email: trimmed.toLowerCase() };
  if (looksLikeNepaliPhone(trimmed)) return { phone: trimmed.replace(/[^\d+]/g, '') };
  return null;
}

/** Display target for "we sent a code to …" copy. */
export function identifierTarget(id: Identifier): string {
  return 'email' in id && id.email ? id.email : (id as { phone: string }).phone;
}
