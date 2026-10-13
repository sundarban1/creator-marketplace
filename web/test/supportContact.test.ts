// Run with `npm test` — Node's built-in runner, deliberately under a non-Nepal
// TZ so every hours assertion proves the browser's zone is ignored.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSupportPhone,
  formatSupportPhone,
  buildTelUrl,
  buildWhatsAppUrl,
  buildMailtoUrl,
  normalizeSupportEmail,
  getPhoneSupportStatus,
  getSupportContext,
  supportWhatsAppMessage,
  supportEmailBody,
  SUPPORT_EMAIL_SUBJECT,
} from '../src/app/lib/supportContact.ts';

const N = '+9779717157832';

/** A Date for the given Kathmandu wall-clock time (UTC+05:45, no DST). */
function npt(hhmm: string, day = '2026-10-13'): Date {
  return new Date(`${day}T${hhmm}+05:45`);
}

// ── Phone normalization ──

test('local Nepal mobile gets +977', () => {
  assert.equal(normalizeSupportPhone('9717157832'), N);
});

test('+977 number is preserved', () => {
  assert.equal(normalizeSupportPhone('+9779717157832'), N);
});

test('977 without plus is normalized, never duplicated', () => {
  assert.equal(normalizeSupportPhone('9779717157832'), N);
  assert.equal(normalizeSupportPhone('009779717157832'), N);
  assert.equal(normalizeSupportPhone('+977 +9779717157832'), null);
  assert.equal(normalizeSupportPhone('+9779779717157832'), null);
});

test('whitespace and formatting characters are stripped', () => {
  assert.equal(normalizeSupportPhone('  971-715-7832 '), N);
  assert.equal(normalizeSupportPhone('(+977) 971 715 7832'), N);
  assert.equal(normalizeSupportPhone('+977-9717157832'), N);
  assert.equal(normalizeSupportPhone('977.971.715.7832'), N);
});

test('missing and empty values are rejected', () => {
  assert.equal(normalizeSupportPhone(undefined), null);
  assert.equal(normalizeSupportPhone(null), null);
  assert.equal(normalizeSupportPhone(''), null);
  assert.equal(normalizeSupportPhone('   '), null);
});

test('malformed values are rejected', () => {
  assert.equal(normalizeSupportPhone('call 9717157832'), null);
  assert.equal(normalizeSupportPhone('97171578'), null); // too short
  assert.equal(normalizeSupportPhone('97171578321'), null); // too long
  assert.equal(normalizeSupportPhone('1234567890'), null); // not a Nepal mobile, no country code
  assert.equal(normalizeSupportPhone('+977 01-4412345'), null); // landline: no WhatsApp
  assert.equal(normalizeSupportPhone('+'), null);
});

test('other countries are kept only with an explicit + prefix', () => {
  assert.equal(normalizeSupportPhone('+44 20 7946 0958'), '+442079460958');
  assert.equal(normalizeSupportPhone('0044 20 7946 0958'), '+442079460958');
  assert.equal(normalizeSupportPhone('442079460958'), null); // never guess
});

test('display formatting', () => {
  assert.equal(formatSupportPhone(N), '+977 971-715-7832');
  assert.equal(formatSupportPhone('+442079460958'), '+442079460958');
});

// ── Links ──

test('tel link uses the normalized number', () => {
  assert.equal(buildTelUrl('9717157832'), 'tel:+9779717157832');
  assert.equal(buildTelUrl(''), null);
  assert.equal(buildTelUrl('abc'), null);
});

test('WhatsApp link is digits-only with an encoded message', () => {
  assert.equal(buildWhatsAppUrl('9717157832'), 'https://wa.me/9779717157832');
  const url = buildWhatsAppUrl('+977 9717157832', "Hi Kolab Support, I'm a creator & need help?");
  assert.equal(
    url,
    'https://wa.me/9779717157832?text=Hi%20Kolab%20Support%2C%20I\'m%20a%20creator%20%26%20need%20help%3F',
  );
  assert.equal(new URL(url!).searchParams.get('text'), "Hi Kolab Support, I'm a creator & need help?");
  assert.equal(buildWhatsAppUrl(undefined, 'hi'), null);
});

test('mailto has recipient, encoded subject and CRLF body', () => {
  const url = buildMailtoUrl(' support@kolab.com.np ', SUPPORT_EMAIL_SUBJECT, supportEmailBody('creator'));
  assert.ok(url!.startsWith('mailto:support@kolab.com.np?subject=Kolab%20Support%20Inquiry&body='));
  const body = decodeURIComponent(url!.split('&body=')[1]!);
  assert.equal(body, 'Hello Kolab Support,\r\n\r\nI need help with my creator account.\r\n\r\n');
});

test('invalid or missing email yields no link', () => {
  assert.equal(buildMailtoUrl('', 's', 'b'), null);
  assert.equal(buildMailtoUrl(undefined, 's', 'b'), null);
  assert.equal(buildMailtoUrl('support@kolab', 's', 'b'), null);
  assert.equal(buildMailtoUrl('a@b.com?cc=x@y.com', 's', 'b'), null);
  assert.equal(normalizeSupportEmail('support@kolab.com'), 'support@kolab.com');
});

// ── Kathmandu hours ──

test('phone hours: 09:00 inclusive, 17:00 exclusive (Kathmandu)', () => {
  const cases: [string, boolean][] = [
    ['00:00:00', false],
    ['08:59:59', false],
    ['08:59:00', false],
    ['09:00:00', true],
    ['12:00:00', true],
    ['16:59:00', true],
    ['16:59:59', true],
    ['17:00:00', false],
    ['20:30:00', false],
    ['23:59:59', false],
  ];
  for (const [time, expected] of cases) {
    const s = getPhoneSupportStatus(npt(time));
    assert.equal(s.available, expected, time);
    assert.equal(s.labelKey, expected ? 'supportWidget.phoneOpenNow' : 'supportWidget.phoneOpensAt9', time);
  }
});

test('uses Kathmandu time, not the runtime timezone', () => {
  assert.notEqual(Intl.DateTimeFormat().resolvedOptions().timeZone, 'Asia/Kathmandu');
  // 03:15Z is 09:00 in Kathmandu but the previous evening in Los Angeles.
  assert.equal(getPhoneSupportStatus(new Date('2026-10-13T03:15:00Z')).available, true);
  // 11:15Z is 17:00 in Kathmandu but 04:15 in LA / 11:15 in London.
  assert.equal(getPhoneSupportStatus(new Date('2026-10-13T11:15:00Z')).available, false);
  // 18:15Z (UTC "evening") is 00:00 next day in Kathmandu → closed.
  assert.equal(getPhoneSupportStatus(new Date('2026-10-13T18:15:00Z')).available, false);
});

test('msUntilChange lands exactly on the next boundary (open panel re-check)', () => {
  const open = getPhoneSupportStatus(npt('16:59:00'));
  assert.equal(open.msUntilChange, 60_000);
  const after = getPhoneSupportStatus(new Date(npt('16:59:00').getTime() + open.msUntilChange));
  assert.equal(after.available, false);

  const morning = getPhoneSupportStatus(npt('08:59:00'));
  assert.equal(morning.msUntilChange, 60_000);
  assert.equal(getPhoneSupportStatus(new Date(npt('08:59:00').getTime() + morning.msUntilChange)).available, true);

  // After closing, the next change is 09:00 the following day (crosses midnight).
  const evening = getPhoneSupportStatus(npt('17:00:00'));
  assert.equal(evening.msUntilChange, 16 * 3600 * 1000);
  const nextDay = getPhoneSupportStatus(new Date(npt('17:00:00').getTime() + evening.msUntilChange));
  assert.equal(nextDay.available, true);
});

// ── Context ──

test('support context: page topic, then role, then general', () => {
  assert.equal(getSupportContext('CREATOR', '/creator'), 'creator');
  assert.equal(getSupportContext('BUSINESS', '/business/settings'), 'business');
  assert.equal(getSupportContext(null, '/creators/sita'), 'general');
  assert.equal(getSupportContext(undefined, '/login'), 'general');
  assert.equal(getSupportContext('CREATOR', '/creator/wallet'), 'payment');
  assert.equal(getSupportContext('BUSINESS', '/business/payments'), 'payment');
  assert.equal(getSupportContext(null, '/payment-result'), 'payment');
  assert.equal(getSupportContext('CREATOR', '/creator/events/abc'), 'campaign');
  assert.equal(getSupportContext('BUSINESS', '/business/events/create'), 'campaign');
  assert.equal(getSupportContext(null, '/events/abc'), 'campaign');
  assert.equal(getSupportContext('CREATOR', '/creator/work/123'), 'campaign');
});

test('prefilled messages carry no account details', () => {
  assert.equal(supportWhatsAppMessage('creator'), "Hi Kolab Support, I'm a creator and need help with my account.");
  assert.equal(supportWhatsAppMessage('business'), "Hi Kolab Support, I'm a business and need help with my account.");
  assert.equal(supportWhatsAppMessage('campaign'), 'Hi Kolab Support, I need help with a campaign or event.');
  assert.equal(supportWhatsAppMessage('payment'), 'Hi Kolab Support, I need help with a payment or withdrawal.');
  assert.equal(supportWhatsAppMessage('general'), 'Hi Kolab Support, I need some assistance.');
  assert.match(supportEmailBody('business'), /my business account/);
  assert.match(supportEmailBody('general'), /assistance with Kolab/);
});
