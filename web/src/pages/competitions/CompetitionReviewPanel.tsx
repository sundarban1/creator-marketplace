import { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, FileClock } from 'lucide-react';
import { api, type ApiCompetitionAdminDetail, type ApiCompetitionPrizeContent } from '../../lib/api';
import { FormErrorBanner } from '../../app/ui/FieldError';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Kathmandu', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
const npr = (n: number | null | undefined) => (n == null ? 'non-cash' : `NPR ${Math.round(n).toLocaleString('en-IN')}`);
const MIN_FEEDBACK = 10;

const ACTION_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted for review', RESUBMITTED: 'Resubmitted', WITHDRAWN: 'Withdrawn by organizer',
  APPROVED: 'Approved', CHANGES_REQUESTED: 'Changes requested', REJECTED: 'Rejected',
  EDIT_SUBMITTED: 'Edit submitted', EDIT_APPROVED: 'Edit approved', EDIT_REJECTED: 'Edit rejected',
};

/**
 * Admin review of a competition — the organizer-authored content only. Any
 * admin can review (unlike moderation evidence, nothing here is participant
 * data). Launch review and proposed-edit review share the same feedback box.
 */
export function CompetitionReviewPanel({ c, onChanged }: { c: ApiCompetitionAdminDetail; onChanged: () => void }) {
  const [feedback, setFeedback] = useState('');
  const [allowResubmission, setAllowResubmission] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pendingLaunch = c.status === 'PENDING_REVIEW';
  const pendingEdit = !!c.review.pendingChanges;
  const okFeedback = feedback.trim().length >= MIN_FEEDBACK;

  const act = async (fn: () => Promise<unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setErr(null);
    try { await fn(); setFeedback(''); onChanged(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      {pendingLaunch && (
        <section className="adm-card rounded-2xl border-2 border-indigo-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><FileClock size={16} className="text-indigo-600" />Awaiting launch review</h2>
          <p className="mt-1 text-sm text-gray-600">
            Submitted {fmt(c.review.submittedAt)} · revision {c.review.revision}.{' '}
            {c.review.publishAt ? `Organizer wants it live at ${fmt(c.review.publishAt)}.` : 'Goes live as soon as you approve.'}
          </p>
          <p className="mt-2 text-xs text-gray-500">Check the content below: clear rules and eligibility, realistic and specific prizes, sensible dates, nothing misleading or against policy.</p>
          <Decision
            feedback={feedback} setFeedback={setFeedback} busy={busy} err={err}
            extra={<label className="flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={allowResubmission} onChange={(e) => setAllowResubmission(e.target.checked)} />Allow the organizer to resubmit after rejection</label>}
            actions={[
              { label: 'Approve', tone: 'primary', icon: CheckCircle2, disabled: false, onClick: () => act(() => api.admin.approveCompetition(c.id), c.review.publishAt ? 'Approve? It will go live at the scheduled time.' : 'Approve and publish this competition to creators now?') },
              { label: 'Request changes', tone: 'secondary', icon: AlertTriangle, disabled: !okFeedback, onClick: () => act(() => api.admin.requestCompetitionChanges(c.id, feedback.trim())) },
              { label: 'Reject', tone: 'danger', icon: XCircle, disabled: !okFeedback, onClick: () => act(() => api.admin.rejectCompetition(c.id, feedback.trim(), allowResubmission), allowResubmission ? 'Reject this competition?' : 'Reject permanently? The organizer will not be able to resubmit.') },
            ]}
          />
        </section>
      )}

      {pendingEdit && (
        <section className="adm-card rounded-2xl border-2 border-indigo-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><FileClock size={16} className="text-indigo-600" />Proposed edit to a {c.status === 'SCHEDULED' ? 'scheduled' : 'live'} competition</h2>
          <p className="mt-1 text-sm text-gray-600">Submitted {fmt(c.review.pendingChangesSubmittedAt)}. The current version stays in effect until you approve. Participants are notified when it's applied.</p>
          <div className="mt-4 space-y-4">
            {c.review.pendingChanges?.rules !== undefined && <Diff label="Rules" before={c.content.rules} after={c.review.pendingChanges.rules ?? ''} />}
            {c.review.pendingChanges && 'eligibility' in c.review.pendingChanges && <Diff label="Eligibility" before={c.content.eligibility ?? '—'} after={c.review.pendingChanges.eligibility ?? '—'} />}
            {c.review.pendingChanges?.prizes && <Diff label="Prizes" before={prizeText(c.content.prizes)} after={prizeText(c.review.pendingChanges.prizes)} />}
          </div>
          <Decision
            feedback={feedback} setFeedback={setFeedback} busy={busy} err={pendingLaunch ? null : err}
            actions={[
              { label: 'Approve edit', tone: 'primary', icon: CheckCircle2, disabled: false, onClick: () => act(() => api.admin.approveCompetitionChanges(c.id), 'Apply these changes? Participants will be notified.') },
              { label: 'Reject edit', tone: 'danger', icon: XCircle, disabled: !okFeedback, onClick: () => act(() => api.admin.rejectCompetitionChanges(c.id, feedback.trim())) },
            ]}
          />
        </section>
      )}

      <section className="adm-card rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Competition content</h2>
        {c.content.coverImageUrl && <img src={c.content.coverImageUrl} alt="" className="mb-3 aspect-[3/1] w-full rounded-xl object-cover" />}
        <dl className="space-y-3 text-sm">
          <Block k="Description" v={c.description} />
          {c.content.objectives && <Block k="Objectives" v={c.content.objectives} />}
          <Block k="Rules" v={c.content.rules} />
          <Block k="Eligibility" v={c.content.eligibility ?? '—'} />
          {c.content.submissionInstructions && <Block k="Submission instructions" v={c.content.submissionInstructions} />}
          {c.content.contactInstructions && <Block k="Contact" v={c.content.contactInstructions} />}
          <Block k="Prizes (advertised)" v={prizeText(c.content.prizes) || 'No prizes'} />
          <Block k="Settings" v={[
            c.content.submissionMode === 'SINGLE' ? 'One entry deadline — later stages shortlist the same entries' : 'A submission deadline for each stage',
            c.content.allowSubmissionEdits ? 'Entries can be replaced before deadlines' : 'Entries are final',
            c.content.onePrizePerCreator ? 'One prize per creator' : 'Creators may win several prizes',
            `Results visible to ${c.content.resultsVisibility === 'PUBLIC' ? 'everyone' : 'participants only'}`,
            c.content.judgingCriteria.length ? `Judging: ${c.content.judgingCriteria.map((j) => `${j.label} ${j.weight}%`).join(', ')}` : 'No scoring rubric',
          ].join('\n')} />
          {c.content.stageBriefs.map((s) => <Block key={s.id} k={`Stage: ${s.name}`} v={[s.brief, s.requirements, // Video upload is hidden for now; creators submit Google Drive links.
            `Accepts: ${s.allowedMethods.filter((m) => m !== 'VIDEO_UPLOAD').map(() => 'Google Drive link').join(', ') || '—'}`].filter(Boolean).join('\n\n')} />)}
          {c.content.attachments.length > 0 && (
            <div><dt className="text-xs font-semibold text-gray-500">Documents</dt>
              <dd className="mt-1 flex flex-wrap gap-2">{c.content.attachments.map((a) => <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-indigo-600 hover:bg-gray-50">{a.name}</a>)}</dd>
            </div>
          )}
        </dl>
      </section>

      {c.review.history.length > 0 && (
        <section className="adm-card rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Review history</h2>
          <ol className="space-y-2 text-sm">
            {c.review.history.map((h) => (
              <li key={h.id} className="border-l-2 border-gray-200 pl-3">
                <span className="font-medium text-gray-800">{ACTION_LABELS[h.action] ?? h.action}</span>
                <span className="text-xs text-gray-400"> · {fmt(h.createdAt)} · rev {h.revision}</span>
                {h.changedFields.length > 0 && <span className="text-xs text-gray-400"> · {h.changedFields.join(', ')}</span>}
                {h.feedback && <p className="mt-0.5 whitespace-pre-line text-gray-600">“{h.feedback}”</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function prizeText(prizes: ApiCompetitionPrizeContent[]): string {
  return prizes.map((p) => `${p.title}${p.recipientCount > 1 ? ` × ${p.recipientCount}` : ''} — ${npr(p.amount)}${p.description ? ` (${p.description})` : ''}`).join('\n');
}

function Block({ k, v }: { k: string; v: string }) {
  return <div><dt className="text-xs font-semibold text-gray-500">{k}</dt><dd className="mt-0.5 whitespace-pre-line text-gray-800">{v}</dd></div>;
}

function Diff({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-gray-500">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-red-100 bg-red-50/50 p-2"><p className="mb-1 text-[11px] font-semibold uppercase text-red-600">Current</p><p className="whitespace-pre-line text-sm text-gray-700">{before}</p></div>
        <div className="rounded-lg border border-green-100 bg-green-50/50 p-2"><p className="mb-1 text-[11px] font-semibold uppercase text-green-700">Proposed</p><p className="whitespace-pre-line text-sm text-gray-900">{after}</p></div>
      </div>
    </div>
  );
}

function Decision({ feedback, setFeedback, busy, err, extra, actions }: {
  feedback: string; setFeedback: (v: string) => void; busy: boolean; err: string | null; extra?: React.ReactNode;
  actions: Array<{ label: string; tone: 'primary' | 'secondary' | 'danger'; icon: typeof CheckCircle2; disabled: boolean; onClick: () => void }>;
}) {
  const tone = { primary: 'bg-indigo-600 text-white hover:bg-indigo-700', secondary: 'border border-gray-200 text-gray-800 hover:bg-gray-50', danger: 'bg-red-600 text-white hover:bg-red-700' };
  return (
    <div className="mt-4 space-y-2">
      <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} placeholder={`Feedback for the organizer (required to request changes or reject, min ${MIN_FEEDBACK} characters)`} className="w-full rounded-lg border border-gray-200 p-2 text-sm" aria-label="Feedback for the organizer" />
      {extra}
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button key={a.label} disabled={busy || a.disabled} onClick={a.onClick} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-40 ${tone[a.tone]}`}>
            <a.icon size={14} />{a.label}
          </button>
        ))}
      </div>
      {err && <FormErrorBanner message={err} />}
    </div>
  );
}
