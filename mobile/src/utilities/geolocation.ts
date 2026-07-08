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

/**
 * Requests foreground location permission (if not already granted) and returns
 * the device's current coordinates. Returns null if permission is denied or the
 * fetch fails — callers should fall back to the creator's saved home location.
 */
export async function getCurrentLocation(): Promise<LatLng | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
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
