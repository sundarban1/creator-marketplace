// Phone-only signups get a `<phone>@phone.kolab.internal` placeholder in the
// required `email` column (see backend auth.service.ts's makePlaceholderEmail)
// — it must never be shown to admins as if it were a real email.
const PLACEHOLDER_EMAIL_DOMAIN = '@phone.kolab.internal';

/** Formats a user's `email` field for admin display: the phone number (without
 *  the +977 country code) if it's a phone-signup placeholder, otherwise the
 *  real email as-is. */
export function displayEmailOrPhone(email: string): string {
  if (!email.endsWith(PLACEHOLDER_EMAIL_DOMAIN)) return email;
  return email.slice(0, -PLACEHOLDER_EMAIL_DOMAIN.length).replace(/^\+?977/, '');
}
