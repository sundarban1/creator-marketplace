import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { api, type ApiAdminProposal, type ProposalFilter } from '../lib/api';
import { useApi } from '../lib/useApi';
import { confirmDialog } from '../app/ui/confirmDialog';

// Admin → Proposals. Proposal (application) deadlines are tracked separately
// from deliverable deadlines:
//  - a PROPOSAL row is something the creator actually submitted — an on-time
//    proposal awaiting review stays "pending" even after the deadline;
//  - an INVITATION row is an invited creator who never submitted — that's the
//    only place "deadline missed" (or "expired", if the business closed early)
//    can appear. No proposal is invented for them.

const PAGE_SIZE = 20;
const FILTERS: { key: ProposalFilter; label: string }[] = [
  { key: 'all',             label: 'All' },
  { key: 'pending',         label: 'Pending review' },
  { key: 'accepted',        label: 'Accepted' },
  { key: 'rejected',        label: 'Rejected' },
  { key: 'deadline_missed', label: 'Deadline missed' },
  { key: 'expired',         label: 'Expired' },
  { key: 'withdrawn',       label: 'Withdrawn' },
];

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}

function statusKey(p: ApiAdminProposal): string {
  const s = p.status.toLowerCase();
  return s === 'shortlisted' ? 'shortlisted' : s;
}

export function Proposals() {
  const [filter, setFilter] = useState<ProposalFilter>('all');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState<'submittedAt' | 'deadline' | 'createdAt'>('submittedAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [reopen, setReopen] = useState<ApiAdminProposal | null>(null);

  const { data, loading, error, refetch } = useApi(() =>
    api.admin.proposals({ filter, search: debounced || undefined, sort, order, page, limit: PAGE_SIZE }),
  );
  useEffect(() => { refetch(); }, [filter, debounced, sort, order, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const list = data?.data;
  const items = list?.items ?? [];

  const columns = [
    {
      key: 'creator', header: 'Creator',
      render: (p: ApiAdminProposal) => (
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate">{p.creator.name ?? '—'}</div>
          <div className="text-[11px] font-mono text-gray-400 truncate">{p.creator.id}</div>
        </div>
      ),
    },
    {
      key: 'opportunity', header: 'Opportunity',
      render: (p: ApiAdminProposal) => (
        <div className="min-w-0">
          <Link to={`/admin/campaigns/${p.campaign.id}`} className="font-medium text-indigo-700 hover:underline truncate block">{p.campaign.title}</Link>
          <div className="text-xs text-gray-500 truncate">{p.business.name ?? '—'} · {p.campaign.status.toLowerCase()}</div>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (p: ApiAdminProposal) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={statusKey(p)} />
          <span className="text-[10px] uppercase tracking-wide text-gray-400">{p.kind === 'INVITATION' ? 'Invited · never submitted' : 'Proposal'}</span>
        </div>
      ),
    },
    {
      key: 'deadline', header: 'Application deadline',
      render: (p: ApiAdminProposal) => <span className="text-xs text-gray-600">{fmt(p.applicationDeadline)}</span>,
    },
    {
      key: 'submitted', header: 'Submitted',
      render: (p: ApiAdminProposal) => p.submittedAt ? (
        <div>
          <div className="text-xs text-gray-700">{fmt(p.submittedAt)}</div>
          <div className={`text-[11px] font-semibold ${p.submittedOnTime ? 'text-emerald-700' : 'text-red-600'}`}>{p.submittedOnTime ? 'On time' : 'Late'}</div>
        </div>
      ) : <span className="text-xs text-gray-400">Not submitted</span>,
    },
    {
      key: 'decided', header: 'Decided / closed',
      render: (p: ApiAdminProposal) => (
        <div className="max-w-[220px]">
          <div className="text-xs text-gray-700">{fmt(p.decidedAt ?? p.closedAt)}</div>
          {p.reason && <div className="text-[11px] text-gray-500 truncate" title={p.reason}>{p.reason}</div>}
        </div>
      ),
    },
    {
      key: 'links', header: 'Links',
      render: (p: ApiAdminProposal) => (
        <div className="flex flex-col gap-0.5 text-xs">
          {p.deliverable && (
            <Link to={`/admin/campaigns/${p.campaign.id}`} className="text-indigo-700 hover:underline">
              Deliverable · {(p.deliverable.workStatus ?? '').replace(/_/g, ' ').toLowerCase()}
            </Link>
          )}
          {p.refundRequest && (
            <Link to="/admin/payments?tab=refunds" className="text-indigo-700 hover:underline">Refund · {(p.refundRequest.status ?? '').toLowerCase()}</Link>
          )}
          {p.status === 'DEADLINE_MISSED' && p.campaign.status === 'ACTIVE' && (
            <button onClick={() => setReopen(p)} className="text-left text-amber-700 hover:underline">Reopen applications…</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Proposals" subtitle="Every proposal and application deadline. Deliverable deadlines and refunds are tracked separately." />

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setPage(1); }}
            className={`text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors ${filter === f.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {f.label}
            {list?.counts?.[f.key] ? <span className="ml-1.5 opacity-70">{list.counts[f.key]}</span> : null}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Creator, business, opportunity or ID…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={`${sort}:${order}`}
          onChange={(e) => { const [s, o] = e.target.value.split(':'); setSort(s as typeof sort); setOrder(o as typeof order); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Sort"
        >
          <option value="submittedAt:desc">Latest activity</option>
          <option value="submittedAt:asc">Oldest activity</option>
          <option value="deadline:asc">Application deadline (soonest)</option>
          <option value="deadline:desc">Application deadline (latest)</option>
        </select>
      </div>

      {error ? (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{/access denied|403/i.test(error) ? "You don't have permission to view proposals." : error}</span>
          <button onClick={refetch} className="text-xs font-semibold underline">Retry</button>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 adm-card divide-y divide-gray-100">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 animate-pulse bg-gray-50" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 adm-card py-16 text-center text-gray-400 text-sm">
          No {filter === 'all' ? '' : FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} proposals{debounced ? ' match this search' : ''}.
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={items} keyField="id" />
          <Pagination page={page} totalPages={Math.max(1, Math.ceil((list?.total ?? 0) / PAGE_SIZE))} total={list?.total ?? 0} limit={PAGE_SIZE} onChange={setPage} />
        </>
      )}

      {reopen && <ReopenModal proposal={reopen} onClose={() => setReopen(null)} onDone={() => { setReopen(null); refetch(); }} />}
    </div>
  );
}

function ReopenModal({ proposal, onClose, onDone }: { proposal: ApiAdminProposal; onClose: () => void; onDone: () => void }) {
  const [deadline, setDeadline] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const field = 'mt-1 w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" aria-label="Close"><X size={18} /></button>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Reopen applications</h3>
          <p className="text-sm text-gray-500">{proposal.campaign.title} — invited creators who missed the deadline can apply again until the new deadline.</p>
        </div>
        <label className="block text-xs font-semibold text-gray-500">New application deadline *
          <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={field} />
        </label>
        <label className="block text-xs font-semibold text-gray-500">Reason * (recorded in the audit log)
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={field} />
        </label>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} disabled={busy} className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
          <button
            disabled={busy || !deadline || reason.trim().length < 5}
            onClick={async () => {
              if (!(await confirmDialog({ title: 'Reopen applications?', message: 'This moves the application deadline and is recorded as an admin override.', confirmLabel: 'Reopen', tone: 'warning' }))) return;
              setBusy(true);
              setErr('');
              try {
                await api.admin.reopenApplications(proposal.campaign.id, { applicationDeadline: new Date(deadline).toISOString(), reason: reason.trim() });
                onDone();
              } catch (e) {
                setErr((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            Reopen
          </button>
        </div>
      </div>
    </div>
  );
}
