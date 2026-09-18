import { apiRequest } from '../lib/apiClient';

/**
 * Admin-managed payment method catalog — same public, unauthenticated
 * endpoint mobile reads from (`GET /api/payment-methods`). Only methods the
 * admin has set to ACTIVE are returned, ordered the way they'd appear in a
 * picker.
 */
export interface PublicPaymentMethod {
  id: string;
  key: string;
  name: string;
  iconUrl: string | null;
  color: string;
  order: number;
}

export function fetchPaymentMethods(signal?: AbortSignal): Promise<PublicPaymentMethod[]> {
  return apiRequest<PublicPaymentMethod[]>('GET', '/api/payment-methods', undefined, {
    anonymous: true,
    signal,
  }).then((r) => r.data);
}
