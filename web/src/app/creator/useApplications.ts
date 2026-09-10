import { useMemo } from 'react';
import { useAsync } from '../lib/useAsync';
import { byDateAsc } from '../lib/format';
import { engagementMeta, type EngagementBucket } from '../lib/engagement';
import { fetchMyApplications, type CreatorApplication } from '../api/creator';

export interface ApplicationBuckets {
  all: CreatorApplication[];
  pending: CreatorApplication[];
  active: CreatorApplication[];
  completed: CreatorApplication[];
  closed: CreatorApplication[];
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

/** Fetches every application once and groups it by engagement bucket. */
export function useApplications(): ApplicationBuckets {
  const { data, loading, error, reload } = useAsync(
    (s) => fetchMyApplications({ limit: 100 }, s),
    [],
  );

  const grouped = useMemo(() => {
    const items = data?.items ?? [];
    const by: Record<EngagementBucket, CreatorApplication[]> = {
      pending: [],
      active: [],
      completed: [],
      closed: [],
    };
    for (const a of items) by[engagementMeta(a.engagementState).bucket].push(a);

    // Active work sorted by nearest deadline; everything else newest-first.
    by.active.sort((x, y) => {
      if (x.contentDeadline && y.contentDeadline) return byDateAsc(x.contentDeadline, y.contentDeadline);
      if (x.contentDeadline) return -1;
      if (y.contentDeadline) return 1;
      return byDateAsc(y.createdAt, x.createdAt);
    });
    for (const k of ['pending', 'completed', 'closed'] as const) {
      by[k].sort((x, y) => byDateAsc(y.createdAt, x.createdAt));
    }

    return { all: items, ...by };
  }, [data]);

  return { ...grouped, loading, error, reload };
}
