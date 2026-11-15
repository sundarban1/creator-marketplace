import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, EyeOff, Lock, MessageSquare, ShieldAlert, UserRound } from 'lucide-react';
import { api, type ApiModerationReportDetail, type ApiModerationUserSummary, type ModActionType } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { alertDialog, confirmDialog } from '../../app/ui/confirmDialog';
import { ACTION_LABEL, REASON_LABEL, TARGET_LABEL, errMessage, fmtDate } from './labels';
import { PriorityPill, StatusPill, VerificationPill } from './pills';
import { usePoll } from './usePoll';

// One report, end to end: what was reported (live + frozen evidence), who is
// involved, history, and the decision workflow. The server enforces every
// rule (verify before acting, decide before resolving, assignment locks);
// this page only offers the steps that are currently valid.

const card = 'bg-white rounded-2xl border border-gray-200 adm-card';
const btn = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const input = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200';
const OPEN = ['NEW', 'UNDER_REVIEW', 'NEEDS_MORE_INFO'];

export function ModerationReportDetail() {
  const { id = '' } = useParams();
  const { data, loading, error, refetch } = useApi(() => api.admin.moderation.report(id));
  const moderators = useApi(() => api.admin.moderation.moderators());
  usePoll(refetch, 45_000);
  // A mutation's response is shown until the next fetch lands (keyed to the
  // fetch it was made on top of, so a background poll supersedes it).
  const [override, setOverride] = useState<{ base: unknown; value: ApiModerationReportDetail } | null>(null);
  const report = override && override.base === data ? override.value : data?.data ?? null;
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<{ data: ApiModerationReportDetail }>) {
    setBusy(true);
    try { setOverride({ base: data, value: (await fn()).data }); }
    catch (e) { void alertDialog({ title: 'Action not completed', message: errMessage(e) }); refetch(); }
    finally { setBusy(false); }
  }

  if (loading && !report) return <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-50 border border-gray-200" />)}</div>;
  if (error && !report) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>;
  if (!report) return null;
  const r = report;
  const open = OPEN.includes(r.status);

  return (
    <div>
      <Link to="/admin/moderation" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3"><ArrowLeft size={14} /> Moderation</Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <PriorityPill priority={r.priority} /><StatusPill status={r.status} /><VerificationPill v={r.verification} />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{REASON_LABEL[r.reason] ?? r.reason}</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {TARGET_LABEL[r.targetType] ?? r.targetType} · Report <span className="font-mono">{r.id}</span> · submitted {fmtDate(r.createdAt)}
          </p>
        </div>
        <AssignBox r={r} busy={busy} moderators={moderators.data?.data ?? []} onAssign={(assigneeId) => run(() => api.admin.moderation.assign(r.id, assigneeId))} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5">
        <div className="space-y-5 min-w-0">
          <ContentPanel r={r} />
          <section className={`${card} p-5`}>
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Reporter’s description</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.description || <span className="text-gray-400">No description provided.</span>}</p>
            {r.actionNote && <p className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2"><b>Internal note:</b> {r.actionNote}</p>}
          </section>
          <HistoryPanel r={r} />
        </div>

        <div className="space-y-5">
          <Workflow r={r} busy={busy} open={open} run={run} />
          <PersonCard title="Reported user" user={r.reportedUser} extra={r.reportedUser && <>Blocked by {r.blocksAgainstUser} user{r.blocksAgainstUser === 1 ? '' : 's'} · {r.userHistory.length} prior action{r.userHistory.length === 1 ? '' : 's'}</>} />
          <PersonCard title="Reporter" confidential user={r.reporter} />
        </div>
      </div>
    </div>
  );
}

function AssignBox({ r, busy, moderators, onAssign }: { r: ApiModerationReportDetail; busy: boolean; moderators: Array<{ id: string; email: string }>; onAssign: (id: string | null | undefined) => void }) {
  return (
    <div className={`${card} p-3 flex flex-wrap items-center gap-2 text-xs`}>
      <span className="text-gray-500">Assigned to</span>
      <select
        disabled={busy}
        value={r.assignedTo?.id ?? ''}
        onChange={(e) => onAssign(e.target.value || null)}
        className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs"
        aria-label="Assign moderator">
        <option value="">Unassigned</option>
        {moderators.map((m) => <option key={m.id} value={m.id}>{m.email}</option>)}
      </select>
      <button disabled={busy} onClick={() => onAssign(undefined)} className={`${btn} bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}>Assign to me</button>
    </div>
  );
}

function Media({ url, label }: { url?: unknown; label: string }) {
  if (typeof url !== 'string' || !url) return null;
  const isVideo = /\.(mp4|mov|webm)(\?|$)/i.test(url);
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">{label}</div>
      {isVideo ? <video src={url} controls className="max-h-72 rounded-lg border border-gray-200" />
        : <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={label} className="max-h-72 rounded-lg border border-gray-200 object-contain" /></a>}
    </div>
  );
}

const TEXT_FIELDS: Array<[string, string]> = [['name', 'Name'], ['title', 'Title'], ['username', 'Username'], ['content', 'Message'], ['caption', 'Caption'], ['bio', 'Bio'], ['description', 'Description'], ['comment', 'Review'], ['externalUrl', 'Link']];
const MEDIA_FIELDS: Array<[string, string]> = [['imageUrl', 'Image'], ['mediaUrl', 'Media'], ['avatarUrl', 'Avatar'], ['logoUrl', 'Logo'], ['coverImageUrl', 'Cover'], ['thumbnailUrl', 'Thumbnail'], ['videoUrl', 'Video'], ['attachmentUrl', 'Attachment']];

type DelivVideo = { url?: string; label?: string; thumbnailUrl?: string };
type DelivFile = { url?: string; fileType?: string; originalFileName?: string };

// A campaign deliverable reported from "Raise an issue": the media the
// business saw, plus the immutable submission version it belonged to.
function DeliverableSnapshot({ snap }: { snap: Record<string, unknown> }) {
  const videos = (Array.isArray(snap.videos) ? snap.videos : []) as DelivVideo[];
  const files = (Array.isArray(snap.files) ? snap.files : []) as DelivFile[];
  const version = snap.submissionVersion as { id: string; version: number; createdAt: string } | null | undefined;
  const links = typeof snap.urls === 'string' ? snap.urls.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean) : [];
  const meta: Array<[string, unknown]> = [['Campaign', snap.campaignTitle], ['Business', snap.businessName], ['Creator', snap.creatorName], ['Work status', snap.workStatus], ['Submitted', snap.submittedAt ? fmtDate(String(snap.submittedAt)) : null]];
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {meta.map(([k, v]) => v ? (
          <div key={k}><dt className="text-[11px] uppercase tracking-wide text-gray-400">{k}</dt><dd className="text-gray-800">{String(v)}</dd></div>
        ) : null)}
      </dl>
      {typeof snap.note === 'string' && snap.note && (
        <div><div className="text-[11px] uppercase tracking-wide text-gray-400">Creator note</div><p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{snap.note}</p></div>
      )}
      {videos.length + files.length === 0 && links.length === 0 && <p className="text-sm text-gray-400">No files in the current draft.</p>}
      <div className="flex flex-wrap gap-3">
        {videos.map((v, i) => <Media key={`v${i}`} url={v.url} label={v.label || `Video ${i + 1}`} />)}
        {files.map((f, i) => f.fileType === 'IMAGE'
          ? <Media key={`f${i}`} url={f.url} label={f.originalFileName || `Image ${i + 1}`} />
          : f.url ? <a key={`f${i}`} href={f.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-700 underline break-all">{f.originalFileName || `File ${i + 1}`}</a> : null)}
      </div>
      {links.length > 0 && (
        <div><div className="text-[11px] uppercase tracking-wide text-gray-400">Links</div>
          {links.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer" className="block text-sm text-indigo-700 underline break-all">{u}</a>)}
        </div>
      )}
      {version && <p className="text-[11px] text-gray-400">Submission version v{version.version} · {fmtDate(version.createdAt)} · <span className="font-mono">{version.id}</span></p>}
    </div>
  );
}

function Snapshot({ snap }: { snap: Record<string, unknown> }) {
  if (snap.kind === 'deliverable') return <DeliverableSnapshot snap={snap} />;
  const context = Array.isArray(snap.context) ? (snap.context as Array<{ id: string; senderId: string; content: string; sentAt: string }>) : null;
  return (
    <div className="space-y-3">
      {TEXT_FIELDS.map(([k, label]) => typeof snap[k] === 'string' && snap[k] ? (
        <div key={k}>
          <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
          <p className={`text-sm text-gray-800 whitespace-pre-wrap break-words ${k === 'content' ? 'bg-red-50 border border-red-100 rounded-lg px-3 py-2' : ''}`}>{String(snap[k])}</p>
        </div>
      ) : null)}
      <div className="flex flex-wrap gap-3">{MEDIA_FIELDS.map(([k, label]) => <Media key={k} url={snap[k]} label={label} />)}</div>
      {context && context.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1 flex items-center gap-1"><MessageSquare size={11} /> Conversation context</div>
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
            {context.map((m) => (
              <div key={m.id} className={`px-3 py-2 ${m.senderId === snap.senderId ? 'bg-gray-50' : ''}`}>
                <div className="text-[11px] text-gray-400">{m.senderId === snap.senderId ? 'Reported user' : 'Other participant'} · {fmtDate(m.sentAt)}</div>
                <div className="text-gray-700 whitespace-pre-wrap break-words">{m.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ContentPanel({ r }: { r: ApiModerationReportDetail }) {
  const [view, setView] = useState<'live' | 'evidence'>(r.liveContent.exists ? 'live' : 'evidence');
  const snap = view === 'live' ? r.liveContent.snapshot : r.evidence ?? undefined;
  return (
    <section className={`${card} p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Reported content</h2>
        <div className="flex gap-1 text-xs">
          {(['live', 'evidence'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} disabled={v === 'live' && !r.liveContent.exists}
              className={`px-2.5 py-1 rounded-md font-medium ${view === v ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 disabled:opacity-40'}`}>
              {v === 'live' ? 'Current' : 'At time of report'}
            </button>
          ))}
        </div>
      </div>
      {r.liveContent.hidden && <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-2.5 py-1 text-xs text-white"><EyeOff size={12} /> Currently hidden / removed</div>}
      {!r.liveContent.exists && view === 'live' && <p className="text-sm text-gray-500">The content no longer exists — showing the evidence captured at submission.</p>}
      {snap ? <Snapshot snap={snap} /> : <p className="text-sm text-gray-400">No content captured.</p>}
      <p className="mt-3 text-[11px] text-gray-400 font-mono">target {r.targetId}{r.conversationId ? ` · conversation ${r.conversationId}` : ''}</p>
    </section>
  );
}

function Workflow({ r, busy, open, run }: { r: ApiModerationReportDetail; busy: boolean; open: boolean; run: (fn: () => Promise<{ data: ApiModerationReportDetail }>) => Promise<void> }) {
  const [decision, setDecision] = useState<'VALID' | 'INVALID' | 'NEEDS_MORE_INFORMATION'>('VALID');
  const [note, setNote] = useState('');
  const [notifyReporter, setNotifyReporter] = useState(true);

  return (
    <section className={`${card} p-5 space-y-5`}>
      <div className="flex items-center gap-2"><ShieldAlert size={16} className="text-indigo-600" /><h2 className="text-sm font-semibold text-gray-900">Decision</h2></div>

      {(r.status === 'NEW' || r.status === 'NEEDS_MORE_INFO') && (
        <Step n={1} title="Start the investigation">
          <button disabled={busy} onClick={() => run(() => api.admin.moderation.startReview(r.id))} className={`${btn} w-full bg-indigo-600 text-white hover:bg-indigo-700`}>Start review</button>
        </Step>
      )}

      {open && (
        <Step n={2} title="Verify the report" hint="Look at the content and context. A report is not proof by itself.">
          <div className="grid grid-cols-1 gap-1.5 mb-2">
            {([['VALID', 'Valid — violates the guidelines'], ['INVALID', 'Invalid — no violation'], ['NEEDS_MORE_INFORMATION', 'Needs more information']] as const).map(([k, l]) => (
              <label key={k} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${decision === k ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'}`}>
                <input type="radio" name="decision" checked={decision === k} onChange={() => setDecision(k)} /> {l}
              </label>
            ))}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Why? (internal — never shown to users)" className={input} />
          <button disabled={busy || note.trim().length < 3} onClick={() => run(() => api.admin.moderation.verify(r.id, decision, note.trim())).then(() => setNote(''))}
            className={`${btn} w-full mt-2 bg-gray-900 text-white hover:bg-black`}>Record decision</button>
        </Step>
      )}

      {r.verification === 'VALID' && r.status !== 'DISMISSED' && r.status !== 'RESOLVED' && (
        <Step n={3} title="Take action">
          <ActionForm r={r} busy={busy} run={run} />
        </Step>
      )}

      {r.verification === 'INVALID' && open && (
        <Step n={3} title="Dismiss">
          <button disabled={busy} onClick={async () => {
            const ok = await confirmDialog({ title: 'Dismiss this report?', message: 'No action will be taken against the user.', confirmLabel: 'Dismiss' });
            if (ok) await run(() => api.admin.moderation.dismiss(r.id, r.actionNote || 'No violation found'));
          }} className={`${btn} w-full bg-gray-100 text-gray-700 hover:bg-gray-200`}>Dismiss report</button>
        </Step>
      )}

      {open && r.verification === 'UNVERIFIED' && r.contentRemovable && r.liveContent.exists && !r.liveContent.hidden && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-xs text-amber-800 mb-2">Clearly harmful? Hide it while you investigate — it can be restored.</p>
          <button disabled={busy} onClick={async () => {
            const ok = await confirmDialog({ title: 'Hide pending investigation?', message: 'The content is hidden from everyone except its owner until you decide.', confirmLabel: 'Hide now', tone: 'warning' });
            if (ok) await run(() => api.admin.moderation.action(r.id, { action: 'REMOVE_CONTENT', reason: 'Hidden pending investigation', interim: true }));
          }} className={`${btn} bg-amber-600 text-white hover:bg-amber-700`}><EyeOff size={13} /> Hide pending review</button>
        </div>
      )}

      {(r.status === 'ACTION_TAKEN' || r.status === 'DISMISSED') && (
        <Step n={4} title="Resolve">
          <label className="flex items-center gap-2 text-xs text-gray-600 mb-2">
            <input type="checkbox" checked={notifyReporter} onChange={(e) => setNotifyReporter(e.target.checked)} /> Tell the reporter the outcome (generic message, no details)
          </label>
          <button disabled={busy} onClick={() => run(() => api.admin.moderation.resolve(r.id, undefined, notifyReporter))} className={`${btn} w-full bg-emerald-600 text-white hover:bg-emerald-700`}>Mark resolved</button>
        </Step>
      )}

      {r.status === 'RESOLVED' && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">Resolved {fmtDate(r.resolvedAt)}. Content can still be restored or restrictions lifted below if needed.</div>
      )}
      {r.status === 'RESOLVED' && <ActionForm r={r} busy={busy} run={run} undoOnly />}
    </section>
  );
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[11px] font-bold text-white">{n}</span>
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      </div>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

const CONTENT_ACTIONS: ModActionType[] = ['REMOVE_CONTENT', 'RESTORE_CONTENT'];
const USER_ACTIONS: ModActionType[] = ['WARN_USER', 'RESTRICT_MESSAGING', 'SUSPEND_TEMPORARY', 'SUSPEND_PERMANENT', 'LIFT_RESTRICTIONS', 'NO_ACTION'];

function ActionForm({ r, busy, run, undoOnly }: { r: ApiModerationReportDetail; busy: boolean; run: (fn: () => Promise<{ data: ApiModerationReportDetail }>) => Promise<void>; undoOnly?: boolean }) {
  const options = [
    ...(r.contentRemovable ? CONTENT_ACTIONS : []),
    ...(r.reportedUser ? USER_ACTIONS : ['NO_ACTION' as ModActionType]),
  ].filter((a) => !undoOnly || a === 'RESTORE_CONTENT' || a === 'LIFT_RESTRICTIONS')
   .filter((a) => a !== 'REMOVE_CONTENT' || !r.liveContent.hidden)
   .filter((a) => a !== 'RESTORE_CONTENT' || r.liveContent.hidden);
  const [chosen, setAction] = useState<ModActionType>(options[0] ?? 'NO_ACTION');
  // Options change as content is hidden/restored — fall back to the first valid one.
  const action: ModActionType = options.includes(chosen) ? chosen : options[0] ?? 'NO_ACTION';
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [days, setDays] = useState(7);
  if (!options.length) return null;

  const needsDays = action === 'SUSPEND_TEMPORARY' || action === 'RESTRICT_MESSAGING';
  const severe = action === 'SUSPEND_TEMPORARY' || action === 'SUSPEND_PERMANENT';
  const needsNotes = action === 'SUSPEND_PERMANENT';

  async function submit() {
    if (severe) {
      const ok = await confirmDialog({
        title: action === 'SUSPEND_PERMANENT' ? 'Permanently suspend this account?' : `Suspend for ${days} days?`,
        message: 'They will be signed out on every device and told the reason. Payments, contracts and history are not deleted.',
        confirmLabel: 'Suspend account', tone: 'danger',
      });
      if (!ok) return;
    }
    await run(() => api.admin.moderation.action(r.id, {
      action, reason: reason.trim(), notes: notes.trim() || undefined,
      durationDays: needsDays ? days : undefined, confirm: severe || undefined,
    }));
    setReason(''); setNotes('');
  }

  return (
    <div className="space-y-2">
      <select value={action} onChange={(e) => setAction(e.target.value as ModActionType)} className={input} aria-label="Action">
        {options.map((a) => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}
      </select>
      {needsDays && (
        <label className="flex items-center gap-2 text-xs text-gray-600">Duration
          <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))} className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm" /> days
        </label>
      )}
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (shown to the user)" className={input} />
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={needsNotes ? 'Internal notes (required)' : 'Internal notes (optional)'} className={input} />
      <button disabled={busy || reason.trim().length < 3 || (needsNotes && !notes.trim())} onClick={submit}
        className={`${btn} w-full ${severe || action === 'REMOVE_CONTENT' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-black'} text-white`}>
        Apply: {ACTION_LABEL[action]}
      </button>
    </div>
  );
}

function PersonCard({ title, user, confidential, extra }: { title: string; user: ApiModerationUserSummary | null; confidential?: boolean; extra?: ReactNode }) {
  const [now] = useState(() => Date.now());
  const restricted = user?.messagingRestrictedUntil && new Date(user.messagingRestrictedUntil).getTime() > now;
  return (
    <section className={`${card} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {confidential && <span className="inline-flex items-center gap-1 text-[11px] text-gray-500"><Lock size={11} /> Confidential</span>}
      </div>
      {!user ? <p className="text-sm text-gray-400">Unknown</p> : (
        <div className="flex gap-3">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center"><UserRound size={18} className="text-gray-400" /></div>}
          <div className="min-w-0 text-sm">
            <div className="font-medium text-gray-900 truncate">{user.name}</div>
            <div className="text-xs text-gray-500 truncate">{user.email} · {user.role.toLowerCase()}</div>
            <div className="font-mono text-[11px] text-gray-400">{user.id}</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {user.suspendedAt ? <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">Suspended{user.suspendedUntil ? ` until ${fmtDate(user.suspendedUntil, false)}` : ''}</span>
                : <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Active</span>}
              {restricted && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Messaging restricted until {fmtDate(user.messagingRestrictedUntil, false)}</span>}
            </div>
            {extra && <div className="mt-1.5 text-xs text-gray-500">{extra}</div>}
            {!confidential && <Link to={`/admin/moderation?user=${encodeURIComponent(user.id)}`} className="mt-1.5 inline-block text-xs text-indigo-600 hover:underline">All reports about this user</Link>}
          </div>
        </div>
      )}
    </section>
  );
}

function HistoryPanel({ r }: { r: ApiModerationReportDetail }) {
  return (
    <section className={`${card} p-5 space-y-5`}>
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Actions on this report</h2>
        {r.actions.length === 0 ? <p className="text-sm text-gray-400">None yet.</p> : (
          <ul className="space-y-2">{r.actions.map((a) => (
            <li key={a.id} className="text-sm"><b>{ACTION_LABEL[a.action]}</b>{a.durationDays ? ` · ${a.durationDays} days` : ''} — {a.reason}
              {a.notes && <span className="text-gray-500"> · {a.notes}</span>}<span className="block text-xs text-gray-400">{fmtDate(a.createdAt)}</span></li>
          ))}</ul>
        )}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Related reports</h2>
        {r.related.length === 0 ? <p className="text-sm text-gray-400">No other reports about this content or user.</p> : (
          <ul className="divide-y divide-gray-100">{r.related.map((x) => (
            <li key={x.id} className="py-2 flex flex-wrap items-center gap-2 text-sm">
              <Link to={`/admin/moderation/reports/${x.id}`} className="text-indigo-600 hover:underline">{REASON_LABEL[x.reason] ?? x.reason}</Link>
              <span className="text-xs text-gray-400">{TARGET_LABEL[x.targetType] ?? x.targetType} · {fmtDate(x.createdAt, false)}</span>
              <StatusPill status={x.status} />
            </li>
          ))}</ul>
        )}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-2">User’s moderation history</h2>
        {r.userHistory.length === 0 ? <p className="text-sm text-gray-400">No previous actions.</p> : (
          <ul className="space-y-1">{r.userHistory.map((a) => (
            <li key={a.id} className="text-sm text-gray-700">{ACTION_LABEL[a.action]} — {a.reason} <span className="text-xs text-gray-400">{fmtDate(a.createdAt, false)}</span></li>
          ))}</ul>
        )}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Audit trail</h2>
        <ul className="space-y-1">{r.auditTrail.map((a) => (
          <li key={a.id} className="text-xs text-gray-600 flex gap-2">
            <span className="text-gray-400 whitespace-nowrap">{fmtDate(a.createdAt)}</span>
            <span className="font-mono">{a.action}</span>
            {a.newValue && <span className="text-gray-400 truncate">{JSON.stringify(a.newValue)}</span>}
          </li>
        ))}</ul>
      </div>
    </section>
  );
}
