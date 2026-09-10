import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AtSign, Lock } from 'lucide-react';
import { useAppAuth } from './AppAuthContext';
import { toIdentifier } from './identifier';
import { useT } from '../i18n';
import { paths, roleHome } from '../routes';
import { ApiError } from '../lib/apiClient';
import { AuthShell } from './AuthShell';
import { SocialAuth } from './SocialAuth';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Alert } from '../ui/Alert';

export function LoginScreen() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithPassword } = useAppAuth();

  const state = location.state as { from?: { pathname?: string }; flash?: string } | null;
  const from = state?.from?.pathname;
  const flash = state?.flash;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [needsVerify, setNeedsVerify] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setNeedsVerify(false);

    const id = toIdentifier(identifier);
    if (!id) return setError(t('auth.identifierRequired'));
    if (!password) return setError(t('auth.passwordRequired'));

    setSubmitting(true);
    try {
      const user = await loginWithPassword(id, password);
      navigate(from && from.startsWith('/') ? from : roleHome(user.role), { replace: true });
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
      <SocialAuth onError={setError} />

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {flash && !error && <Alert tone="success">{flash}</Alert>}
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

        <TextField
          label={t('auth.emailOrPhone')}
          icon={<AtSign />}
          autoComplete="username"
          inputMode="email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />

        <TextField
          label={t('auth.password')}
          type="password"
          icon={<Lock />}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          labelAccessory={
            <Link
              to={paths.forgotPassword}
              className="text-[13px] font-semibold text-brand hover:underline"
            >
              {t('auth.forgotPassword')}
            </Link>
          }
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {t('auth.signInCta')}
        </Button>
      </form>
    </AuthShell>
  );
}
