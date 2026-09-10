import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AtSign, Lock, User } from 'lucide-react';
import { useAppAuth } from './AppAuthContext';
import { toIdentifier } from './identifier';
import { useT } from '../i18n';
import { paths } from '../routes';
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

  const [role, setRole] = useState<Role>('CREATOR');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError(t('auth.nameRequired'));
    const id = toIdentifier(identifier);
    if (!id) return setError(t('auth.identifierRequired'));
    if (!password) return setError(t('auth.passwordRequired'));

    setSubmitting(true);
    try {
      await register(id, {
        role,
        password,
        fullName: role === 'CREATOR' ? name.trim() : undefined,
        businessName: role === 'BUSINESS' ? name.trim() : undefined,
        referralCode: referralCode.trim() || undefined,
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
      <SocialAuth onError={setError} />

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink">{t('auth.chooseRoleTitle')}</p>
          <SegmentedControl<Role>
            ariaLabel={t('auth.chooseRoleTitle')}
            variant="cards"
            value={role}
            onChange={setRole}
            options={[
              { value: 'CREATOR', label: t('roles.creator'), description: t('auth.creatorRoleBlurb') },
              { value: 'BUSINESS', label: t('roles.business'), description: t('auth.businessRoleBlurb') },
            ]}
          />
        </div>

        <TextField
          label={role === 'BUSINESS' ? t('auth.businessName') : t('auth.fullName')}
          icon={<User />}
          autoComplete={role === 'BUSINESS' ? 'organization' : 'name'}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

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
          autoComplete="new-password"
          hint={t('auth.passwordHint')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <TextField
          label={`${t('auth.referralCode')} (${t('common.optional')})`}
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value)}
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {t('auth.signUpCta')}
        </Button>

        <p className="text-center text-[12px] leading-relaxed text-ink-soft">{t('auth.termsNotice')}</p>
      </form>
    </AuthShell>
  );
}
