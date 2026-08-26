import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../middleware/error';

// Khalti's older e-wallet/checkout API returns errors as a numeric `status_code`
// (documented in their "Error Codes" table) rather than an HTTP status alone —
// the ePayment (KPG-2) initiate/lookup endpoints below can still surface these
// same codes inside a 400 body, so every failure path is mapped through this
// table for a message that's actually meaningful to a business trying to pay.
const KHALTI_ERROR_MESSAGES: Record<number, string> = {
  1001: 'Khalti rejected the request (token not provided).',
  1002: 'Khalti rejected the request (invalid token).',
  1003: 'This Khalti payment link has been deleted.',
  1004: 'This Khalti payment link is no longer active.',
  1005: 'The Khalti account associated with this payment has been deleted.',
  1006: 'The Khalti account associated with this payment is inactive.',
  1007: 'This Khalti payment link has expired.',
  1008: 'Khalti is having trouble processing this payment right now.',
  1009: "This Khalti account doesn't have permission to complete this payment.",
  1010: 'Khalti rejected the payment details as invalid.',
  1011: 'Khalti rejected the payment details as invalid.',
  1012: 'Khalti payment reference was not provided.',
  1013: 'This payment has already been submitted to Khalti.',
  1014: 'Khalti could not parse the payment request.',
  1015: 'Khalti could not parse the payment request.',
  1016: 'Insufficient balance in the Khalti wallet.',
  1017: 'Khalti server error — please try again shortly.',
  1018: 'Khalti had a problem processing this payment.',
  1019: 'Khalti is currently under maintenance — please try again shortly.',
  1020: 'Khalti could not reach the payment provider.',
  1021: 'Khalti reported an error from the payment provider.',
  4000: 'Khalti could not fulfill this payment request.',
};

// Khalti's documented error shape is `{ "error_code": "1002", "message": "Invalid
// token" }`, but the ePayment (KPG-2) endpoints have also been observed returning
// `detail`/`status_code` (e.g. per-field validation errors) — this checks every
// spelling Khalti is known to use before falling back to a generic message.
function friendlyKhaltiMessage(body: Record<string, unknown> | null, fallback: string): string {
  const rawCode = body?.error_code ?? body?.status_code;
  const code = typeof rawCode === 'string' ? parseInt(rawCode, 10) : typeof rawCode === 'number' ? rawCode : NaN;
  if (!Number.isNaN(code) && KHALTI_ERROR_MESSAGES[code]) return KHALTI_ERROR_MESSAGES[code];

  const detail = body?.message ?? body?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;

  return fallback;
}

export type KhaltiInitiateParams = {
  amountPaisa: number;
  purchaseOrderId: string;
  purchaseOrderName: string;
  returnUrl: string;
  websiteUrl: string;
  customerInfo?: { name?: string; email?: string; phone?: string };
};

export type KhaltiInitiateResult = {
  pidx: string;
  paymentUrl: string;
};

export type KhaltiLookupResult = {
  pidx: string;
  status: string;
  totalAmountPaisa: number;
  transactionId: string | null;
};

function assertConfigured(): string {
  if (!env.KHALTI_SECRET_KEY) {
    throw new AppError('Khalti is not configured on the server yet.', 503);
  }
  return env.KHALTI_SECRET_KEY;
}

// One request per payment attempt — see Application.khaltiPidx's doc comment
// for why the caller must overwrite the stored pidx with whatever this returns.
export async function initiateKhaltiPayment(params: KhaltiInitiateParams): Promise<KhaltiInitiateResult> {
  const secretKey = assertConfigured();

  let res: Response;
  try {
    res = await fetch(`${env.KHALTI_BASE_URL}/epayment/initiate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${secretKey}`,
      },
      body: JSON.stringify({
        return_url: params.returnUrl,
        website_url: params.websiteUrl,
        amount: params.amountPaisa,
        purchase_order_id: params.purchaseOrderId,
        purchase_order_name: params.purchaseOrderName,
        ...(params.customerInfo ? { customer_info: params.customerInfo } : {}),
      }),
    });
  } catch (err) {
    logger.error({ err, purchaseOrderId: params.purchaseOrderId }, 'Khalti initiate request failed to send');
    throw new AppError('Could not reach Khalti. Please check your connection and try again.', 502);
  }

  const body = await res.json().catch(() => null) as Record<string, unknown> | null;

  if (!res.ok || !body?.pidx || !body?.payment_url) {
    logger.error({ status: res.status, body, purchaseOrderId: params.purchaseOrderId }, 'Khalti initiate rejected');
    const message = friendlyKhaltiMessage(body, 'Khalti could not start this payment. Please try again.');
    throw new AppError(message, 502);
  }

  return { pidx: String(body.pidx), paymentUrl: String(body.payment_url) };
}

// Always the source of truth for whether a payment actually completed — the
// query params Khalti's redirect carries back to khaltiCallback are shaped by
// whatever the user's browser sends and must never be trusted on their own.
export async function lookupKhaltiPayment(pidx: string): Promise<KhaltiLookupResult> {
  const secretKey = assertConfigured();

  let res: Response;
  try {
    res = await fetch(`${env.KHALTI_BASE_URL}/epayment/lookup/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${secretKey}`,
      },
      body: JSON.stringify({ pidx }),
    });
  } catch (err) {
    logger.error({ err, pidx }, 'Khalti lookup request failed to send');
    throw new AppError('Could not confirm the Khalti payment. Please try again.', 502);
  }

  const body = await res.json().catch(() => null) as Record<string, unknown> | null;

  if (!res.ok || !body?.status) {
    logger.error({ status: res.status, body, pidx }, 'Khalti lookup rejected');
    const message = friendlyKhaltiMessage(body, 'Could not confirm the Khalti payment.');
    throw new AppError(message, 502);
  }

  return {
    pidx: String(body.pidx ?? pidx),
    status: String(body.status),
    totalAmountPaisa: Number(body.total_amount ?? 0),
    transactionId: body.transaction_id ? String(body.transaction_id) : null,
  };
}
