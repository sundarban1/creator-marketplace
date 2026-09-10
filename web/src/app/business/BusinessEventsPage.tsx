import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchMyCampaigns } from '../api/business';
import { PageHeader } from '../ui/PageHeader';
import { Tabs } from '../ui/Tabs';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { BizEventCard } from './BizEventCard';

const TABS = ['active', 'draft', 'closed'] as const;
type Tab = (typeof TABS)[number];

const MATCH: Record<Tab, (s: string) => boolean> = {
  active: (s) => s === 'ACTIVE' || s === 'PENDING_APPROVAL' || s === 'PAUSED',
  draft: (s) => s === 'DRAFT',
  closed: (s) => s === 'CLOSED' || s === 'CANCELLED' || s === 'EXPIRED',
};

export function BusinessEventsPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.includes(params.get('tab') as Tab) ? params.get('tab') : 'active') as Tab;

  const campaigns = useAsync((s) => fetchMyCampaigns({ limit: 100 }, s), []);

  const buckets = useMemo(() => {
    const list = campaigns.data?.items ?? [];
    return {
      active: list.filter((c) => MATCH.active(c.status)),
      draft: list.filter((c) => MATCH.draft(c.status)),
      closed: list.filter((c) => MATCH.closed(c.status)),
    };
  }, [campaigns.data]);

  const list = buckets[tab];

  return (
    <>
      <PageHeader
        title={t('biz.eventsTitle')}
        description={t('biz.eventsSubtitle')}
        actions={
          <Link to="/business/events/create">
            <Button size="sm">
              <Plus size={15} />
              {t('biz.newEvent')}
            </Button>
          </Link>
        }
      />

      <Tabs
        value={tab}
        onChange={(v) => setParams(v === 'active' ? {} : { tab: v }, { replace: true })}
        tabs={TABS.map((v) => ({
          value: v,
          label: t(`biz.eventTab${v[0].toUpperCase()}${v.slice(1)}`),
          count: campaigns.loading ? undefined : buckets[v].length,
        }))}
      />

      <div className="mt-6">
        {campaigns.loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72 w-full rounded-2xl" />
            ))}
          </div>
        ) : campaigns.error ? (
          <EmptyState variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: campaigns.reload }} />
        ) : list.length === 0 ? (
          <EmptyState
            variant="no-events"
            title={t('biz.noEventsTitle')}
            description={t('biz.noEventsBody')}
            action={{ label: t('biz.newEvent'), href: '/business/events/create' }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <BizEventCard key={c.id} event={c} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
