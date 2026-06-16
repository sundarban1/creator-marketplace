import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'favorite_businesses';

async function loadIds(): Promise<Set<string>> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {}
  return new Set();
}

async function saveIds(ids: Set<string>): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify([...ids]));
  } catch {}
}

export function useFavoriteBusinesses() {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadIds().then(setIds).catch(() => {});
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      void saveIds(next);
      return next;
    });
  }, []);

  return {
    favoriteIds: ids,
    isFavorited: (id: string) => ids.has(id),
    toggle,
  };
}
