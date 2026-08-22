import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { storage } from '@/utilities/storage';
import { BIOMETRIC_ENABLED_KEY, BIOMETRIC_OFFERED_KEY } from '@/utilities/constants';

export type BiometricLabel = 'Face ID' | 'Fingerprint' | 'Biometrics';

/** Whether this device has biometric hardware AND at least one face/fingerprint enrolled. */
export async function isBiometricAvailable(): Promise<boolean> {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && isEnrolled;
}

/** Best-effort label for the settings toggle — "Face ID" on iOS devices that support it, else generic. */
export async function getBiometricLabel(): Promise<BiometricLabel> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (Platform.OS === 'ios' && types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'Fingerprint';
  return 'Biometrics';
}

// Dedupe concurrent calls so overlapping triggers (e.g. BiometricGateScreen's
// auto-unlock-on-mount racing a tap on the still-visible "Unlock" button before
// React re-renders with checking=true) never open a second native prompt on top
// of the first — that's what shows up as Face ID/fingerprint asking repeatedly.
// Shared across unlock and step-up prompts, which is safe only because the two
// can never be on screen together: the unlock gate is an early return that
// replaces the whole navigator, so no in-app screen exists to withdraw from.
let inFlight: Promise<LocalAuthentication.LocalAuthenticationResult> | null = null;

/**
 * Raw prompt. Prefer `authenticate()` (login/unlock) or `confirmSensitiveAction()`
 * (step-up before a money-moving action) — they carry the right cancel labels.
 */
function prompt(promptMessage: string, cancelLabel: string) {
  if (inFlight) return inFlight;
  inFlight = LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel,
    // Device passcode/PIN stays available as the OS-level fallback — a user whose
    // face doesn't scan in bad light must never be locked out of their own money.
    disableDeviceFallback: false,
  }).finally(() => { inFlight = null; });
  return inFlight;
}

export function authenticate(promptMessage: string): Promise<boolean> {
  return prompt(promptMessage, 'Use password instead').then((result) => result.success);
}

export type SensitiveActionResult =
  | 'confirmed'   // biometric passed, or there was nothing enrolled to check against
  | 'cancelled'   // user dismissed the prompt — abort quietly, this isn't an error
  | 'failed';     // scan didn't match, or the sensor is locked out

/**
 * Step-up confirmation before a high-risk action (withdrawals, payout-detail
 * changes). Gated on the device having biometrics *enrolled* rather than on the
 * biometric-login toggle: this is a security control, not a convenience
 * preference, so declining faster logins shouldn't opt you out of it. Devices
 * with nothing enrolled pass straight through — the action is already behind an
 * authenticated session, and hard-blocking them would lock those users out of
 * their own earnings entirely.
 */
export async function confirmSensitiveAction(promptMessage: string, cancelLabel: string): Promise<SensitiveActionResult> {
  if (!(await isBiometricAvailable())) return 'confirmed';
  try {
    const result = await prompt(promptMessage, cancelLabel);
    if (result.success) return 'confirmed';
    // `error` is only present on the failure branch of the result union.
    const reason = 'error' in result ? result.error : '';
    return reason === 'user_cancel' || reason === 'system_cancel' || reason === 'app_cancel'
      ? 'cancelled'
      : 'failed';
  } catch {
    return 'failed';
  }
}

export function isBiometricLoginEnabled(): boolean {
  return storage.get(BIOMETRIC_ENABLED_KEY) === 'true';
}

export async function setBiometricLoginEnabled(enabled: boolean): Promise<void> {
  await storage.set(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
}

/** Whether the post-login "Enable {biometric} login?" offer has already been shown once. */
export function hasOfferedBiometricLogin(): boolean {
  return storage.get(BIOMETRIC_OFFERED_KEY) === 'true';
}

export async function markBiometricLoginOffered(): Promise<void> {
  await storage.set(BIOMETRIC_OFFERED_KEY, 'true');
}

/**
 * Drops the saved biometric-login preference when the device no longer has any
 * face/fingerprint enrolled (user removed them in OS settings, or moved the
 * install to a device without biometrics). Without this the cold-start gate
 * would arm against a credential that can never succeed, leaving "Use password
 * instead" as the only way in. Returns whether biometric login is still on.
 */
export async function syncBiometricLoginWithDevice(): Promise<boolean> {
  if (!isBiometricLoginEnabled()) return false;
  if (await isBiometricAvailable()) return true;
  await setBiometricLoginEnabled(false);
  return false;
}
