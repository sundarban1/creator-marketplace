import { useQuery } from '@tanstack/react-query';
import { request } from '@/lib/api';
import { STALE } from '@/lib/queryClient';

/**
 * Public, admin-managed contact details (`GET /api/public/site-info`, the same
 * source as the web footer + floating support widget). `supportPhone` is the
 * admin's "Inquiry & Customer Support Phone" (`platform.supportPhone`, calls),
 * `whatsapp` is "WhatsApp Support Number" (`platform.supportWhatsapp`), `email`
 * is "Contact Email" (`platform.supportEmail`). Empty string = not configured.
 */
export type SupportSiteInfo = {
  supportPhone: string;
  whatsapp: string;
  email: string;
};

export const siteInfoService = {
  async getSupportContacts(): Promise<SupportSiteInfo> {
    const res = await request<Partial<SupportSiteInfo>>('GET', '/api/public/site-info');
    return {
      supportPhone: res.data?.supportPhone ?? '',
      whatsapp: res.data?.whatsapp ?? '',
      email: res.data?.email ?? '',
    };
  },
};

/** Fetched only while a support surface is on screen (`enabled`), then cached. */
export function useSupportContacts(enabled = true) {
  return useQuery({
    queryKey: ['siteInfo', 'support'],
    queryFn: () => siteInfoService.getSupportContacts(),
    staleTime: STALE.static,
    enabled,
  });
}
