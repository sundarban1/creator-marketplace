import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AtSign, Lock } from 'lucide-react';
import { useAppAuth } from './AppAuthContext';
import { toIdentifier } from './identifier';
import { useT } from '../i18n';
import { paths } from '../routes';
import { ApiError } from '../lib/apiClient';
import { AuthShell } from './AuthShell';
import { postAuthPath } from './postAuthNav';
import { SocialAuth } from './SocialAuth';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { useFormValidation, useValidators } from '../lib/validation';
import { IdentifierField } from './IdentifierField';
import { Alert } from '../ui/Alert';

export function LoginScreen() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithPassword } = useAppAuth();

  const state = location.state as { from?: { pathname?: string; search?: string }; flash?: string } | null;
  // Keep the query string too — email/notification deep links carry it
  // (e.g. /business/deliverables?campaign=…).
  const from = state?.from?.pathname ? state.from.pathname + (state.from.search ?? '') : undefined;
  const flash = state?.flash;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [needsVerify, setNeedsVerify] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const v = useValidators();
  const form = useFormValidation(
    { identifier: toIdentifier(identifier), password },
    { identifier: v.required(t('auth.identifierRequired')), password: v.required(t('auth.passwordRequired')) },
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setNeedsVerify(false);
    if (!form.validate()) return;
    const id = toIdentifier(identifier)!;

    setSubmitting(true);
    try {
      const user = await loginWithPassword(id, password);
      navigate(from && from.startsWith('/') ? from : await postAuthPath(user), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        // Backend blocks login until the account is verified — and has already
        // re-issued an OTP. Offer a way straight to the code screen.
        setNeedsVerify(true);
        setError(t('auth.verifyBeforeLogin'));
      } else {
        setError(err instanceof Error ? err.message : t('common.somethingWrong'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={t('auth.signInTitle')}
      subtitle={t('auth.signInSubtitle')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link to={paths.signup} className="font-semibold text-brand hover:underline">
            {t('auth.createOne')}
          </Link>
        </>
      }
    >
      <form ref={form.formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
        {flash && !error && <Alert tone="success">{flash}</Alert>}

        <IdentifierField
          label={t('auth.emailOrPhone')}
          icon={<AtSign />}
          placeholder={t('auth.emailOrPhonePlaceholder')}
          autoComplete="username"
          inputMode="email"
          value={identifier}
          onValueChange={setIdentifier}
          error={form.error('identifier')}
        />

        <TextField
          label={t('auth.password')}
          type="password"
          icon={<Lock />}
          placeholder={t('auth.passwordPlaceholder')}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={form.error('password')}
          labelAccessory={
            <Link
              to={paths.forgotPassword}
              className="text-[13px] font-semibold text-brand hover:underline"
            >
              {t('auth.forgotPassword')}
            </Link>
          }
        />

        {error && (
          <Alert tone="error">
            <span>
              {error}
              {needsVerify && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="font-semibold underline"
                    onClick={() =>
                      navigate(paths.verify, { state: { identifier: toIdentifier(identifier) } })
                    }
                  >
                    {t('auth.enterCodeInstead')}
                  </button>
                </>
              )}
            </span>
          </Alert>
        )}

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {t('auth.signInCta')}
        </Button>
      </form>

      <SocialAuth onError={setError} />
    </AuthShell>
  );
}
