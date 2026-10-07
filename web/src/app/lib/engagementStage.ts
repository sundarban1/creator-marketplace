import type { TFn } from '../i18n';

/** The timed fields of an application the stage countdowns hang off. */
export interface StageTimes {
  engagementState: string;
  paymentDueAt?: string | null;
  creatorConfirmationDueAt?: string | null;
  contentDeadline?: string | null;
  contentGraceDeadline?: string | null;
  businessReviewDueAt?: string | null;
  paymentReleaseAt?: string | null;
}

export interface StageInfo {
  label: string;
  value: string;
  overdue: boolean;
  note?: string;
}

function countdown(iso: string, t: TFn): { text: string; overdue: boolean } {
  const ms = new Date(iso).getTime() - Date.now();
  const overdue = ms < 0;
  const mins = Math.max(1, Math.round(Math.abs(ms) / 60000));
  const time =
    mins < 60 ? `${mins}m`
    : mins < 60 * 24 ? `${Math.floor(mins / 60)}h ${mins % 60}m`
    : `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
  return { text: overdue ? t('stage.overdue', { time }) : t('stage.left', { time }), overdue };
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

/**
 * The countdown/deadline for whatever timed stage an engagement is in, worded
 * for the viewer — folded into that stage's card on both work pages so the
 * "what's happening" text and "by when" sit together. Same stages and
 * timestamps as mobile's activity-timeline status strip.
 */
export function stageInfo(a: StageTimes, role: 'CREATOR' | 'BUSINESS', t: TFn): StageInfo | null {
  const biz = role === 'BUSINESS';
  const timed = (iso: string | null | undefined, label: string, note?: string): StageInfo | null => {
    if (!iso) return null;
    const cd = countdown(iso, t);
    return { label, value: cd.text, overdue: cd.overdue, note };
  };

  switch (a.engagementState) {
    case 'CREATOR_SELECTED':
      return biz
        ? timed(a.paymentDueAt, t('stage.bizPayLabel'), t('stage.bizPayNote'))
        : timed(a.paymentDueAt, t('stage.creatorPayLabel'), t('stage.creatorPayNote'));
    case 'ESCROW_FUNDED':
      return biz
        ? timed(a.creatorConfirmationDueAt, t('stage.bizConfirmLabel'), t('stage.bizConfirmNote'))
        : timed(a.creatorConfirmationDueAt, t('stage.creatorConfirmLabel'), t('stage.creatorConfirmNote'));
    case 'IN_PROGRESS':
    case 'REVISION_REQUESTED':
      return timed(a.contentDeadline, t('stage.contentDueLabel'), a.contentDeadline ? fmtWhen(a.contentDeadline) : undefined);
    case 'CONTENT_OVERDUE':
      return timed(a.contentGraceDeadline, t('stage.graceLabel'), biz ? t('stage.bizGraceNote') : t('stage.creatorGraceNote'));
    case 'BUSINESS_REVIEW':
      return biz
        ? timed(a.businessReviewDueAt, t('stage.bizReviewLabel'), t('stage.bizReviewNote'))
        : timed(a.businessReviewDueAt, t('stage.creatorReviewLabel'));
    case 'PAYMENT_RELEASE_PENDING':
      return a.paymentReleaseAt
        ? { label: t('stage.releaseLabel'), value: fmtWhen(a.paymentReleaseAt), overdue: false }
        : null;
    default:
      return null;
  }
}
