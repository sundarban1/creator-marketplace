import { useEffect, useRef, useState } from 'react';
import { Ban, Flag, LockOpen, MoreHorizontal } from 'lucide-react';
import { useT } from '../i18n';
import { blocksApi } from '../api/safety';
import type { ReportTargetType } from '../api/report';
import { publishLive } from '../lib/liveUpdates';
import { confirmDialog } from './confirmDialog';
import { ReportDialog } from './ReportButton';
import { useToast } from './Toast';

/**
 * ⋯ overflow on user-generated content: Report (always) + Block / Unblock
 * when `block` is given (profiles, organizers). Blocking is server-enforced
 * and immediate; `onBlocked` lets the page leave content that is now hidden
 * (the profile/event itself 404s for a blocked viewer).
 */
export function SafetyMenu({
  report,
  block,
  onBlocked,
}: {
  report: { type: ReportTargetType; id: string };
  block?: { userId: string; name: string; source?: 'profile' | 'event' | 'competition' };
  onBlocked?: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState<boolean | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  // Block state is only needed once the menu opens — no request on page load.
  useEffect(() => {
    if (!open || !block || blockedByMe !== null) return;
    let cancelled = false;
    blocksApi.status(block.userId).then((s) => { if (!cancelled) setBlockedByMe(s.blockedByMe); }).catch(() => {});
    return () => { cancelled = true; };
  }, [open, block, blockedByMe]);

  async function toggleBlock() {
    if (!block) return;
    setOpen(false);
    if (blockedByMe) {
      try {
        await blocksApi.unblock(block.userId);
        setBlockedByMe(false);
        publishLive('campaigns', 'conversations');
        toast.success(t('safety.unblocked', { name: block.name }));
      } catch { toast.error(t('safety.blockFailed')); }
      return;
    }
    let failed = false;
    const ok = await confirmDialog({
      title: t('safety.blockTitle', { name: block.name }),
      message: t('safety.blockBody'),
      confirmLabel: t('safety.blockConfirm'),
      tone: 'danger',
      action: () => blocksApi.block(block.userId, block.source ?? 'profile').catch((e) => { failed = true; throw e; }),
    });
    if (!ok || failed) return;
    setBlockedByMe(true);
    publishLive('campaigns', 'conversations');
    toast.success(t('safety.blocked', { name: block.name }));
    onBlocked?.();
  }

  const item = 'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-medium hover:bg-surface-dim';
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('safety.moreOptions')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-line-strong text-ink-soft hover:text-ink"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-xl">
          <button type="button" role="menuitem" className={`${item} text-ink`} onClick={() => { setOpen(false); setReporting(true); }}>
            <Flag size={15} /> {t('safety.report')}
          </button>
          {block && (
            <button type="button" role="menuitem" className={`${item} ${blockedByMe ? 'text-ink' : 'text-danger'}`} onClick={toggleBlock} disabled={blockedByMe === null}>
              {blockedByMe ? <LockOpen size={15} /> : <Ban size={15} />} {blockedByMe ? t('safety.unblock') : t('safety.block')}
            </button>
          )}
        </div>
      )}
      <ReportDialog open={reporting} onClose={() => setReporting(false)} targetType={report.type} targetId={report.id} />
    </div>
  );
}
