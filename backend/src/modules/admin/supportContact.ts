/**
 * Admin-managed support contacts (Contact page) — validation on save and the
 * effective WhatsApp number served by GET /api/public/site-info. Phone rules
 * match the web/mobile helpers (web/src/app/lib/supportContact.ts,
 * mobile/src/utilities/supportContact.ts) so anything the admin can save is
 * something the Help & Support panels can actually turn into a link.
 */

const NEPAL_CC = '977';
/** Nepal mobile numbers: 10 digits, 96x/97x/98x. */
const NEPAL_MOBILE = /^9[678]\d{8}$/;
/** E.164 subscriber part for any other country: 8–15 digits, no leading 0. */
const INTERNATIONAL = /^[1-9]\d{7,14}$/;

/** E.164 (`+9779717157832`) or `null` when empty / malformed / ambiguous. */
export function normalizeSupportPhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\(?\+?[\d\s\-().]+$/.test(trimmed)) return null;

  const hasPlus = /^\(?\+/.test(trimmed);
  let digits = trimmed.replace(/\D/g, '');
  let explicitCountry = hasPlus;
  if (!hasPlus && digits.startsWith('00')) {
    digits = digits.slice(2);
    explicitCountry = true;
  }

  if (digits.startsWith(NEPAL_CC) && (explicitCountry || digits.length === NEPAL_CC.length + 10)) {
    const local = digits.slice(NEPAL_CC.length);
    return NEPAL_MOBILE.test(local) ? `+${NEPAL_CC}${local}` : null;
  }
  if (explicitCountry) return INTERNATIONAL.test(digits) ? `+${digits}` : null;
  if (NEPAL_MOBILE.test(digits)) return `+${NEPAL_CC}${digits}`;
  return null;
}

export function isValidSupportEmail(raw: unknown): boolean {
  return typeof raw === 'string'
    && /^[^\s@<>()?&,;:"]+@[^\s@<>()?&,;:"]+\.[^\s@<>()?&,;:".]{2,}$/.test(raw.trim());
}

const PHONE_KEYS: Record<string, string> = {
  'platform.supportPhone':    'Inquiry & Customer Support Phone',
  'platform.supportWhatsapp': 'WhatsApp Support Number',
};
const EMAIL_KEYS: Record<string, string> = {
  'platform.supportEmail': 'Contact Email',
};

/**
 * Returns a human-readable problem with the support-contact keys in a settings
 * payload, or `null` when they're fine. Keys not present are ignored (partial
 * saves from other admin pages), and an empty string always means "not set".
 */
export function supportContactSettingsError(settings: Record<string, unknown>): string | null {
  for (const [key, label] of Object.entries(PHONE_KEYS)) {
    if (!(key in settings)) continue;
    const value = settings[key];
    if (typeof value !== 'string') return `${label} must be text`;
    if (value.trim() && !normalizeSupportPhone(value)) {
      return `${label} must be a valid mobile number, e.g. 98XXXXXXXX or +977 98XXXXXXXX`;
    }
  }
  for (const [key, label] of Object.entries(EMAIL_KEYS)) {
    if (!(key in settings)) continue;
    const value = settings[key];
    if (typeof value !== 'string') return `${label} must be text`;
    if (value.trim() && !isValidSupportEmail(value)) return `${label} must be a valid email address`;
  }
  return null;
}

/** The WhatsApp number to publish: the dedicated one, else the support line. */
export function effectiveSupportWhatsapp(settings: Record<string, unknown>): string {
  const dedicated = typeof settings['platform.supportWhatsapp'] === 'string'
    ? (settings['platform.supportWhatsapp'] as string).trim()
    : '';
  if (dedicated) return dedicated;
  const support = settings['platform.supportPhone'];
  return typeof support === 'string' ? support.trim() : '';
}
