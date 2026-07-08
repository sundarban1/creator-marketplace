import * as Location from 'expo-location';

export type LatLng = { lat: number; lng: number };

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
