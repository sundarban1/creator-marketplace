import { useState } from 'react';
import { CheckCircle2, XCircle, PencilLine, History, ShieldCheck, Paperclip } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { api, type ApiCampaignDetail, type ApiCampaignReview } from '../lib/api';
import { useApi } from '../lib/useApi';

// Admin "Event Reviews" panel on /admin/campaigns/:id — the three review
// decisions (approve / request changes / reject), the creator-facing terms an
// admin should check before deciding, and the append-only review history.
// Every decision is validated + race-guarded server-side (409 if someone else
// decided first); the UI just prevents obvious mistakes and double clicks.

const MIN_FEEDBACK = 10;

const ACTION_LABEL: Record<ApiCampaignReview['action'], string> = {
  SUBMITTED: 'Submitted for review',
  RESUBMITTED: 'Resubmitted',
  APPROVED: 'Approved and published',
  CHANGES_REQUESTED: 'Changes requested',
  REJECTED: 'Rejected',
};
const ACTION_DOT: Record<ApiCampaignReview['action'], string> = {
  SUBMITTED: 'bg-blue-500', RESUBMITTED: 'bg-blue-500', APPROVED: 'bg-emerald-500',
  CHANGES_REQUESTED: 'bg-orange-500', REJECTED: 'bg-red-500',
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function fmtDate(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
}

type Modal = null | 'approve' | 'changes' | 'reject';

export function EventReviewPanel({ campaign, onDecided, toast }: {
  campaign: ApiCampaignDetail;
  onDecided: () => void;
  toast: (msg: string, ok?: boolean) => void;
}) {
  const [modal, setModal] = useState<Modal>(null);
  const [text, setText] = useState('');
  const [allowResubmission, setAllowResubmission] = useState(true);
  const [busy, setBusy] = useState(false);
  const { data: historyRes, refetch: refetchHistory } = useApi(() => api.admin.campaignReviewHistory(campaign.id));
  const history = historyRes?.data ?? [];

  const pending = campaign.status === 'PENDING_APPROVAL';
  const textOk = text.trim().length >= MIN_FEEDBACK;

  function close() {
    if (busy) return;
    setModal(null);
    setText('');
    setAllowResubmission(true);
  }

  async function decide() {
    if (busy) return;
    if (modal !== 'approve' && !textOk) return;
    setBusy(true);
    try {
      if (modal === 'approve') {
        await api.admin.approveCampaign(campaign.id);
        toast('Event approved and published. The business has been notified.');
      } else if (modal === 'changes') {
        await api.admin.requestCampaignChanges(campaign.id, text.trim());
        toast('Changes requested. The business has been emailed your feedback.');
      } else if (modal === 'reject') {
        await api.admin.rejectCampaign(campaign.id, text.trim(), allowResubmission);
        toast('Event rejected. The business has been emailed the reason.');
      }
      setModal(null);
      setText('');
      setAllowResubmission(true);
      refetchHistory();
      onDecided();
    } catch (e) {
      toast((e as Error).message ?? 'Could not save the review decision.', false);
      // A 409 means someone else decided — refresh so the admin sees it.
      refetchHistory();
      onDecided();
    } finally {
      setBusy(false);
    }
  }

  const attachments = campaign.brief?.attachments ?? [];
  const reqs = campaign.brief?.creatorRequirements;
  const terms: Array<[string, string | null | undefined]> = [
    ['Deliverables', campaign.deliverables],
    ['Content type', campaign.contentType],
    ['Min. followers', campaign.minFollowers ? campaign.minFollowers.toLocaleString() : null],
    ['Creator tiers', reqs?.tiers?.length ? reqs.tiers.join(', ') : null],
    ['Languages', reqs?.languages?.length ? reqs.languages.join(', ') : null],
    ['Eligibility notes', reqs?.notes],
    ['Starts', fmtDate(campaign.startDate)],
    ['Applications close', fmtDate(campaign.applicationDeadline)],
    ['Content deadline', fmtDate(campaign.deadline)],
    ['Event time', campaign.eventTime],
    ['Capacity', campaign.capacity ? String(campaign.capacity) : null],
    ['Location type', campaign.locationType === 'REMOTE' ? 'Remote' : campaign.locationType === 'ONSITE' ? 'On-site' : null],
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <ShieldCheck size={15} className="text-gray-400" /> Event Review
          {(campaign.reviewRevision ?? 0) > 1 && <span className="text-xs font-normal text-gray-500">· revision {campaign.reviewRevision}</span>}
        </h2>
        {pending && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setModal('approve')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <CheckCircle2 size={14} /> Approve and Publish
            </button>
            <button
              onClick={() => setModal('changes')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50"
            >
              <PencilLine size={14} /> Request Changes
            </button>
            <button
              onClick={() => setModal('reject')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
            >
              <XCircle size={14} /> Reject Event
            </button>
          </div>
        )}
      </div>

      {!pending && campaign.reviewFeedback && (campaign.status === 'CHANGES_REQUESTED' || campaign.status === 'REJECTED') && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${campaign.status === 'REJECTED' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
          <p className="font-semibold mb-1">
            {campaign.status === 'REJECTED' ? 'Rejection reason sent to the business' : 'Feedback sent to the business'}
            {campaign.status === 'REJECTED' && campaign.resubmissionAllowed === false && ' · resubmission disabled'}
          </p>
          <p className="whitespace-pre-line">{campaign.reviewFeedback}</p>
          <p className="mt-2 text-xs opacity-80">Waiting for the business to edit and resubmit.</p>
        </div>
      )}

      {/* Creator-facing terms worth checking before a decision */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Creator commitments & eligibility</p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          {terms.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="text-gray-400 w-36 flex-shrink-0">{k}</dt>
              <dd className="text-gray-800 whitespace-pre-line">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {(campaign.featureImageUrl || attachments.length > 0) && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Images & media</p>
          <div className="flex flex-wrap gap-3 items-start">
            {campaign.featureImageUrl && (
              <a href={campaign.featureImageUrl} target="_blank" rel="noreferrer">
                <img src={campaign.featureImageUrl} alt="Cover" className="h-24 w-36 object-cover rounded-lg border border-gray-200" />
              </a>
            )}
            {attachments.map((a) => (
              <a key={a.url} href={a.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:underline border border-gray-200 rounded-lg px-2.5 py-1.5">
                <Paperclip size={12} /> {a.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><History size={12} /> Review history</p>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">No review activity recorded yet.</p>
        ) : (
          <ol className="space-y-3">
            {history.map((h) => (
              <li key={h.id} className="flex gap-3">
                <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${ACTION_DOT[h.action]}`} />
                <div className="min-w-0 text-sm">
                  <p className="text-gray-800">
                    <span className="font-medium">{ACTION_LABEL[h.action]}</span>
                    <span className="text-gray-400"> · revision {h.revision} · {fmtTime(h.createdAt)}</span>
                  </p>
                  {h.actor && <p className="text-xs text-gray-500">by {h.actor.email}</p>}
                  {h.changedFields.length > 0 && (
                    <p className="text-xs text-gray-500">Changed after approval: {h.changedFields.join(', ')}</p>
                  )}
                  {h.feedback && <p className="mt-1 text-gray-700 whitespace-pre-line bg-gray-50 rounded-lg px-3 py-2">{h.feedback}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <ConfirmModal
        open={modal === 'approve'}
        title="Approve and publish this event?"
        body="It becomes visible to eligible creators immediately and can receive proposals. The business will be emailed that it is live."
        confirmLabel="Approve and Publish"
        variant="success"
        loading={busy}
        onConfirm={decide}
        onCancel={close}
      />

      <ConfirmModal
        open={modal === 'changes'}
        title="Request changes"
        body="The event stays unpublished. The business receives your feedback by email and in their dashboard, then edits and resubmits it for review."
        confirmLabel="Send feedback"
        variant="warning"
        loading={busy}
        confirmDisabled={!textOk}
        extra={
          <div className="space-y-1.5">
            <textarea
              autoFocus
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Explain exactly what must be corrected, e.g. “Please clarify the deliverables and whether the complimentary meal includes drinks.”"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-y"
            />
            <p className={`text-xs ${textOk ? 'text-gray-400' : 'text-orange-600'}`}>
              {textOk ? 'Shown to the business exactly as written.' : `Feedback is required (at least ${MIN_FEEDBACK} characters).`}
            </p>
          </div>
        }
        onConfirm={decide}
        onCancel={close}
      />

      <ConfirmModal
        open={modal === 'reject'}
        title="Reject this event?"
        body="This declines the event — it is not a request for corrections. The business receives the reason below by email and in their dashboard."
        confirmLabel="Reject Event"
        variant="danger"
        loading={busy}
        confirmDisabled={!textOk}
        extra={
          <div className="space-y-2">
            <textarea
              autoFocus
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Reason for rejection (shown to the business)…"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 resize-y"
            />
            <p className={`text-xs ${textOk ? 'text-gray-400' : 'text-red-600'}`}>
              {textOk ? 'Shown to the business exactly as written.' : `A rejection reason is required (at least ${MIN_FEEDBACK} characters).`}
            </p>
            <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={allowResubmission} onChange={(e) => setAllowResubmission(e.target.checked)} className="mt-0.5" />
              <span>
                Allow the business to edit and resubmit
                <span className="block text-xs text-gray-500">Untick for policy violations that require a permanent rejection — explain why in the reason.</span>
              </span>
            </label>
          </div>
        }
        onConfirm={decide}
        onCancel={close}
      />
    </div>
  );
}
