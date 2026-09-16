import { useState } from 'react';
import { CheckCircle2, Mail, Phone as PhoneIcon } from 'lucide-react';
import { useT } from '../i18n';
import { useAppAuth } from '../auth/AppAuthContext';
import { looksLikeNepaliPhone } from '../auth/identifier';
import { isPhonePlaceholderEmail } from '../lib/identity';
import { useCountdown } from '../lib/useCountdown';
import { requestEmailOtp, requestPhoneOtp, verifyEmailOtp, verifyPhoneOtp } from '../api/auth';
import { useToast } from './Toast';
import { Card, CardHeader } from './Card';
import { Button } from './Button';
import { TextField } from './TextField';
import { OtpInput } from './OtpInput';

const RESEND_COOLDOWN = 30;

function VerifiedPill({ label }: { label: string }) {
  return (
    <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[12px] font-semibold text-success">
      <CheckCircle2 size={13} />
      {label}
    </span>
  );
}

function VerifyButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-violet/30 px-3 py-1.5 text-[12.5px] font-semibold text-violet-dark hover:bg-violet/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
    </button>
  );
}

function OtpPanel({
  target,
  code,
  onCode,
  error,
  busy,
  remaining,
  onVerify,
  onResend,
}: {
  target: string;
  code: string;
  onCode: (v: string) => void;
  error: string;
  busy: boolean;
  remaining: number;
  onVerify: () => void;
  onResend: () => void;
}) {
  const t = useT();
  return (
    <div className="mt-3 rounded-xl bg-surface-dim p-3.5">
      <p className="mb-2.5 text-[12.5px] text-ink-soft">{t('contactVerification.codeSentTo', { target })}</p>
      <OtpInput value={code} onChange={onCode} invalid={Boolean(error)} autoFocus={false} />
      {error && <p className="mt-2 text-[12.5px] font-medium text-danger">{error}</p>}
      <div className="mt-3 flex items-center justify-between gap-3">
        <Button size="sm" onClick={onVerify} loading={busy} disabled={code.length !== 6}>
          {t('contactVerification.verifyCta')}
        </Button>
        {remaining > 0 ? (
          <span className="text-[12.5px] text-ink-soft">{t('auth.resendIn', { seconds: remaining })}</span>
        ) : (
          <button type="button" onClick={onResend} className="text-[12.5px] font-semibold text-brand hover:underline">
            {t('auth.resendCode')}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Phone + email verification card — shared by CreatorVerificationPage and
 * BusinessVerificationPage. Reads/patches the session user directly (not a
 * role-specific profile), since isEmailVerified/isPhoneVerified live on
 * `AuthUser`, not CreatorProfile/BusinessProfile.
 */
export function ContactVerificationCard() {
  const t = useT();
  const toast = useToast();
  const { user, updateUser } = useAppAuth();

  const hasRealEmail = Boolean(user?.email) && !isPhonePlaceholderEmail(user?.email);

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState('');
  const emailCountdown = useCountdown();

  const [phoneStep, setPhoneStep] = useState<'closed' | 'input' | 'otp'>('closed');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone ?? '');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const phoneCountdown = useCountdown();

  async function startEmailVerification() {
    if (!user?.email || isPhonePlaceholderEmail(user.email)) return;
    setEmailBusy(true);
    setEmailError('');
    try {
      await requestEmailOtp(user.email);
      setEmailOpen(true);
      emailCountdown.start(RESEND_COOLDOWN);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setEmailBusy(false);
    }
  }

  async function resendEmailOtp() {
    if (!user?.email || isPhonePlaceholderEmail(user.email)) return;
    setEmailError('');
    try {
      await requestEmailOtp(user.email);
      emailCountdown.start(RESEND_COOLDOWN);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : t('common.somethingWrong'));
    }
  }

  async function submitEmailOtp() {
    if (!user?.email || isPhonePlaceholderEmail(user.email) || emailCode.length !== 6) return;
    setEmailBusy(true);
    setEmailError('');
    try {
      await verifyEmailOtp(user.email, emailCode);
      updateUser({ isEmailVerified: true });
      setEmailOpen(false);
      setEmailCode('');
      toast.success(t('contactVerification.emailVerified'));
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : t('contactVerification.invalidCode'));
    } finally {
      setEmailBusy(false);
    }
  }

  async function sendPhoneOtp() {
    if (!looksLikeNepaliPhone(phoneNumber)) {
      setPhoneError(t('contactVerification.phoneInvalid'));
      return;
    }
    setPhoneBusy(true);
    setPhoneError('');
    try {
      await requestPhoneOtp(phoneNumber.trim());
      setPhoneStep('otp');
      phoneCountdown.start(RESEND_COOLDOWN);
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setPhoneBusy(false);
    }
  }

  async function resendPhoneOtp() {
    setPhoneError('');
    try {
      await requestPhoneOtp(phoneNumber.trim());
      phoneCountdown.start(RESEND_COOLDOWN);
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : t('common.somethingWrong'));
    }
  }

  async function submitPhoneOtp() {
    if (phoneCode.length !== 6) return;
    setPhoneBusy(true);
    setPhoneError('');
    try {
      await verifyPhoneOtp(phoneNumber.trim(), phoneCode);
      updateUser({ phone: phoneNumber.trim(), isPhoneVerified: true });
      setPhoneStep('closed');
      setPhoneCode('');
      toast.success(t('contactVerification.phoneVerified'));
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : t('contactVerification.invalidCode'));
    } finally {
      setPhoneBusy(false);
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader title={t('contactVerification.heading')} />
      <div className="divide-y divide-line">
        <div className="py-3 first:pt-0">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet/10 text-violet">
              <Mail size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-ink">{t('contactVerification.emailLabel')}</p>
              <p className="mt-0.5 truncate text-[12px] text-ink-soft">
                {hasRealEmail ? user?.email : t('contactVerification.noEmail')}
              </p>
            </div>
            {user?.isEmailVerified ? (
              <VerifiedPill label={t('contactVerification.verifiedBadge')} />
            ) : (
              hasRealEmail && (
                <VerifyButton
                  label={t('contactVerification.verifyButton')}
                  onClick={startEmailVerification}
                  disabled={emailBusy}
                />
              )
            )}
          </div>
          {emailOpen && hasRealEmail && !user?.isEmailVerified && (
            <OtpPanel
              target={user?.email ?? ''}
              code={emailCode}
              onCode={setEmailCode}
              error={emailError}
              busy={emailBusy}
              remaining={emailCountdown.remaining}
              onVerify={submitEmailOtp}
              onResend={resendEmailOtp}
            />
          )}
        </div>

        <div className="py-3 last:pb-0">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet/10 text-violet">
              <PhoneIcon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-ink">{t('contactVerification.phoneLabel')}</p>
              <p className="mt-0.5 truncate text-[12px] text-ink-soft">{user?.phone ?? t('contactVerification.noPhone')}</p>
            </div>
            {user?.isPhoneVerified ? (
              <VerifiedPill label={t('contactVerification.verifiedBadge')} />
            ) : (
              <VerifyButton
                label={t('contactVerification.verifyButton')}
                onClick={() => setPhoneStep(phoneStep === 'closed' ? 'input' : 'closed')}
              />
            )}
          </div>
          {phoneStep === 'input' && !user?.isPhoneVerified && (
            <div className="mt-3 rounded-xl bg-surface-dim p-3.5">
              <TextField
                label={t('contactVerification.phoneLabel')}
                type="tel"
                inputMode="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                error={phoneError || undefined}
                placeholder="98XXXXXXXX"
              />
              <Button size="sm" className="mt-3" onClick={sendPhoneOtp} loading={phoneBusy}>
                {t('contactVerification.sendCodeCta')}
              </Button>
            </div>
          )}
          {phoneStep === 'otp' && !user?.isPhoneVerified && (
            <OtpPanel
              target={phoneNumber}
              code={phoneCode}
              onCode={setPhoneCode}
              error={phoneError}
              busy={phoneBusy}
              remaining={phoneCountdown.remaining}
              onVerify={submitPhoneOtp}
              onResend={resendPhoneOtp}
            />
          )}
        </div>
      </div>
    </Card>
  );
}
