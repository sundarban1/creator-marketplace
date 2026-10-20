import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { AppError } from '../../middleware/error';
import { env, frontendBaseUrl } from '../../config/env';
import { logger } from '../../config/logger';
import { buildEsewaCheckoutHtml, decodeEsewaResponse, esewaCheckoutCsp } from '../../utils/esewa';
import { competitionPaymentService as pay, kolabPaymentsEnabled, availableProviders } from './competition.payments.service';
import type { PaymentsAdminListQuery } from './competition.payments.schema';

function h(fn: (req: Request) => Promise<unknown>, message = 'OK', status?: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      success(res, await fn(req), message, status);
    } catch (err) {
      next(err);
    }
  };
}

const uid = (req: Request) => req.user!.id;

type Outcome = 'success' | 'failed' | 'pending';

/**
 * Where the gateway's browser redirect ends up. Mobile reuses the app's
 * existing khalti-callback / esewa-callback deep links (they toast and pop
 * back to the screen that opened checkout, which reloads). Web lands on
 * /payment-result, which hands back to the paying tab or forwards to the
 * competition's payments tab.
 */
function redirectResult(res: Response, gateway: 'khalti' | 'esewa', platform: 'web' | 'mobile', outcome: Outcome, competitionId?: string, error?: string) {
  if (platform === 'web') {
    const qs = new URLSearchParams({ payment: outcome });
    if (competitionId) qs.set('competitionId', competitionId);
    if (error) qs.set('paymentError', error);
    res.redirect(`${frontendBaseUrl}/payment-result?${qs.toString()}`);
    return;
  }
  const qs = new URLSearchParams({ success: String(outcome === 'success') });
  if (outcome === 'pending') qs.set('pending', 'true');
  if (error) qs.set('error', error);
  res.redirect(`${env.APP_SCHEME}://${gateway}-callback?${qs.toString()}`);
}

const outcomeOf = (o: string): Outcome => (o === 'SUCCEEDED' ? 'success' : o === 'PENDING' ? 'pending' : 'failed');

async function khaltiCallback(req: Request, res: Response, platform: 'web' | 'mobile') {
  const { pidx, purchase_order_id: fundingId } = req.query as { pidx?: string; purchase_order_id?: string };
  if (!pidx || !fundingId) return redirectResult(res, 'khalti', platform, 'failed', undefined, 'missing_payment_reference');
  try {
    const r = await pay.confirmKhalti(fundingId, pidx);
    redirectResult(res, 'khalti', platform, outcomeOf(r.outcome), r.competitionId);
  } catch (err) {
    logger.warn({ err, fundingId }, 'competition funding: Khalti callback failed');
    redirectResult(res, 'khalti', platform, 'failed', undefined, err instanceof AppError ? err.message : 'Could not confirm the Khalti payment');
  }
}

async function esewaSuccess(req: Request, res: Response, platform: 'web' | 'mobile') {
  const { fundingId } = req.params;
  const { data } = req.query as { data?: string };
  if (!data) return redirectResult(res, 'esewa', platform, 'failed', undefined, 'missing_payment_reference');
  try {
    const r = await pay.confirmEsewa(fundingId, data);
    redirectResult(res, 'esewa', platform, outcomeOf(r.outcome), r.competitionId);
  } catch (err) {
    logger.warn({ err, fundingId }, 'competition funding: eSewa callback failed');
    redirectResult(res, 'esewa', platform, 'failed', undefined, err instanceof AppError ? err.message : 'Could not confirm the eSewa payment');
  }
}

function esewaFailure(req: Request, res: Response, platform: 'web' | 'mobile') {
  const { data } = req.query as { data?: string };
  if (data) {
    try { logger.warn({ fundingId: req.params.fundingId, esewa: decodeEsewaResponse(data) }, 'competition funding: eSewa failure'); } catch { /* logged below */ }
  }
  // Record the outcome from eSewa's own status API, never from this redirect.
  void pay.reconcileFunding(req.params.fundingId).catch(() => {});
  redirectResult(res, 'esewa', platform, 'failed', undefined, 'payment_failed');
}

export const CompetitionPaymentController = {
  // ── Public config ──
  config: h(async () => ({ kolabPaymentsEnabled: kolabPaymentsEnabled(), providers: kolabPaymentsEnabled() ? availableProviders() : [] }), 'Payment options retrieved'),

  // ── Organizer ──
  summary:        h((req) => pay.organizerSummary(uid(req), req.params.id), 'Prize payments retrieved'),
  initiateFunding: h((req) => pay.initiateFunding(uid(req), req.params.id, req.body.provider, req.body.platform), 'Payment started'),
  reportPayment:  h((req) => pay.reportDirectPayment(uid(req), req.params.id, req.params.payoutId, req.body, req.file?.buffer), 'Payment recorded'),

  // ── Creator ──
  confirmReceipt: h((req) => pay.confirmReceipt(uid(req), req.params.id, req.params.payoutId), 'Thanks for confirming'),
  dispute:        h((req) => pay.dispute(uid(req), req.params.id, req.params.payoutId, req.body.reason), 'Issue reported'),

  // ── Admin ──
  adminList:      h((req) => pay.adminList(req.query as unknown as PaymentsAdminListQuery), 'Prize payments retrieved'),
  adminDetail:    h((req) => pay.adminDetail(req.params.id, req.user?.email), 'Prize payments retrieved'),
  adminPayout:    h((req) => pay.adminPayoutAction(uid(req), req.user?.email, req.params.id, req.params.payoutId, req.body), 'Prize payment updated'),
  adminRefund:    h((req) => pay.adminRecordRefund(uid(req), req.user?.email, req.params.id, req.body), 'Refund recorded'),
  adminCheckFunding: h((req) => pay.adminCheckFunding(req.user?.email, req.params.id, req.params.fundingId), 'Payment re-checked'),

  // ── Gateway redirects (public, no Authorization header) ──
  khaltiCallback:    (req: Request, res: Response) => khaltiCallback(req, res, 'mobile'),
  khaltiCallbackWeb: (req: Request, res: Response) => khaltiCallback(req, res, 'web'),
  esewaSuccess:      (req: Request, res: Response) => esewaSuccess(req, res, 'mobile'),
  esewaSuccessWeb:   (req: Request, res: Response) => esewaSuccess(req, res, 'web'),
  esewaFailure:      (req: Request, res: Response) => esewaFailure(req, res, 'mobile'),
  esewaFailureWeb:   (req: Request, res: Response) => esewaFailure(req, res, 'web'),
  async esewaCheckout(req: Request, res: Response) {
    res.setHeader('Content-Security-Policy', esewaCheckoutCsp());
    try {
      const fields = await pay.esewaCheckoutForm(req.params.fundingId, req.query.platform === 'web' ? 'web' : 'mobile');
      res.type('html').send(buildEsewaCheckoutHtml(fields));
    } catch (err) {
      const message = err instanceof AppError ? err.message : 'Could not start the eSewa payment. Please try again.';
      res.status(err instanceof AppError ? err.statusCode : 500).type('html').send(
        `<!doctype html><html><head><meta charset="utf-8" /><title>Payment error</title></head><body style="font-family:sans-serif;text-align:center;padding:48px 24px;color:#374151;"><p>${message.replace(/</g, '&lt;')}</p></body></html>`,
      );
    }
  },
};
