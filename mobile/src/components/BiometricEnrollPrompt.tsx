import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { AppModal } from '@/components/AppModal';
import {
  authenticate,
  getBiometricLabel,
  hasOfferedBiometricLogin,
  isBiometricAvailable,
  isBiometricLoginEnabled,
  markBiometricLoginOffered,
  setBiometricLoginEnabled,
  type BiometricLabel,
} from '@/services/biometric';

/**
 * One-shot "Enable Face ID / Fingerprint?" offer, shown once after the user's
 * first successful login on a biometric-capable device. Mounted alongside the
 * navigator rather than inside the login screen because the auth redirect
 * unmounts login the instant the session lands — the offer has to outlive it.
 *
 * Deliberately suppressed while isFirstLogin is still true, so a brand-new
 * account isn't interrupted mid-signup — the effect re-runs the moment
 * onboarding clears that flag, so the offer lands on the home screen instead.
 * Tapping either button marks the offer as spent — Settings → Security is the
 * permanent home for the toggle after that.
 */
export function BiometricEnrollPrompt() {
  const { user } = useAuth();
  const { t } = useLanguage();
  // Read off the two fields the offer actually depends on rather than the whole
  // user object — updateUser() replaces that object on every profile edit, and
  // re-running the availability check on each of those is pointless work.
  const userId       = user?.id;
  const isFirstLogin = user?.isFirstLogin;
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState<BiometricLabel>('Biometrics');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Re-evaluated per signed-in user rather than once on mount: a user who logs
    // out and signs in as someone else on the same device still only ever sees
    // this once (the marker is device-scoped), but the check has to re-run for
    // the session that actually qualifies.
    if (!userId || isFirstLogin === true) return;
    if (isBiometricLoginEnabled() || hasOfferedBiometricLogin()) return;

    let cancelled = false;
    void (async () => {
      const available = await isBiometricAvailable();
      if (cancelled || !available) return;
      setLabel(await getBiometricLabel());
      if (!cancelled) setVisible(true);
    })();
    return () => { cancelled = true; };
  }, [userId, isFirstLogin]);

  async function handleEnable() {
    setBusy(true);
    try {
      // Confirm against the real sensor before persisting — same gate the
      // Settings toggle uses, so an unattended device can't switch it on.
      const ok = await authenticate(t('biometricEnroll.confirmPrompt', { label }));
      if (!ok) return; // stay open so a mis-scan can be retried
      await setBiometricLoginEnabled(true);
      await markBiometricLoginOffered();
      setVisible(false);
    } catch {
      // Sensor error — leave the modal up rather than silently losing the offer.
    } finally {
      setBusy(false);
    }
  }

  async function handleDismiss() {
    setVisible(false);
    await markBiometricLoginOffered();
  }

  if (!visible) return null;

  return (
    <AppModal
      visible
      type="info"
      icon={label === 'Face ID' ? 'smile' : 'fingerprint'}
      title={t('biometricEnroll.title', { label })}
      body={t('biometricEnroll.body', { label })}
      confirmLabel={t('biometricEnroll.enable')}
      cancelLabel={t('biometricEnroll.notNow')}
      loading={busy}
      onConfirm={() => { void handleEnable(); }}
      onCancel={() => { void handleDismiss(); }}
    />
  );
}
