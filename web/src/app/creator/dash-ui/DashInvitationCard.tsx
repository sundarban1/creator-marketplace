import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Gift, Wallet2 } from 'lucide-react';
import { useT } from '../../i18n';
import { useToast } from '../../ui/Toast';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { StatusBadge } from '../../ui/StatusBadge';
import { respondToInvitation, type Invitation } from '../../api/creator';

/**
 * Free events (OPEN_EVENT) are accepted/declined right here. Paid campaigns
 * route the creator through the normal proposal flow instead — this card
 * only shows "Apply Now" / "Applied" for those (spec: paid-invite-apply-flow).
 */
export function DashInvitationCard({
  invitation,
  onChange,
}: {
  invitation: Invitation;
  onChange: (updated: Invitation) => void;
}) {
  const t = useT();
  const toast = useToast();
  const [submitting, setSubmitting] = useState<'ACCEPTED' | 'DECLINED' | null>(null);
  const c = invitation.campaign;
  const isFreeEvent = c?.campaignType === 'OPEN_EVENT' || (!c?.budgetMin && !c?.budgetMax);
  const isPaidInvite = !isFreeEvent;

  async function respond(status: 'ACCEPTED' | 'DECLINED') {
    if (status === 'DECLINED' && !window.confirm(t('applications.invitedConfirmDecline'))) return;
    setSubmitting(status);
    try {
      const updated = await respondToInvitation(invitation.id, status);
      onChange(updated);
      toast.success(status === 'ACCEPTED' ? t('applications.invitedAccepted') : t('applications.invitedDeclined'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('applications.invitedRespondFailed'));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <Link to={`/creator/events/${invitation.campaignId}`} className="flex items-start gap-3">
        <Avatar name={c?.business?.businessName ?? 'Business'} src={c?.business?.logoUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-ink-soft">{c?.business?.businessName}</p>
          <p className="mt-0.5 line-clamp-2 text-[14px] font-semibold text-ink">{c?.title ?? 'Campaign'}</p>
        </div>
        {isPaidInvite && invitation.hasApplied ? (
          <StatusBadge label={t('applications.invitedApplied')} tone="success" />
        ) : !isPaidInvite && invitation.status !== 'PENDING' ? (
          <StatusBadge
            label={invitation.status === 'ACCEPTED' ? t('applications.invitedStatusAccepted') : t('applications.invitedStatusDeclined')}
            tone={invitation.status === 'ACCEPTED' ? 'success' : 'danger'}
          />
        ) : null}
      </Link>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          {isFreeEvent ? <Gift size={12} /> : <Wallet2 size={12} />}
          {isFreeEvent
            ? t('applications.invitedFreeEvent')
            : t('applications.invitedBudgetRange', {
                min: (c?.budgetMin ?? 0).toLocaleString(),
                max: (c?.budgetMax ?? 0).toLocaleString(),
              })}
        </span>
        {c?.deadline && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock size={12} />
            {t('applications.invitedDeadline', {
              date: new Date(c.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            })}
          </span>
        )}
      </div>

      {!isPaidInvite && invitation.status === 'PENDING' && (
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" size="sm" fullWidth loading={submitting === 'DECLINED'} onClick={() => respond('DECLINED')}>
            {t('applications.invitedDecline')}
          </Button>
          <Button size="sm" fullWidth loading={submitting === 'ACCEPTED'} onClick={() => respond('ACCEPTED')}>
            {t('applications.invitedAccept')}
          </Button>
        </div>
      )}

      {isPaidInvite && !invitation.hasApplied && (
        <div className="mt-3">
          <Link to={`/creator/events/${invitation.campaignId}`}>
            <Button size="sm" fullWidth>
              {t('applications.invitedApplyNow')}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
