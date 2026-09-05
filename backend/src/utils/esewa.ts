import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { reportError, LogEvent } from '../config/observability';
import { AppError } from '../middleware/error';
import { getDict } from '../i18n';

import { HttpStatus } from '../constants/httpStatus';

// eSewa's ePay v2 flow (unlike Khalti's simple initiate/lookup API pair) has the
// browser POST a signed HTML form directly to eSewa, then eSewa redirects back
// with a signed, base64-encoded result — every field below mirrors what their
// docs call the "signed_field_names" set for the default form/response shape.
const SIGNED_FIELD_NAMES = 'total_amount,transaction_uuid,product_code';

export type EsewaFormFields = {
  amount: string;
  tax_amount: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  product_service_charge: string;
  product_delivery_charge: string;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
};

export type EsewaDecodedResponse = {
  transaction_code?: string;
  status?: string;
  total_amount?: string;
  transaction_uuid?: string;
  product_code?: string;
  signed_field_names?: string;
  signature?: string;
};

export type EsewaStatusResult = {
  status: string;
  refId: string | null;
};

// eSewa's transaction-status values, mapped to something a business can
// actually act on instead of a raw enum string — same purpose as Khalti's
// KHALTI_ERROR_MESSAGES table. Both languages' copies live in ../i18n; getDict()
// resolves the current request's language on its own (see i18n/index.ts).
export function friendlyEsewaStatusMessage(status: string): string {
  const dict = getDict();
  return (dict.esewa.status as Record<string, string>)[status] ?? `eSewa payment ${status.toLowerCase()}.`;
}

// eSewa's error responses are typically shaped `{ code, message }` (sometimes
// `error_message`) — checked in order before falling back to a generic message,
// mirroring khalti.ts's friendlyKhaltiMessage.
function friendlyEsewaErrorMessage(body: Record<string, unknown> | null, fallback: string): string {
  const detail = body?.message ?? body?.error_message ?? body?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  return fallback;
}

function assertConfigured(): { secretKey: string; returnBaseUrl: string } {
  if (!env.ESEWA_SECRET_KEY || !env.ESEWA_RETURN_BASE_URL) {
    throw new AppError(getDict().esewa.notConfigured, HttpStatus.SERVICE_UNAVAILABLE);
  }
  return { secretKey: env.ESEWA_SECRET_KEY, returnBaseUrl: env.ESEWA_RETURN_BASE_URL };
}

// Two decimal places — the eSewa signature is computed over this exact string
// in buildEsewaSignedFields, and checkEsewaStatus sends the same format, so the
// two must never diverge. (Tested against eSewa's rc-epay form endpoint: both
// "100" and "100.00" are accepted, so this format is not what bounces a
// transaction to failure_url.)
function formatAmount(amountNpr: number): string {
  return amountNpr.toFixed(2);
}

// eSewa's status/redirect responses can echo totals back with a thousands
// comma (e.g. "1,000.0") even though outgoing amounts never have one.
export function parseEsewaAmount(value: string): number {
  return parseFloat(value.replace(/,/g, ''));
}

function signMessage(secretKey: string, message: string): string {
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

export function buildEsewaSignedFields(params: {
  appId: string;
  transactionUuid: string;
  totalAmountNpr: number;
}): EsewaFormFields {
  const { secretKey, returnBaseUrl } = assertConfigured();
  const totalAmount = formatAmount(params.totalAmountNpr);
  const productCode = env.ESEWA_MERCHANT_CODE;

  const message = `total_amount=${totalAmount},transaction_uuid=${params.transactionUuid},product_code=${productCode}`;
  const signature = signMessage(secretKey, message);

  return {
    amount: totalAmount,
    tax_amount: '0',
    total_amount: totalAmount,
    transaction_uuid: params.transactionUuid,
    product_code: productCode,
    product_service_charge: '0',
    product_delivery_charge: '0',
    success_url: `${returnBaseUrl}/api/payments/esewa/success/${params.appId}`,
    failure_url: `${returnBaseUrl}/api/payments/esewa/failure/${params.appId}`,
    signed_field_names: SIGNED_FIELD_NAMES,
    signature,
  };
}

// The checkout page (buildEsewaCheckoutHtml) needs two things Helmet's default
// production CSP forbids: an inline <script> to auto-submit, and a cross-origin
// form POST to eSewa's domain. Without this override the page renders blank —
// the browser silently blocks both. Scoped to that one response only.
export function esewaCheckoutCsp(): string {
  let esewaOrigin = 'https://rc-epay.esewa.com.np https://epay.esewa.com.np';
  try {
    esewaOrigin = new URL(env.ESEWA_BASE_URL).origin;
  } catch {
    /* fall back to both known eSewa origins */
  }
  return [
    "default-src 'self'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    "base-uri 'self'",
    `form-action ${esewaOrigin}`,
  ].join('; ');
}

export function buildEsewaCheckoutHtml(fields: EsewaFormFields): string {
  const inputs = Object.entries(fields)
    .map(([key, value]) => `<input type="hidden" name="${key}" value="${String(value).replace(/"/g, '&quot;')}" />`)
    .join('\n      ');

  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>Redirecting to eSewa…</title></head>
  <body>
    <form id="esewa-form" method="POST" action="${env.ESEWA_BASE_URL}">
      ${inputs}
    </form>
    <script>document.getElementById('esewa-form').submit();</script>
  </body>
</html>`;
}

// eSewa appends this as a base64-encoded `data` query param on both the
// success_url and failure_url redirect — never trusted on its own, only ever
// used to look up the fields to re-verify (signature, then checkEsewaStatus).
export function decodeEsewaResponse(dataParam: string): EsewaDecodedResponse {
  try {
    const json = Buffer.from(dataParam, 'base64').toString('utf-8');
    return JSON.parse(json) as EsewaDecodedResponse;
  } catch (err) {
    logger.error({ err }, 'Could not decode eSewa response payload');
    throw new AppError(getDict().esewa.decodeFailed, HttpStatus.BAD_REQUEST);
  }
}

export function verifyEsewaSignature(decoded: EsewaDecodedResponse): void {
  const { secretKey } = assertConfigured();
  if (!decoded.signed_field_names || !decoded.signature) {
    throw new AppError(getDict().esewa.missingSignature, HttpStatus.BAD_REQUEST);
  }

  const fieldNames = decoded.signed_field_names.split(',');
  const message = fieldNames
    .map((name) => `${name}=${(decoded as Record<string, unknown>)[name] ?? ''}`)
    .join(',');
  const expected = signMessage(secretKey, message);

  if (expected !== decoded.signature) {
    logger.error({ decoded }, 'eSewa response signature mismatch');
    throw new AppError(getDict().esewa.invalidSignature, HttpStatus.BAD_REQUEST);
  }
}

// Always the source of truth for whether a payment actually completed — same
// role as lookupKhaltiPayment. Called after signature verification so a forged
// redirect can never reach eSewa's real server with fabricated identifiers.
export async function checkEsewaStatus(params: {
  transactionUuid: string;
  totalAmountNpr: number;
}): Promise<EsewaStatusResult> {
  const dict = getDict();
  assertConfigured();
  const productCode = env.ESEWA_MERCHANT_CODE;
  const totalAmount = formatAmount(params.totalAmountNpr);

  const url = new URL(env.ESEWA_STATUS_URL);
  url.searchParams.set('product_code', productCode);
  url.searchParams.set('total_amount', totalAmount);
  url.searchParams.set('transaction_uuid', params.transactionUuid);

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch (err) {
    // Network/transport failure talking to eSewa at all — unexpected and
    // actionable, worth a Sentry alert (unlike a merely-declined payment).
    reportError(err, { event: LogEvent.PAYMENT_ESEWA_STATUS_CHECK_FAILED, transactionUuid: params.transactionUuid });
    throw new AppError(dict.esewa.statusCheckNetworkError, HttpStatus.BAD_GATEWAY);
  }

  const body = await res.json().catch(() => null) as Record<string, unknown> | null;
  if (!res.ok || !body?.status) {
    // eSewa reached but rejected/couldn't confirm — an expected business
    // outcome (pending, not found, malformed reply), not an exception.
    logger.warn({ status: res.status, body, transactionUuid: params.transactionUuid }, 'eSewa status check rejected');
    const message = friendlyEsewaErrorMessage(body, dict.esewa.statusCheckRejected);
    throw new AppError(message, HttpStatus.BAD_GATEWAY);
  }

  logger.info({ event: LogEvent.PAYMENT_ESEWA_STATUS_CHECK, status: body.status, transactionUuid: params.transactionUuid }, 'eSewa status check');

  return {
    status: String(body.status),
    refId: body.ref_id ? String(body.ref_id) : null,
  };
}
