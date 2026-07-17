import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { storage } from '@/utilities/storage';
import { BIOMETRIC_ENABLED_KEY } from '@/utilities/constants';

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
let inFlight: Promise<boolean> | null = null;

export function authenticate(promptMessage: string): Promise<boolean> {
  if (inFlight) return inFlight;
  inFlight = LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Use password instead',
    disableDeviceFallback: false,
  })
    .then((result) => result.success)
    .finally(() => { inFlight = null; });
  return inFlight;
}

export function isBiometricLoginEnabled(): boolean {
  return storage.get(BIOMETRIC_ENABLED_KEY) === 'true';
}

export async function setBiometricLoginEnabled(enabled: boolean): Promise<void> {
  await storage.set(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
}
