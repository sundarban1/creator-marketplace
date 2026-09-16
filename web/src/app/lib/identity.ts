// Phone-only signups get a `<phone>@phone.kolab.internal` placeholder in the
// required `email` column (backend auth.service.ts's makePlaceholderEmail).
// `User.emailIsPlaceholder` is a *different* flag (Apple sign-in withholding
// the real address) and is false for these accounts, so this domain check is
// the only reliable way to tell a placeholder apart from a real address.
const PHONE_PLACEHOLDER_EMAIL_DOMAIN = '@phone.kolab.internal';

/** True if `email` is the `<phone>@phone.kolab.internal` placeholder a
 *  phone-only signup gets in the required `email` column, not a real address. */
export function isPhonePlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(PHONE_PLACEHOLDER_EMAIL_DOMAIN);
}

/** The identifier to show a user for their own account: their real email when
 *  they have one, otherwise their phone — never the internal placeholder
 *  address a phone-only signup gets in the `email` column. */
export function displayIdentifier(user: { email: string; phone: string | null; emailIsPlaceholder: boolean }): string {
  if (user.emailIsPlaceholder || isPhonePlaceholderEmail(user.email)) return user.phone ?? '';
  return user.email;
}
