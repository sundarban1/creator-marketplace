import * as SecureStore from 'expo-secure-store';

// In-memory cache for synchronous reads — SecureStore is async only
const cache = new Map<string, string>();

export const storage = {
  // Synchronous reads (from cache, populated on app start via hydrate())
  get(key: string): string | null {
    return cache.get(key) ?? null;
  },
  getJSON<T>(key: string): T | null {
    const val = cache.get(key);
    return val ? (JSON.parse(val) as T) : null;
  },

  // Async writes — persist to SecureStore and update cache
  async set(key: string, value: string): Promise<void> {
    cache.set(key, value);
    await SecureStore.setItemAsync(key, value);
  },
  async setJSON<T>(key: string, value: T): Promise<void> {
    const str = JSON.stringify(value);
    cache.set(key, str);
    await SecureStore.setItemAsync(key, str);
  },

  // Async delete
  async remove(key: string): Promise<void> {
    cache.delete(key);
    await SecureStore.deleteItemAsync(key);
  },

  // Session-only writes — cache only, never touches SecureStore (used for "Remember me" off)
  setMemoryOnly(key: string, value: string): void {
    cache.set(key, value);
  },
  setJSONMemoryOnly<T>(key: string, value: T): void {
    cache.set(key, JSON.stringify(value));
  },

  // Call once on app start to warm the in-memory cache from secure storage.
  // Each read is bounded by a timeout: SecureStore (Android Keystore) has been
  // observed to hang indefinitely on some devices, and this call gates the
  // auth `isLoading` flag — a hung read there leaves the app stuck on the
  // splash / welcome screen forever. A key that doesn't resolve in time is
  // treated as absent (worst case: the user signs in again).
  async hydrate(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map(async (key) => {
        try {
          const val = await Promise.race([
            SecureStore.getItemAsync(key),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
          ]);
          if (val != null) cache.set(key, val);
        } catch {
          // decryption failure / unavailable keystore — treat as absent
        }
      })
    );
  },
};
