import { useEffect, useState } from 'react';
import { api, type LandingStats } from '../../../lib/api';

/** Fetches the single public landing-stats endpoint once (real creator/business
 *  counts + the live category list) and shares the result across whichever
 *  sections need it, instead of each section fetching independently. */
export function useLandingStats() {
  const [stats, setStats] = useState<LandingStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.public.landingStats()
      .then((res) => { if (!cancelled) setStats(res.data); })
      .catch(() => { /* sections fall back to static copy on failure */ });
    return () => { cancelled = true; };
  }, []);

  return stats;
}
