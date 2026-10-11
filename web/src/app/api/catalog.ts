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

export function fetchCategories(
  signal?: AbortSignal,
  scope?: 'BOTH' | 'CREATOR' | 'BUSINESS',
): Promise<Category[]> {
  return apiRequest<Category[]>('GET', '/api/categories', undefined, {
    anonymous: true,
    signal,
    params: { scope },
  }).then((r) => r.data.filter((c) => c.status === 'ACTIVE'));
}

/** Admin-managed active platform catalog (names) — the source for every
 *  platform *picker*. fetchCampaignPlatforms below only lists platforms that
 *  live campaigns already use, so it's for browse filters, not pickers. */
export function fetchActivePlatforms(signal?: AbortSignal): Promise<string[]> {
  return apiRequest<{ name: string }[]>('GET', '/api/platforms', undefined, {
    anonymous: true,
    signal,
  }).then((r) => r.data.map((p) => p.name));
}

export function fetchCampaignPlatforms(signal?: AbortSignal): Promise<string[]> {
  return apiRequest<string[]>('GET', '/api/campaigns/platforms', undefined, {
    anonymous: true,
    signal,
  }).then((r) => r.data);
}

export interface PaymentMethod {
  id: string;
  key: string;
  name: string;
  iconUrl: string | null;
  color: string;
  order: number;
}

export function fetchPaymentMethods(signal?: AbortSignal): Promise<PaymentMethod[]> {
  return apiRequest<PaymentMethod[]>('GET', '/api/payment-methods', undefined, {
    anonymous: true,
    signal,
  }).then((r) => r.data);
}
