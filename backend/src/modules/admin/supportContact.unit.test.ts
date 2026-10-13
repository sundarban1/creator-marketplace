import { describe, it, expect } from 'vitest';
import {
  normalizeSupportPhone,
  isValidSupportEmail,
  supportContactSettingsError,
  effectiveSupportWhatsapp,
} from './supportContact';

describe('normalizeSupportPhone', () => {
  it('adds +977 to a local Nepal mobile and never duplicates it', () => {
    expect(normalizeSupportPhone('9717157832')).toBe('+9779717157832');
    expect(normalizeSupportPhone('+9779717157832')).toBe('+9779717157832');
    expect(normalizeSupportPhone('9779717157832')).toBe('+9779717157832');
    expect(normalizeSupportPhone('+977-9717157832')).toBe('+9779717157832');
    expect(normalizeSupportPhone('(+977) 971 715 7832')).toBe('+9779717157832');
  });

  it('rejects empty, malformed and ambiguous values', () => {
    for (const bad of [undefined, null, 42, '', '  ', 'call me', '97171578', '1234567890', '+977 01-4412345']) {
      expect(normalizeSupportPhone(bad)).toBeNull();
    }
  });

  it('keeps other countries only with an explicit prefix', () => {
    expect(normalizeSupportPhone('+44 20 7946 0958')).toBe('+442079460958');
    expect(normalizeSupportPhone('442079460958')).toBeNull();
  });
});

describe('supportContactSettingsError', () => {
  it('accepts valid values, blanks, and payloads without contact keys', () => {
    expect(supportContactSettingsError({
      'platform.supportPhone': '+977-9717157832',
      'platform.supportWhatsapp': '9717157832',
      'platform.supportEmail': 'info@kolab.com.np',
    })).toBeNull();
    expect(supportContactSettingsError({
      'platform.supportPhone': '',
      'platform.supportWhatsapp': '   ',
      'platform.supportEmail': '',
    })).toBeNull();
    expect(supportContactSettingsError({ 'platform.commission': 10 })).toBeNull();
  });

  it('names the field that is wrong', () => {
    expect(supportContactSettingsError({ 'platform.supportWhatsapp': '01-4412345' }))
      .toMatch(/^WhatsApp Support Number must be a valid mobile number/);
    expect(supportContactSettingsError({ 'platform.supportPhone': 'abc' }))
      .toMatch(/^Inquiry & Customer Support Phone/);
    expect(supportContactSettingsError({ 'platform.supportEmail': 'info@kolab' }))
      .toBe('Contact Email must be a valid email address');
    expect(supportContactSettingsError({ 'platform.supportWhatsapp': 9717157832 }))
      .toBe('WhatsApp Support Number must be text');
  });

  it('validates email like the clients do', () => {
    expect(isValidSupportEmail(' support@kolab.com.np ')).toBe(true);
    expect(isValidSupportEmail('a@b.com?cc=x@y.com')).toBe(false);
  });
});

describe('effectiveSupportWhatsapp', () => {
  it('prefers the dedicated WhatsApp number', () => {
    expect(effectiveSupportWhatsapp({
      'platform.supportWhatsapp': '9800000000',
      'platform.supportPhone': '9717157832',
    })).toBe('9800000000');
  });

  it('falls back to the support phone when WhatsApp is blank or missing', () => {
    expect(effectiveSupportWhatsapp({ 'platform.supportWhatsapp': ' ', 'platform.supportPhone': '+977-9717157832' }))
      .toBe('+977-9717157832');
    expect(effectiveSupportWhatsapp({ 'platform.supportPhone': '9717157832' })).toBe('9717157832');
    expect(effectiveSupportWhatsapp({})).toBe('');
  });
});
