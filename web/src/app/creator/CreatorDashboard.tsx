import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, FileText, Wallet, CalendarClock, ArrowRight } from 'lucide-react';
import { useAppAuth } from '../auth/AppAuthContext';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { rupees, isFuture, byDateAsc } from '../lib/format';
import { useDeadlineLabel } from '../lib/useDeadlineLabel';
import { isActiveWork } from '../lib/engagement';
import { fetchWalletSummary, fetchMyApplications, fetchNotifications } from '../api/creator';
import { fetchPublicEvents } from '../api/publicMarketplace';
import { cn } from '../ui/cn';
import { PageHeader } from '../ui/PageHeader';
import { StatCard } from '../ui/StatCard';
import { Card, CardHeader } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { ApplicationCard } from './ApplicationCard';
import { EventCard } from '../public/EventCard';

export function CreatorDashboard() {
  const { user } = useAppAuth();
  const t = useT();
  const fmtDeadline = useDeadlineLabel();

  const wallet = useAsync((s) => fetchWalletSummary(s), []);
  const apps = useAsync((s) => fetchMyApplications({ limit: 50 }, s), []);
  const activity = useAsync((s) => fetchNotifications(6, s), []);
  const recommended = useAsync((s) => fetchPublicEvents({ limit: 3 }, s), []);

  const { activeWork, pending, upcoming } = useMemo(() => {
    const list = apps.data?.items ?? [];
    const active = list.filter((a) => isActiveWork(a.engagementState));
    return {
      activeWork: active,
      pending: list.filter((a) => a.engagementState === 'PROPOSAL_PENDING'),
      upcoming: active
        .filter((a) => isFuture(a.contentDeadline))
        .sort((x, y) => byDateAsc(x.contentDeadline!, y.contentDeadline!)),
    };
  }, [apps.data]);

  return (
    <>
      <PageHeader title={t('dashboard.welcome', { name: user?.name ?? '' })} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t('dashboard.activeWork')}
          value={apps.loading ? undefined : activeWork.length}
          icon={Briefcase}
        />
        <StatCard
          label={t('dashboard.pendingApplications')}
          value={apps.loading ? undefined : pending.length}
          icon={FileText}
        />
        <StatCard
          label={t('dashboard.walletBalance')}
          value={wallet.loading ? undefined : rupees(wallet.data?.withdrawableBalance ?? 0)}
          icon={Wallet}
          hint={
            wallet.data && wallet.data.pendingEarnings > 0
              ? `+ ${rupees(wallet.data.pendingEarnings)} pending`
              : undefined
          }
        />
        <StatCard
          label={t('dashboard.upcomingDeadlines')}
          value={apps.loading ? undefined : upcoming.length}
          icon={CalendarClock}
          hint={
            upcoming[0]?.contentDeadline
              ? fmtDeadline(upcoming[0].contentDeadline).label
              : undefined
          }
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Active work */}
        <Card>
          <CardHeader
            title={t('dashboard.activeWorkHeading')}
            action={
              <Link to="/creator/work" className="text-[13px] font-semibold text-brand hover:underline">
                {t('dashboard.viewAll')}
              </Link>
            }
          />
          {apps.loading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          ) : apps.error ? (
            <EmptyState size="sm" variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: apps.reload }} />
          ) : activeWork.length === 0 ? (
            <EmptyState
              size="sm"
              variant="empty"
              title={t('dashboard.noActiveWork')}
              action={{ label: t('dashboard.exploreEvents'), href: '/creator/events' }}
            />
          ) : (
            <div className="space-y-3">
              {activeWork.slice(0, 4).map((a) => (
                <ApplicationCard key={a.id} application={a} />
              ))}
            </div>
          )}
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader
            title={t('dashboard.recentActivity')}
            action={
              <Link to="/creator/settings" className="text-[13px] font-semibold text-brand hover:underline">
                {t('dashboard.seeAll')}
              </Link>
            }
          />
          {activity.loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !activity.data || activity.data.length === 0 ? (
            <EmptyState size="sm" variant="empty" title={t('dashboard.noActivity')} />
          ) : (
            <ul className="divide-y divide-line">
              {activity.data.map((n) => (
                <li key={n.id} className="flex gap-3 py-3">
                  <span className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full', n.isRead ? 'bg-line-strong' : 'bg-brand')} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[12px] text-ink-soft">{n.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Recommended events */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">{t('dashboard.recommendedHeading')}</h2>
          <Link to="/creator/events" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
            {t('dashboard.seeAll')}
            <ArrowRight size={13} />
          </Link>
        </div>
        {recommended.loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72 w-full rounded-2xl" />
            ))}
          </div>
        ) : !recommended.data || recommended.data.items.length === 0 ? (
          <EmptyState size="sm" variant="no-events" title={t('public.noEventsTitle')} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.data.items.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
