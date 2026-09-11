import { Link, useNavigate } from 'react-router-dom';
import { Globe, ShieldCheck, LogOut, UserX, Trash2 } from 'lucide-react';
import { useAppAuth } from '../auth/AppAuthContext';
import { useAppLanguage, useT, type Lang } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchAuthMethods, deactivateAccount, deleteAccount } from '../api/auth';
import { paths } from '../routes';
import { PageHeader } from '../ui/PageHeader';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../ui/cn';

const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ne', label: 'नेपाली' },
];

export function AccountSettingsPage() {
  const t = useT();
  const navigate = useNavigate();
  const { user, logout } = useAppAuth();
  const { language, setLanguage } = useAppLanguage();
  const methods = useAsync((s) => fetchAuthMethods(s), []);

  const m = methods.data;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={t('settings.eyebrow')} title={t('settings.title')} />

      {/* Language */}
      <Card>
        <CardHeader title={t('settings.languageHeading')} />
        <div className="flex gap-2">
          {LANGS.map((l) => (
            <button
              key={l.value}
              onClick={() => setLanguage(l.value)}
              aria-pressed={language === l.value}
              className={cn(
                'rounded-xl border px-4 py-2 text-[14px] font-semibold',
                language === l.value ? 'border-violet/40 bg-violet/[0.06] text-violet-dark' : 'border-line-strong text-ink-soft',
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-soft">
          <Globe size={12} />
          {t('settings.languageHint')}
        </p>
      </Card>

      {/* Login & security */}
      <Card className="mt-6">
        <CardHeader title={t('settings.securityHeading')} />
        {methods.loading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[14px] text-ink">
                <ShieldCheck size={16} className={m?.hasPassword ? 'text-success' : 'text-ink-soft'} />
                {m?.hasPassword ? t('settings.passwordSet') : t('settings.passwordNotSet')}
              </span>
              <Link to={paths.forgotPassword} className="text-[13px] font-semibold text-violet-dark hover:underline">
                {t('settings.resetPassword')}
              </Link>
            </div>

            {m && m.providers.length > 0 && (
              <div className="border-t border-line pt-3">
                <p className="mb-2 text-[13px] font-semibold text-ink">{t('settings.connectedAccounts')}</p>
                <ul className="space-y-1.5">
                  {m.providers.map((prov) => (
                    <li key={prov.provider} className="flex items-center justify-between text-[13px]">
                      <span className="font-medium text-ink">{prov.provider}</span>
                      <span className="text-ink-soft">
                        {t('settings.linkedOn', {
                          date: new Date(prov.linkedAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }),
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Account */}
      <Card className="mt-6">
        <CardHeader title={t('settings.accountHeading')} />
        <dl className="space-y-2 text-[14px]">
          <div className="flex justify-between">
            <dt className="text-ink-soft">{t('settings.email')}</dt>
            <dd className="font-medium text-ink">{user?.email}</dd>
          </div>
          {user?.phone && (
            <div className="flex justify-between">
              <dt className="text-ink-soft">{t('settings.phone')}</dt>
              <dd className="font-medium text-ink">{user.phone}</dd>
            </div>
          )}
        </dl>

        <div className="mt-5 space-y-3 border-t border-line pt-4">
          <Button variant="secondary" onClick={() => logout().then(() => navigate(paths.login))}>
            <LogOut size={15} />
            {t('settings.signOut')}
          </Button>

          <button
            onClick={async () => {
              if (!window.confirm(t('settings.confirmDeactivate'))) return;
              await deactivateAccount();
              await logout();
              navigate(paths.login);
            }}
            className="flex items-center gap-2 text-[13px] font-semibold text-ink-soft hover:text-warning"
          >
            <UserX size={14} />
            {t('settings.deactivate')}
          </button>
          <p className="text-[12px] text-ink-soft">{t('settings.deactivateHint')}</p>

          <button
            onClick={async () => {
              if (!window.confirm(t('settings.confirmDelete'))) return;
              await deleteAccount();
              await logout();
              navigate(paths.login);
            }}
            className="flex items-center gap-2 text-[13px] font-semibold text-danger hover:underline"
          >
            <Trash2 size={14} />
            {t('settings.deleteAccount')}
          </button>
          <p className="text-[12px] text-ink-soft">{t('settings.deleteHint')}</p>
        </div>
      </Card>
    </div>
  );
}
