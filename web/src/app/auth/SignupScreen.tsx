import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AtSign, Building2, Lock, User } from 'lucide-react';
import { useAppAuth } from './AppAuthContext';
import { toIdentifier } from './identifier';
import { useT } from '../i18n';
import { paths } from '../routes';
import { useAsync } from '../lib/useAsync';
import { getPlatformFlags } from '../api/platformFlags';
import { AuthShell } from './AuthShell';
import { SocialAuth } from './SocialAuth';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Alert } from '../ui/Alert';
import { SegmentedControl } from '../ui/SegmentedControl';

type Role = 'CREATOR' | 'BUSINESS';

export function SignupScreen() {
  const t = useT();
  const navigate = useNavigate();
  const { register } = useAppAuth();

  // Fails open (both true) while loading/on a fetch error — the backend is
  // the real gate (assertRegistrationEnabled); this is only proactive UX so a
  // closed role isn't offered in the first place. See platformFlags.ts.
  const flags = useAsync(() => getPlatformFlags(), []);
  const creatorEnabled = flags.data?.creatorRegistrationEnabled ?? true;
  const businessEnabled = flags.data?.businessRegistrationEnabled ?? true;
  const bothClosed = !creatorEnabled && !businessEnabled;

  // Lets a marketing-site CTA (e.g. "Post a Campaign") land a visitor with
  // the Business tab preselected via `/signup?role=business`, rather than
  // always defaulting to Creator regardless of which link they clicked.
  const [searchParams] = useSearchParams();
  const [selectedRole, setSelectedRole] = useState<Role>(
    searchParams.get('role')?.toLowerCase() === 'business' ? 'BUSINESS' : 'CREATOR',
  );
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Derived, not synced via an effect: falls back off whichever side is
  // closed once flags load, without a render round-trip.
  const role: Role =
    selectedRole === 'CREATOR' && !creatorEnabled && businessEnabled
      ? 'BUSINESS'
      : selectedRole === 'BUSINESS' && !businessEnabled && creatorEnabled
        ? 'CREATOR'
        : selectedRole;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const id = toIdentifier(identifier);
    if (!id) return setError(t('auth.identifierRequired'));
    if (!password) return setError(t('auth.passwordRequired'));

    setSubmitting(true);
    try {
      await register(id, {
        role,
        password,
      });
      navigate(paths.verify, { state: { identifier: id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={t('auth.signUpTitle')}
      subtitle={t('auth.signUpSubtitle')}
      footer={
        <>
          {t('auth.haveAccount')}{' '}
          <Link to={paths.login} className="font-semibold text-brand hover:underline">
            {t('auth.signIn')}
          </Link>
        </>
      }
    >
      {bothClosed ? (
        <Alert tone="warning">{t('auth.registrationClosedBoth')}</Alert>
      ) : (
        <>
          <SocialAuth onError={setError} />

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {error && <Alert tone="error">{error}</Alert>}

            {creatorEnabled && businessEnabled ? (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-ink">{t('auth.chooseRoleTitle')}</p>
                <SegmentedControl<Role>
                  ariaLabel={t('auth.chooseRoleTitle')}
                  variant="cards"
                  value={role}
                  onChange={setSelectedRole}
                  options={[
                    {
                      value: 'CREATOR',
                      label: t('roles.creator'),
                      description: t('auth.creatorRoleBlurb'),
                      icon: <User size={16} />,
                    },
                    {
                      value: 'BUSINESS',
                      label: t('roles.business'),
                      description: t('auth.businessRoleBlurb'),
                      icon: <Building2 size={16} />,
                      accent: 'success',
                    },
                  ]}
                />
              </div>
            ) : (
              <Alert tone="neutral">
                {t('auth.registrationOnlyRole', {
                  role: role === 'CREATOR' ? t('roles.creator') : t('roles.business'),
                })}
              </Alert>
            )}

            <TextField
              label={t('auth.emailOrPhone')}
              icon={<AtSign />}
              placeholder={t('auth.emailOrPhonePlaceholder')}
              autoComplete="username"
              inputMode="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />

            <TextField
              label={t('auth.password')}
              type="password"
              icon={<Lock />}
              placeholder={t('auth.passwordPlaceholder')}
              autoComplete="new-password"
              hint={t('auth.passwordHint')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button type="submit" size="lg" fullWidth loading={submitting}>
              {t('auth.signUpCta')}
            </Button>

            <p className="text-center text-[12px] leading-relaxed text-ink-soft">
              {t('auth.termsNoticePrefix')}
              <Link to="/terms" className="font-semibold text-brand hover:underline">
                {t('auth.termsLinkLabel')}
              </Link>
              {t('auth.termsNoticeMiddle')}
              <Link to="/privacy" className="font-semibold text-brand hover:underline">
                {t('auth.privacyLinkLabel')}
              </Link>
              {t('auth.termsNoticeSuffix')}
            </p>
          </form>
        </>
      )}
    </AuthShell>
  );
}
