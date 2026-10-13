import { useState, type ReactNode } from 'react';
import {
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Hourglass,
  LineChart,
  Megaphone,
  Star,
  Trophy,
  UserCheck,
  Wallet,
  Inbox,
} from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { rupees } from '../lib/format';
import {
  ANALYTICS_RANGES,
  fetchBusinessAnalytics,
  fetchCreatorAnalytics,
  fmtBucket,
  type AnalyticsRange,
} from '../api/analytics';
import { DashPageHeader } from '../creator/dash-ui/DashPageHeader';
import { Card, CardHeader } from '../ui/Card';
import { StatCard } from '../ui/StatCard';
import { BarChart } from '../ui/BarChart';
import { Select } from '../ui/Select';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

/** Analytics for both roles — web twins of mobile's (creator|business)/analytics.tsx. */

function RangeSelect({ value, onChange }: { value: AnalyticsRange; onChange: (r: AnalyticsRange) => void }) {
  const t = useT();
  return (
    <Select
      aria-label={t('analytics.rangeLabel')}
      value={value}
      onChange={(e) => onChange(e.target.value as AnalyticsRange)}
      className="w-40"
      options={ANALYTICS_RANGES.map((r) => ({ value: r, label: t(`analytics.range_${r}`) }))}
    />
  );
}

function Shell({
  range,
  setRange,
  loading,
  error,
  reload,
  children,
}: {
  range: AnalyticsRange;
  setRange: (r: AnalyticsRange) => void;
  loading: boolean;
  error: boolean;
  reload: () => void;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <div>
      <DashPageHeader
        title={t('analytics.headerTitle')}
        description={t('analytics.viewInsights')}
        actions={<RangeSelect value={range} onChange={setRange} />}
      />
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState variant="error" title={t('analytics.loadError')} action={{ label: t('common.retry'), onClick: reload }} />
      ) : (
        children
      )}
    </div>
  );
}

const mins = (n: number) => `${n} min`;

export function CreatorAnalyticsPage() {
  const t = useT();
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const res = useAsync((s) => fetchCreatorAnalytics(range, s), [range]);
  const d = res.data;

  return (
    <Shell range={range} setRange={setRange} loading={res.loading} error={!!res.error || !d} reload={res.reload}>
      {d && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={Wallet} label={t('analytics.totalEarnings')} value={rupees(d.totals.totalEarnings)} />
            <StatCard icon={Hourglass} tone="amber" label={t('analytics.pendingEarnings')} value={rupees(d.totals.pendingEarnings)} />
            <StatCard
              icon={Eye}
              tone="blue"
              label={t('analytics.profileViews')}
              value={d.totals.profileViewsLast30Days.toLocaleString('en-IN')}
              hint={`${d.totals.profileViewsTrendPct >= 0 ? '+' : ''}${d.totals.profileViewsTrendPct}%`}
            />
            <StatCard icon={CheckCircle2} tone="emerald" label={t('analytics.profileCompletion')} value={`${d.totals.profileCompletion.percent}%`} />
            <StatCard icon={Star} tone="amber" label={t('analytics.averageRating')} value={d.totals.averageRating.toFixed(1)} />
            <StatCard icon={Clock} tone="blue" label={t('analytics.responseTime')} value={mins(d.totals.responseTimeAvgMins)} />
            <StatCard icon={LineChart} tone="emerald" label={t('analytics.completionRate')} value={`${d.totals.completionRate}%`} />
            <StatCard icon={FileText} label={t('analytics.applicationsSubmitted')} value={d.totals.applicationsSubmitted.toLocaleString('en-IN')} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title={t('analytics.earningsTrend')} />
              <BarChart
                title={t('analytics.earningsTrend')}
                data={d.charts.earningsTrend.map((r) => ({ label: fmtBucket(r.bucket), value: r.amount }))}
                format={rupees}
              />
            </Card>
            <Card>
              <CardHeader title={t('analytics.campaignActivity')} />
              <BarChart
                title={t('analytics.campaignActivity')}
                data={[
                  { label: t('analytics.invited'), value: d.campaignBreakdown.invitationsReceived },
                  { label: t('analytics.submitted'), value: d.campaignBreakdown.applicationsSubmitted },
                  { label: t('analytics.accepted'), value: d.campaignBreakdown.accepted },
                  { label: t('analytics.active'), value: d.campaignBreakdown.active },
                  { label: t('analytics.completed'), value: d.campaignBreakdown.completed },
                ]}
              />
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader title={t('analytics.referralProgram')} />
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [t('analytics.totalInvites'), String(d.referrals.totalInvites)],
                [t('analytics.successfulReferrals'), String(d.referrals.successfulReferrals)],
                [t('analytics.pendingRewards'), String(d.referrals.pendingRewards)],
                [t('analytics.rewardsEarned'), rupees(d.referrals.rewardsEarned)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-line bg-surface-dim px-4 py-3">
                  <dd className="text-[20px] font-semibold text-ink">{value}</dd>
                  <dt className="text-[12px] text-ink-soft">{label}</dt>
                </div>
              ))}
            </dl>
          </Card>

          {d.totals.profileCompletion.missing.length > 0 && (
            <Card className="mt-6">
              <CardHeader title={t('analytics.missingSections')} />
              <div className="flex flex-wrap gap-2">
                {d.totals.profileCompletion.missing.map((m) => (
                  <span key={m} className="rounded-full bg-brand-orange/10 px-3 py-1 text-[12.5px] font-medium text-ink">
                    {m}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </Shell>
  );
}

export function BusinessAnalyticsPage() {
  const t = useT();
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const res = useAsync((s) => fetchBusinessAnalytics(range, s), [range]);
  const d = res.data;

  return (
    <Shell range={range} setRange={setRange} loading={res.loading} error={!!res.error || !d} reload={res.reload}>
      {d && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={Megaphone} label={t('analytics.totalEvents')} value={d.totals.campaignsCreated.toLocaleString('en-IN')} />
            <StatCard icon={LineChart} tone="blue" label={t('analytics.activeEvents')} value={d.totals.activeCampaigns.toLocaleString('en-IN')} />
            <StatCard icon={Trophy} tone="emerald" label={t('analytics.completedEvents')} value={d.totals.completedCampaigns.toLocaleString('en-IN')} />
            <StatCard icon={Wallet} tone="amber" label={t('analytics.totalSpend')} value={rupees(d.totals.totalSpend)} />
            <StatCard icon={Inbox} label={t('analytics.applicationsReceived')} value={d.totals.applicationsReceived.toLocaleString('en-IN')} />
            <StatCard icon={UserCheck} tone="emerald" label={t('analytics.creatorsHired')} value={d.totals.creatorsHired.toLocaleString('en-IN')} />
            <StatCard icon={Star} tone="amber" label={t('analytics.avgRatingGiven')} value={d.totals.averageRatingGiven.toFixed(1)} />
            <StatCard icon={Clock} tone="blue" label={t('analytics.responseTime')} value={mins(d.totals.responseTimeAvgMins)} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title={t('analytics.monthlySpending')} />
              <BarChart
                title={t('analytics.monthlySpending')}
                data={d.charts.monthlySpending.map((r) => ({ label: fmtBucket(r.bucket), value: r.amount }))}
                format={rupees}
              />
            </Card>
            <Card>
              <CardHeader title={t('analytics.applicationsReceived')} />
              <BarChart
                title={t('analytics.applicationsReceived')}
                data={d.charts.applicationsReceived.map((r) => ({ label: fmtBucket(r.bucket), value: r.count }))}
              />
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader title={t('analytics.eventStatusBreakdown')} />
            <BarChart
              title={t('analytics.eventStatusBreakdown')}
              data={[
                { label: t('analytics.active'), value: d.campaignStatus.active },
                { label: t('analytics.draft'), value: d.campaignStatus.draft },
                { label: t('analytics.paused'), value: d.campaignStatus.paused },
                { label: t('analytics.closed'), value: d.campaignStatus.closed },
                { label: t('analytics.cancelled'), value: d.campaignStatus.cancelled },
              ]}
            />
          </Card>
        </>
      )}
    </Shell>
  );
}
