import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useT } from '../i18n';
import { fadeUp, stagger } from '../../pages/landing/lib/motion';
import { useAsync } from '../lib/useAsync';
import { fetchBusinessApplications } from '../api/business';
import { byDateAsc } from '../lib/format';
import { PageHeader } from '../ui/PageHeader';
import { Tabs } from '../ui/Tabs';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { BizApplicationCard } from './BizApplicationCard';

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

  return (
    <>
      <PageHeader eyebrow={t('biz.eyebrowApps')} title={t('biz.appsTitle')} description={t('biz.appsSubtitle')} />

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
          <div className="grid gap-3 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : apps.error ? (
          <EmptyState variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: apps.reload }} />
        ) : list.length === 0 ? (
          <EmptyState variant="empty" title={t('biz.nothingToReview')} />
        ) : (
          <motion.div
            key={tab}
            initial="hidden"
            animate="show"
            variants={stagger(0.04)}
            className="grid gap-3 lg:grid-cols-2"
          >
            {list.map((a) => (
              <motion.div key={a.id} variants={fadeUp} className="min-w-0">
                <BizApplicationCard application={a} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </>
  );
}
