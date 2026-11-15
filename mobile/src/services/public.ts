// Signed-out ("guest") reads — the /api/public/* namespace the web marketplace
// already uses. Everything here works without a session; the backend masks
// private profiles (isPrivate) and only returns published content.
import { request } from '@/lib/api';
import type { ApiCreatorListResponse, ApiCreatorPublicProfile } from '@/services/creator';
import type { BusinessDetailResult, BusinessListItem } from '@/services/business';

export const publicService = {
  /** Only creators who opted into a public profile (`publicOnly=true`). */
  async listCreators(params?: { page?: number; limit?: number; search?: string }): Promise<ApiCreatorListResponse> {
    const res = await request<ApiCreatorListResponse>('GET', '/api/public/creators', undefined, {
      page:       params?.page ?? 1,
      limit:      params?.limit ?? 12,
      search:     params?.search?.trim() || undefined,
      publicOnly: 'true',
    });
    return res.data;
  },

  /** id or username. */
  async getCreator(handle: string): Promise<ApiCreatorPublicProfile> {
    const res = await request<ApiCreatorPublicProfile>('GET', `/api/public/creators/${encodeURIComponent(handle)}`);
    return res.data;
  },

  async listBusinesses(params?: { page?: number; limit?: number; search?: string }): Promise<{ businesses: BusinessListItem[]; total: number }> {
    const res = await request<{ businesses: BusinessListItem[]; total: number }>('GET', '/api/public/businesses', undefined, {
      page:   params?.page ?? 1,
      limit:  params?.limit ?? 20,
      search: params?.search?.trim() || undefined,
    });
    return res.data;
  },

  /** id or slug. */
  async getBusiness(idOrSlug: string): Promise<BusinessDetailResult> {
    const res = await request<BusinessDetailResult>('GET', `/api/public/businesses/${encodeURIComponent(idOrSlug)}`);
    return res.data;
  },
};
