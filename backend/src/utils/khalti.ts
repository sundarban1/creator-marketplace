import { env } from '../config/env';
import { logger } from '../config/logger';
import { reportError, LogEvent } from '../config/observability';
import { AppError } from '../middleware/error';
import { getDict } from '../i18n';

import { HttpStatus } from '../constants/httpStatus';

// Khalti's older e-wallet/checkout API returns errors as a numeric `status_code`
// (documented in their "Error Codes" table) rather than an HTTP status alone —
// the ePayment (KPG-2) initiate/lookup endpoints below can still surface these
// same codes inside a 400 body, so every failure path is mapped through this
// table (../i18n's khalti.errors, in both languages) for a message that's
// actually meaningful to a business trying to pay.

// Khalti's documented error shape is `{ "error_code": "1002", "message": "Invalid
// token" }`, but the ePayment (KPG-2) endpoints have also been observed returning
// `detail`/`status_code` (e.g. per-field validation errors) — this checks every
// spelling Khalti is known to use before falling back to a generic message.
function friendlyKhaltiMessage(body: Record<string, unknown> | null, fallback: string): string {
  const rawCode = body?.error_code ?? body?.status_code;
  const code = typeof rawCode === 'string' ? parseInt(rawCode, 10) : typeof rawCode === 'number' ? rawCode : NaN;
  const errors = getDict().khalti.errors;
  if (!Number.isNaN(code) && errors[code]) return errors[code];

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
    throw new AppError(getDict().khalti.notConfigured, HttpStatus.SERVICE_UNAVAILABLE);
  }
  return env.KHALTI_SECRET_KEY;
}

// One request per payment attempt — see Application.khaltiPidx's doc comment
// for why the caller must overwrite the stored pidx with whatever this returns.
export async function initiateKhaltiPayment(params: KhaltiInitiateParams): Promise<KhaltiInitiateResult> {
  const dict = getDict();
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
    reportError(err, { event: LogEvent.PAYMENT_KHALTI_INITIATE_FAILED, purchaseOrderId: params.purchaseOrderId });
    throw new AppError(dict.khalti.initiateNetworkError, HttpStatus.BAD_GATEWAY);
  }

  const body = await res.json().catch(() => null) as Record<string, unknown> | null;

  if (!res.ok || !body?.pidx || !body?.payment_url) {
    logger.warn({ status: res.status, body, purchaseOrderId: params.purchaseOrderId }, 'Khalti initiate rejected');
    const message = friendlyKhaltiMessage(body, dict.khalti.initiateRejectedFallback);
    throw new AppError(message, HttpStatus.BAD_GATEWAY);
  }

  logger.info({ event: LogEvent.PAYMENT_KHALTI_INITIATED, purchaseOrderId: params.purchaseOrderId, pidx: body.pidx }, 'Khalti payment initiated');

  return { pidx: String(body.pidx), paymentUrl: String(body.payment_url) };
}

// Always the source of truth for whether a payment actually completed — the
// query params Khalti's redirect carries back to khaltiCallback are shaped by
// whatever the user's browser sends and must never be trusted on their own.
export async function lookupKhaltiPayment(pidx: string): Promise<KhaltiLookupResult> {
  const dict = getDict();
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
    reportError(err, { event: LogEvent.PAYMENT_KHALTI_LOOKUP_FAILED, pidx });
    throw new AppError(dict.khalti.lookupNetworkError, HttpStatus.BAD_GATEWAY);
  }

  const body = await res.json().catch(() => null) as Record<string, unknown> | null;

  if (!res.ok || !body?.status) {
    logger.warn({ status: res.status, body, pidx }, 'Khalti lookup rejected');
    const message = friendlyKhaltiMessage(body, dict.khalti.lookupRejectedFallback);
    throw new AppError(message, HttpStatus.BAD_GATEWAY);
  }

  logger.info({ event: LogEvent.PAYMENT_KHALTI_LOOKUP, pidx, status: body.status }, 'Khalti payment lookup');

  return {
    pidx: String(body.pidx ?? pidx),
    status: String(body.status),
    totalAmountPaisa: Number(body.total_amount ?? 0),
    transactionId: body.transaction_id ? String(body.transaction_id) : null,
  };
}
