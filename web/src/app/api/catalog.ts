import { apiRequest } from '../lib/apiClient';

export interface Category {
  id: string;
  key: string;
  name: string;
  scope: 'BOTH' | 'CREATOR' | 'BUSINESS';
  status: string;
  /** FontAwesome slug (see src/lib/iconOptions) — admin-set, shared with mobile. */
  icon: string;
  iconBg: string;
  color: string;
}

export function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  return apiRequest<Category[]>('GET', '/api/categories', undefined, { anonymous: true, signal }).then(
    (r) => r.data.filter((c) => c.status === 'ACTIVE'),
  );
}

export function fetchCampaignPlatforms(signal?: AbortSignal): Promise<string[]> {
  return apiRequest<string[]>('GET', '/api/campaigns/platforms', undefined, {
    anonymous: true,
    signal,
  }).then((r) => r.data);
}
