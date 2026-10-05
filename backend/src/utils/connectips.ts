import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { reportError, LogEvent } from '../config/observability';
import { AppError } from '../middleware/error';
import { getDict } from '../i18n';

import { HttpStatus } from '../constants/httpStatus';

// connectIPS (NCHL) e-payment. Same browser shape as eSewa's ePay v2 — the
// browser POSTs a signed HTML form to the gateway's login page, then NCHL
// redirects back — with two differences that drive everything below:
//  - the TOKEN is an RSA-SHA256 signature made with the merchant's private key
//    (from NCHL's CREDITOR.pfx), not an HMAC over a shared secret;
//  - success/failure URLs are registered with NCHL per merchant, never sent in
//    the form, so the redirect carries only `TXNID` — that id alone has to lead
//    back to the attempt (ConnectIpsPayment.txnId → application) and to which
//    client started it (encoded in the id's prefix, see newConnectIpsTxnId).

export type ConnectIpsFormFields = {
  MERCHANTID: string;
  APPID: string;
  APPNAME: string;
  TXNID: string;
  TXNDATE: string;
  TXNCRNCY: string;
  TXNAMT: string;
  REFERENCEID: string;
  REMARKS: string;
  PARTICULARS: string;
  TOKEN: string;
};

export type ConnectIpsValidateResult = {
  status: string;
  statusDesc: string | null;
};

// validatetxn's documented outcomes (connectIPS Gateway §6). Only SUCCESS is a
// completed payment. FAILED is final; ERROR comes as "TRANSACTION NOT FOUND"
// (never reached the gateway) or "TRANSACTION INCOMPLETE" (abandoned before
// OTP) — none of these are paid, and every retry starts over with a new TXNID
// (NCHL rejects a reused one as a duplicate).
export function friendlyConnectIpsStatusMessage(result: ConnectIpsValidateResult): string {
  const msgs = getDict().connectips.status;
  const desc = (result.statusDesc ?? '').toUpperCase();
  if (result.status === 'FAILED') return msgs.FAILED;
  if (desc.includes('NOT FOUND')) return msgs.NOT_FOUND;
  if (desc.includes('INCOMPLETE')) return msgs.INCOMPLETE;
  return msgs.UNKNOWN;
}

type Config = {
  merchantId: string;
  appId: string;
  appName: string;
  appPassword: string;
  privateKey: crypto.KeyObject;
};

let cachedKey: { raw: string; key: crypto.KeyObject } | null = null;

// Accepts the PEM verbatim, with literal "\n" escapes (single-line env var), or
// base64-encoded as a whole — whichever survives the deploy platform's env UI.
function loadPrivateKey(raw: string): crypto.KeyObject {
  if (cachedKey?.raw === raw) return cachedKey.key;
  let pem = raw.replace(/\\n/g, '\n').trim();
  if (!pem.includes('-----BEGIN')) pem = Buffer.from(pem, 'base64').toString('utf-8');
  try {
    const key = crypto.createPrivateKey(pem);
    cachedKey = { raw, key };
    return key;
  } catch (err) {
    reportError(err, { event: LogEvent.PAYMENT_CONNECTIPS_KEY_INVALID });
    throw new AppError(getDict().connectips.notConfigured, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

function assertConfigured(): Config {
  if (!env.CONNECTIPS_MERCHANT_ID || !env.CONNECTIPS_APP_ID || !env.CONNECTIPS_PRIVATE_KEY || !env.CONNECTIPS_APP_PASSWORD) {
    throw new AppError(getDict().connectips.notConfigured, HttpStatus.SERVICE_UNAVAILABLE);
  }
  return {
    merchantId:  env.CONNECTIPS_MERCHANT_ID,
    appId:       env.CONNECTIPS_APP_ID,
    appName:     env.CONNECTIPS_APP_NAME,
    appPassword: env.CONNECTIPS_APP_PASSWORD,
    privateKey:  loadPrivateKey(env.CONNECTIPS_PRIVATE_KEY),
  };
}

export function isConnectIpsConfigured(): boolean {
  return !!(env.CONNECTIPS_MERCHANT_ID && env.CONNECTIPS_APP_ID && env.CONNECTIPS_PRIVATE_KEY
    && env.CONNECTIPS_APP_PASSWORD && env.CONNECTIPS_RETURN_BASE_URL);
}

function sign(privateKey: crypto.KeyObject, message: string): string {
  return crypto.createSign('RSA-SHA256').update(message).sign(privateKey, 'base64');
}

// NCHL amounts are integer paisa on both the form and the validate API.
export function toPaisa(amountNpr: number): number {
  return Math.round(amountNpr * 100);
}

// TXNID is capped at 20 chars by NCHL. First char records which client
// started the payment ('W' web / 'M' mobile), since the fixed redirect URL
// can't carry it; the rest is random so retries never collide.
export function newConnectIpsTxnId(platform: 'web' | 'mobile'): string {
  const prefix = platform === 'web' ? 'W' : 'M';
  return `${prefix}${crypto.randomBytes(12).toString('hex').toUpperCase().slice(0, 19)}`;
}

export function platformFromTxnId(txnId: string): 'web' | 'mobile' {
  return txnId.startsWith('W') ? 'web' : 'mobile';
}

// DD-MM-YYYY in Nepal time — the format NCHL expects for TXNDATE.
function txnDate(now = new Date()): string {
  const npt = new Date(now.getTime() + (5 * 60 + 45) * 60_000);
  const dd = String(npt.getUTCDate()).padStart(2, '0');
  const mm = String(npt.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${npt.getUTCFullYear()}`;
}

export function buildConnectIpsSignedFields(params: {
  txnId: string;
  amountPaisa: number;
}): ConnectIpsFormFields {
  const cfg = assertConfigured();
  const fields: Omit<ConnectIpsFormFields, 'TOKEN'> = {
    MERCHANTID:  cfg.merchantId,
    APPID:       cfg.appId,
    APPNAME:     cfg.appName,
    TXNID:       params.txnId,
    TXNDATE:     txnDate(),
    TXNCRNCY:    'NPR',
    TXNAMT:      String(params.amountPaisa),
    // Our TXNID is already unique per attempt, so it doubles as the reference.
    REFERENCEID: params.txnId,
    REMARKS:     'Kolab escrow payment',
    PARTICULARS: 'Kolab creator payment',
  };
  // The signed string is every field in this exact order, ending in the
  // literal "TOKEN=TOKEN" placeholder, per NCHL's merchant integration guide.
  const message = [
    ...Object.entries(fields).map(([k, v]) => `${k}=${v}`),
    'TOKEN=TOKEN',
  ].join(',');
  return { ...fields, TOKEN: sign(cfg.privateKey, message) };
}

// Same reason as esewaCheckoutCsp: the auto-submitting page needs an inline
// script and a cross-origin form POST, both blocked by the default policy.
export function connectIpsCheckoutCsp(): string {
  let origin = 'https://uat.connectips.com https://login.connectips.com';
  try {
    origin = new URL(env.CONNECTIPS_GATEWAY_URL).origin;
  } catch {
    /* fall back to both known connectIPS origins */
  }
  return [
    "default-src 'self'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    "base-uri 'self'",
    `form-action ${origin}`,
  ].join('; ');
}

export function buildConnectIpsCheckoutHtml(fields: ConnectIpsFormFields): string {
  const inputs = Object.entries(fields)
    .map(([key, value]) => `<input type="hidden" name="${key}" value="${String(value).replace(/"/g, '&quot;')}" />`)
    .join('\n      ');

  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>Redirecting to connectIPS…</title></head>
  <body>
    <form id="connectips-form" method="POST" action="${env.CONNECTIPS_GATEWAY_URL}">
      ${inputs}
    </form>
    <script>document.getElementById('connectips-form').submit();</script>
  </body>
</html>`;
}

// Always the source of truth for whether a payment completed — the redirect
// itself is unsigned (just a TXNID), so nothing is trusted until NCHL's own
// validatetxn API confirms this id + amount as SUCCESS.
export async function validateConnectIpsTxn(params: {
  txnId: string;
  amountPaisa: number;
}): Promise<ConnectIpsValidateResult> {
  const dict = getDict();
  const cfg = assertConfigured();
  const txnAmt = params.amountPaisa;
  const token = sign(
    cfg.privateKey,
    `MERCHANTID=${cfg.merchantId},APPID=${cfg.appId},REFERENCEID=${params.txnId},TXNAMT=${txnAmt}`,
  );

  let res: Response;
  try {
    res = await fetch(env.CONNECTIPS_VALIDATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${cfg.appId}:${cfg.appPassword}`).toString('base64')}`,
      },
      body: JSON.stringify({
        merchantId:  Number(cfg.merchantId),
        appId:       cfg.appId,
        referenceId: params.txnId,
        txnAmt,
        token,
      }),
    });
  } catch (err) {
    reportError(err, { event: LogEvent.PAYMENT_CONNECTIPS_VALIDATE_FAILED, txnId: params.txnId });
    throw new AppError(dict.connectips.validateNetworkError, HttpStatus.BAD_GATEWAY);
  }

  const body = await res.json().catch(() => null) as Record<string, unknown> | null;
  if (res.status === 401) {
    // Wrong APP_ID / APP_PASSWORD pair (connectIPS Gateway §7) — our config
    // problem, not the business's, so alert rather than just warn.
    reportError(new Error('connectIPS validatetxn 401 — check CONNECTIPS_APP_ID / CONNECTIPS_APP_PASSWORD'), {
      event: LogEvent.PAYMENT_CONNECTIPS_VALIDATE_FAILED, txnId: params.txnId,
    });
    throw new AppError(dict.connectips.validateRejected, HttpStatus.BAD_GATEWAY);
  }
  if (!res.ok || !body?.status) {
    // Never log the raw body — NCHL echoes our signed token back in it.
    logger.warn({ httpStatus: res.status, status: body?.status, statusDesc: body?.statusDesc, txnId: params.txnId }, 'connectIPS validatetxn rejected');
    throw new AppError(dict.connectips.validateRejected, HttpStatus.BAD_GATEWAY);
  }

  logger.info({ event: LogEvent.PAYMENT_CONNECTIPS_VALIDATE, status: body.status, statusDesc: body.statusDesc, txnId: params.txnId }, 'connectIPS validatetxn');

  return {
    status:     String(body.status),
    statusDesc: body.statusDesc ? String(body.statusDesc) : null,
  };
}
