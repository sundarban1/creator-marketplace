import { useEffect, useState } from 'react';
import { api, type ApiPartner } from '../../../lib/api';

type PublicPartner = Pick<ApiPartner, 'id' | 'name' | 'logoUrl' | 'websiteUrl'>;

/** Active partners (admin → Partners) for the marquee under the hero. Empty
 *  until an admin publishes one — callers fall back to real creators. */
export function usePartners() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [partners, setPartners] = useState<PublicPartner[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.public.partners()
      .then((res) => {
        if (cancelled) return;
        setPartners(res.data);
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, []);

  return { status, partners };
}
