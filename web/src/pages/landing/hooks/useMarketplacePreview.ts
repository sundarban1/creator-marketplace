import { useEffect, useMemo, useState } from 'react';
import { api, type PublicCreatorLite, type PublicBusinessLite } from '../../../lib/api';
import { fetchCategories, type Category } from '../../../app/api/catalog';
import { makeCategoryLookup } from '../../../app/public/categoryLookup';

/**
 * Fetches a small sample of public creators + businesses once and shares it
 * with the landing page's two marketplace preview sections. Each stays `null`
 * until it resolves; on failure it stays `null` and the section renders its
 * static i18n fallback (mirrors useLandingStats / useSuccessStories).
 *
 * Also loads the category catalog so the preview cards can show each category
 * as a colored icon pill (matching the /creators + /businesses browse cards).
 */
export function useMarketplacePreview() {
  const [creators, setCreators] = useState<PublicCreatorLite[] | null>(null);
  const [businesses, setBusinesses] = useState<PublicBusinessLite[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.public.creators(12)
      .then((res) => { if (!cancelled) setCreators(res.data.creators); })
      .catch(() => { /* section falls back to static copy */ });
    api.public.businesses(12)
      .then((res) => { if (!cancelled) setBusinesses(res.data.businesses); })
      .catch(() => { /* section falls back to static copy */ });
    fetchCategories()
      .then((cats) => { if (!cancelled) setCategories(cats); })
      .catch(() => { /* pills fall back to a plain tag icon */ });
    return () => { cancelled = true; };
  }, []);

  const categoryMeta = useMemo(() => makeCategoryLookup(categories), [categories]);

  return { creators, businesses, categoryMeta };
}
