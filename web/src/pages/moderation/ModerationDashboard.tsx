import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, Eye, Flag, HelpCircle, Search, ShieldBan, ShieldCheck, XCircle } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { Pagination } from '../../components/Pagination';
import { api, type ApiModerationEvent, type ApiModerationReportRow } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { alertDialog } from '../../app/ui/confirmDialog';
import { usePoll } from './usePoll';
import { LEGACY_REASONS, REASON_LABEL, TARGET_LABEL, errMessage, fmtDate } from './labels';
import { PriorityPill, StatusPill, VerificationPill } from './pills';

// Admin › Moderation — the single queue every user report and safety signal
// lands in. Reports are the source of truth (persisted before any alert is
// sent); this page reads them straight from the database.

const PAGE_SIZE = 20;
type Tab = 'reports' | 'signals';

const VIEWS = [
  { key: 'open', label: 'Open' },
  { key: 'mine', label: 'Assigned to me' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'closed', label: 'Closed' },
  { key: 'all', label: 'All' },
] as const;

const select = 'h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200';

export function ModerationDashboard() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'signals' ? 'signals' : 'reports';
  const setTab = (t: Tab) => setParams(t === 'reports' ? {} : { tab: t });
  // Remount the reports tab when arriving with a ?user= filter from a signal.
  const reportsKey = params.get('user') ?? '';

  const stats = useApi(() => api.admin.moderation.stats());
  usePoll(stats.refetch);
  const s = stats.data?.data;

  return (
    <div>
      <PageHeader title="Moderation" subtitle="Every report and safety signal from the apps. Nothing is closed without an admin decision." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard title="Pending review" value={s?.pending ?? '—'} icon={Clock} iconColor="text-amber-600" iconBg="bg-amber-50" />
        <StatCard title="Urgent open" value={s?.urgentOpen ?? '—'} icon={AlertTriangle} iconColor="text-red-600" iconBg="bg-red-50" />
        <StatCard title="Under review" value={s ? s.underReview + s.needsMoreInfo : '—'} icon={Eye} iconColor="text-indigo-600" iconBg="bg-indigo-50" />
        <StatCard title="New block events" value={s?.unreviewedBlocks ?? '—'} icon={ShieldBan} iconColor="text-gray-700" iconBg="bg-gray-100" />
      </div>
      {s && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 mb-5">
          <span>Total reports <b className="text-gray-800">{s.total}</b></span>
          <span className="flex items-center gap-1"><HelpCircle size={12} /> Needs more info <b className="text-gray-800">{s.needsMoreInfo}</b></span>
          <span className="flex items-center gap-1"><Flag size={12} /> Action taken <b className="text-gray-800">{s.actionTaken}</b></span>
          <span className="flex items-center gap-1"><XCircle size={12} /> Dismissed <b className="text-gray-800">{s.dismissed}</b></span>
          <span className="flex items-center gap-1"><CheckCircle2 size={12} /> Resolved <b className="text-gray-800">{s.resolved}</b></span>
          <span>Unassigned open <b className="text-gray-800">{s.unassignedOpen}</b></span>
          <span>Block events (all time) <b className="text-gray-800">{s.blockEvents}</b></span>
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {([['reports', 'Reports'], ['signals', `Safety signals${s && s.unreviewedBlocks + s.unreviewedContentSignals ? ` (${s.unreviewedBlocks + s.unreviewedContentSignals})` : ''}`]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${tab === k ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'reports' ? <ReportsTab key={reportsKey} initialQuery={reportsKey} /> : <SignalsTab onChanged={stats.refetch} />}
    </div>
  );
}

function ReportsTab({ initialQuery }: { initialQuery: string }) {
  const navigate = useNavigate();
  const [view, setView] = useState<(typeof VIEWS)[number]['key']>('open');
  const [page, setPage] = useState(1);
  const [reason, setReason] = useState('');
  const [targetType, setTargetType] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const requestParams = useMemo(() => ({
    page, limit: PAGE_SIZE,
    view: view === 'mine' || view === 'unassigned' ? 'open' : view,
    assigned: view === 'mine' ? 'me' : view === 'unassigned' ? 'unassigned' : undefined,
    reason: reason || undefined, targetType: targetType || undefined, priority: priority || undefined,
    status: status || undefined, q: query || undefined, from: from || undefined, to: to ? `${to}T23:59:59` : undefined,
  }), [page, view, reason, targetType, priority, status, query, from, to]);

  const list = useApi(() => api.admin.moderation.reports(requestParams));
  useEffect(() => { list.refetch(); }, [requestParams]); // eslint-disable-line react-hooks/exhaustive-deps
  usePoll(list.refetch);

  const rows = list.data?.data.items ?? [];
  const pg = list.data?.data.pagination;
  const reset = (fn: () => void) => { fn(); setPage(1); };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {VIEWS.map((v) => (
          <button key={v.key} onClick={() => reset(() => setView(v.key))}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${view === v.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <form className="relative" onSubmit={(e) => { e.preventDefault(); reset(() => setQuery(q.trim())); }}>
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Report ID, user ID, name, email, content ID"
            className="h-9 w-72 max-w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </form>
        <select className={select} value={reason} onChange={(e) => reset(() => setReason(e.target.value))} aria-label="Reason">
          <option value="">All reasons</option>
          {Object.entries(REASON_LABEL).filter(([k]) => !LEGACY_REASONS.has(k)).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select className={select} value={targetType} onChange={(e) => reset(() => setTargetType(e.target.value))} aria-label="Content type">
          <option value="">All content</option>
          {Object.entries(TARGET_LABEL).filter(([k]) => k !== 'POST').map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select className={select} value={priority} onChange={(e) => reset(() => setPriority(e.target.value))} aria-label="Priority">
          <option value="">Any priority</option>
          {['URGENT', 'HIGH', 'NORMAL', 'LOW'].map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
        </select>
        <select className={select} value={status} onChange={(e) => reset(() => setStatus(e.target.value))} aria-label="Status">
          <option value="">Any status</option>
          {['NEW', 'UNDER_REVIEW', 'NEEDS_MORE_INFO', 'ACTION_TAKEN', 'DISMISSED', 'RESOLVED'].map((st) => <option key={st} value={st}>{st === 'NEW' ? 'Pending' : st.replace(/_/g, ' ').toLowerCase()}</option>)}
        </select>
        <input type="date" className={select} value={from} onChange={(e) => reset(() => setFrom(e.target.value))} aria-label="From date" />
        <input type="date" className={select} value={to} onChange={(e) => reset(() => setTo(e.target.value))} aria-label="To date" />
      </div>

      {list.error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{list.error}</div>}

      <div className="bg-white rounded-2xl border border-gray-200 adm-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Report</th>
                <th className="text-left font-semibold px-4 py-3">Content</th>
                <th className="text-left font-semibold px-4 py-3">Reported user</th>
                <th className="text-left font-semibold px-4 py-3">Reporter</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
                <th className="text-left font-semibold px-4 py-3">Assigned</th>
                <th className="text-left font-semibold px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.loading && !rows.length ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-4"><div className="h-5 animate-pulse rounded bg-gray-100" /></td></tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-14 text-center text-gray-400">No reports match these filters.</td></tr>
              ) : rows.map((r) => <ReportRow key={r.id} r={r} onOpen={() => navigate(`/admin/moderation/reports/${r.id}`)} />)}
            </tbody>
          </table>
        </div>
      </div>
      {pg && <Pagination page={pg.page} totalPages={Math.max(1, pg.totalPages)} total={pg.total} limit={PAGE_SIZE} onChange={setPage} />}
    </>
  );
}

function ReportRow({ r, onOpen }: { r: ApiModerationReportRow; onOpen: () => void }) {
  return (
    <tr onClick={onOpen} className={`cursor-pointer hover:bg-gray-50 ${r.priority === 'URGENT' && ['NEW', 'UNDER_REVIEW', 'NEEDS_MORE_INFO'].includes(r.status) ? 'bg-red-50/40' : ''}`}>
      <td className="px-4 py-3 align-top">
        <div className="flex items-center gap-2 mb-1"><PriorityPill priority={r.priority} /><span className="font-mono text-[11px] text-gray-400">#{r.id.slice(-8)}</span></div>
        <div className="text-gray-800 font-medium">{REASON_LABEL[r.reason] ?? r.reason}</div>
      </td>
      <td className="px-4 py-3 align-top max-w-xs">
        <div className="text-[11px] text-gray-400 uppercase tracking-wide">{TARGET_LABEL[r.targetType] ?? r.targetType}</div>
        <div className="text-gray-700 line-clamp-2">{r.contentPreview ?? r.contentTitle ?? '—'}</div>
      </td>
      <td className="px-4 py-3 align-top">
        {r.reportedUser ? (<><div className="text-gray-800">{r.reportedUser.name}</div><div className="font-mono text-[11px] text-gray-400">{r.reportedUser.id.slice(-10)}</div></>) : <span className="text-gray-400">—</span>}
      </td>
      <td className="px-4 py-3 align-top text-gray-600">{r.reporter?.name ?? '—'}</td>
      <td className="px-4 py-3 align-top space-y-1"><StatusPill status={r.status} /><div><VerificationPill v={r.verification} /></div></td>
      <td className="px-4 py-3 align-top text-xs text-gray-600">{r.assignedTo?.email ?? <span className="text-gray-400">Unassigned</span>}</td>
      <td className="px-4 py-3 align-top text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
    </tr>
  );
}

const SIGNAL_LABEL: Record<ApiModerationEvent['type'], string> = {
  USER_BLOCKED: 'User blocked',
  USER_UNBLOCKED: 'User unblocked',
  CONTENT_AUTO_REJECTED: 'Content auto-rejected',
  CONTENT_HELD_FOR_REVIEW: 'Content held for review',
  MODERATION_SERVICE_ERROR: 'Screening unavailable',
};

function SignalsTab({ onChanged }: { onChanged: () => void }) {
  const [type, setType] = useState('USER_BLOCKED');
  const [reviewed, setReviewed] = useState<'' | 'yes' | 'no'>('no');
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ type: type || undefined, reviewed: reviewed || undefined, page, limit: PAGE_SIZE }), [type, reviewed, page]);
  const list = useApi(() => api.admin.moderation.events(params));
  useEffect(() => { list.refetch(); }, [params]); // eslint-disable-line react-hooks/exhaustive-deps
  usePoll(list.refetch);
  const rows = list.data?.data.items ?? [];
  const pg = list.data?.data.pagination;

  async function markReviewed(id: string) {
    try {
      await api.admin.moderation.reviewEvent(id);
      list.refetch(); onChanged();
    } catch (e) { void alertDialog({ title: 'Could not update', message: errMessage(e) }); }
  }

  return (
    <>
      <p className="text-xs text-gray-500 mb-3">
        A block is a safety signal, not proof of wrongdoing — look at the pattern (how often an account is blocked, related reports) before acting. Open the user’s reports to take action.
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        <select className={select} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Signal type">
          <option value="">All signals</option>
          {Object.entries(SIGNAL_LABEL).filter(([k]) => k !== 'USER_UNBLOCKED').map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select className={select} value={reviewed} onChange={(e) => { setReviewed(e.target.value as '' | 'yes' | 'no'); setPage(1); }} aria-label="Reviewed">
          <option value="no">Not yet reviewed</option>
          <option value="yes">Reviewed</option>
          <option value="">All</option>
        </select>
      </div>
      {list.error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{list.error}</div>}
      <div className="bg-white rounded-2xl border border-gray-200 adm-card divide-y divide-gray-100">
        {list.loading && !rows.length ? <div className="p-6"><div className="h-5 animate-pulse rounded bg-gray-100" /></div>
          : rows.length === 0 ? <div className="py-14 text-center text-sm text-gray-400">No signals here.</div>
          : rows.map((e) => (
            <div key={e.id} className="flex flex-wrap items-start gap-3 p-4">
              <div className={`mt-0.5 rounded-lg p-2 ${e.type === 'USER_BLOCKED' ? 'bg-gray-100 text-gray-700' : e.type === 'MODERATION_SERVICE_ERROR' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                {e.type === 'USER_BLOCKED' ? <ShieldBan size={16} /> : <ShieldCheck size={16} />}
              </div>
              <div className="flex-1 min-w-[220px] text-sm">
                <div className="font-medium text-gray-900">{SIGNAL_LABEL[e.type]}</div>
                {e.type === 'USER_BLOCKED' ? (
                  <div className="text-gray-600">
                    <b>{e.actor?.name ?? 'A user'}</b> blocked <b>{e.target?.name ?? 'a user'}</b>
                    {e.metadata?.source ? <> from {String(e.metadata.source)}</> : null}
                    {e.blockActive === false && <span className="ml-1 text-xs text-gray-400">(since unblocked)</span>}
                  </div>
                ) : (
                  <div className="text-gray-600">
                    {e.contentType?.replace(/_/g, ' ')} by <b>{e.actor?.name ?? 'unknown'}</b>
                    {Array.isArray(e.metadata?.categories) && <> · {(e.metadata!.categories as string[]).join(', ')}</>}
                  </div>
                )}
                {e.target && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    {e.target.name} has been blocked {e.timesBlocked} time{e.timesBlocked === 1 ? '' : 's'} ·{' '}
                    <Link className="text-indigo-600 hover:underline" to={`/admin/moderation?user=${encodeURIComponent(e.target.id)}`}>
                      view reports about this user
                    </Link>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(e.createdAt)}</div>
              {!e.reviewedAt ? (
                <button onClick={() => markReviewed(e.id)} className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium">Mark reviewed</button>
              ) : <span className="text-xs text-emerald-600 font-medium">Reviewed</span>}
            </div>
          ))}
      </div>
      {pg && <Pagination page={pg.page} totalPages={Math.max(1, pg.totalPages)} total={pg.total} limit={PAGE_SIZE} onChange={setPage} />}
    </>
  );
}
