import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, FileText, Briefcase, PackageCheck, Plus } from 'lucide-react';
import { useAppAuth } from '../auth/AppAuthContext';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchNotifications } from '../api/creator';
import { fetchMyCampaigns, fetchBusinessApplications } from '../api/business';
import { engagementMeta } from '../lib/engagement';
import { PageHeader } from '../ui/PageHeader';
import { StatCard } from '../ui/StatCard';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../ui/cn';
import { BizApplicationCard } from './BizApplicationCard';

export function BusinessDashboard() {
  const { user } = useAppAuth();
  const t = useT();

  const campaigns = useAsync((s) => fetchMyCampaigns({ limit: 100 }, s), []);
  const apps = useAsync((s) => fetchBusinessApplications({ limit: 100 }, s), []);
  const activity = useAsync((s) => fetchNotifications(6, s), []);

  const activeEvents = (campaigns.data?.items ?? []).filter((c) => c.status === 'ACTIVE').length;

  const { toReview, inProgress, toApprove, needsAction } = useMemo(() => {
    const list = apps.data?.items ?? [];
    const pending = list.filter((a) => a.engagementState === 'PROPOSAL_PENDING');
    const review = list.filter((a) => a.engagementState === 'BUSINESS_REVIEW');
    const progress = list.filter((a) => {
      const b = engagementMeta(a.engagementState).bucket;
      return b === 'active' && a.engagementState !== 'BUSINESS_REVIEW';
    });
    return {
      toReview: pending,
      inProgress: progress,
      toApprove: review,
      needsAction: [...review, ...pending].slice(0, 5),
    };
  }, [apps.data]);

  return (
    <>
      <PageHeader
        eyebrow={t('biz.eyebrowDash')}
        title={t('biz.dashWelcome', { name: user?.name ?? '' })}
        actions={
          <Link to="/business/events/create">
            <Button size="sm">
              <Plus size={15} />
              {t('biz.createEvent')}
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('biz.activeEvents')} value={campaigns.loading ? undefined : activeEvents} icon={CalendarDays} />
        <StatCard label={t('biz.toReview')} value={apps.loading ? undefined : toReview.length} icon={FileText} />
        <StatCard label={t('biz.inProgress')} value={apps.loading ? undefined : inProgress.length} icon={Briefcase} />
        <StatCard label={t('biz.toApprove')} value={apps.loading ? undefined : toApprove.length} icon={PackageCheck} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader
            title={t('biz.needsAction')}
            action={
              <Link to="/business/applications" className="text-[13px] font-semibold text-violet-dark hover:underline">
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
          ) : needsAction.length === 0 ? (
            <EmptyState size="sm" variant="empty" title={t('biz.nothingToReview')} />
          ) : (
            <div className="space-y-3">
              {needsAction.map((a) => (
                <BizApplicationCard key={a.id} application={a} />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={t('biz.recentActivity')} />
          {activity.loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !activity.data || activity.data.length === 0 ? (
            <EmptyState size="sm" variant="empty" title={t('biz.noActivity')} />
          ) : (
            <ul className="divide-y divide-line">
              {activity.data.map((n) => (
                <li key={n.id} className="flex gap-3 py-3">
                  <span className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full', n.isRead ? 'bg-line-strong' : 'bg-violet')} />
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
    </>
  );
}
