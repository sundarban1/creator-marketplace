import { useSearchParams } from 'react-router-dom';
import { useT } from '../i18n';
import { PageHeader } from '../ui/PageHeader';
import { Tabs } from '../ui/Tabs';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { ApplicationCard } from './ApplicationCard';
import { useApplications } from './useApplications';

const TABS = ['active', 'completed'] as const;
type Tab = (typeof TABS)[number];

/** Accepted work only — a focused view of the same engagements. */
export function CreatorWorkPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.includes(params.get('tab') as Tab) ? params.get('tab') : 'active') as Tab;

  const buckets = useApplications();
  const list = buckets[tab];

  return (
    <>
      <PageHeader title={t('work.title')} description={t('work.subtitle')} />

      <Tabs
        value={tab}
        onChange={(v) => setParams(v === 'active' ? {} : { tab: v }, { replace: true })}
        tabs={TABS.map((v) => ({
          value: v,
          label: t(`applications.tab${v[0].toUpperCase()}${v.slice(1)}`),
          count: buckets.loading ? undefined : buckets[v].length,
        }))}
      />

      <div className="mt-6">
        {buckets.loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : buckets.error ? (
          <EmptyState variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: buckets.reload }} />
        ) : list.length === 0 ? (
          <EmptyState
            variant="empty"
            title={t('work.emptyTitle')}
            description={t('work.emptyBody')}
            action={{ label: t('applications.browseEvents'), href: '/creator/events' }}
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {list.map((a) => (
              <ApplicationCard key={a.id} application={a} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
