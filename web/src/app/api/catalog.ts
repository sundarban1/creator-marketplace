import { apiRequest } from '../lib/apiClient';

export interface Category {
  id: string;
  key: string;
  name: string;
  scope: 'BOTH' | 'CREATOR' | 'BUSINESS';
  status: string;
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
