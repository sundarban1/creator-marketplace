import { useT } from '../i18n';
import { Alert } from '../ui/Alert';

export interface DisputeInfo {
  status: string;
  reason: string;
  raisedByRole: string;
  resolution: string | null;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

const RESOLUTION_LABEL_KEY: Record<string, string> = {
  CREATOR_WON: 'workDetail.resolutionCreatorWon',
  BUSINESS_WON: 'workDetail.resolutionBusinessWon',
  PARTIAL: 'workDetail.resolutionPartial',
  DISMISSED: 'workDetail.resolutionDismissed',
};

/** Shared by both the creator work-detail page and the business event-detail
 * page — same dispute record, just viewed from either side. */
export function DisputeStatusCard({ dispute, viewerRole }: { dispute: DisputeInfo; viewerRole: 'CREATOR' | 'BUSINESS' }) {
  const t = useT();
  const resolved = dispute.status === 'RESOLVED';

  return (
    <Alert tone={resolved ? 'neutral' : 'error'}>
      <span className="block font-semibold">{t('workDetail.disputeRaisedTitle')}</span>
      <span className="mt-1 block text-[13px]">
        {dispute.raisedByRole === viewerRole ? t('workDetail.disputeRaisedByYou') : t('workDetail.disputeRaisedByOther')}
      </span>
      <span className="mt-1 block whitespace-pre-line text-[13px]">{dispute.reason}</span>
      {resolved ? (
        <div className="mt-2 border-t border-line/60 pt-2 text-[13px] font-medium">
          {t('workDetail.disputeResolved')}: {t(RESOLUTION_LABEL_KEY[dispute.resolution ?? ''] ?? 'workDetail.resolutionDismissed')}
          {dispute.resolutionNote && (
            <p className="mt-1 text-[12px] font-normal text-ink-soft">
              {t('workDetail.disputeResolutionNoteLabel')}: {dispute.resolutionNote}
            </p>
          )}
        </div>
      ) : (
        <span className="mt-2 block text-[12px] text-ink-soft">{t('workDetail.disputeUnderReview')}</span>
      )}
    </Alert>
  );
}
