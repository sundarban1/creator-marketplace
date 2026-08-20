import { request } from '@/lib/api';
import type { ApiCategory } from './category';

export type PricingModel = 'PER_PROJECT' | 'PER_HOUR' | 'PER_DAY' | 'PER_CAMPAIGN' | 'CUSTOM_QUOTE';
export type ServiceStatus = 'ACTIVE' | 'HIDDEN' | 'REPORTED' | 'REMOVED';

export interface ApiService {
  id: string;
  creatorProfileId: string;
  categoryId: string;
  category: ApiCategory;
  name: string;
  description: string;
  startingPrice: number | null;
  pricingModel: PricingModel;
  deliveryTime: string | null;
  whatsIncluded: string[];
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
  // Only present on the public discovery endpoints (`listPublic`/`getPublicDetail`)
  // — the backend's `findManyPublic`/`findById` both `include: { creatorProfile: true }`,
  // but the owner-side endpoints (`listMine`/`create`/`update`) never populate this.
  creatorProfile?: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
    location: string | null;
    isVerified: boolean;
  };
}

export interface CreateServiceInput {
  categoryId: string;
  name: string;
  description: string;
  startingPrice?: number;
  pricingModel: PricingModel;
  deliveryTime?: string;
  whatsIncluded?: string[];
}

export type UpdateServiceInput = Partial<CreateServiceInput>;

export const serviceService = {
  // ── Provider self-service ───────────────────────────────────────────────────

  async listMine(): Promise<ApiService[]> {
    const res = await request<ApiService[]>('GET', '/api/creator/services');
    return res.data;
  },

  async create(data: CreateServiceInput): Promise<ApiService> {
    const res = await request<ApiService>('POST', '/api/creator/services', data);
    return res.data;
  },

  async update(id: string, data: UpdateServiceInput): Promise<ApiService> {
    const res = await request<ApiService>('PUT', `/api/creator/services/${id}`, data);
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await request('DELETE', `/api/creator/services/${id}`);
  },

  // ── Public discovery (business side) ────────────────────────────────────────

  async listPublic(params?: { categoryId?: string; search?: string; page?: number; limit?: number }): Promise<{ items: ApiService[]; total: number }> {
    const res = await request<{ items: ApiService[]; total: number }>('GET', '/api/services', undefined, {
      categoryId: params?.categoryId,
      search:     params?.search,
      page:       params?.page,
      limit:      params?.limit,
    });
    return res.data;
  },

  async getPublicDetail(id: string): Promise<ApiService> {
    const res = await request<ApiService>('GET', `/api/services/${id}`);
    return res.data;
  },
};
