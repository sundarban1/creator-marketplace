import { Linking } from 'react-native';
import { router } from 'expo-router';
import { AppModal } from '@/components/AppModal';
import { useLanguage } from '@/context/LanguageContext';
import { ApiError } from '@/lib/api';
import { profileService } from '@/services/profile';
import { useSupportContacts } from '@/services/siteInfo';
import { buildMailtoUrl, buildWhatsAppUrl, SUPPORT_EMAIL_SUBJECT } from '@/utilities/supportContact';

/*
 * Paying competition winners yourself ("Pay winners directly") needs a
 * verified business — the backend enforces it on submit-for-review
 * (code BUSINESS_VERIFICATION_REQUIRED). This is the message shown instead of
 * submitting: verify (→ Settings › Verification) or, with no documents, ask
 * the Kolab admin to create the competition. Mirrors web's
 * competitions/VerifyBusinessDialog.tsx.
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
    const p = await profileService.getBusinessProfile();
    if (p.isVerified || p.verificationStatus === 'VERIFIED') return null;
    return p.verificationStatus === 'PENDING' ? 'PENDING' : 'NOT_VERIFIED';
  } catch {
    return null; // can't tell — let the server decide
  }
}

export function VerifyBusinessModal({ gate, draftSaved, onClose }: {
  gate: VerifyGate | null;
  /** The work was saved as a draft before this opened. */
  draftSaved?: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const contacts = useSupportContacts(!!gate);
  const msg = t('comp.contactAdminMessage');
  const contactUrl = contacts.data
    ? buildWhatsAppUrl(contacts.data.whatsapp || contacts.data.supportPhone, msg) ?? buildMailtoUrl(contacts.data.email, SUPPORT_EMAIL_SUBJECT, msg)
    : null;
  const pending = gate === 'PENDING';

  const body = [
    pending ? t('comp.verifyPendingBody') : t('comp.verifyBody'),
    draftSaved ? t('comp.verifyDraftSaved') : null,
    pending ? null : t('comp.verifyNoDocs'),
  ].filter(Boolean).join('\n\n');

  return (
    <AppModal
      visible={!!gate}
      type="info"
      icon="shield-alt"
      title={pending ? t('comp.verifyPendingTitle') : t('comp.verifyTitle')}
      body={body}
      confirmLabel={pending ? t('comp.verifyStatusCta') : t('comp.verifyCta')}
      onConfirm={() => {
        onClose();
        router.push('/(business)/settings?section=verification' as Parameters<typeof router.push>[0]);
      }}
      // Second button = "Contact admin" when a support contact is configured, otherwise a plain close.
      cancelLabel={!pending && contactUrl ? t('comp.contactAdmin') : t('common.close')}
      onCancelPress={() => {
        if (!pending && contactUrl) void Linking.openURL(contactUrl).catch(() => {});
        onClose();
      }}
      onCancel={onClose}
    />
  );
}
