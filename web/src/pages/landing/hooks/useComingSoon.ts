import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export interface ComingSoonFlags {
  /** iOS / App Store download button should show a Coming Soon badge instead. */
  ios: boolean;
  /** Android / Google Play download button should show a Coming Soon badge instead. */
  android: boolean;
}

/** Fetches the public per-store coming-soon flags once and shares them across
 *  whichever sections need them. Defaults to false for both (real download
 *  buttons) while loading and on fetch failure — erring toward showing a live
 *  launch is safer than erring toward hiding one. */
export function useComingSoon(): ComingSoonFlags {
  const [flags, setFlags] = useState<ComingSoonFlags>({ ios: false, android: false });

  useEffect(() => {
    let cancelled = false;
    api.public.comingSoon()
      .then((res) => {
        if (!cancelled) setFlags({ ios: res.data.ios, android: res.data.android });
      })
      .catch(() => { /* fall back to showing real download buttons */ });
    return () => { cancelled = true; };
  }, []);

  return flags;
}
