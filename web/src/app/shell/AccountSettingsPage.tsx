import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Globe, ShieldCheck, LogOut, UserX, Trash2, Mail, Gift, LifeBuoy, Info, ChevronRight, BadgeCheck, Eye, Phone, Share2, Check } from 'lucide-react';
import { useAppAuth } from '../auth/AppAuthContext';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { useAppLanguage, useT, type Lang } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchAuthMethods, deactivateAccount, deleteAccount } from '../api/auth';
import { fetchNotificationSettings, updateNotificationSettings } from '../api/creator';
import { fetchBusinessProfile, updateBusinessProfile } from '../api/business';
import { fetchPaymentMethods } from '../api/catalog';
import { paths } from '../routes';
import { PageHeader } from '../ui/PageHeader';
import { Card, CardHeader } from '../ui/Card';
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

export function AccountSettingsPage() {
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, logout } = useAppAuth();
  const { language, setLanguage } = useAppLanguage();
  const methods = useAsync((s) => fetchAuthMethods(s), []);
  const notifSettings = useAsync((s) => fetchNotificationSettings(s), []);
  const bizProfile = useAsync((s) => fetchBusinessProfile(s), []);
  const paymentMethodsCatalog = useAsync((s) => fetchPaymentMethods(s), []);
  const [emailNotifOverride, setEmailNotifOverride] = useState<boolean | null>(null);
  const [privacyOverride, setPrivacyOverride] = useState<Partial<Record<'showPublicProfile' | 'hideContactDetails' | 'hideSocialLinks', boolean>>>({});
  const [paymentMethodsOverride, setPaymentMethodsOverride] = useState<string[] | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const emailNotif = emailNotifOverride ?? notifSettings.data?.emailNotificationsEnabled ?? null;
  const privacy = bizProfile.data
    ? {
        showPublicProfile: privacyOverride.showPublicProfile ?? bizProfile.data.showPublicProfile,
        hideContactDetails: privacyOverride.hideContactDetails ?? bizProfile.data.hideContactDetails,
        hideSocialLinks: privacyOverride.hideSocialLinks ?? bizProfile.data.hideSocialLinks,
      }
    : null;
  const selectedPaymentMethods = paymentMethodsOverride ?? bizProfile.data?.paymentMethods ?? null;

  function toggleEmailNotif(next: boolean) {
    setEmailNotifOverride(next);
    updateNotificationSettings({ emailNotificationsEnabled: next }).catch(() => setEmailNotifOverride(!next));
  }

  function togglePrivacy(key: 'showPublicProfile' | 'hideContactDetails' | 'hideSocialLinks', next: boolean) {
    setPrivacyOverride((prev) => ({ ...prev, [key]: next }));
    updateBusinessProfile({ [key]: next }).catch(() => setPrivacyOverride((prev) => ({ ...prev, [key]: !next })));
  }

  function togglePaymentMethod(key: string) {
    const current = selectedPaymentMethods ?? [];
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    setPaymentMethodsOverride(next);
    updateBusinessProfile({ paymentMethods: next }).catch(() => setPaymentMethodsOverride(current));
  }

  const m = methods.data;
  const verificationTone =
    bizProfile.data?.verificationStatus === 'VERIFIED' ? 'success' : bizProfile.data?.verificationStatus === 'PENDING' ? 'warning' : 'neutral';

  return (
    <div>
      <PageHeader title={t('settings.title')} />

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
              <button
                type="button"
                onClick={() => setChangePasswordOpen(true)}
                className="text-[13px] font-semibold text-violet-dark hover:underline"
              >
                {t('settings.resetPassword')}
              </button>
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

      {/* Notifications */}
      <Card className="mt-6">
        <CardHeader title={t('settings.notificationsHeading')} />
        {notifSettings.loading || emailNotif === null ? (
          <Skeleton className="h-6 w-full" />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-start gap-2 text-[14px] text-ink">
              <Mail size={16} className="mt-0.5 flex-shrink-0 text-ink-soft" />
              <span>
                {t('settings.emailNotifications')}
                <span className="mt-0.5 block text-[12px] font-normal text-ink-soft">{t('settings.emailNotificationsHint')}</span>
              </span>
            </span>
            <Switch checked={emailNotif} onChange={toggleEmailNotif} label={t('settings.emailNotifications')} />
          </div>
        )}
      </Card>

      {/* Privacy */}
      <Card className="mt-6">
        <CardHeader title={t('settings.privacyHeading')} />
        {bizProfile.loading || !privacy ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="divide-y divide-line">
            <div className="flex items-center justify-between gap-3 py-3 first:pt-0">
              <span className="flex items-start gap-2 text-[14px] text-ink">
                <Eye size={16} className="mt-0.5 flex-shrink-0 text-ink-soft" />
                <span>
                  {t('settings.showProfilePublicly')}
                  <span className="mt-0.5 block text-[12px] font-normal text-ink-soft">{t('settings.showProfilePubliclyHint')}</span>
                </span>
              </span>
              <Switch checked={privacy.showPublicProfile} onChange={(v) => togglePrivacy('showPublicProfile', v)} label={t('settings.showProfilePublicly')} />
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="flex items-start gap-2 text-[14px] text-ink">
                <Phone size={16} className="mt-0.5 flex-shrink-0 text-ink-soft" />
                <span>
                  {t('settings.hideContactDetails')}
                  <span className="mt-0.5 block text-[12px] font-normal text-ink-soft">{t('settings.hideContactDetailsHint')}</span>
                </span>
              </span>
              <Switch checked={privacy.hideContactDetails} onChange={(v) => togglePrivacy('hideContactDetails', v)} label={t('settings.hideContactDetails')} />
            </div>
            <div className="flex items-center justify-between gap-3 py-3 last:pb-0">
              <span className="flex items-start gap-2 text-[14px] text-ink">
                <Share2 size={16} className="mt-0.5 flex-shrink-0 text-ink-soft" />
                <span>
                  {t('settings.hideSocialLinks')}
                  <span className="mt-0.5 block text-[12px] font-normal text-ink-soft">{t('settings.hideSocialLinksHint')}</span>
                </span>
              </span>
              <Switch checked={privacy.hideSocialLinks} onChange={(v) => togglePrivacy('hideSocialLinks', v)} label={t('settings.hideSocialLinks')} />
            </div>
          </div>
        )}
      </Card>

      {/* Payment methods */}
      <Card className="mt-6">
        <CardHeader title={t('settings.paymentMethodsHeading')} />
        <p className="mb-3 text-[12.5px] text-ink-soft">{t('settings.paymentMethodsHint')}</p>
        {paymentMethodsCatalog.loading || bizProfile.loading || !selectedPaymentMethods ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="divide-y divide-line">
            {(paymentMethodsCatalog.data ?? []).map((pm) => {
              const selected = selectedPaymentMethods.includes(pm.key);
              return (
                <button
                  key={pm.key}
                  type="button"
                  onClick={() => togglePaymentMethod(pm.key)}
                  className="flex w-full items-center gap-3 py-3 text-left first:pt-0 last:pb-0"
                >
                  {pm.iconUrl ? (
                    <img src={pm.iconUrl} alt="" className="h-9 w-9 flex-shrink-0 rounded-lg object-contain" />
                  ) : (
                    <span
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-[13px] font-bold text-white"
                      style={{ backgroundColor: pm.color }}
                    >
                      {pm.name[0]}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 text-[14px] font-medium text-ink">{pm.name}</span>
                  <span
                    className={cn(
                      'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2',
                      selected ? 'border-brand bg-brand' : 'border-line-strong',
                    )}
                  >
                    {selected && <Check size={13} className="text-white" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* More */}
      <Card className="mt-6">
        <CardHeader title={t('settings.moreHeading')} />
        <div className="divide-y divide-line">
          <Link to="/business/verification" className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <BadgeCheck size={16} className="flex-shrink-0 text-ink-soft" />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium text-ink">{t('settings.verification')}</span>
              <span className="block text-[12px] text-ink-soft">{t('settings.verificationHint')}</span>
            </span>
            {bizProfile.data && (
              <StatusBadge
                label={t(
                  bizProfile.data.verificationStatus === 'VERIFIED'
                    ? 'settings.verificationStatusVerified'
                    : bizProfile.data.verificationStatus === 'PENDING'
                      ? 'settings.verificationStatusPending'
                      : 'settings.verificationStatusNotVerified',
                )}
                tone={verificationTone}
              />
            )}
            <ChevronRight size={16} className="flex-shrink-0 text-ink-soft/60" />
          </Link>
          <Link to="/business/referrals" className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <Gift size={16} className="flex-shrink-0 text-ink-soft" />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium text-ink">{t('settings.referABusiness')}</span>
              <span className="block text-[12px] text-ink-soft">{t('settings.referABusinessHint')}</span>
            </span>
            <ChevronRight size={16} className="flex-shrink-0 text-ink-soft/60" />
          </Link>
          <Link to="/business/support" className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <LifeBuoy size={16} className="flex-shrink-0 text-ink-soft" />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium text-ink">{t('settings.helpAndSupport')}</span>
              <span className="block text-[12px] text-ink-soft">{t('settings.helpAndSupportHint')}</span>
            </span>
            <ChevronRight size={16} className="flex-shrink-0 text-ink-soft/60" />
          </Link>
          <Link to="/business/about" className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <Info size={16} className="flex-shrink-0 text-ink-soft" />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium text-ink">{t('settings.about')}</span>
              <span className="block text-[12px] text-ink-soft">{t('settings.aboutHint')}</span>
            </span>
            <ChevronRight size={16} className="flex-shrink-0 text-ink-soft/60" />
          </Link>
        </div>
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
