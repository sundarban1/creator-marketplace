import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useT } from '../i18n';
import { fadeUp, stagger } from '../../pages/landing/lib/motion';
import { DashPageHeader } from './dash-ui/DashPageHeader';
import { DashTabs } from './dash-ui/DashTabs';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { DashApplicationCard } from './dash-ui/DashApplicationCard';
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
      <DashPageHeader title={t('work.title')} description={t('work.subtitle')} />

      <DashTabs
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
          <motion.div
            key={tab}
            initial="hidden"
            animate="show"
            variants={stagger(0.04)}
            className="grid gap-3 lg:grid-cols-2"
          >
            {list.map((a) => (
              <motion.div key={a.id} variants={fadeUp} className="min-w-0">
                <DashApplicationCard application={a} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </>
  );
}
