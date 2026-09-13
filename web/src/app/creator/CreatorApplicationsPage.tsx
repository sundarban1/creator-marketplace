import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useT } from '../i18n';
import { fadeUp, stagger } from '../../pages/landing/lib/motion';
import { DashPageHeader } from './dash-ui/DashPageHeader';
import { DashTabs } from './dash-ui/DashTabs';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { DashApplicationCard } from './dash-ui/DashApplicationCard';
import { DashInvitationCard } from './dash-ui/DashInvitationCard';
import { useApplications } from './useApplications';
import { useInvitations } from './useInvitations';

const APPLICATION_TABS = ['all', 'pending', 'active', 'completed', 'closed'] as const;
const TABS = ['invited', ...APPLICATION_TABS] as const;
type Tab = (typeof TABS)[number];

export function CreatorApplicationsPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.includes(params.get('tab') as Tab) ? params.get('tab') : 'all') as Tab;

  const buckets = useApplications();
  const invitations = useInvitations();
  const list = tab === 'invited' ? [] : buckets[tab];

  return (
    <>
      <DashPageHeader
        title={t('applications.title')}
        description={t('applications.subtitle')}
      />

      <DashTabs
        value={tab}
        onChange={(v) => setParams(v === 'all' ? {} : { tab: v }, { replace: true })}
        tabs={TABS.map((v) =>
          v === 'invited'
            ? { value: v, label: t('applications.tabInvited'), count: invitations.loading ? undefined : invitations.pendingCount }
            : { value: v, label: t(`applications.tab${v[0].toUpperCase()}${v.slice(1)}`), count: buckets.loading ? undefined : buckets[v].length },
        )}
      />

      <div className="mt-6">
        {tab === 'invited' ? (
          invitations.loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-2xl" />
              ))}
            </div>
          ) : invitations.error ? (
            <EmptyState
              variant="error"
              title={t('common.somethingWrong')}
              action={{ label: t('common.retry'), onClick: invitations.reload }}
            />
          ) : invitations.items.length === 0 ? (
            <EmptyState variant="empty" title={t('applications.invitedEmptyTitle')} description={t('applications.invitedEmptyBody')} />
          ) : (
            <motion.div key={tab} initial="hidden" animate="show" variants={stagger(0.04)} className="grid gap-3 lg:grid-cols-2">
              {invitations.items.map((inv) => (
                <motion.div key={inv.id} variants={fadeUp} className="min-w-0">
                  <DashInvitationCard invitation={inv} onChange={invitations.setItem} />
                </motion.div>
              ))}
            </motion.div>
          )
        ) : buckets.loading ? (
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
