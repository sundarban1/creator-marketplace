import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { useAppAuth } from './AppAuthContext';
import { postAuthPath } from './postAuthNav';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { getPlatformFlags } from '../api/platformFlags';
import { preloadGoogleSignIn, requestGoogleAccessToken } from '../lib/googleAuth';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';
import { SegmentedControl } from '../ui/SegmentedControl';

type Role = 'CREATOR' | 'BUSINESS';

/**
 * Google (+ Apple) sign-in for the auth screens. On a brand-new Google account
 * the backend asks for a role first — we collect it in a small dialog and
 * retry. Same registration kill-switches as SignupScreen gate which role(s)
 * can be picked here (see platformFlags.ts) — a brand-new Google account is
 * just as much a "signup" as the email/password form.
 */
export function SocialAuth({ onError }: { onError: (msg: string) => void }) {
  const t = useT();
  const navigate = useNavigate();
  const { googleAuth } = useAppAuth();

  const flags = useAsync(() => getPlatformFlags(), []);
  const creatorEnabled = flags.data?.creatorRegistrationEnabled ?? true;
  const businessEnabled = flags.data?.businessRegistrationEnabled ?? true;

  const [busy, setBusy] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('CREATOR');

  // Warm up the GIS script as soon as this screen mounts, rather than on
  // click — starting the popup outside a click's synchronous call stack
  // gets it blocked with a "popup_failed_to_open" error.
  useEffect(() => {
    preloadGoogleSignIn();
  }, []);

  // Derived, not synced via an effect: falls back off whichever side is
  // closed once flags load, without a render round-trip.
  const role: Role =
    selectedRole === 'CREATOR' && !creatorEnabled && businessEnabled
      ? 'BUSINESS'
      : selectedRole === 'BUSINESS' && !businessEnabled && creatorEnabled
        ? 'CREATOR'
        : selectedRole;

  const finish = async (r: { needsRole: false; user: Parameters<typeof postAuthPath>[0] }) => {
    navigate(await postAuthPath(r.user), { replace: true });
  };

  const handleGoogle = async () => {
    onError('');
    setBusy(true);
    try {
      const token = await requestGoogleAccessToken();
      const res = await googleAuth(token);
      if (res.needsRole) {
        setPendingToken(token);
      } else {
        await finish(res);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  const confirmRole = async () => {
    if (!pendingToken) return;
    setBusy(true);
    try {
      const res = await googleAuth(pendingToken, role);
      if (!res.needsRole) {
        setPendingToken(null);
        await finish(res);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="secondary" fullWidth size="lg" loading={busy} onClick={handleGoogle}>
        <FcGoogle size={18} />
        {t('auth.continueGoogle')}
      </Button>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[12px] font-medium uppercase tracking-wide text-ink-soft">
          {t('auth.or')}
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <Modal
        open={pendingToken != null}
        onClose={() => setPendingToken(null)}
        title={t('auth.chooseRoleTitle')}
      >
        {!creatorEnabled && !businessEnabled ? (
          <Alert tone="warning">{t('auth.registrationClosedBoth')}</Alert>
        ) : creatorEnabled && businessEnabled ? (
          <SegmentedControl<Role>
            ariaLabel={t('auth.chooseRoleTitle')}
            variant="cards"
            value={role}
            onChange={setSelectedRole}
            options={[
              { value: 'CREATOR', label: t('roles.creator'), description: t('auth.creatorRoleBlurb') },
              { value: 'BUSINESS', label: t('roles.business'), description: t('auth.businessRoleBlurb') },
            ]}
          />
        ) : (
          <Alert tone="neutral">
            {t('auth.registrationOnlyRole', {
              role: role === 'CREATOR' ? t('roles.creator') : t('roles.business'),
            })}
          </Alert>
        )}
        {(creatorEnabled || businessEnabled) && (
          <Button className="mt-4" fullWidth loading={busy} onClick={confirmRole}>
            {t('common.continue')}
          </Button>
        )}
      </Modal>
    </>
  );
}
