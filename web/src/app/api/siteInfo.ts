import { apiRequest } from '../lib/apiClient';

/**
 * Public, admin-managed contact details (`GET /api/public/site-info`) — the
 * same source as the landing footer. Only the fields the floating support
 * widget reads: `supportPhone` is the admin's "Inquiry & Customer Support
 * Phone" (`platform.supportPhone`, used for calls), `whatsapp` is "WhatsApp
 * Support Number" (`platform.supportWhatsapp`), `email` is "Contact Email"
 * (`platform.supportEmail`). Empty string = not configured.
 */
export interface SupportSiteInfo {
  supportPhone: string;
  whatsapp: string;
  email: string;
}

/**
 * Memoized, in-flight-deduped — the widget mounts in several layouts and the
 * values don't change within a session. A failure clears the cache so the
 * next open retries instead of pinning the error for the whole visit.
 */
let cached: Promise<SupportSiteInfo> | null = null;

/** Drop the cached copy — called when an admin saves settings (socket push). */
export function invalidateSupportSiteInfo(): void {
  cached = null;
}

export function getSupportSiteInfo(): Promise<SupportSiteInfo> {
  if (!cached) {
    cached = apiRequest<SupportSiteInfo>('GET', '/api/public/site-info', undefined, { anonymous: true })
      .then((r) => ({
        supportPhone: r.data?.supportPhone ?? '',
        whatsapp: r.data?.whatsapp ?? '',
        email: r.data?.email ?? '',
      }))
      .catch((err: unknown) => {
        cached = null;
        throw err;
      });
  }
  return cached;
}
