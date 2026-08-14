import { useEffect, useState } from 'react';
import { api, type SiteInfo } from '../../../lib/api';

/** Fetches admin-managed contact details + social links for the landing
 *  footer. `null` while loading or on failure — the footer just renders
 *  nothing extra in that case rather than showing broken/empty rows. */
export function useSiteInfo() {
  const [info, setInfo] = useState<SiteInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.public.siteInfo()
      .then((res) => { if (!cancelled) setInfo(res.data); })
      .catch(() => { /* footer simply omits the contact block on failure */ });
    return () => { cancelled = true; };
  }, []);

  return info;
}
