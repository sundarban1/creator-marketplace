import { request } from '@/lib/api';

export interface ApiCategory {
  id: string;
  icon: string;
  iconBg: string;
  color: string;
  name: string;
  key: string;
}

export const categoryService = {
  /** Omit `scope` to get every active category regardless of which side created it
   *  (needed for display lookups that must resolve a category no matter who owns it). */
  async getCategories(scope?: 'CREATOR' | 'BUSINESS'): Promise<ApiCategory[]> {
    const res = await request<ApiCategory[]>('GET', '/api/categories', undefined, scope ? { scope } : undefined);
    return res.data;
  },
};
