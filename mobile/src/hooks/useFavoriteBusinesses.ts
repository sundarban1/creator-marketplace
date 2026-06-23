import { useEffect, useState } from 'react';
import { request } from '@/lib/api';

export function useFavoriteBusinesses() {
  const [ids, setIds] = useState<Set<string>>(new Set());

  function loadIds() {
    request<{ ids: string[] }>('GET', '/api/creator/businesses/favorites')
      .then((res) => setIds(new Set(res.data.ids)))
      .catch(() => {});
  }

  useEffect(() => { loadIds(); }, []);

  async function toggle(businessId: string): Promise<boolean> {
    const wasIn = ids.has(businessId);

    // Optimistic update
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
      // Sync exactly with server truth
      setIds((prev) => {
        const next = new Set(prev);
        if (res.data.isFavorited) next.add(businessId);
        else next.delete(businessId);
        return next;
      });
      return res.data.isFavorited;
    } catch (err) {
      // Roll back to original state
      setIds((prev) => {
        const next = new Set(prev);
        if (wasIn) next.add(businessId);
        else next.delete(businessId);
        return next;
      });
      throw err; // Let caller handle the error
    }
  }

  return { favoriteIds: ids, toggle, reloadIds: loadIds };
}
