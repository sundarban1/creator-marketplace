import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache-first storage for non-sensitive read data (feed/profile) so core
// screens can show the last-known content instead of a blank/error state
// when opened offline. Not for anything SecureStore-worthy — see
// `utilities/storage.ts` for auth/session data.
const PREFIX = 'offline_cache:';

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setCached<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Best-effort — a cache write failure shouldn't break the screen.
  }
}
