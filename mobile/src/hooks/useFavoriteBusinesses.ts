import { useEffect, useState } from 'react';
import { request } from '@/lib/api';

export function useFavoriteBusinesses() {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    request<{ ids: string[] }>('GET', '/api/creator/businesses/favorites')
      .then((res) => setIds(new Set(res.data.ids)))
      .catch(() => {});
  }, []);

  async function toggle(businessId: string) {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(businessId)) next.delete(businessId);
      else next.add(businessId);
      return next;
    });

    try {
      const res = await request<{ isFavorited: boolean }>(
        'POST',
        `/api/creator/businesses/${businessId}/favorite`,
      );
      setIds((prev) => {
        const next = new Set(prev);
        if (res.data.isFavorited) next.add(businessId);
        else next.delete(businessId);
        return next;
      });
    } catch {
      setIds((prev) => {
        const next = new Set(prev);
        if (next.has(businessId)) next.delete(businessId);
        else next.add(businessId);
        return next;
      });
    }
  }

  return { favoriteIds: ids, toggle };
}
