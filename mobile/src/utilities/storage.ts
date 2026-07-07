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

  // Call once on app start to warm the in-memory cache from secure storage
  async hydrate(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map(async (key) => {
        const val = await SecureStore.getItemAsync(key);
        if (val != null) cache.set(key, val);
      })
    );
  },
};
