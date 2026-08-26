import { request } from '@/lib/api';

export interface ApiPaymentMethod {
  id: string;
  key: string;
  name: string;
  iconUrl: string | null;
  color: string;
  order: number;
}

export const paymentMethodService = {
  async getPaymentMethods(): Promise<ApiPaymentMethod[]> {
    const res = await request<ApiPaymentMethod[]>('GET', '/api/payment-methods');
    return res.data;
  },
};
