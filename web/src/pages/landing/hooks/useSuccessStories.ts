import { useEffect, useState } from 'react';
import { api, type ApiSuccessStory } from '../../../lib/api';

type PublicSuccessStory = Pick<ApiSuccessStory, 'id' | 'name' | 'role' | 'quote' | 'photoUrl'>;

/** Fetches active success stories once and shares the result with the Stories
 *  section. `status` distinguishes "still loading" from "resolved" (empty or
 *  not) from "failed" — the section shows real quotes, an honest empty state,
 *  or nothing while loading, but never fabricated placeholder testimonials. */
export function useSuccessStories() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [stories, setStories] = useState<PublicSuccessStory[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.public.successStories()
      .then((res) => {
        if (cancelled) return;
        setStories(res.data);
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, []);

  return { status, stories };
}
