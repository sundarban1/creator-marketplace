import { useState, type FormEvent } from 'react';
import { useT } from '../i18n';
import { changePassword } from '../api/auth';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Alert } from '../ui/Alert';

const PASSWORD_MIN_LENGTH = 8;

function isStrongPassword(value: string): boolean {
  return value.length >= PASSWORD_MIN_LENGTH && /[A-Z]/.test(value) && /[0-9]/.test(value);
}

export function ChangePasswordModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
}) {
  const t = useT();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setNewPassword('');
    setConfirmPassword('');
    setNewPasswordError('');
    setConfirmPasswordError('');
    setError('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function validate(): boolean {
    let valid = true;

    if (!newPassword) {
      setNewPasswordError(t('settings.newPasswordRequired'));
      valid = false;
    } else if (!isStrongPassword(newPassword)) {
      setNewPasswordError(t('settings.passwordWeak'));
      valid = false;
    } else {
      setNewPasswordError('');
    }

    if (!confirmPassword) {
      setConfirmPasswordError(t('settings.confirmPasswordRequired'));
      valid = false;
    } else if (newPassword && confirmPassword !== newPassword) {
      setConfirmPasswordError(t('settings.passwordMismatch'));
      valid = false;
    } else {
      setConfirmPasswordError('');
    }

    return valid;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      await changePassword(newPassword, confirmPassword);
      reset();
      onDone?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={t('settings.resetPassword')}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}

        <TextField
          label={t('settings.newPasswordLabel')}
          type="password"
          autoComplete="new-password"
          hint={newPasswordError ? undefined : t('auth.passwordHint')}
          error={newPasswordError}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <TextField
          label={t('settings.confirmPasswordLabel')}
          type="password"
          autoComplete="new-password"
          placeholder={t('settings.confirmPasswordPlaceholder')}
          error={confirmPasswordError}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {t('settings.resetPassword')}
        </Button>
      </form>
    </Modal>
  );
}
