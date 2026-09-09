import type { ComingSoonFlags } from '../hooks/useComingSoon';

// Real store URLs aren't published yet — badges link to '#' as placeholders
// until the app is live, so update APP_STORE_URL/PLAY_STORE_URL then.
export const APP_STORE_URL = '#';
export const PLAY_STORE_URL = '#';

/** Picks the store link matching the visitor's device so a single "download
 *  the app" action (e.g. FinalCTA's Get Started button) can send iOS/Android
 *  visitors straight to their platform's store instead of making them choose
 *  between both badges. Desktop/unknown UAs fall back to the Apple link, same
 *  as the leftmost badge. */
export function getDeviceStoreUrl(): string {
  if (typeof navigator === 'undefined') return APP_STORE_URL;
  if (/android/i.test(navigator.userAgent)) return PLAY_STORE_URL;
  return APP_STORE_URL;
}

/** Whether the store matching the visitor's device is in Coming Soon mode, so
 *  a device-targeted download action can fall back to "scroll to the badges"
 *  instead of opening a dead store link. Mirrors getDeviceStoreUrl's UA logic. */
export function isDeviceComingSoon(flags: ComingSoonFlags): boolean {
  if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) return flags.android;
  return flags.ios;
}
