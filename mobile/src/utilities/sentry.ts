import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

const SENTRY_DSN =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_SENTRY_DSN_IOS
    : process.env.EXPO_PUBLIC_SENTRY_DSN_ANDROID;

/**
 * Initializes Sentry error tracking. Safe to call unconditionally — the SDK
 * itself no-ops network delivery when `dsn` is empty/undefined (confirmed in
 * @sentry/react-native's `init()`: a falsy dsn simply skips transport setup,
 * it doesn't throw), so no extra guard is needed here for local dev / CI
 * where the DSN env vars aren't set.
 *
 * Must be called once, at the very top of the app entry, before the provider
 * tree renders — `Sentry.init()` is what wires up global JS exception and
 * unhandled-promise-rejection capture.
 */
export function initSentry() {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
  });
}
