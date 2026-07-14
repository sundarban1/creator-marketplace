// Nepal-only app — every mobile number is 10 digits starting 97 or 98 (NTC/Ncell
// ranges). Canonical stored format is always E.164 (+977XXXXXXXXXX). Mirrors
// mobile/src/utilities/phone.ts so both sides agree on exactly one shape.
const NEPAL_MOBILE_REGEX = /^(97|98)\d{8}$/;

function stripToDigits(phone: string): string {
  return phone.replace(/[\s\-()]/g, '').replace(/^\+?977/, '');
}

/** True if `phone` is a valid Nepal mobile number, with or without a +977/977 prefix. */
export function isValidNepaliPhone(phone: string): boolean {
  return NEPAL_MOBILE_REGEX.test(stripToDigits(phone));
}

/** Canonicalizes a validated Nepal mobile number to E.164 (+977XXXXXXXXXX). */
export function toE164NepaliPhone(phone: string): string {
  return `+977${stripToDigits(phone)}`;
}
