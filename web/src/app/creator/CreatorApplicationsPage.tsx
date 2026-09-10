import { useSearchParams } from 'react-router-dom';
import { useT } from '../i18n';
import { PageHeader } from '../ui/PageHeader';
import { Tabs } from '../ui/Tabs';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { ApplicationCard } from './ApplicationCard';
import { useApplications } from './useApplications';

const TABS = ['all', 'pending', 'active', 'completed', 'closed'] as const;
type Tab = (typeof TABS)[number];

export function CreatorApplicationsPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.includes(params.get('tab') as Tab) ? params.get('tab') : 'all') as Tab;

  const buckets = useApplications();
  const list = buckets[tab];

  return (
    <>
      <PageHeader title={t('applications.title')} description={t('applications.subtitle')} />

      <Tabs
        value={tab}
        onChange={(v) => setParams(v === 'all' ? {} : { tab: v }, { replace: true })}
        tabs={TABS.map((v) => ({
          value: v,
          label: t(`applications.tab${v[0].toUpperCase()}${v.slice(1)}`),
          count: buckets.loading ? undefined : buckets[v].length,
        }))}
      />

      <div className="mt-6">
        {buckets.loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : buckets.error ? (
          <EmptyState
            variant="error"
            title={t('common.somethingWrong')}
            action={{ label: t('common.retry'), onClick: buckets.reload }}
          />
        ) : list.length === 0 ? (
          <EmptyState
            variant={tab === 'all' ? 'empty' : 'no-results'}
            title={tab === 'all' ? t('applications.emptyAllTitle') : t('applications.emptyTabTitle')}
            description={
              tab === 'all'
                ? t('applications.emptyAllBody')
                : t('applications.emptyTabBody', { tab: t(`applications.tab${tab[0].toUpperCase()}${tab.slice(1)}`).toLowerCase() })
            }
            action={tab === 'all' ? { label: t('applications.browseEvents'), href: '/creator/events' } : undefined}
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
