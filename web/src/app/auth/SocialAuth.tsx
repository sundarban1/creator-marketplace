import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa6';
import { useAppAuth } from './AppAuthContext';
import { useT } from '../i18n';
import { roleHome } from '../routes';
import { requestGoogleAccessToken } from '../lib/googleAuth';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { SegmentedControl } from '../ui/SegmentedControl';

type Role = 'CREATOR' | 'BUSINESS';

/**
 * Google (+ Apple) sign-in for the auth screens. On a brand-new Google account
 * the backend asks for a role first — we collect it in a small dialog and
 * retry.
 */
export function SocialAuth({ onError }: { onError: (msg: string) => void }) {
  const t = useT();
  const navigate = useNavigate();
  const { googleAuth } = useAppAuth();

  const [busy, setBusy] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('CREATOR');

  const finish = (r: { needsRole: false; user: { role: 'CREATOR' | 'BUSINESS' | 'ADMIN' } }) => {
    navigate(roleHome(r.user.role), { replace: true });
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
        finish(res);
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
        finish(res);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="space-y-2.5">
        <Button variant="secondary" fullWidth size="lg" loading={busy} onClick={handleGoogle}>
          <FcGoogle size={18} />
          {t('auth.continueGoogle')}
        </Button>
        <Button
          variant="secondary"
          fullWidth
          size="lg"
          onClick={() => onError(t('auth.appleUseApp'))}
        >
          <FaApple size={17} />
          {t('auth.continueApple')}
        </Button>
      </div>

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
        <Button className="mt-4" fullWidth loading={busy} onClick={confirmRole}>
          {t('common.continue')}
        </Button>
      </Modal>
    </>
  );
}
