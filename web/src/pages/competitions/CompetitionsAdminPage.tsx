import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Flag, Trophy } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { api, type ApiCompetitionAdminRow } from '../../lib/api';

const STATUSES = ['', 'DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'AWAITING_RESULTS', 'COMPLETED', 'CANCELLED'];
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Asia/Kathmandu', day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Admin oversight list. Aggregate data only — the backend never returns
 * submissions, draft decisions or creator identities on these endpoints.
 */
export function CompetitionsAdminPage() {
  const navigate = useNavigate();
  // The review queue is the default view — it's the part admins act on.
  const [params, setParams] = useSearchParams();
  const queue = params.get('review') !== 'all';
  const [status, setStatus] = useState('');
  const [flagged, setFlagged] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  // Results are tagged with the query they answer; `loading` is derived
  // (no setState in the effect body).
  const key = JSON.stringify({ queue, status, flagged, q, page });
  const [result, setResult] = useState<{ key: string; rows: ApiCompetitionAdminRow[]; totalPages: number; error: string | null } | null>(null);
  const loading = result?.key !== key;
  const rows = result?.rows ?? [];
  const totalPages = result?.totalPages ?? 1;
  const error = result?.key === key ? result.error : null;

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      api.admin.competitions({ review: queue ? 'pending' : undefined, status: queue ? undefined : status || undefined, flagged: !queue && flagged ? 'true' : undefined, q: q || undefined, page })
        .then((r) => { if (!cancelled) setResult({ key, rows: r.data.items, totalPages: r.data.pagination.totalPages, error: null }); })
        .catch((e: Error) => { if (!cancelled) setResult({ key, rows: [], totalPages: 1, error: e.message }); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [key, queue, status, flagged, q, page]);

  return (
    <div>
      <PageHeader title="Competitions" subtitle="Oversight of creator competitions. Submissions and judging stay private to organizers." />

      <div className="mb-4 inline-flex rounded-xl border border-gray-200 bg-white p-1 text-sm" role="tablist" aria-label="View">
        {[{ v: true, label: 'Review queue' }, { v: false, label: 'All competitions' }].map((o) => (
          <button key={o.label} role="tab" aria-selected={queue === o.v} onClick={() => { setParams(o.v ? {} : { review: 'all' }); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 font-medium ${queue === o.v ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{o.label}</button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search title or organizer…" className="h-10 w-64 rounded-xl border border-gray-200 bg-white px-3 text-sm" aria-label="Search competitions" />
        {!queue && <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm" aria-label="Filter by status">
          {STATUSES.map((s) => <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'All statuses'}</option>)}
        </select>}
        {!queue && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={flagged} onChange={(e) => { setFlagged(e.target.checked); setPage(1); }} /> Flagged / suspended only
          </label>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />)}</div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          <Trophy className="mx-auto mb-2" size={28} />
          {queue ? 'Nothing to review — new competitions and proposed edits to live ones will appear here.' : status || flagged || q ? 'No competitions match these filters.' : 'No competitions have been created yet.'}
        </div>
      ) : (
        <div className="adm-card overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr><th className="px-4 py-3">Competition</th><th className="px-4 py-3">Organizer</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Participants</th><th className="px-4 py-3">Registration closes</th><th className="px-4 py-3">Moderation</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id} onClick={() => navigate(`/admin/competitions/${r.id}`)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.title}<div className="text-xs text-gray-400">{r.stageCount} stage{r.stageCount === 1 ? '' : 's'}</div></td>
                  <td className="px-4 py-3 text-gray-700">{r.organizer.businessName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={r.status.toLowerCase()} />
                      {r.hasPendingChanges && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">edit to review</span>}
                    </div>
                    {queue && r.submittedForReviewAt && r.status === 'PENDING_REVIEW' && <div className="mt-0.5 text-xs text-gray-400">submitted {fmt(r.submittedForReviewAt)}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.participantCount}</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(r.registrationDeadline)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {r.suspended && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Suspended</span>}
                      {r.moderationFlag !== 'NONE' && r.moderationFlag !== 'CLEARED' && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{r.moderationFlag.replace(/_/g, ' ').toLowerCase()}</span>}
                      {r.openReports > 0 && <span className="inline-flex items-center gap-1 text-xs text-red-600"><Flag size={12} />{r.openReports}</span>}
                      {!r.suspended && (r.moderationFlag === 'NONE' || r.moderationFlag === 'CLEARED') && r.openReports === 0 && <span className="text-xs text-gray-400">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex justify-end gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40">Previous</button>
          <span className="px-2 py-1.5 text-sm text-gray-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
