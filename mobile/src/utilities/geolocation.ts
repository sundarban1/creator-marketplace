import * as Location from 'expo-location';
import { buildGeocodeUrl } from './constants';

export type LatLng = { lat: number; lng: number };

/**
 * Resolves a plain-text address (e.g. a profile's "location" field set without
 * ever going through a Places picker) into coordinates. Used as a fallback so
 * "Home" is selectable even for profiles that only ever saved location as text.
 */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  if (!address.trim()) return null;
  try {
    const res = await fetch(buildGeocodeUrl(address));
    const json = await res.json();
    if (json.status === 'OK' && json.results?.[0]) {
      const loc = json.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng };
    }
    return null;
  } catch {
    return null;
  }
}

// expo-location's getCurrentPositionAsync has no built-in timeout — on a physical
// device with a weak/no GPS signal it can hang for a very long time (or effectively
// forever), which is exactly what shows up as a "current location" button that spins
// endlessly. This bounds it so the caller always gets an answer.
const FRESH_FIX_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * Requests foreground location permission (if not already granted) and returns
 * the device's current coordinates. Returns null if permission is denied or no
 * position could be obtained — callers should fall back to the creator's saved
 * home location.
 */
export async function getCurrentLocation(): Promise<LatLng | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    // Try a cached fix first — usually resolves near-instantly on a physical device
    // and is more than accurate enough for pinning a location on a map, so the UI
    // doesn't have to wait on a fresh GPS lock just to show *something*.
    const cached = await Location.getLastKnownPositionAsync({ maxAge: 2 * 60 * 1000 }).catch(() => null);

    // Race the fresh fix against the timeout above rather than awaiting it directly —
    // falls back to the cached fix (if any) instead of leaving the caller hanging.
    const fresh = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      FRESH_FIX_TIMEOUT_MS,
    );

    const pos = fresh ?? cached;
    if (!pos) return null;
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

export async function hasLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}
