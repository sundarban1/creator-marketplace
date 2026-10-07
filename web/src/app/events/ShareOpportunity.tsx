import { useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link2, MessageSquare, Share2 } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa6';
import { useT } from '../i18n';
import { useAppAuth } from '../auth/AppAuthContext';
import { createOpportunityShare, type SharePlatform } from '../api/opportunityShare';
import { isMobileWebBrowser } from '../lib/platform';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { cn } from '../ui/cn';

/**
 * Share Opportunity — lets a creator pass an event/campaign to other creators
 * over WhatsApp, SMS, a copied link or the browser's native share sheet. This
 * is "I found something you might like", not a referral: no code, no reward.
 *
 * Renders nothing unless a creator is signed in and the opportunity is open.
 * Links are minted lazily per platform (the backend reuses one per
 * creator × opportunity × platform) and cached for the life of the button.
 */
export function ShareOpportunityButton({
  campaignId,
  isOpen = true,
  variant,
  className,
}: {
  campaignId: string;
  /** False once the opportunity stops accepting applications — nothing to share then. */
  isOpen?: boolean;
  /** `icon` = subtle square on a card; `button` = secondary button beside the CTA. */
  variant: 'icon' | 'button';
  className?: string;
}) {
  const t = useT();
  const { user } = useAppAuth();
  const [open, setOpen] = useState(false);

  if (user?.role !== 'CREATOR' || !isOpen) return null;

  const openSheet = (e: MouseEvent) => {
    // On a card this sits inside the card-wide <Link> — don't navigate.
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={openSheet}
          aria-label={t('shareOpportunity.button')}
          title={t('shareOpportunity.button')}
          className={cn(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft',
            'transition-colors hover:bg-ink/[0.05] hover:text-violet',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40',
            className,
          )}
        >
          <Share2 size={15} />
        </button>
      ) : (
        <Button variant="secondary" size="lg" onClick={openSheet} className={className}>
          <Share2 size={16} />
          {t('shareOpportunity.button')}
        </Button>
      )}

      {open &&
        createPortal(
          // Portalled out of any card <Link>, and React events stopped here so
          // they don't bubble (through the portal) back into it either.
          <div onClick={(e) => e.stopPropagation()}>
            <ShareOpportunitySheet campaignId={campaignId} onClose={() => setOpen(false)} />
          </div>,
          document.body,
        )}
    </>
  );
}

function ShareOpportunitySheet({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const links = useRef(new Map<SharePlatform, Promise<string>>());
  const [busy, setBusy] = useState<SharePlatform | null>(null);

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const canSms = isMobileWebBrowser();

  const linkFor = (platform: SharePlatform): Promise<string> => {
    let p = links.current.get(platform);
    if (!p) {
      p = createOpportunityShare(campaignId, platform).then((r) => r.shareUrl);
      // A failed mint shouldn't poison the cache for the next tap.
      p.catch(() => links.current.delete(platform));
      links.current.set(platform, p);
    }
    return p;
  };

  const message = (link: string) => t('shareOpportunity.message', { link });

  async function run(platform: SharePlatform, action: () => Promise<void>) {
    setBusy(platform);
    try {
      await action();
    } catch (err) {
      // The user dismissing the native share sheet isn't an error.
      if (!(err instanceof DOMException && err.name === 'AbortError')) toast.error(t('shareOpportunity.failed'));
    } finally {
      setBusy(null);
    }
  }

  const shareWhatsApp = () =>
    run('WHATSAPP', async () => {
      // Open the tab synchronously, inside the click, so popup blockers allow
      // it — then point it at WhatsApp once the link is minted.
      const win = window.open('', '_blank');
      try {
        const link = await linkFor('WHATSAPP');
        const url = `https://wa.me/?text=${encodeURIComponent(message(link))}`;
        if (win) win.location.href = url;
        else window.location.href = url;
      } catch (err) {
        win?.close();
        throw err;
      }
    });

  const shareSms = () =>
    run('SMS', async () => {
      const link = await linkFor('SMS');
      // `?&body=` is the form both iOS and Android Messages accept.
      window.location.href = `sms:?&body=${encodeURIComponent(message(link))}`;
    });

  const copyLink = () =>
    run('COPY_LINK', async () => {
      const pending = linkFor('COPY_LINK');
      // Safari only allows clipboard writes inside the click; a ClipboardItem
      // backed by a promise keeps that gesture while the link is minted.
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'text/plain': pending.then((l) => new Blob([l], { type: 'text/plain' })) }),
          ]);
          toast.success(t('shareOpportunity.linkCopied'), 2500);
          return;
        } catch {
          /* fall through to writeText */
        }
      }
      await navigator.clipboard.writeText(await pending);
      toast.success(t('shareOpportunity.linkCopied'), 2500);
    });

  const nativeShare = () =>
    run('NATIVE_SHARE', async () => {
      const link = await linkFor('NATIVE_SHARE');
      await navigator.share({ text: message(link) });
    });

  return (
    <Modal open onClose={onClose} title={t('shareOpportunity.title')}>
      <p className="text-[14px] leading-relaxed text-ink-soft">{t('shareOpportunity.description')}</p>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <ShareTile
          label={t('shareOpportunity.whatsapp')}
          icon={<FaWhatsapp size={20} />}
          tone="text-[#25D366] bg-[#25D366]/10"
          loading={busy === 'WHATSAPP'}
          onClick={shareWhatsApp}
        />
        {canSms && (
          <ShareTile
            label={t('shareOpportunity.sms')}
            icon={<MessageSquare size={19} />}
            tone="text-violet bg-violet/10"
            loading={busy === 'SMS'}
            onClick={shareSms}
          />
        )}
        <ShareTile
          label={t('shareOpportunity.copyLink')}
          icon={<Link2 size={19} />}
          tone="text-ink bg-ink/[0.06]"
          loading={busy === 'COPY_LINK'}
          onClick={copyLink}
        />
        {canNativeShare && (
          <ShareTile
            label={t('shareOpportunity.more')}
            icon={<Share2 size={18} />}
            tone="text-ink bg-ink/[0.06]"
            loading={busy === 'NATIVE_SHARE'}
            onClick={nativeShare}
          />
        )}
      </div>
    </Modal>
  );
}

function ShareTile({
  label,
  icon,
  tone,
  loading,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  tone: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading || undefined}
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface px-2 py-3.5',
        'transition-colors hover:border-violet/30 hover:bg-surface-dim',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40',
        'disabled:cursor-wait disabled:opacity-60',
      )}
    >
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-full', tone)}>{icon}</span>
      <span className="text-[13px] font-semibold text-ink">{label}</span>
    </button>
  );
}
