import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Pagination } from '../../components/Pagination';
import { api, type ApiAdminDispute, type DisputeResolution } from '../../lib/api';
import { useApi } from '../../lib/useApi';

const PAGE_SIZE = 10;
const STATUS_TABS = ['OPEN', 'RESOLVED'] as const;
type StatusTab = typeof STATUS_TABS[number];

function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}
const rs = (n: number) => `Rs. ${n.toLocaleString()}`;

export function DisputesTab() {
  const [statusFilter, setStatusFilter] = useState<StatusTab>('OPEN');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ApiAdminDispute | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const { data, loading, error, refetch } = useApi(() =>
    api.admin.disputes({ page, limit: PAGE_SIZE, status: statusFilter })
  );

  useEffect(() => { refetch(); }, [page, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const disputes = data?.data ?? [];
  const total = data?.pagination?.total ?? disputes.length;
  const totalPages = data?.pagination?.totalPages ?? 1;

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const columns = [
    {
      key: 'campaign', header: 'Campaign',
      render: (r: ApiAdminDispute) => <span className="font-medium text-gray-900">{r.campaign.title}</span>,
    },
    {
      key: 'parties', header: 'Business → Creator',
      render: (r: ApiAdminDispute) => (
        <span className="text-xs text-gray-600">
          {r.application.campaign.business.businessName ?? '—'} → {r.application.creator.fullName ?? '—'}
        </span>
      ),
    },
    {
      key: 'raisedBy', header: 'Raised by',
      render: (r: ApiAdminDispute) => (
        <span className={`text-xs font-semibold ${r.raisedByRole === 'CREATOR' ? 'text-violet-700' : 'text-blue-700'}`}>
          {r.raisedByRole === 'CREATOR' ? 'Creator' : 'Business'}
        </span>
      ),
    },
    {
      key: 'amount', header: 'Escrow',
      render: (r: ApiAdminDispute) => <span className="font-bold text-gray-900">{rs(r.application.proposedRate)}</span>,
    },
    {
      key: 'escrow', header: 'Escrow state',
      render: (r: ApiAdminDispute) => <StatusBadge status={r.application.escrowStatus.toLowerCase()} />,
    },
    { key: 'createdAt', header: 'Opened', render: (r: ApiAdminDispute) => <span className="text-sm text-gray-500">{fmtDate(r.createdAt)}</span> },
    {
      key: 'status', header: 'Status',
      render: (r: ApiAdminDispute) =>
        r.status === 'RESOLVED'
          ? <span className="text-xs font-medium text-gray-500">{r.resolution?.replace('_', ' ').toLowerCase()}</span>
          : <StatusBadge status="open" />,
    },
    {
      key: 'actions', header: '',
      render: (r: ApiAdminDispute) => (
        <button onClick={() => setSelected(r)}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
          {r.status === 'RESOLVED' ? 'View' : 'Review'}
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {STATUS_TABS.map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors ${
              statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 animate-pulse bg-gray-50 first:rounded-t-xl last:rounded-b-xl" />)}
        </div>
      ) : disputes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400 text-sm">
          No {statusFilter.toLowerCase()} disputes.
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={disputes} keyField="id" />
          <Pagination page={page} totalPages={totalPages} total={total} limit={PAGE_SIZE} onChange={setPage} />
        </>
      )}

      {selected && (
        <DisputeModal
          dispute={selected}
          onClose={() => setSelected(null)}
          onResolved={() => { setSelected(null); refetch(); }}
          onToast={showToast}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-medium text-white shadow-lg z-[60] ${toast.ok ? 'bg-gray-900' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Resolution modal ──────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-800 break-words">{value ?? '—'}</dd>
    </div>
  );
}

const OUTCOMES: { key: DisputeResolution; label: string; hint: string }[] = [
  { key: 'CREATOR_WON',  label: 'Creator wins',  hint: 'Full escrow released to the creator wallet.' },
  { key: 'BUSINESS_WON', label: 'Business wins', hint: 'Full escrow refunded to the business.' },
  { key: 'PARTIAL',      label: 'Partial split', hint: 'Divide the escrow between the two parties.' },
  { key: 'DISMISSED',    label: 'Dismiss',       hint: 'No merit — unfreeze and resume the normal flow.' },
];

function DisputeModal({
  dispute, onClose, onResolved, onToast,
}: {
  dispute: ApiAdminDispute;
  onClose: () => void;
  onResolved: () => void;
  onToast: (msg: string, ok?: boolean) => void;
}) {
  const total = dispute.application.proposedRate;
  const resolved = dispute.status === 'RESOLVED';

  const [outcome, setOutcome] = useState<DisputeResolution | null>(null);
  const [note, setNote] = useState('');
  const [creatorAmount, setCreatorAmount] = useState(Math.round(total / 2));
  const [busy, setBusy] = useState(false);

  const businessAmount = Math.max(0, total - creatorAmount);
  const splitValid = outcome !== 'PARTIAL' || (creatorAmount >= 0 && businessAmount >= 0 && creatorAmount + businessAmount === total);
  const canSubmit = !!outcome && note.trim().length >= 5 && splitValid && !busy;

  const versions = dispute.application.submissionVersions ?? [];
  const notes = useMemo(
    () => [...(dispute.application.revisionNotes ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [dispute],
  );

  async function submit() {
    if (!outcome) return;
    setBusy(true);
    try {
      await api.admin.resolveDispute(dispute.id, {
        outcome,
        note: note.trim(),
        ...(outcome === 'PARTIAL' ? { creatorAmount, businessAmount } : {}),
      });
      onToast('Dispute resolved');
      onResolved();
    } catch (e) {
      onToast((e as Error).message ?? 'Failed to resolve', false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[88vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"><X size={18} /></button>

        <div className="p-6 pb-4 border-b border-gray-100 pr-10">
          <h3 className="text-base font-semibold text-gray-900">{dispute.campaign.title}</h3>
          <p className="text-sm text-gray-500">
            {dispute.application.campaign.business.businessName ?? '—'} → {dispute.application.creator.fullName ?? '—'} · {rs(total)} held
          </p>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={dispute.application.escrowStatus.toLowerCase()} />
            {resolved && <span className="text-xs text-gray-500">resolved · {dispute.resolution?.replace('_', ' ').toLowerCase()}</span>}
          </div>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Raised by" value={dispute.raisedByRole === 'CREATOR' ? 'Creator' : 'Business'} />
            <Field label="Opened" value={fmtDate(dispute.createdAt)} />
            <div className="col-span-2"><Field label="Reason" value={<span className="whitespace-pre-wrap">{dispute.reason}</span>} /></div>
            {dispute.application.deliverableUrls && (
              <div className="col-span-2"><Field label="Submitted links" value={<span className="break-all">{dispute.application.deliverableUrls}</span>} /></div>
            )}
          </dl>

          {versions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Submissions</h4>
              <ul className="space-y-2">
                {versions.map((v) => (
                  <li key={v.version} className="text-xs bg-gray-50 rounded-lg p-2.5">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-700">
                        #{v.version}{v.late ? ' · late' : ''}
                      </span>
                      <span className="text-gray-400">{fmtDate(v.createdAt)}</span>
                    </div>
                    {v.note && <p className="text-gray-600 mt-0.5">{v.note}</p>}
                    {v.reviewOutcome && (
                      <p className="text-gray-500 mt-0.5">
                        → {v.reviewOutcome.replace('_', ' ').toLowerCase()}{v.reviewNote ? `: ${v.reviewNote}` : ''}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {notes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Feedback / dispute history</h4>
              <ul className="space-y-1.5">
                {notes.map((n, i) => (
                  <li key={i} className="text-xs text-gray-600 border-l-2 border-gray-200 pl-2">
                    <span className="text-gray-400">{fmtDate(n.createdAt)}</span> — {n.note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resolved ? (
            <div className="rounded-lg bg-gray-50 p-3">
              <Field label="Resolution note" value={dispute.resolutionNote} />
              {dispute.resolution === 'PARTIAL' && (
                <p className="text-xs text-gray-500 mt-1">
                  Creator {rs(dispute.creatorAmount ?? 0)} · Business {rs(dispute.businessAmount ?? 0)}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Resolution</h4>
              <div className="space-y-2">
                {OUTCOMES.map((o) => (
                  <label key={o.key} className={`flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer ${outcome === o.key ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
                    <input type="radio" name="outcome" className="mt-0.5" checked={outcome === o.key} onChange={() => setOutcome(o.key)} />
                    <div>
                      <div className="text-sm font-medium text-gray-800">{o.label}</div>
                      <div className="text-xs text-gray-500">{o.hint}</div>
                    </div>
                  </label>
                ))}
              </div>

              {outcome === 'PARTIAL' && (
                <div className="rounded-lg bg-gray-50 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-gray-500 w-20">Creator</label>
                    <input type="number" min={0} max={total} value={creatorAmount}
                      onChange={(e) => setCreatorAmount(Math.max(0, Math.min(total, Number(e.target.value) || 0)))}
                      className="flex-1 text-sm border border-gray-200 rounded-lg p-1.5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-gray-500 w-20">Business</label>
                    <input type="number" value={businessAmount} readOnly
                      className="flex-1 text-sm border border-gray-200 rounded-lg p-1.5 bg-gray-100 text-gray-500" />
                  </div>
                  <p className={`text-xs ${splitValid ? 'text-gray-400' : 'text-red-600'}`}>
                    Must sum to {rs(total)}.
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-500">Resolution reason * (audited)</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                  className="mt-1 w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Why this outcome — recorded in the audit log and shown to both parties." />
              </div>
            </div>
          )}
        </div>

        {!resolved && (
          <div className="p-6 pt-4 border-t border-gray-100 flex gap-3">
            <button disabled={!canSubmit} onClick={submit}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40">
              {busy ? 'Resolving…' : 'Resolve dispute'}
            </button>
            <button disabled={busy} onClick={onClose}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
