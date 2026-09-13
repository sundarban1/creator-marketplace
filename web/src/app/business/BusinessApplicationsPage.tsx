import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useT } from '../i18n';
import { fadeUp, stagger } from '../../pages/landing/lib/motion';
import { useAsync } from '../lib/useAsync';
import { fetchBusinessApplications, type BusinessApplication } from '../api/business';
import { byDateAsc, compactNumber, rupees } from '../lib/format';
import { PageHeader } from '../ui/PageHeader';
import { Tabs } from '../ui/Tabs';
import { Card, CardHeader } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { EngagementBadge } from '../creator/EngagementBadge';

const TABS = ['new', 'accepted', 'rejected'] as const;
type Tab = (typeof TABS)[number];

export function BusinessApplicationsPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.includes(params.get('tab') as Tab) ? params.get('tab') : 'new') as Tab;

  const apps = useAsync((s) => fetchBusinessApplications({ limit: 200 }, s), []);

  const buckets = useMemo(() => {
    const list = apps.data?.items ?? [];
    const sorted = [...list].sort((a, b) => byDateAsc(b.createdAt, a.createdAt));
    return {
      new: sorted.filter((a) => a.engagementState === 'PROPOSAL_PENDING'),
      accepted: sorted.filter(
        (a) => a.status !== 'REJECTED' && a.engagementState !== 'PROPOSAL_PENDING' && a.status !== 'EXPIRED',
      ),
      rejected: sorted.filter((a) => a.status === 'REJECTED' || a.engagementState === 'PROPOSAL_REJECTED'),
    };
  }, [apps.data]);

  const list = buckets[tab];

  // Grouped by campaign — a business reviewing "New" proposals thinks in
  // terms of "who applied to Summer Fashion", not one global mixed feed.
  const byCampaign = useMemo(() => {
    const groups = new Map<string, { title: string; campaignId: string | undefined; items: BusinessApplication[] }>();
    for (const a of list) {
      const key = a.campaignId ?? 'unknown';
      const existing = groups.get(key);
      if (existing) existing.items.push(a);
      else groups.set(key, { title: a.campaign?.title ?? '—', campaignId: a.campaignId, items: [a] });
    }
    return [...groups.values()];
  }, [list]);

  return (
    <>
      <PageHeader title={t('biz.appsTitle')} description={t('biz.appsSubtitle')} />

      <Tabs
        value={tab}
        onChange={(v) => setParams(v === 'new' ? {} : { tab: v }, { replace: true })}
        tabs={TABS.map((v) => ({
          value: v,
          label: t(`biz.appTab${v[0].toUpperCase()}${v.slice(1)}`),
          count: apps.loading ? undefined : buckets[v].length,
        }))}
      />

      <div className="mt-6">
        {apps.loading ? (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        ) : apps.error ? (
          <EmptyState variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: apps.reload }} />
        ) : list.length === 0 ? (
          <EmptyState variant="empty" title={t('biz.nothingToReview')} />
        ) : (
          <motion.div key={tab} initial="hidden" animate="show" variants={stagger(0.06)} className="space-y-5">
            {byCampaign.map((group) => (
              <motion.div key={group.campaignId ?? group.title} variants={fadeUp}>
                <Card>
                  <CardHeader
                    title={group.title}
                    action={
                      <span className="text-[12.5px] text-ink-soft">
                        {t('biz.applicantsCount', { count: group.items.length })}
                      </span>
                    }
                  />
                  <ul className="divide-y divide-line">
                    {group.items.map((a) => (
                      <li key={a.id}>
                        <Link
                          to={group.campaignId ? `/business/events/${group.campaignId}` : '/business/applications'}
                          className="flex items-center gap-3 py-3 transition-colors hover:bg-surface-dim -mx-2 px-2 rounded-xl"
                        >
                          <Avatar name={a.creator?.fullName ?? 'Creator'} src={a.creator?.avatarUrl ?? null} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-medium text-ink">{a.creator?.fullName ?? 'Creator'}</p>
                            {a.creator?.location && (
                              <p className="truncate text-[12px] text-ink-soft">{a.creator.location}</p>
                            )}
                          </div>
                          {a.creator?.followers !== undefined && a.creator.followers > 0 && (
                            <span className="hidden flex-shrink-0 text-[12.5px] text-ink-soft sm:block">
                              {compactNumber(a.creator.followers)} {t('public.followers')}
                            </span>
                          )}
                          <span className="flex-shrink-0 text-[13px] font-semibold text-ink">{rupees(a.proposedRate)}</span>
                          <EngagementBadge state={a.engagementState} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </>
  );
}
