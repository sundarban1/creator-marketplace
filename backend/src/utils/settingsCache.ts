import { AdminRepository } from '../modules/admin/admin.repository';

const adminRepo = new AdminRepository();

// Rate-limit middleware reads platform settings on every single request — a
// bare getSetting()/getSettings() DB round-trip per request would be wasteful.
// This is a process-local cache (fine even across multiple instances, since
// each just serves slightly-stale reads for at most CACHE_TTL_MS); it is not a
// source of truth, PlatformSetting still is.
const CACHE_TTL_MS = 30_000;

let cache: Record<string, unknown> | null = null;
let cachedAt = 0;

export async function getCachedSettings(): Promise<Record<string, unknown>> {
  const now = Date.now();
  if (!cache || now - cachedAt > CACHE_TTL_MS) {
    cache = await adminRepo.getSettings();
    cachedAt = now;
  }
  return cache;
}

// Called by AdminService.updateSettings so a saved change in the dashboard
// takes effect immediately instead of waiting out the TTL above.
export function invalidateSettingsCache(): void {
  cache = null;
}
