import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Lock } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { api, type ApiCompetitionAdminDetail, type ApiCompetitionAdminRow, type ApiCompetitionEvidence } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { CompetitionReviewPanel } from './CompetitionReviewPanel';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Kathmandu', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
const npr = (n: number | null) => (n == null ? '' : `NPR ${Math.round(n).toLocaleString('en-IN')}`);

/**
 * Competition oversight. Everything shown by default is aggregate or already
 * public. Moderation tools appear only for admins on the backend's
 * COMPETITION_MODERATOR_EMAILS allowlist — and the backend re-checks that on
 * every call, so hiding the UI is not the protection.
 */
export function CompetitionAdminDetail() {
  const { id = '' } = useParams();
  const { data, loading, error, refetch } = useApi(() => api.admin.competition(id));
  const c = data?.data;

  if (loading && !c) return <div className="h-64 animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
  if (error || !c) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error ?? 'Competition not found.'}</div>;

  return (
    <div className="space-y-5">
      <Link to="/admin/competitions" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft size={14} /> Competitions</Link>
      <PageHeader title={c.title} subtitle={`${c.organizer.businessName ?? 'Unknown organizer'}${c.organizer.isVerified ? ' · verified' : ''}`} />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={c.status.toLowerCase()} />
        {c.moderation.suspended && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Suspended</span>}
        {c.moderation.flag !== 'NONE' && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">{c.moderation.flag.replace(/_/g, ' ').toLowerCase()}</span>}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <CompetitionReviewPanel c={c} onChanged={refetch} />
          <Card title="Overview">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <Row k="Published" v={fmt(c.publishedAt)} />
              <Row k="Participants" v={String(c.participantCount)} />
              <Row k="Registration" v={`${fmt(c.registrationOpensAt)} → ${fmt(c.registrationDeadline)}`} />
              <Row k="Runs" v={`${fmt(c.startsAt)} → ${fmt(c.endsAt)}`} />
              {c.completedAt && <Row k="Completed" v={fmt(c.completedAt)} />}
              {c.cancelledAt && <Row k="Cancelled" v={`${fmt(c.cancelledAt)}${c.cancelReason ? ` — ${c.cancelReason}` : ''}`} />}
            </dl>
          </Card>

          <Card title="Stages">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-gray-500"><tr><th className="py-2 pr-3">Stage</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Deadline</th><th className="py-2 pr-3">Submissions</th><th className="py-2 pr-3">Advanced</th><th className="py-2">Not selected</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {c.stages.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2 pr-3 font-medium text-gray-900">{s.order}. {s.name}{s.advanceLimit ? <span className="text-xs text-gray-400"> (top {s.advanceLimit})</span> : null}</td>
                      <td className="py-2 pr-3"><StatusBadge status={s.status.toLowerCase()} /></td>
                      <td className="py-2 pr-3 text-gray-600">{fmt(s.deadline)}</td>
                      <td className="py-2 pr-3">{s.submissions}</td>
                      <td className="py-2 pr-3">{s.advanced}</td>
                      <td className="py-2">{s.notSelected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-400"><Lock size={12} /> Counts include published decisions only. Individual entries, drafts and judging notes are private to the organizer.</p>
          </Card>

          <Card title="Prizes (advertised)">
            {c.prizes.length === 0 ? <p className="text-sm text-gray-400">No prizes configured.</p> : (
              <ul className="divide-y divide-gray-100 text-sm">
                {c.prizes.map((p, i) => <li key={i} className="flex justify-between py-2"><span>{p.title}{p.recipientCount > 1 ? ` × ${p.recipientCount}` : ''}</span><span className="font-medium">{npr(p.amount)}</span></li>)}
              </ul>
            )}
            {c.prizePool && <p className="mt-2 text-sm text-gray-600">Total advertised: <b>{npr(c.prizePool.amount)}</b></p>}
            <p className="mt-2 text-xs text-gray-400">Informational only — Kolab does not process or verify competition prize payments.</p>
          </Card>

          {c.results && (
            <Card title="Published results">
              {c.results.length === 0 ? <p className="text-sm text-gray-400">Completed without prize assignments.</p> : (
                <ul className="divide-y divide-gray-100 text-sm">{c.results.map((r, i) => <li key={i} className="flex justify-between py-2"><span>{r.creator.fullName ?? r.creator.username}</span><span className="text-gray-600">{r.prize.title}</span></li>)}</ul>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card title={`Reports (${c.reports.length})`}>
            {c.reports.length === 0 ? <p className="text-sm text-gray-400">No reports filed against this competition.</p> : (
              <ul className="space-y-2 text-sm">
                {c.reports.map((r) => (
                  <li key={r.id} className="rounded-lg border border-gray-100 p-2">
                    <div className="flex justify-between"><span className="font-medium">{r.reason.replace(/_/g, ' ').toLowerCase()}</span><StatusBadge status={r.status.toLowerCase()} /></div>
                    {r.description && <p className="mt-1 text-gray-600">{r.description}</p>}
                    <p className="mt-1 text-xs text-gray-400">{fmt(r.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/admin/reports" className="mt-3 inline-block text-xs font-medium text-indigo-600 hover:underline">Open the Reports queue</Link>
          </Card>

          <Moderation c={c} onChanged={refetch} />
        </div>
      </div>
    </div>
  );
}

function Moderation({ c, onChanged }: { c: ApiCompetitionAdminDetail; onChanged: () => void }) {
  const [flag, setFlag] = useState<ApiCompetitionAdminRow['moderationFlag']>(c.moderation.flag);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [stageId, setStageId] = useState(c.stages[0]?.id ?? '');
  const [evidence, setEvidence] = useState<ApiCompetitionEvidence | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!c.viewerIsModerator) {
    return (
      <Card title="Moderation">
        <div className="flex items-start gap-2 text-sm text-gray-500"><ShieldAlert size={16} className="mt-0.5 shrink-0" /><p className="min-w-0">Moderation tools (flagging, suspension, evidence access) are limited to Kolab competition moderators. Ask an engineer to add your email to <code className="break-all">COMPETITION_MODERATOR_EMAILS</code> if you need access.</p></div>
      </Card>
    );
  }

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr(null);
    try { await fn(); onChanged(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const reasonOk = reason.trim().length >= 5;

  return (
    <Card title="Moderation">
      <p className="mb-3 text-xs text-gray-500">Every action here requires a reason and is recorded in the audit log.</p>
      {c.moderation.note && <p className="mb-3 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">Last note: {c.moderation.note}</p>}
      <div className="space-y-2">
        <select value={flag} onChange={(e) => setFlag(e.target.value as typeof flag)} className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm" aria-label="Moderation flag">
          {(['NONE', 'FLAGGED', 'UNDER_INVESTIGATION', 'CLEARED'] as const).map((f) => <option key={f} value={f}>{f.replace(/_/g, ' ').toLowerCase()}</option>)}
        </select>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note (required)" className="w-full rounded-lg border border-gray-200 p-2 text-sm" aria-label="Moderation note" />
        <button disabled={busy || note.trim().length < 5} onClick={() => act(() => api.admin.flagCompetition(c.id, flag, note.trim()).then(() => setNote('')))} className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Update flag</button>
      </div>

      <hr className="my-4 border-gray-100" />
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason for suspension / evidence access (required)" className="w-full rounded-lg border border-gray-200 p-2 text-sm" aria-label="Reason" />
      <div className="mt-2 flex flex-wrap gap-2">
        {c.moderation.suspended ? (
          <button disabled={busy || !reasonOk} onClick={() => act(() => api.admin.unsuspendCompetition(c.id, reason.trim()))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold disabled:opacity-40">Reinstate</button>
        ) : (
          <button disabled={busy || !reasonOk} onClick={() => { if (window.confirm('Suspend this competition? It will be hidden and frozen for creators and the organizer.')) void act(() => api.admin.suspendCompetition(c.id, reason.trim())); }} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Suspend</button>
        )}
      </div>

      {c.stages.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-semibold text-gray-700">Evidence access (audited)</p>
          <div className="flex gap-2">
            <select value={stageId} onChange={(e) => setStageId(e.target.value)} className="h-9 flex-1 rounded-lg border border-gray-200 px-2 text-sm" aria-label="Stage">
              {c.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button disabled={busy || !reasonOk} onClick={() => act(() => api.admin.competitionEvidence(c.id, stageId, reason.trim()).then((r) => setEvidence(r.data)))} className="rounded-lg border border-gray-200 px-3 text-sm font-semibold disabled:opacity-40">View entries</button>
          </div>
        </div>
      )}
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      {evidence && (
        <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-gray-100">
          {evidence.items.length === 0 ? <p className="p-3 text-sm text-gray-400">No entries for {evidence.stage.name}.</p> : (
            <ul className="divide-y divide-gray-100 text-sm">
              {evidence.items.map((e) => (
                <li key={e.participantId} className="p-2">
                  <p className="font-medium">{e.creator.fullName ?? e.creator.username}</p>
                  <a href={e.videoUrl ?? e.externalUrl ?? '#'} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline">{e.method === 'VIDEO_UPLOAD' ? 'Uploaded video' : e.externalUrl}</a>
                  <p className="text-xs text-gray-400">v{e.version} · {fmt(e.submittedAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="adm-card rounded-2xl border border-gray-200 bg-white p-5"><h2 className="mb-3 text-sm font-semibold text-gray-900">{title}</h2>{children}</section>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div><dt className="text-xs text-gray-500">{k}</dt><dd className="text-gray-800">{v}</dd></div>;
}
