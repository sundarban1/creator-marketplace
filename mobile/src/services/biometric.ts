import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import { storage } from '@/utilities/storage';
import { BIOMETRIC_ENABLED_KEY, BIOMETRIC_OFFERED_KEY, BIOMETRIC_KEYPAIR_KEY } from '@/utilities/constants';
import { bytesToBase64Url, base64UrlToBytes, asciiToBytes } from '@/utilities/base64url';
import { request, ApiError } from '@/lib/api';

// Pure-JS SHA-512 (no native module, no dependency on a global WebCrypto that
// Hermes doesn't provide) — wired once so the synchronous ed25519 API
// (getPublicKey/sign) can be used instead of the WebCrypto-backed async one.
ed.hashes.sha512 = sha512;

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

// On some Android OEM ROMs the device-PIN / credential branch of BiometricPrompt
// never delivers a callback, so `authenticateAsync` neither resolves nor rejects
// (the native module even documents this: "react-native doesn't pass this value
// to the underlying fragment - we won't resolve the promise"). Without a ceiling
// the module-level `inFlight` would pin forever and every later unlock/step-up
// call would silently await a dead promise — the gate would sit on an infinite
// spinner and the login screen's quick-login button would stay frozen too. Force
// the prompt to settle and reset native state if it runs long.
const PROMPT_TIMEOUT_MS = 60_000;

/**
 * Raw prompt. Prefer `authenticate()` (login/unlock) or `confirmSensitiveAction()`
 * (step-up before a money-moving action) — they carry the right cancel labels.
 */
function prompt(promptMessage: string, cancelLabel: string) {
  if (inFlight) return inFlight;

  const native = LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel,
    // Device passcode/PIN stays available as the OS-level fallback — a user whose
    // face doesn't scan in bad light must never be locked out of their own money.
    disableDeviceFallback: false,
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const guarded = new Promise<LocalAuthentication.LocalAuthenticationResult>((resolve, reject) => {
    timer = setTimeout(() => {
      // Tear down the orphaned native prompt so `isAuthenticating` doesn't stay
      // stuck, then report it as a system cancel (quiet abort, same as backgrounding).
      LocalAuthentication.cancelAuthenticate().catch(() => {});
      resolve({ success: false, error: 'system_cancel' });
    }, PROMPT_TIMEOUT_MS);
    native.then(resolve, reject);
  });

  inFlight = guarded.finally(() => { clearTimeout(timer); inFlight = null; });
  return inFlight;
}

/**
 * Dismiss any biometric prompt that's currently on screen and clear the in-flight
 * guard. Call this when the app is leaving the foreground so a prompt the user
 * walked away from can't outlive its context and wedge the shared `inFlight`.
 * No-op on iOS (the native method is Android-only) and when nothing is pending.
 */
export async function cancelActivePrompt(): Promise<void> {
  if (!inFlight) return;
  try {
    await LocalAuthentication.cancelAuthenticate();
  } catch {
    // cancelAuthenticate is Android-only / best-effort — ignore if unavailable.
  }
}

export type SensitiveActionResult =
  | 'confirmed'   // biometric passed, or there was nothing enrolled to check against
  | 'cancelled'   // user dismissed the prompt — abort quietly, this isn't an error
  | 'failed';     // scan didn't match, or the sensor is locked out

// Shared by authenticate() and confirmSensitiveAction() so a real failed/locked-out
// scan is never collapsed into the same bucket as the user just dismissing the
// prompt — callers need to tell "try again" apart from "nothing to see here".
function interpretPromptResult(result: LocalAuthentication.LocalAuthenticationResult): SensitiveActionResult {
  if (result.success) return 'confirmed';
  // `error` is only present on the failure branch of the result union.
  const reason = 'error' in result ? result.error : '';
  return reason === 'user_cancel' || reason === 'system_cancel' || reason === 'app_cancel'
    ? 'cancelled'
    : 'failed';
}

export async function authenticate(promptMessage: string): Promise<SensitiveActionResult> {
  try {
    return interpretPromptResult(await prompt(promptMessage, 'Use password instead'));
  } catch {
    return 'failed';
  }
}

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
    return interpretPromptResult(await prompt(promptMessage, cancelLabel));
  } catch {
    return 'failed';
  }
}

export function isBiometricLoginEnabled(): boolean {
  return storage.get(BIOMETRIC_ENABLED_KEY) === 'true';
}

// Internal — the local "enabled" flag is only ever meaningful alongside the
// device keypair + backend registration, so it's flipped exclusively by
// enableBiometricLogin/disableBiometricLogin/clearInvalidBiometricCredential
// below, never on its own.
async function setBiometricLoginEnabled(enabled: boolean): Promise<void> {
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
 *
 * Deliberately checks hardware/enrollment only, not the SecureStore keypair
 * itself — reading a requireAuthentication item would trigger a native
 * biometric prompt on every cold start, which is exactly the app-lock
 * behavior this feature must NOT become (it's re-login, not app-lock). A
 * silently-invalidated keypair self-heals the next time the user actually
 * taps "Continue with Face ID" — see prepareBiometricSignIn below.
 */
export async function syncBiometricLoginWithDevice(): Promise<boolean> {
  if (!isBiometricLoginEnabled()) return false;
  if (await isBiometricAvailable()) return true;
  await setBiometricLoginEnabled(false);
  return false;
}

/**
 * Clears local biometric-login state (and best-effort revokes it server-side)
 * without ever touching the normal session — used both by the user's
 * explicit "Disable {label}" action and by self-healing when a credential
 * turns out to be dead (enrollment changed locally, or revoked/missing on
 * the backend).
 */
export async function clearInvalidBiometricCredential(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_KEYPAIR_KEY).catch(() => {});
  await setBiometricLoginEnabled(false);
}

export type BiometricEnableResult =
  | { success: true }
  | { success: false; reason: 'unavailable' | 'cancelled' | 'failed' | 'network' };

/**
 * Full "Enable {label} login" flow (Settings toggle, or the post-login
 * offer): confirms against the live sensor, generates a device-bound Ed25519
 * keypair, and registers only the PUBLIC key with the backend. The private
 * key never leaves this function in plaintext — it's written straight into
 * SecureStore behind requireAuthentication and is never cached, logged, or
 * sent anywhere. Only flips the local "enabled" flag once the backend has
 * actually confirmed registration, so a half-finished attempt never claims
 * to be enabled.
 */
export async function enableBiometricLogin(confirmPromptMessage: string): Promise<BiometricEnableResult> {
  if (!(await isBiometricAvailable())) return { success: false, reason: 'unavailable' };

  const confirmResult = await authenticate(confirmPromptMessage);
  if (confirmResult !== 'confirmed') return { success: false, reason: confirmResult };

  const secretKey = await Crypto.getRandomBytesAsync(32);
  const publicKey = ed.getPublicKey(secretKey);

  try {
    await SecureStore.setItemAsync(BIOMETRIC_KEYPAIR_KEY, bytesToBase64Url(secretKey), {
      requireAuthentication: true,
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    return { success: false, reason: 'failed' };
  }

  try {
    await request('POST', '/api/auth/biometric/register', {
      publicKey: bytesToBase64Url(publicKey),
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
  } catch {
    // Never leave a local key registered that the backend doesn't know about.
    await SecureStore.deleteItemAsync(BIOMETRIC_KEYPAIR_KEY).catch(() => {});
    return { success: false, reason: 'network' };
  }

  await setBiometricLoginEnabled(true);
  return { success: true };
}

/**
 * "Disable {label} login": revokes this device's credential server-side
 * (best-effort — the local key is deleted regardless, since the point is
 * that this device must stop being able to sign in biometrically even if the
 * revoke call itself fails to reach the server) and clears local state.
 * Never touches the normal session — the caller stays logged in.
 */
export async function disableBiometricLogin(): Promise<void> {
  await request('DELETE', '/api/auth/biometric').catch(() => {});
  await clearInvalidBiometricCredential();
}

export type BiometricSignInResult =
  | { success: true; challenge: string; signature: string }
  | { success: false; reason: 'unavailable' | 'cancelled' | 'failed' | 'network' };

/**
 * Login-screen "Continue with {label}": reading the device-bound private key
 * is itself what triggers the native biometric prompt (it was written with
 * requireAuthentication: true). On success, signs a fresh single-use
 * challenge from the backend and hands back the (challenge, signature) pair
 * for authService.biometricLogin to exchange for a brand-new normal session
 * — nothing here ever reuses or reveals an existing token.
 */
export async function prepareBiometricSignIn(): Promise<BiometricSignInResult> {
  let secretKeyB64: string | null;
  try {
    secretKeyB64 = await SecureStore.getItemAsync(BIOMETRIC_KEYPAIR_KEY, { requireAuthentication: true });
  } catch (err) {
    // Leave local config alone either way so the button stays available to
    // retry. SecureStore has no structured error code for this prompt (unlike
    // LocalAuthentication.authenticateAsync), but both platforms' native
    // modules put a distinct "cancel" phrase in the message for a
    // user-dismissed prompt (errSecUserCanceled on iOS, ERROR_USER_CANCELED/
    // ERROR_NEGATIVE_BUTTON on Android) — anything else is a genuine failed
    // or locked-out scan and must surface as 'failed', not be silently
    // swallowed as a no-op cancel.
    const message = err instanceof Error ? err.message : '';
    return { success: false, reason: /cancel/i.test(message) ? 'cancelled' : 'failed' };
  }
  if (!secretKeyB64) {
    // Expo docs: a key invalidated by an enrollment change resolves to null
    // rather than throwing — nothing left to resume, so self-heal the same
    // way a revoked/missing backend credential does, below.
    await clearInvalidBiometricCredential();
    return { success: false, reason: 'unavailable' };
  }

  let challenge: string;
  try {
    const res = await request<{ challenge: string }>('POST', '/api/auth/biometric/challenge');
    challenge = res.data.challenge;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      await clearInvalidBiometricCredential();
      return { success: false, reason: 'unavailable' };
    }
    return { success: false, reason: 'network' };
  }

  const secretKey = base64UrlToBytes(secretKeyB64);
  const signature = ed.sign(asciiToBytes(challenge), secretKey);
  return { success: true, challenge, signature: bytesToBase64Url(signature) };
}
