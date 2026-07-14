// Nepal-only app — every mobile number is 10 digits starting 97 or 98
// (NTC/Ncell ranges). Canonical stored/submitted format is always E.164
// (+977XXXXXXXXXX); these helpers are the single source of truth for that
// check so it doesn't drift across the several screens that collect a phone.
const NEPAL_MOBILE_REGEX = /^(97|98)\d{8}$/;

function stripToDigits(phone: string): string {
  return phone.trim().replace(/^\+?977/, '').replace(/[\s\-()]/g, '');
}

/** True if `phone` is a valid Nepal mobile number, with or without a +977/977 prefix. */
export function isValidNepaliPhone(phone: string): boolean {
  return NEPAL_MOBILE_REGEX.test(stripToDigits(phone));
}

/** Canonicalizes to E.164 (+977XXXXXXXXXX) for submission to the backend, regardless
 *  of whether the user typed the country code themselves. */
export function normalizePhoneForSubmit(phone: string): string {
  const stripped = phone.trim().replace(/[\s\-()]/g, '');
  if (stripped.startsWith('+977')) return stripped;
  if (stripped.startsWith('977'))  return `+${stripped}`;
  return `+977${stripped}`;
}

/** Strips the +977/977 Nepal country code for display — phones are always stored as E.164 (+977XXXXXXXXXX). */
export function formatPhoneDisplay(phone: string): string {
  return phone.trim().replace(/^\+?977/, '');
}
