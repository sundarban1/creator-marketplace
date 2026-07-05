import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'ch_device_id';

let cachedDeviceId: string | null = null;

/** Synchronous read of the already-warmed device id, if any. Returns null until warmDeviceId() resolves. */
export function getCachedDeviceId(): string | null {
  return cachedDeviceId;
}

/** Generates (once, ever) and persists a per-install device id, then caches it for synchronous access. */
export async function warmDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) {
    cachedDeviceId = existing;
    return existing;
  }

  const id = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  cachedDeviceId = id;
  return id;
}
