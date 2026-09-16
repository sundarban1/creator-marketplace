import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Globe, ShieldCheck, BadgeCheck, LogOut, UserX, Trash2, Link2, User, Mail, Gift, LifeBuoy, Info } from 'lucide-react';
import { useAppAuth } from '../auth/AppAuthContext';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { useAppLanguage, useT, type Lang } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { isPhonePlaceholderEmail } from '../lib/identity';
import { fetchAuthMethods, deactivateAccount, deleteAccount } from '../api/auth';
import { fetchNotificationSettings, updateNotificationSettings, fetchCreatorFullProfile } from '../api/creator';
import { paths } from '../routes';
import { DashPageHeader } from './dash-ui/DashPageHeader';
import { DashCard, DashCardHeader } from './dash-ui/DashCard';
import { DashListRow } from './dash-ui/DashListRow';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { Switch } from '../ui/Switch';
import { StatusBadge } from '../ui/StatusBadge';
import { useToast } from '../ui/Toast';
import { cn } from '../ui/cn';

const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ne', label: 'नेपाली' },
];

/**
 * Restyled `shell/AccountSettingsPage` for the creator dashboard — grouped
 * "Account" / "App & Privacy" row lists (contrast with the shared page's
 * editorial cards, which the business app keeps). Same data/actions.
 */
export function CreatorSettingsPage() {
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, logout } = useAppAuth();
  const { language, setLanguage } = useAppLanguage();
  const methods = useAsync((s) => fetchAuthMethods(s), []);
  const notifSettings = useAsync((s) => fetchNotificationSettings(s), []);
  const creatorProfile = useAsync((s) => fetchCreatorFullProfile(s), []);
  const [emailNotifOverride, setEmailNotifOverride] = useState<boolean | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const emailNotif = emailNotifOverride ?? notifSettings.data?.emailNotificationsEnabled ?? null;

  function toggleEmailNotif(next: boolean) {
    setEmailNotifOverride(next);
    updateNotificationSettings({ emailNotificationsEnabled: next }).catch(() => setEmailNotifOverride(!next));
  }

  const m = methods.data;
  const verificationTone =
    creatorProfile.data?.verificationStatus === 'VERIFIED'
      ? 'success'
      : creatorProfile.data?.verificationStatus === 'PENDING'
        ? 'warning'
        : 'neutral';

  return (
    <div className="mx-auto max-w-2xl">
      <DashPageHeader title={t('settings.title')} />

      {/* Account */}
      <DashCard>
        <DashCardHeader title={t('settings.accountHeading')} />
        <div className="divide-y divide-black/[0.05]">
          <DashListRow
            icon={User}
            tone="violet"
            title={user && isPhonePlaceholderEmail(user.email) ? (user.phone ?? undefined) : user?.email}
            subtitle={user && !isPhonePlaceholderEmail(user.email) ? (user.phone ?? undefined) : undefined}
          />
          <DashListRow
            icon={ShieldCheck}
            tone={m?.hasPassword ? 'green' : 'neutral'}
            title={m?.hasPassword ? t('settings.passwordSet') : t('settings.passwordNotSet')}
            trailing={
              <button
                type="button"
                onClick={() => setChangePasswordOpen(true)}
                className="text-[13px] font-semibold text-violet-dark hover:underline"
              >
                {t('settings.resetPassword')}
              </button>
            }
          />
          <div className="py-3">
            <DashListRow
              icon={Globe}
              tone="pink"
              title={t('settings.languageHeading')}
              subtitle={t('settings.languageHint')}
              className="py-0"
            />
            <div className="ml-12 mt-2 flex gap-2">
              {LANGS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLanguage(l.value)}
                  aria-pressed={language === l.value}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors',
                    language === l.value ? 'bg-violet/10 text-violet-dark' : 'bg-black/[0.04] text-ink-soft',
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DashCard>

      {/* App & Privacy */}
      <DashCard className="mt-6">
        <DashCardHeader title={t('settings.appPrivacyHeading')} />
        {methods.loading ? (
          <Skeleton className="h-10 w-full" />
        ) : m && m.providers.length > 0 ? (
          <div className="divide-y divide-black/[0.05]">
            <div className="pb-1 pt-0">
              <p className="mb-1 text-[12px] font-semibold text-ink-soft">{t('settings.connectedAccounts')}</p>
            </div>
            {m.providers.map((prov) => (
              <DashListRow
                key={prov.provider}
                icon={Link2}
                tone="blue"
                title={prov.provider}
                subtitle={t('settings.linkedOn', {
                  date: new Date(prov.linkedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                })}
              />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-ink-soft">—</p>
        )}

        <div className="mt-3 divide-y divide-black/[0.05] border-t border-black/[0.05]">
          <DashListRow
            as="button"
            icon={UserX}
            tone="neutral"
            title={t('settings.deactivate')}
            subtitle={t('settings.deactivateHint')}
            chevron
            onClick={async () => {
              if (!window.confirm(t('settings.confirmDeactivate'))) return;
              await deactivateAccount();
              await logout();
              navigate(paths.login);
            }}
          />
          <DashListRow
            as="button"
            icon={Trash2}
            tone="red"
            title={t('settings.deleteAccount')}
            subtitle={t('settings.deleteHint')}
            chevron
            onClick={async () => {
              if (!window.confirm(t('settings.confirmDelete'))) return;
              await deleteAccount();
              await logout();
              navigate(paths.login);
            }}
          />
        </div>
      </DashCard>

      {/* Notifications */}
      <DashCard className="mt-6">
        <DashCardHeader title={t('settings.notificationsHeading')} />
        {notifSettings.loading || emailNotif === null ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <DashListRow
            icon={Mail}
            tone="blue"
            title={t('settings.emailNotifications')}
            subtitle={t('settings.emailNotificationsHint')}
            trailing={<Switch checked={emailNotif} onChange={toggleEmailNotif} label={t('settings.emailNotifications')} />}
          />
        )}
      </DashCard>

      {/* More */}
      <DashCard className="mt-6">
        <DashCardHeader title={t('settings.moreHeading')} />
        <div className="divide-y divide-black/[0.05]">
          <Link to="/creator/verification">
            <DashListRow
              icon={BadgeCheck}
              tone="green"
              title={t('settings.verification')}
              subtitle={t('settings.verificationHint')}
              trailing={
                creatorProfile.data && (
                  <StatusBadge
                    label={t(
                      creatorProfile.data.verificationStatus === 'VERIFIED'
                        ? 'settings.verificationStatusVerified'
                        : creatorProfile.data.verificationStatus === 'PENDING'
                          ? 'settings.verificationStatusPending'
                          : 'settings.verificationStatusNotVerified',
                    )}
                    tone={verificationTone}
                  />
                )
              }
              chevron
            />
          </Link>
          <Link to="/creator/referrals">
            <DashListRow icon={Gift} tone="pink" title={t('settings.referAFriend')} subtitle={t('settings.referAFriendHint')} chevron />
          </Link>
          <Link to="/creator/support">
            <DashListRow icon={LifeBuoy} tone="violet" title={t('settings.helpAndSupport')} subtitle={t('settings.helpAndSupportHint')} chevron />
          </Link>
          <Link to="/creator/about">
            <DashListRow icon={Info} tone="neutral" title={t('settings.about')} subtitle={t('settings.aboutHint')} chevron />
          </Link>
        </div>
      </DashCard>

      <Button
        variant="secondary"
        fullWidth
        className="mt-6 border-danger-soft bg-danger-soft text-danger hover:bg-danger-soft/80"
        onClick={() => logout().then(() => navigate(paths.login))}
      >
        <LogOut size={15} />
        {t('settings.signOut')}
      </Button>

      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        onDone={() => {
          toast.success(t('settings.passwordUpdated'));
          methods.reload();
        }}
      />
    </div>
  );
}
