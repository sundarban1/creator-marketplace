/**
 * Pure helpers behind the floating Help & Support widget — phone
 * normalization, Kathmandu-time phone hours, and WhatsApp / tel / mailto link
 * building. No React, no app imports, so it runs under `node --test`
 * (see supportContact.test.ts).
 *
 * The contact details themselves always come from the backend
 * (`GET /api/public/site-info` → admin "Inquiry & Customer Support Phone" and
 * "Contact Email"); nothing here hardcodes a number or address.
 */

// ── Phone numbers ──────────────────────────────────────────────────────────

const NEPAL_CC = '977';
/** Nepal mobile numbers: 10 digits, 96x/97x/98x (NTC, Ncell, Smart…). */
const NEPAL_MOBILE = /^9[678]\d{8}$/;
/** E.164 subscriber part for any other country: 8–15 digits, no leading 0. */
const INTERNATIONAL = /^[1-9]\d{7,14}$/;

/**
 * Normalize an admin-entered support number to E.164 (`+9779717157832`), or
 * `null` when it's empty / malformed / ambiguous — callers must then render
 * no phone or WhatsApp link at all.
 *
 * - `9717157832`, `+9779717157832`, `9779717157832`, `009779717157832` and
 *   formatted variants (`+977 971-715 7832`, `(+977) 9717157832`) all map to
 *   `+9779717157832`.
 * - `+977` / `977` followed by a non-mobile number is rejected (WhatsApp and
 *   the "call us" copy both assume a mobile line).
 * - Another country's number is kept as-is only when written with an explicit
 *   `+`/`00` prefix; bare digits that aren't a Nepal mobile are rejected rather
 *   than guessing a country code.
 */
export function normalizeSupportPhone(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Only digits, a leading +, and common formatting characters are allowed —
  // anything else ("call 9717…", "ext. 12") is malformed, not something to strip.
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

/** Human-readable form for display/copying: `+977 971-715-7832`. */
export function formatSupportPhone(normalized: string): string {
  const m = /^\+977(\d{3})(\d{3})(\d{4})$/.exec(normalized);
  return m ? `+977 ${m[1]}-${m[2]}-${m[3]}` : normalized;
}

/** `tel:+9779717157832`, or `null` for an invalid number. */
export function buildTelUrl(raw: string | null | undefined): string | null {
  const phone = normalizeSupportPhone(raw);
  return phone ? `tel:${phone}` : null;
}

/** `https://wa.me/9779717157832?text=…` (digits only, no `+`), or `null`. */
export function buildWhatsAppUrl(raw: string | null | undefined, message?: string): string | null {
  const phone = normalizeSupportPhone(raw);
  if (!phone) return null;
  const base = `https://wa.me/${phone.slice(1)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// ── Email ──────────────────────────────────────────────────────────────────

export function normalizeSupportEmail(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim();
  return /^[^\s@<>()?&,;:"]+@[^\s@<>()?&,;:"]+\.[^\s@<>()?&,;:".]{2,}$/.test(email) ? email : null;
}

export const SUPPORT_EMAIL_SUBJECT = 'Kolab Support Inquiry';

/** `mailto:` with an encoded subject + body, or `null` for an invalid address. */
export function buildMailtoUrl(raw: string | null | undefined, subject: string, body: string): string | null {
  const email = normalizeSupportEmail(raw);
  if (!email) return null;
  // RFC 6068: line breaks in a mailto body are CRLF.
  const crlfBody = body.replace(/\r?\n/g, '\r\n');
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(crlfBody)}`;
}

// ── Phone support hours (Asia/Kathmandu) ───────────────────────────────────

export const SUPPORT_TIMEZONE = 'Asia/Kathmandu';
/** Minutes after local midnight: open 09:00 inclusive, close 17:00 exclusive. */
export const PHONE_OPEN_MINUTE = 9 * 60;
export const PHONE_CLOSE_MINUTE = 17 * 60;

const kathmanduClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: SUPPORT_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** Seconds since midnight on the Kathmandu wall clock — never the browser's zone. */
export function kathmanduSecondOfDay(now: Date): number {
  const parts = kathmanduClock.formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return (get('hour') % 24) * 3600 + get('minute') * 60 + get('second');
}

export interface PhoneSupportStatus {
  available: boolean;
  /** Dotted i18n key for the status line shown next to "Call our team". */
  labelKey: 'supportWidget.phoneOpenNow' | 'supportWidget.phoneOpensAt9';
  /** Milliseconds until `available` next flips — for a single re-check timer. */
  msUntilChange: number;
}

export function getPhoneSupportStatus(now: Date = new Date()): PhoneSupportStatus {
  const sec = kathmanduSecondOfDay(now);
  const open = PHONE_OPEN_MINUTE * 60;
  const close = PHONE_CLOSE_MINUTE * 60;
  const available = sec >= open && sec < close;
  const nextBoundary = available ? close : sec < open ? open : open + 24 * 3600;
  return {
    available,
    labelKey: available ? 'supportWidget.phoneOpenNow' : 'supportWidget.phoneOpensAt9',
    msUntilChange: (nextBoundary - sec) * 1000 - now.getMilliseconds(),
  };
}

// ── Context-aware prefilled messages ───────────────────────────────────────

export type SupportContext = 'payment' | 'campaign' | 'creator' | 'business' | 'general';

const PAYMENT_PATH = /\/(wallet|payments?|payment-result|withdraw\w*)(\/|$)/;
const CAMPAIGN_PATH = /\/(events|work|applications|deliverables|campaigns?|community\/events)(\/|$)/;

/** Page topic beats account type; signed-out visitors with no topic are "general". */
export function getSupportContext(role: string | null | undefined, pathname: string): SupportContext {
  if (PAYMENT_PATH.test(pathname)) return 'payment';
  if (CAMPAIGN_PATH.test(pathname)) return 'campaign';
  if (role === 'CREATOR') return 'creator';
  if (role === 'BUSINESS') return 'business';
  return 'general';
}

/**
 * Prefills go to Kolab's support inbox, so they stay in English whatever the
 * UI language — and never carry ids, amounts or other account details.
 */
const WHATSAPP_MESSAGES: Record<SupportContext, string> = {
  creator: "Hi Kolab Support, I'm a creator and need help with my account.",
  business: "Hi Kolab Support, I'm a business and need help with my account.",
  campaign: 'Hi Kolab Support, I need help with a campaign or event.',
  payment: 'Hi Kolab Support, I need help with a payment or withdrawal.',
  general: 'Hi Kolab Support, I need some assistance.',
};

const EMAIL_BODIES: Record<SupportContext, string> = {
  creator: 'I need help with my creator account.',
  business: 'I need help with my business account.',
  campaign: 'I need help with a campaign or event.',
  payment: 'I need help with a payment or withdrawal.',
  general: 'I need assistance with Kolab.',
};

export function supportWhatsAppMessage(context: SupportContext): string {
  return WHATSAPP_MESSAGES[context];
}

export function supportEmailBody(context: SupportContext): string {
  return `Hello Kolab Support,\n\n${EMAIL_BODIES[context]}\n\n`;
}
