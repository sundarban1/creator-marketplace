import { useState } from 'react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { getPlatformFlags } from '../api/platformFlags';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';
import { SegmentedControl } from '../ui/SegmentedControl';

type Role = 'CREATOR' | 'BUSINESS';

/**
 * "How will you use Kolab?" dialog shown when a brand-new Google account has
 * no role yet. Shared by both Google entry points — the desktop popup flow
 * (SocialAuth.tsx) and the mobile-web redirect flow (GoogleCallbackScreen.tsx)
 * — so the role-completion UX (and the registration-kill-switch gating) stays
 * identical between them instead of being duplicated.
 */
export function GoogleRoleModal({
  open,
  onClose,
  onConfirm,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (role: Role) => void;
  busy: boolean;
}) {
  const t = useT();
  const flags = useAsync(() => getPlatformFlags(), []);
  const creatorEnabled = flags.data?.creatorRegistrationEnabled ?? true;
  const businessEnabled = flags.data?.businessRegistrationEnabled ?? true;

  const [selectedRole, setSelectedRole] = useState<Role>('CREATOR');

  const role: Role =
    selectedRole === 'CREATOR' && !creatorEnabled && businessEnabled
      ? 'BUSINESS'
      : selectedRole === 'BUSINESS' && !businessEnabled && creatorEnabled
        ? 'CREATOR'
        : selectedRole;

  return (
    <Modal open={open} onClose={onClose} title={t('auth.chooseRoleTitle')}>
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
        <Button className="mt-4" fullWidth loading={busy} onClick={() => onConfirm(role)}>
          {t('common.continue')}
        </Button>
      )}
    </Modal>
  );
}
