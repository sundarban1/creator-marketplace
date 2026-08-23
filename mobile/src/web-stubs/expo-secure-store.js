// Web-only stub for expo-secure-store, which has no web implementation —
// calling it under the web bundle throws "getValueWithKeyAsync is not a
// function", which broke auth hydration and left the app stuck on the splash.
//
// Wired in metro.config.js for platform === 'web' ONLY; native builds resolve
// the real package. localStorage is NOT secure storage — the web target here
// exists for looking at screens, never for handling real credentials.
const mem = new Map();

const store = {
  get(key) {
    try { return window.localStorage.getItem(key); } catch { return mem.get(key) ?? null; }
  },
  set(key, value) {
    try { window.localStorage.setItem(key, value); } catch { mem.set(key, value); }
  },
  remove(key) {
    try { window.localStorage.removeItem(key); } catch { mem.delete(key); }
  },
};

export async function getItemAsync(key) { return store.get(key); }
export async function setItemAsync(key, value) { store.set(key, String(value)); }
export async function deleteItemAsync(key) { store.remove(key); }
export function getItem(key) { return store.get(key); }
export function setItem(key, value) { store.set(key, String(value)); }
export async function isAvailableAsync() { return true; }
export const WHEN_UNLOCKED = 'whenUnlocked';
export const AFTER_FIRST_UNLOCK = 'afterFirstUnlock';
export default { getItemAsync, setItemAsync, deleteItemAsync, getItem, setItem, isAvailableAsync };
