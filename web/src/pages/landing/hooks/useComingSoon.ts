import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

/** Fetches the public coming-soon flag once and shares it across whichever
 *  sections need it. Defaults to false (real download buttons) both while
 *  loading and on fetch failure — erring toward showing a live launch is
 *  safer than erring toward hiding one. */
export function useComingSoon() {
  const [comingSoon, setComingSoon] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.public.comingSoon()
      .then((res) => { if (!cancelled) setComingSoon(res.data.comingSoon); })
      .catch(() => { /* fall back to showing real download buttons */ });
    return () => { cancelled = true; };
  }, []);

  return comingSoon;
}
