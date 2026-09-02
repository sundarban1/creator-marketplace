// Phone-only signups get a `<phone>@phone.kolab.internal` placeholder in the
// required `email` column (see backend auth.service.ts's makePlaceholderEmail)
// — it must never be shown to admins as if it were a real email.
const PLACEHOLDER_EMAIL_DOMAIN = '@phone.kolab.internal';

/** True if `email` is the `<phone>@phone.kolab.internal` placeholder a
 *  phone-only signup gets in the required `email` column, not a real address. */
export function isPhonePlaceholderEmail(email: string): boolean {
  return email.endsWith(PLACEHOLDER_EMAIL_DOMAIN);
}

/** Formats a user's `email` field for admin display: the phone number (without
 *  the +977 country code) if it's a phone-signup placeholder, otherwise the
 *  real email as-is. */
export function displayEmailOrPhone(email: string): string {
  if (!isPhonePlaceholderEmail(email)) return email;
  return email.slice(0, -PLACEHOLDER_EMAIL_DOMAIN.length).replace(/^\+?977/, '');
}

/** Replaces every `<phone>@phone.kolab.internal` placeholder embedded in a
 *  free-text string (notification bodies, activity logs, etc.) with just the
 *  phone number, so admins never see the internal placeholder domain. */
export function stripPhonePlaceholderEmail(text: string): string {
  return text.replace(/[^\s@]+@phone\.kolab\.internal/gi, (match) => displayEmailOrPhone(match));
}

/** Formats a business profile's `businessName` for display. The column is
 *  nullable (a business that signed up but never finished onboarding has no
 *  name yet), so every admin surface must tolerate null rather than assume a
 *  string it can `.slice()`. */
export function displayBusinessName(name: string | null | undefined): string {
  return name?.trim() || 'Unnamed business';
}
