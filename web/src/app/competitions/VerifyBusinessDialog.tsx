import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ShieldCheck } from 'lucide-react';
import { useT } from '../i18n';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { ApiError } from '../lib/apiClient';
import { fetchBusinessProfile } from '../api/business';
import { getSupportSiteInfo } from '../api/siteInfo';
import { buildMailtoUrl, buildWhatsAppUrl, SUPPORT_EMAIL_SUBJECT } from '../lib/supportContact';

/*
 * Paying competition winners yourself ("Pay winners directly") needs a
 * verified business — the backend enforces it on submit-for-review
 * (code BUSINESS_VERIFICATION_REQUIRED). This is the message shown instead of
 * submitting: verify (→ /business/verification) or, with no documents, ask
 * the Kolab admin to create the competition. Mirrors mobile's
 * features/business/competition/VerifyBusinessModal.tsx.
 */

export type VerifyGate = 'NOT_VERIFIED' | 'PENDING';

export const isVerificationRequiredError = (e: unknown) => e instanceof ApiError && e.code === 'BUSINESS_VERIFICATION_REQUIRED';

/**
 * Null when the business may submit; otherwise why not. Only "pay directly" is
 * gated, and only on a first submission — competitions already sent to review
 * before (`reviewRevision` > 0) are left alone, same as the server.
 */
export async function checkVerificationGate(method: string | null | undefined, reviewRevision = 0): Promise<VerifyGate | null> {
  if (method !== 'DIRECT' || reviewRevision > 0) return null;
  try {
    const p = await fetchBusinessProfile();
    if (p.isVerified || p.verificationStatus === 'VERIFIED') return null;
    return p.verificationStatus === 'PENDING' ? 'PENDING' : 'NOT_VERIFIED';
  } catch {
    return null; // can't tell — let the server decide
  }
}

export function VerifyBusinessDialog({ gate, draftSaved, onClose }: {
  gate: VerifyGate | null;
  /** Shown on the create flow, where the work was saved as a draft before this opened. */
  draftSaved?: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const [contactUrl, setContactUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!gate) return;
    let alive = true;
    getSupportSiteInfo()
      .then((info) => {
        if (!alive) return;
        const msg = t('comp.contactAdminMessage');
        setContactUrl(buildWhatsAppUrl(info.whatsapp || info.supportPhone, msg) ?? buildMailtoUrl(info.email, SUPPORT_EMAIL_SUBJECT, msg));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [gate, t]);

  const pending = gate === 'PENDING';
  return (
    <Modal
      open={!!gate}
      onClose={onClose}
      title={pending ? t('comp.verifyPendingTitle') : t('comp.verifyTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.close')}</Button>
          <Button onClick={() => { onClose(); navigate('/business/verification'); }}>
            <ShieldCheck size={16} aria-hidden /> {pending ? t('comp.verifyStatusCta') : t('comp.verifyCta')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Alert tone={pending ? 'progress' : 'info'}>{pending ? t('comp.verifyPendingBody') : t('comp.verifyBody')}</Alert>
        {draftSaved && <p className="text-[13px] text-ink-soft">{t('comp.verifyDraftSaved')}</p>}
        {!pending && (
          <div className="rounded-xl border border-line px-3.5 py-3">
            <p className="text-[13.5px] text-ink">{t('comp.verifyNoDocs')}</p>
            {contactUrl && (
              <a
                href={contactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-brand hover:underline"
              >
                <MessageCircle size={15} aria-hidden /> {t('comp.contactAdmin')}
              </a>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
