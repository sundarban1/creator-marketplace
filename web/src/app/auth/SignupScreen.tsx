import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AtSign, Building2, Check, Circle, Lock, User } from 'lucide-react';
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
import { useFormValidation, useValidators } from '../lib/validation';
import { IdentifierField } from './IdentifierField';
import { Alert } from '../ui/Alert';
import { SegmentedControl } from '../ui/SegmentedControl';
import { cn } from '../ui/cn';

type Role = 'CREATOR' | 'BUSINESS';

// Mirrors the backend password policy (and mobile's PW_RULES in login.tsx).
const PW_RULES = [
  { key: 'auth.pwRule8Chars', test: (p: string) => p.length >= 8 },
  { key: 'auth.pwRuleUppercase', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'auth.pwRuleNumber', test: (p: string) => /[0-9]/.test(p) },
] as const;

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

  const v = useValidators();
  const form = useFormValidation(
    { identifier: toIdentifier(identifier), password },
    { identifier: v.required(t('auth.identifierRequired')), password: v.required(t('auth.passwordRequired')) },
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.validate()) return;
    const id = toIdentifier(identifier)!;

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
          <form ref={form.formRef} onSubmit={handleSubmit} noValidate className="space-y-4">

            {creatorEnabled && businessEnabled ? (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-ink">{t('auth.chooseRoleTitle')}</p>
                <SegmentedControl<Role>
                  ariaLabel={t('auth.chooseRoleTitle')}
                  variant="chips"
                  value={role}
                  onChange={setSelectedRole}
                  options={[
                    {
                      value: 'CREATOR',
                      label: t('roles.creator'),
                      icon: <User size={16} />,
                    },
                    {
                      value: 'BUSINESS',
                      label: t('roles.business'),
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={form.error('password')}
            />

            <ul className="-mt-2 flex flex-wrap gap-2" aria-label={t('auth.passwordHint')}>
              {PW_RULES.map((rule) => {
                const ok = rule.test(password);
                return (
                  <li
                    key={rule.key}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors',
                      ok
                        ? 'border-success/40 bg-success/[0.12] text-success'
                        : 'border-line-strong bg-surface-dim text-ink-soft',
                    )}
                  >
                    {ok ? <Check size={12} strokeWidth={3} aria-hidden /> : <Circle size={12} aria-hidden />}
                    {t(rule.key)}
                  </li>
                );
              })}
            </ul>

            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" size="lg" fullWidth loading={submitting}>
              {t('auth.signUpCta')}
            </Button>

          </form>

          <SocialAuth onError={setError} />

          <p className="mt-5 text-center text-[12px] leading-relaxed text-ink-soft">
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
        </>
      )}
    </AuthShell>
  );
}
