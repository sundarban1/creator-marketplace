import { useState } from 'react';
import { Download, Share2, Ticket } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { downloadFile } from '../lib/downloadFile';
import { fetchEventInvitation } from '../api/campaigns';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { Skeleton } from '../ui/Skeleton';
import { useToast } from '../ui/Toast';

/**
 * "View My Invitation" — the accepted creator's dynamic free-event invitation
 * card (1080×1350 PNG rendered by the backend). Web twin of mobile's
 * event-invitation.tsx: save downloads the PNG, share uses the Web Share API
 * (with the image file where the browser supports it, else the link).
 */
export function EventInvitationButton({ campaignId, campaignTitle }: { campaignId: string; campaignTitle: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Ticket size={15} />
        {t('eventInvitation.title')}
      </Button>
      {open && <InvitationModal campaignId={campaignId} campaignTitle={campaignTitle} onClose={() => setOpen(false)} />}
    </>
  );
}

function InvitationModal({
  campaignId,
  campaignTitle,
  onClose,
}: {
  campaignId: string;
  campaignTitle: string;
  onClose: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const invitation = useAsync((s) => fetchEventInvitation(campaignId, s), [campaignId]);
  const [busy, setBusy] = useState(false);
  const fileName = `kolab-invitation-${campaignId}.png`;

  async function save() {
    if (!invitation.data) return;
    setBusy(true);
    try {
      await downloadFile(invitation.data.imageUrl, fileName);
      toast.success(t('eventInvitation.saved'));
    } catch {
      toast.error(t('eventInvitation.saveFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!invitation.data) return;
    const url = invitation.data.imageUrl;
    try {
      // Prefer sharing the image itself; fall back to the link, then clipboard.
      try {
        const blob = await (await fetch(url, { mode: 'cors' })).blob();
        const file = new File([blob], fileName, { type: blob.type || 'image/png' });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: campaignTitle });
          return;
        }
      } catch {
        /* CORS / unsupported — fall through to sharing the link */
      }
      if (navigator.share) {
        await navigator.share({ title: campaignTitle, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t('eventInvitation.linkCopied'));
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // user dismissed the sheet
      toast.error(t('eventInvitation.shareFailed'));
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('eventInvitation.title')}
      footer={
        invitation.data ? (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={share}>
              <Share2 size={14} />
              {t('eventInvitation.share')}
            </Button>
            <Button onClick={save} loading={busy}>
              <Download size={14} />
              {t('eventInvitation.save')}
            </Button>
          </div>
        ) : undefined
      }
    >
      {invitation.loading ? (
        <div className="space-y-2">
          <Skeleton className="mx-auto aspect-[4/5] w-full max-w-sm rounded-xl" />
          <p className="text-center text-[12.5px] text-ink-soft">{t('eventInvitation.preparing')}</p>
        </div>
      ) : invitation.error || !invitation.data ? (
        <EmptyState
          variant="error"
          size="sm"
          title={t('eventInvitation.errorTitle')}
          description={t('eventInvitation.errorBody')}
          action={{ label: t('eventInvitation.retry'), onClick: invitation.reload }}
        />
      ) : (
        <img
          src={invitation.data.imageUrl}
          alt={campaignTitle}
          className="mx-auto w-full max-w-sm rounded-xl border border-line"
          style={{ aspectRatio: `${invitation.data.width} / ${invitation.data.height}` }}
        />
      )}
    </Modal>
  );
}
