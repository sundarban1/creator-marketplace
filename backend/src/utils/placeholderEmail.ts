// Sign in with Apple only discloses the user's email on the *first* authorization
// of an Apple ID for a given app. A user who authorized once before — then
// deleted their Kolab account, or abandoned onboarding before it was created —
// gets an identity token with no email on every later sign-in. Rather than
// dead-ending them at account creation (User.email is required + unique), we mint
// the account against a reserved, non-routable placeholder address and flag it
// (`User.emailIsPlaceholder`) so onboarding forces them to add + verify a real
// one via the existing request-email-otp / verify-email-otp flow.
//
// `.invalid` is reserved by RFC 2606 and can never resolve in DNS, so even if an
// email-send guard is ever missed, the message cannot reach a real inbox.

export const PLACEHOLDER_EMAIL_DOMAIN = 'placeholder.invalid';

/** Builds a deterministic, unique, non-routable address from a stable id (the Apple `sub`). */
export function synthesizePlaceholderEmail(seed: string): string {
  return `apple_${seed.replace(/[^a-zA-Z0-9]/g, '')}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

/** True for an address minted by {@link synthesizePlaceholderEmail} — i.e. the user has no real email yet. */
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
}
