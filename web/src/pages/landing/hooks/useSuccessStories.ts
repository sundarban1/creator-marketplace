import { useEffect, useState } from 'react';
import { api, type ApiSuccessStory } from '../../../lib/api';

type PublicSuccessStory = Pick<ApiSuccessStory, 'id' | 'name' | 'role' | 'quote' | 'photoUrl'>;

/** Fetches active success stories once and shares the result with the Stories
 *  section, falling back to the static i18n copy on failure (mirrors useLandingStats). */
export function useSuccessStories() {
  const [stories, setStories] = useState<PublicSuccessStory[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.public.successStories()
      .then((res) => { if (!cancelled) setStories(res.data); })
      .catch(() => { /* section falls back to static copy on failure */ });
    return () => { cancelled = true; };
  }, []);

  return stories;
}
