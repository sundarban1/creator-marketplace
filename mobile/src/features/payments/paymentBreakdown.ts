import type { PlatformFlags } from '@/services/platformSettings';

/** Mirrors backend `PaymentBreakdown` (campaign.service computePaymentBreakdown)
 *  — the exact amounts Khalti/eSewa/connectIPS charge. */
export interface PaymentBreakdown {
  currency: 'NPR';
  creatorRate: number;
  standardFeePercent: number;
  standardFee: number;
  feeWaived: boolean;
  platformFee: number;
  taxPercent: number;
  taxApplicable: boolean;
  tax: number;
  total: number;
  creatorReceives: number;
}

const roundPaisa = (n: number) => Math.round(n * 100) / 100;

/** Placeholder shown only until the backend breakdown arrives (or for the
 *  creator side, which can't call the business-only endpoint). Same formula as
 *  the backend, driven by the admin flags — never a hardcoded percent. */
export function estimateBreakdown(rate: number, flags: Pick<PlatformFlags, 'paymentFeePercent' | 'paymentTaxPercent' | 'paymentFeeEnabled'>): PaymentBreakdown {
  const creatorRate = roundPaisa(rate);
  const standardFee = roundPaisa(creatorRate * (flags.paymentFeePercent / 100));
  const feeWaived = flags.paymentFeeEnabled === false || flags.paymentFeePercent === 0;
  const platformFee = feeWaived ? 0 : standardFee;
  const tax = roundPaisa(platformFee * (flags.paymentTaxPercent / 100));
  return {
    currency: 'NPR',
    creatorRate,
    standardFeePercent: flags.paymentFeePercent,
    standardFee,
    feeWaived,
    platformFee,
    taxPercent: flags.paymentTaxPercent,
    taxApplicable: tax > 0,
    tax,
    total: roundPaisa(creatorRate + platformFee + tax),
    creatorReceives: creatorRate,
  };
}

/** "Rs. 3,169.50" / "Rs. 3,000" — paisa only when there are any. */
export function formatNpr(n: number): string {
  const hasPaisa = Math.round(n * 100) % 100 !== 0;
  return `Rs. ${n.toLocaleString('en-US', { minimumFractionDigits: hasPaisa ? 2 : 0, maximumFractionDigits: 2 })}`;
}
