import { useT } from '../i18n';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { GoogleAuthModalKind } from '../lib/googleAuth';

/**
 * The single reusable error modal for every Google Sign-In failure mode
 * (spec §7) — popup blocked, cancelled, browser/session unavailable, timed
 * out, offline, or a backend error. Built on the app's existing generic
 * `Modal` (focus trap, Esc, backdrop close already handled there).
 */
export function GoogleAuthErrorModal({
  kind,
  detail,
  onRetry,
  onClose,
  retrying,
}: {
  kind: GoogleAuthModalKind | null;
  /** For `server` errors, the backend's own (already user-safe) message, shown instead of the generic copy. */
  detail?: string;
  onRetry: () => void;
  onClose: () => void;
  retrying: boolean;
}) {
  const t = useT();
  if (!kind) return null;

  const copy: Record<GoogleAuthModalKind, { title: string; body: string }> = {
    popup_blocked: { title: t('auth.googlePopupBlockedTitle'), body: t('auth.googlePopupBlockedBody') },
    cancelled: { title: t('auth.googleCancelledTitle'), body: t('auth.googleCancelledBody') },
    unavailable: { title: t('auth.googleUnavailableTitle'), body: t('auth.googleUnavailableBody') },
    timeout: { title: t('auth.googleTimeoutTitle'), body: t('auth.googleTimeoutBody') },
    network: { title: t('auth.googleNetworkTitle'), body: t('auth.googleNetworkBody') },
    server: { title: t('auth.googleServerTitle'), body: detail || t('auth.googleServerBody') },
  };

  const { title, body } = copy[kind];

  return (
    <Modal open onClose={onClose} title={title}>
      <p className="text-[14px] leading-relaxed text-ink-soft">{body}</p>
      <div className="mt-5 flex gap-3">
        <Button variant="secondary" fullWidth onClick={onClose} disabled={retrying}>
          {t('common.cancel')}
        </Button>
        <Button fullWidth loading={retrying} onClick={onRetry}>
          {t('common.retry')}
        </Button>
      </div>
    </Modal>
  );
}
