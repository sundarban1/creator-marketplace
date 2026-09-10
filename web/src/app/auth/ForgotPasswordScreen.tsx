import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AtSign, Lock } from 'lucide-react';
import { useAppAuth } from './AppAuthContext';
import { toIdentifier, identifierTarget } from './identifier';
import { useT } from '../i18n';
import { paths } from '../routes';
import { AuthShell } from './AuthShell';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Alert } from '../ui/Alert';
import { OtpInput } from '../ui/OtpInput';
import type { Identifier } from '../api/auth';

export function ForgotPasswordScreen() {
  const t = useT();
  const navigate = useNavigate();
  const { forgotPassword, verifyResetOtp, resetPassword } = useAppAuth();

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [identifier, setIdentifier] = useState('');
  const [resolvedId, setResolvedId] = useState<Identifier | null>(null);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setError('');
    const id = toIdentifier(identifier);
    if (!id) return setError(t('auth.identifierRequired'));

    setSubmitting(true);
    try {
      await forgotPassword(id);
      setResolvedId(id);
      setStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (code.length !== 6) return setError(t('auth.codeRequired'));
    if (!newPassword) return setError(t('auth.passwordRequired'));

    setSubmitting(true);
    try {
      const token = await verifyResetOtp(resolvedId!, code);
      await resetPassword(token, newPassword);
      navigate(paths.login, { replace: true, state: { flash: t('auth.resetDone') } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={t('auth.forgotTitle')}
      subtitle={
        step === 'request'
          ? t('auth.forgotSubtitle')
          : t(resolvedId && 'email' in resolvedId ? 'auth.verifySubtitleEmail' : 'auth.verifySubtitlePhone', {
              target: resolvedId ? identifierTarget(resolvedId) : '',
            })
      }
      footer={
        <Link to={paths.login} className="font-semibold text-brand hover:underline">
          {t('auth.signIn')}
        </Link>
      }
    >
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {step === 'request' ? (
        <form onSubmit={handleRequest} noValidate className="space-y-4">
          <TextField
            label={t('auth.emailOrPhone')}
            icon={<AtSign />}
            autoComplete="username"
            inputMode="email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <Button type="submit" size="lg" fullWidth loading={submitting}>
            {t('auth.sendCode')}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleReset} noValidate className="space-y-5">
          <OtpInput value={code} onChange={setCode} invalid={Boolean(error)} />
          <TextField
            label={t('auth.newPassword')}
            type="password"
            icon={<Lock />}
            autoComplete="new-password"
            hint={t('auth.passwordHint')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button type="submit" size="lg" fullWidth loading={submitting}>
            {t('auth.resetCta')}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
