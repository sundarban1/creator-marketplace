import { request } from '@/lib/api';

export interface ApiCategory {
  id: string;
  icon: string;
  iconBg: string;
  color: string;
  name: string;
  key: string;
  // Section header for the provider-role picker (e.g. "Photography", "Events")
  // — only meaningful for CREATOR-scope rows; industry (BOTH-scope) rows leave
  // this null, they're not grouped.
  group: string | null;
}

export const categoryService = {
  /** Omit `scope` to get every active category regardless of which side created it
   *  (needed for display lookups that must resolve a category no matter who owns it).
   *  `strict` opts out of the default CREATOR/BUSINESS -> "+ BOTH" widening — pass
   *  it when BOTH-scope content-niche rows would be wrong to mix in (e.g. the
   *  provider-Service category picker, which needs actual provider types only). */
  async getCategories(scope?: 'CREATOR' | 'BUSINESS' | 'BOTH', strict?: boolean): Promise<ApiCategory[]> {
    const res = await request<ApiCategory[]>('GET', '/api/categories', undefined, {
      scope,
      strict: strict ? 'true' : undefined,
    });
    return res.data;
  },
};
