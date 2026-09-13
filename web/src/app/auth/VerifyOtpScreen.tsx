import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppAuth } from './AppAuthContext';
import { identifierTarget } from './identifier';
import { postAuthPath } from './postAuthNav';
import { useT } from '../i18n';
import { paths } from '../routes';
import { useCountdown } from '../lib/useCountdown';
import { AuthShell } from './AuthShell';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { OtpInput } from '../ui/OtpInput';
import type { Identifier } from '../api/auth';

const RESEND_COOLDOWN = 30;

export function VerifyOtpScreen() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOtp, resendOtp } = useAppAuth();

  const identifier = (location.state as { identifier?: Identifier } | null)?.identifier ?? null;

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { remaining, start } = useCountdown();

  useEffect(() => {
    start(RESEND_COOLDOWN);
  }, [start]);

  // Reached directly (e.g. refresh) with no identifier in history state.
  if (!identifier) return <Navigate to={paths.login} replace />;

  const isEmail = 'email' in identifier;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (code.length !== 6) return setError(t('auth.codeRequired'));

    setSubmitting(true);
    try {
      const user = await verifyOtp(identifier!, code);
      navigate(await postAuthPath(user), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError('');
    setNotice('');
    try {
      await resendOtp(identifier!);
      setNotice(t('auth.codeResent'));
      start(RESEND_COOLDOWN);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    }
  }

  return (
    <AuthShell
      title={t('auth.verifyTitle')}
      subtitle={t(isEmail ? 'auth.verifySubtitleEmail' : 'auth.verifySubtitlePhone', {
        target: identifierTarget(identifier),
      })}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {notice && !error && <Alert tone="success">{notice}</Alert>}

        <OtpInput value={code} onChange={setCode} invalid={Boolean(error)} />

        {isEmail && (
          <p className="text-center text-[13px] text-ink-soft">{t('auth.checkSpamEmail')}</p>
        )}

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {t('auth.verifyCta')}
        </Button>

        <div className="text-center text-[13px] text-ink-soft">
          {remaining > 0 ? (
            t('auth.resendIn', { seconds: remaining })
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="font-semibold text-brand hover:underline"
            >
              {t('auth.resendCode')}
            </button>
          )}
        </div>
      </form>
    </AuthShell>
  );
}
