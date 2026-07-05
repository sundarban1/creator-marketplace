import { useState } from 'react';
import { Check, X as XIcon } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader } from '../components/PageHeader';
import { api, type ApiReferral, type ApiBusinessReferral, type ApiResponse } from '../lib/api';
import { useApi } from '../lib/useApi';

const STATUS_TABS = ['PENDING', 'COMPLETED', 'EXPIRED'] as const;
const AUDIENCES = ['CREATOR', 'BUSINESS'] as const;
type Audience = typeof AUDIENCES[number];
type ReferralRow = ApiReferral | ApiBusinessReferral;

function hasFlags(row: ReferralRow): row is ApiBusinessReferral {
  return 'flags' in row;
}

function Condition({ met, label }: { met: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1 text-xs ${met ? 'text-emerald-600' : 'text-gray-400'}`}>
      {met ? <Check size={13} /> : <XIcon size={13} />}
      <span>{label}</span>
    </div>
  );
}

function Flag({ tripped, label }: { tripped: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1 text-xs ${tripped ? 'text-red-600' : 'text-gray-400'}`}>
      {tripped ? <XIcon size={13} /> : <Check size={13} />}
      <span>{label}</span>
    </div>
  );
}

export function Referrals() {
  const [audience, setAudience] = useState<Audience>('CREATOR');
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_TABS[number]>('PENDING');
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const { data, loading, error, refetch } = useApi(() =>
    (audience === 'CREATOR' ? api.admin.referrals(statusFilter) : api.admin.businessReferrals(statusFilter)) as Promise<ApiResponse<ReferralRow[]>>
  );
  const referrals = data?.data ?? [];

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function switchAudience(a: Audience) {
    setAudience(a);
    refetch();
  }

  function switchStatus(s: typeof STATUS_TABS[number]) {
    setStatusFilter(s);
    refetch();
  }

  async function handleRelease(row: ReferralRow) {
    setReleasingId(row.id);
    try {
      if (audience === 'CREATOR') await api.admin.releaseReferral(row.id);
      else await api.admin.releaseBusinessReferral(row.id);
      showToast(`Rs. ${row.rewardAmount} released to ${row.referrer.name ?? 'referrer'}.`);
      refetch();
    } catch (e) {
      showToast((e as Error).message ?? 'Failed to release reward.', false);
    } finally {
      setReleasingId(null);
    }
  }

  const columns = [
    {
      key: 'referrer',
      header: 'Referrer',
      render: (row: ReferralRow) => <span className="font-medium text-gray-900">{row.referrer.name ?? '—'}</span>,
    },
    {
      key: 'referred',
      header: 'Referred',
      render: (row: ReferralRow) => <span className="text-gray-700">{row.referred.name ?? '—'}</span>,
    },
    {
      key: 'code',
      header: 'Code',
      render: (row: ReferralRow) => <span className="font-mono text-xs text-gray-500">{row.code}</span>,
    },
    {
      key: 'linkedAt',
      header: 'Signed up',
      render: (row: ReferralRow) => (
        <span className="text-sm text-gray-500">
          {new Date(row.linkedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'conditions',
      header: 'Conditions',
      render: (row: ReferralRow) => (
        <div className="flex flex-col gap-0.5">
          <Condition met={row.eligibility.verified} label="Verified badge" />
          <Condition met={row.eligibility.profileComplete} label="Profile complete" />
          {hasFlags(row) ? (
            <Condition met={row.eligibility.fundedCampaignStable} label="Funded campaign (14d+)" />
          ) : (
            <Condition met={(row as ApiReferral).eligibility.firstEventCompleted} label="First event done" />
          )}
          <Condition met={row.eligibility.notExpired} label="Within 3 months" />
        </div>
      ),
    },
    ...(audience === 'BUSINESS' ? [{
      key: 'flags',
      header: 'Fraud flags',
      render: (row: ReferralRow) => hasFlags(row) ? (
        <div className="flex flex-col gap-0.5">
          <Flag tripped={row.flags.samePan} label="Same PAN/VAT" />
          <Flag tripped={row.flags.samePayout} label="Same payout" />
          <Flag tripped={row.flags.sameDevice} label="Same device" />
        </div>
      ) : null,
    }] : []),
    {
      key: 'status',
      header: 'Status',
      render: (row: ReferralRow) => <StatusBadge status={row.status.toLowerCase()} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: ReferralRow) => {
        const flagsClear = !hasFlags(row) || (!row.flags.samePan && !row.flags.samePayout && !row.flags.sameDevice);
        const conditionsMet = hasFlags(row)
          ? row.eligibility.verified && row.eligibility.profileComplete && row.eligibility.fundedCampaignStable && row.eligibility.notExpired
          : row.eligibility.verified && row.eligibility.profileComplete && row.eligibility.firstEventCompleted && row.eligibility.notExpired;
        const allMet = conditionsMet && flagsClear;
        if (row.status !== 'PENDING') return <span className="text-xs text-gray-400">—</span>;
        return (
          <button
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!allMet || releasingId === row.id}
            onClick={() => handleRelease(row)}>
            {releasingId === row.id
              ? 'Releasing…'
              : audience === 'CREATOR'
                ? `Release Rs. ${row.rewardAmount} (+ Rs. 200 to referred)`
                : `Release Rs. ${row.rewardAmount}`}
          </button>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Referrals"
        subtitle={loading ? 'Loading...' : `${referrals.length} ${statusFilter.toLowerCase()} referrals`}
      />

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => switchStatus(s)}
              className={`text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors ${
                statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {AUDIENCES.map((a) => (
            <button
              key={a}
              onClick={() => switchAudience(a)}
              className={`text-sm font-medium px-3.5 py-1.5 rounded-md transition-colors ${
                audience === a ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {a === 'CREATOR' ? 'Creators' : 'Businesses'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse bg-gray-50 first:rounded-t-xl last:rounded-b-xl" />
          ))}
        </div>
      ) : referrals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400 text-sm">
          No {statusFilter.toLowerCase()} referrals.
        </div>
      ) : (
        <DataTable columns={columns} data={referrals} keyField="id" />
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-medium text-white shadow-lg z-50 ${toast.ok ? 'bg-gray-900' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
