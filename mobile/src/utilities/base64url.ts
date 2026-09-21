// Self-contained base64url codec for raw bytes (no padding) — used for the
// biometric-login keypair/signature wire format. Deliberately not built on
// `atob`/`btoa` or `Buffer`, neither of which is reliably present in Hermes
// without a polyfill (see src/lib/api.ts's `typeof atob === 'function'`
// guard) — this only needs plain JS bit-packing, so it has no such gap.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function bytesToBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : undefined;
    out += ALPHABET[b0 >> 2];
    out += ALPHABET[((b0 & 0x03) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
    if (b1 !== undefined) out += ALPHABET[((b1 & 0x0f) << 2) | (b2 === undefined ? 0 : b2 >> 6)];
    if (b2 !== undefined) out += ALPHABET[b2 & 0x3f];
  }
  return out;
}

export function base64UrlToBytes(b64url: string): Uint8Array {
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (let i = 0; i < b64url.length; i++) {
    const idx = ALPHABET.indexOf(b64url[i]);
    if (idx === -1) continue; // ignore stray padding/whitespace
    value = (value << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

// The biometric challenge is always a plain-ASCII JWT (base64url segments
// joined by '.'), so a full UTF-8 codec (TextEncoder, not reliably global in
// Hermes) is unnecessary — a direct char-code map is correct and simpler.
export function asciiToBytes(str: string): Uint8Array {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i);
  return out;
}
