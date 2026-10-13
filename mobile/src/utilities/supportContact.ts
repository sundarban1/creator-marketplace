/**
 * Pure helpers behind the Contact Support sheet — phone normalization,
 * Kathmandu-time phone hours, and WhatsApp / tel / mailto link building.
 * Mirrors web/src/app/lib/supportContact.ts (unit-tested there with
 * `npm test`); keep the two in step.
 *
 * Contact details always come from the backend (`GET /api/public/site-info`
 * → admin "Inquiry & Customer Support Phone" + "Contact Email"); nothing here
 * hardcodes a number or address.
 */

// ── Phone numbers ──────────────────────────────────────────────────────────

const NEPAL_CC = '977';
/** Nepal mobile numbers: 10 digits, 96x/97x/98x (NTC, Ncell, Smart…). */
const NEPAL_MOBILE = /^9[678]\d{8}$/;
/** E.164 subscriber part for any other country: 8–15 digits, no leading 0. */
const INTERNATIONAL = /^[1-9]\d{7,14}$/;

/**
 * Normalize an admin-entered support number to E.164 (`+9779717157832`), or
 * `null` when it's empty / malformed / ambiguous — callers then show no phone
 * or WhatsApp action at all. Local Nepal mobiles get `+977`; `977…`/`00977…`
 * gain the `+`; the code is never duplicated; another country's number is kept
 * only when written with an explicit `+`/`00` prefix.
 */
export function normalizeSupportPhone(raw: string | null | undefined): string | null {
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

/** Human-readable form for display/copying: `+977 971-715-7832`. */
export function formatSupportPhone(normalized: string): string {
  const m = /^\+977(\d{3})(\d{3})(\d{4})$/.exec(normalized);
  return m ? `+977 ${m[1]}-${m[2]}-${m[3]}` : normalized;
}

export function buildTelUrl(raw: string | null | undefined): string | null {
  const phone = normalizeSupportPhone(raw);
  return phone ? `tel:${phone}` : null;
}

/** `https://wa.me/9779717157832?text=…` (digits only, no `+`) — the universal
 *  link opens the WhatsApp app when installed, the browser otherwise. */
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

export function buildMailtoUrl(raw: string | null | undefined, subject: string, body: string): string | null {
  const email = normalizeSupportEmail(raw);
  if (!email) return null;
  // RFC 6068: line breaks in a mailto body are CRLF.
  const crlfBody = body.replace(/\r?\n/g, '\r\n');
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(crlfBody)}`;
}

// ── Phone support hours (Asia/Kathmandu) ───────────────────────────────────

/** Open 09:00 inclusive, close 17:00 exclusive, every day. */
export const PHONE_OPEN_MINUTE = 9 * 60;
export const PHONE_CLOSE_MINUTE = 17 * 60;

/**
 * Asia/Kathmandu has been a fixed UTC+05:45 with no DST since 1986, so the
 * wall clock is plain arithmetic on the UTC instant — independent of the
 * device's own timezone, and of how complete Hermes' Intl timezone data is
 * on a given Android/iOS build (the web version uses Intl with the IANA zone).
 */
const KATHMANDU_OFFSET_MS = (5 * 60 + 45) * 60_000;
const DAY_MS = 86_400_000;

export function kathmanduSecondOfDay(now: Date): number {
  const ms = (((now.getTime() + KATHMANDU_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS;
  return Math.floor(ms / 1000);
}

export interface PhoneSupportStatus {
  available: boolean;
  /** i18n key for the status line under "Call our team". */
  labelKey: 'supportContact.phoneOpenNow' | 'supportContact.phoneOpensAt9';
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
    labelKey: available ? 'supportContact.phoneOpenNow' : 'supportContact.phoneOpensAt9',
    msUntilChange: (nextBoundary - sec) * 1000 - now.getMilliseconds(),
  };
}

// ── Context-aware prefilled messages ───────────────────────────────────────

export type SupportContext = 'payment' | 'campaign' | 'creator' | 'business' | 'general';

/** An explicit topic (wallet, event screens) beats account type. */
export function getSupportContext(role: string | null | undefined, topic?: 'payment' | 'campaign'): SupportContext {
  if (topic) return topic;
  if (role === 'CREATOR') return 'creator';
  if (role === 'BUSINESS') return 'business';
  return 'general';
}

/** Prefills go to Kolab's support inbox, so they stay in English whatever the
 *  UI language — and never carry ids, amounts or other account details. */
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
