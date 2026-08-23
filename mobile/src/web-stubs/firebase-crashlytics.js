// Web-only stub for @react-native-firebase/crashlytics. The native SDK reads a
// google-services config that only exists for iOS/Android, so on web it throws
// "No Firebase App '[DEFAULT]' has been created" during AuthContext setup —
// which the app's error boundary caught, leaving every route on "Something went
// wrong".
//
// Wired in metro.config.js for platform === 'web' ONLY. Crash reporting is a
// production-native concern; the web target exists here for UI verification.
const noop = () => {};
export const getCrashlytics = () => ({
  setUserId: noop, log: noop, recordError: noop, setAttribute: noop, setAttributes: noop, crash: noop,
});
export const setUserId = async () => {};
export const log = noop;
export const recordError = noop;
export const setAttribute = async () => {};
export const setAttributes = async () => {};
export default { getCrashlytics, setUserId, log, recordError, setAttribute, setAttributes };
