import { request } from '@/lib/api';

export interface ApiCategory {
  id: string;
  icon: string;
  iconBg: string;
  name: string;
  key: string;
}

export const categoryService = {
  async getCategories(scope: 'CREATOR' | 'BUSINESS'): Promise<ApiCategory[]> {
    const res = await request<ApiCategory[]>('GET', '/api/categories', undefined, { scope });
    return res.data;
  },
};
