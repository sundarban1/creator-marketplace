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
import { FieldError } from '../ui/FieldError';
import { useFormValidation, useValidators, type Rule } from '../lib/validation';
import { IdentifierField } from './IdentifierField';
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
  const v = useValidators();
  const requestForm = useFormValidation(
    { identifier: toIdentifier(identifier) },
    { identifier: v.required(t('auth.identifierRequired')) },
  );
  const codeRule: Rule<string> = (c) => (c.length === 6 ? undefined : t('auth.codeRequired'));
  const resetForm = useFormValidation(
    { code, newPassword },
    { code: codeRule, newPassword: v.required(t('auth.passwordRequired')) },
  );

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!requestForm.validate()) return;
    const id = toIdentifier(identifier)!;

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
    if (!resetForm.validate()) return;

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
      {step === 'request' ? (
        <form ref={requestForm.formRef} onSubmit={handleRequest} noValidate className="space-y-4">
          <IdentifierField
            label={t('auth.emailOrPhone')}
            icon={<AtSign />}
            placeholder={t('auth.emailOrPhonePlaceholder')}
            autoComplete="username"
            inputMode="email"
            value={identifier}
            onValueChange={setIdentifier}
            error={requestForm.error('identifier')}
          />
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" size="lg" fullWidth loading={submitting}>
            {t('auth.sendCode')}
          </Button>
        </form>
      ) : (
        <form ref={resetForm.formRef} onSubmit={handleReset} noValidate className="space-y-5">
          <div>
            <OtpInput value={code} onChange={setCode} invalid={Boolean(error || resetForm.error('code'))} />
            <FieldError message={resetForm.error('code')} />
          </div>
          <TextField
            label={t('auth.newPassword')}
            type="password"
            icon={<Lock />}
            autoComplete="new-password"
            hint={t('auth.passwordHint')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={resetForm.error('newPassword')}
          />
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" size="lg" fullWidth loading={submitting}>
            {t('auth.resetCta')}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
