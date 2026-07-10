import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Wallet, Hourglass, Eye, Star, Clock, CheckCircle2,
  Send, UserPlus, Megaphone, Gift, TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { StatCard } from '../components/StatCard';
import { api, type AnalyticsRange, type ApiCreatorAnalytics, type ApiBrandAnalytics } from '../lib/api';
import { useApi } from '../lib/useApi';

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: '7d',   label: '7 Days' },
  { value: '30d',  label: '30 Days' },
  { value: '90d',  label: '90 Days' },
  { value: '12mo', label: '12 Months' },
  { value: 'all',  label: 'All Time' },
];

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#94a3b8', '#ef4444'];

function fmtCurrency(n: number) {
  return `NPR ${Math.round(n).toLocaleString()}`;
}

function fmtBucket(bucket: string) {
  // 'YYYY-MM-DD' -> 'Mon D'; 'YYYY-MM' -> 'Mon YYYY'
  const parts = bucket.split('-');
  if (parts.length === 3) {
    return new Date(bucket).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  const [y, m] = parts;
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

function EmptyChart() {
  return <p className="text-sm text-gray-400 py-10 text-center">No data for this range.</p>;
}

function CreatorAnalyticsView({ data }: { data: ApiCreatorAnalytics }) {
  const { totals, campaignBreakdown, referrals, charts } = data;

  const breakdownData = [
    { name: 'Invited',   value: campaignBreakdown.invitationsReceived },
    { name: 'Submitted', value: campaignBreakdown.applicationsSubmitted },
    { name: 'Accepted',  value: campaignBreakdown.accepted },
    { name: 'Rejected',  value: campaignBreakdown.rejected },
    { name: 'Active',    value: campaignBreakdown.active },
    { name: 'Completed', value: campaignBreakdown.completed },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Earnings"   value={fmtCurrency(totals.totalEarnings)}   icon={Wallet}       iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard title="Pending Earnings" value={fmtCurrency(totals.pendingEarnings)} icon={Hourglass}    iconColor="text-amber-600"   iconBg="bg-amber-50" />
        <StatCard
          title="Profile Views"
          value={totals.profileViewsLast30Days.toLocaleString()}
          change={`${totals.profileViewsTrendPct >= 0 ? '+' : ''}${totals.profileViewsTrendPct}%`}
          changePositive={totals.profileViewsTrendPct >= 0}
          icon={Eye}
          iconColor="text-sky-600" iconBg="bg-sky-50"
        />
        <StatCard title="Profile Completion" value={`${totals.profileCompletion.percent}%`} icon={CheckCircle2} iconColor="text-indigo-600" iconBg="bg-indigo-50" />
        <StatCard title="Average Rating"    value={totals.averageRating.toFixed(1)} icon={Star}  iconColor="text-yellow-600" iconBg="bg-yellow-50" />
        <StatCard title="Response Time"     value={`${totals.responseTimeAvgMins} min`} icon={Clock} iconColor="text-purple-600" iconBg="bg-purple-50" />
        <StatCard title="Completion Rate"   value={`${totals.completionRate}%`} icon={TrendingUp} iconColor="text-teal-600" iconBg="bg-teal-50" />
        <StatCard title="Applications Submitted" value={totals.applicationsSubmitted.toLocaleString()} icon={Send} iconColor="text-blue-600" iconBg="bg-blue-50" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title="Earnings Trend">
          {charts.earningsTrend.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.earningsTrend.map((r) => ({ ...r, label: fmtBucket(r.bucket) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip formatter={(v) => fmtCurrency(Number(v))} />
                <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Campaign Activity">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={breakdownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Gift size={15} className="text-gray-400" /> Referral Program
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Invites',       value: referrals.totalInvites },
            { label: 'Successful Referrals', value: referrals.successfulReferrals },
            { label: 'Pending Rewards',      value: referrals.pendingRewards },
            { label: 'Rewards Earned',       value: fmtCurrency(referrals.rewardsEarned) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-lg px-3 py-3">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-sm font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
        {totals.profileCompletion.missing.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Missing profile sections</p>
            <div className="flex flex-wrap gap-1.5">
              {totals.profileCompletion.missing.map((m) => (
                <span key={m} className="text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full">{m}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BrandAnalyticsView({ data }: { data: ApiBrandAnalytics }) {
  const { totals, campaignStatus, charts } = data;

  const statusData = [
    { name: 'Active',    value: campaignStatus.active },
    { name: 'Draft',     value: campaignStatus.draft },
    { name: 'Paused',    value: campaignStatus.paused },
    { name: 'Closed',    value: campaignStatus.closed },
    { name: 'Cancelled', value: campaignStatus.cancelled },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Events"     value={totals.campaignsCreated.toLocaleString()}   icon={Megaphone} iconColor="text-indigo-600"  iconBg="bg-indigo-50" />
        <StatCard title="Active Events"    value={totals.activeCampaigns.toLocaleString()}    icon={TrendingUp} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard title="Completed Events" value={totals.completedCampaigns.toLocaleString()} icon={CheckCircle2} iconColor="text-teal-600"   iconBg="bg-teal-50" />
        <StatCard title="Total Spend"      value={fmtCurrency(totals.totalSpend)}              icon={Wallet}     iconColor="text-amber-600"   iconBg="bg-amber-50" />
        <StatCard title="Applications Received" value={totals.applicationsReceived.toLocaleString()} icon={Send} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard title="Creators Hired"   value={totals.creatorsHired.toLocaleString()}       icon={UserPlus}   iconColor="text-violet-600"  iconBg="bg-violet-50" />
        <StatCard title="Avg. Rating Given" value={totals.averageRatingGiven.toFixed(1)} icon={Star} iconColor="text-yellow-600" iconBg="bg-yellow-50" />
        <StatCard title="Response Time"    value={`${totals.responseTimeAvgMins} min`} icon={Clock} iconColor="text-purple-600" iconBg="bg-purple-50" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title="Monthly Spending">
          {charts.monthlySpending.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.monthlySpending.map((r) => ({ ...r, label: fmtBucket(r.bucket) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip formatter={(v) => fmtCurrency(Number(v))} />
                <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Applications Received">
          {charts.applicationsReceived.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.applicationsReceived.map((r) => ({ ...r, label: fmtBucket(r.bucket) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Event Status Breakdown">
        {statusData.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

export function UserAnalytics() {
  const { userId } = useParams<{ userId: string }>();
  const navigate    = useNavigate();
  const location    = useLocation();
  const state = location.state as { name?: string; email?: string } | null;
  const [range, setRange] = useState<AnalyticsRange>('30d');

  const { data, loading, error, refetch } = useApi(() => api.admin.analytics(userId!, range));
  useEffect(() => { refetch(); }, [range]); // eslint-disable-line react-hooks/exhaustive-deps

  const result = data?.data ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            className="mt-0.5 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{state?.name ?? 'User'} Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {state?.email ?? ''}{state?.email && result ? ' · ' : ''}{result ? (result.role === 'CREATOR' ? 'Creator' : 'Business') : ''}
            </p>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                range === r.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      ) : error || !result ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error ?? 'Analytics not found.'}
        </div>
      ) : result.role === 'CREATOR' ? (
        <CreatorAnalyticsView data={result} />
      ) : (
        <BrandAnalyticsView data={result} />
      )}
    </div>
  );
}
