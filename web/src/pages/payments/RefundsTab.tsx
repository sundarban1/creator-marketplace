import { useEffect, useState } from 'react';
import { Search, X, ShieldAlert } from 'lucide-react';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Pagination } from '../../components/Pagination';
import {
  api,
  type ApiAdminRefund,
  type ApiAdminRefundDetail,
  type RefundStatus,
  type RefundTransferMethod,
} from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { confirmImageUpload } from '../../app/ui/uploadPreview';
import { confirmDialog } from '../../app/ui/confirmDialog';

// Payments → Refund Requests. Refunds are opened by the escrow flow (missed
// deadline, dispute, late payment, …); an admin verifies the recipient,
// approves, transfers the money outside Kolab and records the transfer. A
// refund is only "completed" once that transfer — with its bank/wallet
// reference — is recorded.

const PAGE_SIZE = 15;

const STATUS_TABS: { key: RefundStatus | 'ALL'; label: string }[] = [
  { key: 'PENDING',    label: 'Pending' },
  { key: 'APPROVED',   label: 'Approved' },
  { key: 'PROCESSING', label: 'In transfer' },
  { key: 'FAILED',     label: 'Failed' },
  { key: 'COMPLETED',  label: 'Completed' },
  { key: 'REJECTED',   label: 'Rejected' },
  { key: 'ALL',        label: 'All' },
];

const REFUND_REASON_LABEL: Record<string, string> = {
  DEADLINE_MISSED:            'Final deadline missed',
  EXTENSION_REJECTED:         'Extension rejected',
  EXTENSION_EXPIRED:          'Extension not answered',
  BUSINESS_CANCELLED_OVERDUE: 'Cancelled after missed deadline',
  CONFIRMATION_TIMEOUT:       'Creator did not confirm',
  DISPUTE_BUSINESS_WON:       'Dispute — business won',
  DISPUTE_SPLIT:              'Dispute — split',
  LATE_PAYMENT:               'Payment arrived late',
  OTHER:                      'Other',
};

const METHODS: RefundTransferMethod[] = ['BANK', 'ESEWA', 'KHALTI', 'CONNECTIPS', 'OTHER'];

const rs = (n: number | null | undefined) => (n == null ? '—' : `Rs. ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`);
function fmt(iso: string | null | undefined, withTime = true): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, withTime
    ? { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' });
}
const isForbidden = (err: string | null) => !!err && /access denied|forbidden|403/i.test(err);

export function RefundsTab() {
  const [status, setStatus] = useState<RefundStatus | 'ALL'>('PENDING');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<'createdAt' | 'amount'>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const { data, loading, error, refetch } = useApi(() =>
    api.admin.refunds({
      page, limit: PAGE_SIZE,
      status: status === 'ALL' ? undefined : status,
      search: debounced || undefined,
      reasonCode: reasonCode || undefined,
      paymentMethod: paymentMethod || undefined,
      from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
      sort, order,
    }),
  );
  useEffect(() => { refetch(); }, [page, status, debounced, reasonCode, paymentMethod, from, to, sort, order]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const list = data?.data;
  const items = list?.items ?? [];
  const counts = list?.counts ?? {};
  const totalPages = Math.max(1, Math.ceil((list?.total ?? 0) / PAGE_SIZE));

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const columns = [
    {
      key: 'ref', header: 'Refund',
      render: (r: ApiAdminRefund) => (
        <div>
          <div className="text-xs font-mono font-semibold text-gray-800">{r.referenceCode}</div>
          <div className="text-[11px] text-gray-400">{fmt(r.createdAt)}</div>
        </div>
      ),
    },
    {
      key: 'business', header: 'Business',
      render: (r: ApiAdminRefund) => (
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate">{r.business.businessName ?? '—'}</div>
          <div className="text-xs text-gray-500 truncate">{r.campaign.title}</div>
        </div>
      ),
    },
    {
      key: 'reason', header: 'Reason',
      render: (r: ApiAdminRefund) => <span className="text-xs text-gray-600">{REFUND_REASON_LABEL[r.reasonCode] ?? r.reasonCode}{r.partial ? ' · partial' : ''}</span>,
    },
    {
      key: 'amount', header: 'Refundable',
      render: (r: ApiAdminRefund) => <span className="font-bold text-gray-900">{rs(r.refundableAmount)}</span>,
    },
    {
      key: 'method', header: 'Paid via',
      render: (r: ApiAdminRefund) => <span className="text-xs uppercase text-gray-500">{r.paymentMethod ?? '—'}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (r: ApiAdminRefund) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={r.status === 'PROCESSING' ? 'processing' : r.status.toLowerCase()} />
          {r.needsSecondApproval && <span className="text-[10px] font-semibold text-amber-700">Needs 2nd approval</span>}
        </div>
      ),
    },
    {
      key: 'actions', header: '',
      render: (r: ApiAdminRefund) => (
        <button onClick={() => setSelectedId(r.id)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
          View
        </button>
      ),
    },
  ];

  const inputCls = 'text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div>
      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <SummaryCard label="Open refunds" value={String(list?.summary.pendingCount ?? '—')} hint="Pending, approved, in transfer or failed" />
        <SummaryCard label="Open refundable amount" value={list ? rs(list.summary.pendingAmount) : '—'} hint="Owed to businesses, not yet transferred" />
        <SummaryCard label={from || to ? 'Completed in period' : 'Completed (all time)'} value={list ? `${rs(list.summary.completedAmount)} · ${list.summary.completedCount}` : '—'} hint="Transfers confirmed with a reference" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_TABS.map((s) => (
          <button
            key={s.key}
            onClick={() => { setStatus(s.key); setPage(1); }}
            className={`text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors ${status === s.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {s.label}
            {s.key !== 'ALL' && counts[s.key] ? <span className="ml-1.5 opacity-70">{counts[s.key]}</span> : null}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2 mb-4">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Refund ID, business, payment ref, deliverable ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select value={reasonCode} onChange={(e) => { setReasonCode(e.target.value); setPage(1); }} className={inputCls} aria-label="Reason">
          <option value="">All reasons</option>
          {Object.entries(REFUND_REASON_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={paymentMethod} onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }} className={inputCls} aria-label="Payment method">
          <option value="">All payment methods</option>
          {['esewa', 'khalti', 'connectips', 'credits'].map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <label className="text-xs text-gray-500 flex items-center gap-1">From <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={inputCls} /></label>
        <label className="text-xs text-gray-500 flex items-center gap-1">To <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={inputCls} /></label>
        <select
          value={`${sort}:${order}`}
          onChange={(e) => { const [s, o] = e.target.value.split(':'); setSort(s as 'createdAt' | 'amount'); setOrder(o as 'asc' | 'desc'); }}
          className={inputCls}
          aria-label="Sort"
        >
          <option value="createdAt:desc">Newest first</option>
          <option value="createdAt:asc">Oldest first</option>
          <option value="amount:desc">Largest amount</option>
          <option value="amount:asc">Smallest amount</option>
        </select>
      </div>

      {error ? (
        isForbidden(error) ? (
          <div className="bg-white rounded-2xl border border-gray-200 adm-card py-14 text-center">
            <ShieldAlert className="mx-auto mb-2 text-gray-400" size={28} />
            <p className="text-sm font-medium text-gray-700">You don't have permission to view refunds.</p>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between gap-3">
            <span>{error}</span>
            <button onClick={refetch} className="text-xs font-semibold underline">Retry</button>
          </div>
        )
      ) : loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 adm-card divide-y divide-gray-100">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 animate-pulse bg-gray-50" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 adm-card py-16 text-center text-gray-400 text-sm">
          No {status === 'ALL' ? '' : STATUS_TABS.find((s) => s.key === status)?.label.toLowerCase()} refund requests{debounced || reasonCode || paymentMethod || from || to ? ' match these filters' : ''}.
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={items} keyField="id" />
          <Pagination page={page} totalPages={totalPages} total={list?.total ?? 0} limit={PAGE_SIZE} onChange={setPage} />
        </>
      )}

      {selectedId && (
        <RefundDetailModal id={selectedId} onClose={() => setSelectedId(null)} onChanged={refetch} onToast={showToast} />
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-medium text-white shadow-lg z-[60] ${toast.ok ? 'bg-gray-900' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 adm-card p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>
    </div>
  );
}

// ── Detail ────────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-800 break-words">{value ?? '—'}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</h4>
      {children}
    </section>
  );
}

type Mode = 'none' | 'recipient' | 'approve' | 'reject' | 'complete' | 'fail' | 'extend';

function RefundDetailModal({ id, onClose, onChanged, onToast }: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
  onToast: (msg: string, ok?: boolean) => void;
}) {
  const { data, loading, error, refetch } = useApi(() => api.admin.refund(id));
  const r: ApiAdminRefundDetail | undefined = data?.data;
  const [mode, setMode] = useState<Mode>('none');
  const [busy, setBusy] = useState(false);

  // form state
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  const [recName, setRecName] = useState('');
  const [recMethod, setRecMethod] = useState<RefundTransferMethod>('BANK');
  const [acct, setAcct] = useState<Record<string, string>>({});
  const [verified, setVerified] = useState(false);
  const [txMethod, setTxMethod] = useState<RefundTransferMethod>('BANK');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [txRef, setTxRef] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [newDeadline, setNewDeadline] = useState('');
  const [consent, setConsent] = useState(false);

  function open(m: Mode) {
    setMode(m);
    setText('');
    if (r && m === 'recipient') {
      setRecName(r.recipient.name ?? r.business.name ?? '');
      setRecMethod((r.recipient.method as RefundTransferMethod) ?? 'BANK');
      setAcct(r.recipient.account ?? {});
      setVerified(false);
    }
    if (r && m === 'approve') setAmount(String(r.calculation.refundableAmount ?? ''));
    if (r && m === 'complete') {
      setAmount(String(r.calculation.refundableAmount ?? ''));
      setTxMethod((r.recipient.method as RefundTransferMethod) ?? 'BANK');
      setTxRef('');
      setProof(null);
    }
    if (m === 'extend') { setNewDeadline(''); setConsent(false); }
  }

  async function run(fn: () => Promise<unknown>, okMsg: string) {
    setBusy(true);
    try {
      await fn();
      onToast(okMsg);
      setMode('none');
      refetch();
      onChanged();
    } catch (e) {
      onToast((e as Error).message ?? 'Action failed', false);
    } finally {
      setBusy(false);
    }
  }

  const can = (s: RefundStatus[]) => !!r && s.includes(r.status);
  const field = 'mt-1 w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const btn = (tone: 'primary' | 'green' | 'danger' | 'ghost' | 'amber') => ({
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    green:   'bg-emerald-600 text-white hover:bg-emerald-700',
    danger:  'bg-red-600 text-white hover:bg-red-700',
    amber:   'bg-amber-50 text-amber-800 hover:bg-amber-100',
    ghost:   'bg-gray-100 text-gray-700 hover:bg-gray-200',
  }[tone] + ' text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-40');

  const acctFields: { key: string; label: string }[] = recMethod === 'BANK'
    ? [{ key: 'bankName', label: 'Bank' }, { key: 'branch', label: 'Branch' }, { key: 'accountNumber', label: 'Account number' }]
    : recMethod === 'OTHER'
      ? [{ key: 'details', label: 'Destination details' }]
      : [{ key: 'walletId', label: `${recMethod} ID / mobile number` }];

  const canReopen = !!r && ['PENDING', 'APPROVED'].includes(r.status) && !r.partial
    && ['CREATOR_FAILED', 'CONTENT_OVERDUE'].includes(r.deliverable.workStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10" aria-label="Close"><X size={18} /></button>

        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Loading…</div>
        ) : error || !r ? (
          <div className="p-10 text-center text-sm text-red-600">{isForbidden(error) ? "You don't have permission to view this refund." : error ?? 'Not found'}</div>
        ) : (
          <>
            <div className="p-6 pb-4 border-b border-gray-100 pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-gray-900">Refund {rs(r.calculation.refundableAmount)}</h3>
                <StatusBadge status={r.status === 'PROCESSING' ? 'processing' : r.status.toLowerCase()} />
                {r.partial && <span className="text-[11px] font-semibold text-gray-500">PARTIAL</span>}
              </div>
              <p className="text-sm text-gray-500">{r.business.name ?? '—'} · {r.campaign.title}</p>
              <p className="mt-1 text-xs font-mono text-gray-400">{r.referenceCode} · {r.id}</p>
            </div>

            <div className="overflow-y-auto p-6 space-y-6">
              <Section title="Refund information">
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                  <Row label="Reason" value={REFUND_REASON_LABEL[r.reasonCode] ?? r.reasonCode} />
                  <Row label="Created" value={fmt(r.createdAt)} />
                  <Row label="Requested by" value={r.initiatedBy ?? r.initiatedByType.toLowerCase()} />
                  <div className="col-span-2 sm:col-span-3"><Row label="Cancellation details" value={r.reason} /></div>
                </dl>
              </Section>

              <Section title="Business">
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                  <Row label="Name" value={<>{r.business.name}{r.business.isVerified ? ' ✓' : ''}</>} />
                  <Row label="Contact person" value={r.business.contactPerson} />
                  <Row label="Email" value={r.business.email} />
                  <Row label="Phone" value={r.business.phone} />
                </dl>
              </Section>

              <Section title="Refund recipient">
                {r.recipient.verifiedAt ? (
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                    <Row label="Recipient name" value={r.recipient.name} />
                    <Row label="Method" value={r.recipient.method} />
                    {Object.entries(r.recipient.account ?? {}).filter(([, v]) => v).map(([k, v]) => (
                      <Row key={k} label={k.replace(/([A-Z])/g, ' $1').toLowerCase()} value={<span className="font-mono">{v}</span>} />
                    ))}
                    <Row label="Verification" value={<span className="text-emerald-700">Verified {fmt(r.recipient.verifiedAt)} by {r.recipient.verifiedBy}</span>} />
                  </dl>
                ) : (
                  <p className="text-sm text-amber-700">Not verified yet — confirm the business's bank or wallet details before transferring.</p>
                )}
              </Section>

              <Section title="Original payment">
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                  <Row label="Payment ID" value={<span className="font-mono text-xs">{r.payment.paymentTransactionId}</span>} />
                  <Row label="Payment reference" value={<span className="font-mono text-xs">{r.payment.paymentReference}</span>} />
                  <Row label="Method" value={r.payment.method?.toUpperCase()} />
                  <Row label="Paid" value={fmt(r.payment.paidAt)} />
                  <Row label="Amount escrowed" value={rs(r.payment.originalAmount)} />
                  <Row label="Remaining refundable" value={rs(r.payment.remainingRefundable)} />
                  <Row label="Deliverable" value={<span className="font-mono text-xs">{r.deliverable.applicationId}</span>} />
                  <Row label="Creator" value={r.deliverable.creator.fullName} />
                </dl>
                {r.payment.previousRefunds.length > 0 && (
                  <ul className="mt-3 text-xs text-gray-600 space-y-1">
                    {r.payment.previousRefunds.map((p) => <li key={p.id}>Previous {p.type.toLowerCase().replace('_', ' ')}: {rs(p.amount)} · {fmt(p.createdAt)}</li>)}
                  </ul>
                )}
              </Section>

              <Section title="Refund calculation">
                <dl className="grid grid-cols-3 gap-x-4 gap-y-3">
                  <Row label="Original amount" value={rs(r.calculation.originalAmount)} />
                  <Row label="Deductions" value={rs(r.calculation.deductionAmount)} />
                  <Row label="Refund amount" value={<strong>{rs(r.calculation.refundableAmount)}</strong>} />
                </dl>
                {r.calculation.note && <p className="mt-2 text-xs text-gray-500">{r.calculation.note}</p>}
                {r.approval.dualApprovalRequired && (
                  <p className="mt-2 text-xs text-amber-700">
                    Above Rs. {r.approval.threshold.toLocaleString()} — two different admins must approve.
                    {r.approval.firstApprovedBy && ` First approval by ${r.approval.firstApprovedBy}.`}
                  </p>
                )}
              </Section>

              <Section title="Deliverable deadline">
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                  <Row label="Proposal" value={r.deliverable.proposalStatus.toLowerCase()} />
                  <Row label="Deliverable" value={r.deliverable.workStatus.replace(/_/g, ' ').toLowerCase()} />
                  <Row label="Original deadline" value={fmt(r.deliverable.originalDeadline)} />
                  <Row label="Final deadline" value={fmt(r.deliverable.currentDeadline)} />
                  <Row label="Marked overdue" value={fmt(r.deliverable.overdueAt)} />
                  <Row label="Closed" value={fmt(r.deliverable.closedAt)} />
                </dl>
                {r.deliverable.extensions.length > 0 && (
                  <ul className="mt-3 space-y-1.5 text-xs text-gray-600">
                    {r.deliverable.extensions.map((e) => (
                      <li key={e.id} className="rounded-lg bg-gray-50 px-3 py-2">
                        <span className="font-semibold">{e.kind === 'ADMIN_EXCEPTIONAL' ? 'Exceptional extension' : 'Extension request'}</span>
                        {' · '}{e.status.toLowerCase()} · asked {fmt(e.createdAt)} for {fmt(e.proposedDeadline)}
                        {e.approvedDeadline && <> · approved until {fmt(e.approvedDeadline)}</>}
                        <div className="text-gray-500 mt-0.5">“{e.reason}”{e.decisionNote ? ` — ${e.decidedByRole?.toLowerCase()}: ${e.decisionNote}` : ''}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {(r.transfer.reference || r.transfer.failureReason || r.transfer.processingStartedAt) && (
                <Section title="Manual transfer">
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                    <Row label="Started" value={fmt(r.transfer.processingStartedAt)} />
                    <Row label="Attempts" value={r.transfer.attemptCount} />
                    {r.transfer.reference && <>
                      <Row label="Method" value={r.transfer.method} />
                      <Row label="Amount transferred" value={rs(r.transfer.amount)} />
                      <Row label="Transferred at" value={fmt(r.transfer.transferredAt)} />
                      <Row label="Transaction reference" value={<span className="font-mono">{r.transfer.reference}</span>} />
                      <Row label="Recorded by" value={r.transfer.completedBy} />
                    </>}
                    {r.transfer.failureReason && <div className="col-span-2 sm:col-span-3"><Row label="Last failure" value={<span className="text-red-600">{r.transfer.failureReason}</span>} /></div>}
                    {r.transfer.adminNotes && <div className="col-span-2 sm:col-span-3"><Row label="Admin notes" value={r.transfer.adminNotes} /></div>}
                  </dl>
                  {r.transfer.proofUrl && (
                    <a href={r.transfer.proofUrl} target="_blank" rel="noreferrer" className="block mt-3">
                      <img src={r.transfer.proofUrl} alt="Proof of payment" className="max-h-52 rounded-lg border border-gray-200" />
                    </a>
                  )}
                </Section>
              )}

              {r.status === 'REJECTED' && <Row label="Rejection reason" value={<span className="text-red-600">{r.approval.rejectionReason}</span>} />}

              <Section title="Audit history">
                <ol className="space-y-1.5">
                  {r.events.map((e) => (
                    <li key={e.id} className="text-xs text-gray-600 flex gap-2">
                      <span className="text-gray-400 shrink-0 w-36">{fmt(e.createdAt)}</span>
                      <span>
                        <span className="font-semibold">{e.action.replace(/_/g, ' ')}</span>
                        {e.fromStatus && e.fromStatus !== e.toStatus ? ` (${e.fromStatus.toLowerCase()} → ${e.toStatus.toLowerCase()})` : ''}
                        {' · '}{e.actor ?? e.actorType.toLowerCase()}
                        {e.note && <span className="text-gray-500"> — {e.note}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              </Section>

              {/* ── Action forms ─────────────────────────────────────────── */}
              {mode === 'recipient' && (
                <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-800">Verify refund recipient</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="text-xs font-semibold text-gray-500">Recipient name *<input value={recName} onChange={(e) => setRecName(e.target.value)} className={field} /></label>
                    <label className="text-xs font-semibold text-gray-500">Method *
                      <select value={recMethod} onChange={(e) => { setRecMethod(e.target.value as RefundTransferMethod); setAcct({}); }} className={field}>
                        {METHODS.map((m) => <option key={m}>{m}</option>)}
                      </select>
                    </label>
                    {acctFields.map((f) => (
                      <label key={f.key} className="text-xs font-semibold text-gray-500">{f.label}
                        <input value={acct[f.key] ?? ''} onChange={(e) => setAcct({ ...acct, [f.key]: e.target.value })} className={field} />
                      </label>
                    ))}
                  </div>
                  <label className="flex items-start gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="mt-1" />
                    I confirmed these details belong to {r.business.name ?? 'the business'} (e.g. by phone or a verified document).
                  </label>
                </div>
              )}

              {mode === 'approve' && (
                <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-800">Approve refund</p>
                  <label className="block text-xs font-semibold text-gray-500">Approved amount (NPR) — at most {rs(r.calculation.refundableAmount)}
                    <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={field} />
                  </label>
                  <label className="block text-xs font-semibold text-gray-500">Note (required if you reduce the amount)
                    <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} className={field} />
                  </label>
                </div>
              )}

              {(mode === 'reject' || mode === 'fail') && (
                <label className="block text-xs font-semibold text-gray-500">
                  {mode === 'reject' ? 'Rejection reason * (recorded in the audit log)' : 'Why did the transfer fail? *'}
                  <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} className={field} />
                </label>
              )}

              {mode === 'complete' && (
                <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-800">Record the completed transfer</p>
                  <p className="text-xs text-gray-500">Only record this after the money has actually left Kolab's account. Recipient: {r.recipient.name} · {r.recipient.method}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="text-xs font-semibold text-gray-500">Transfer method *
                      <select value={txMethod} onChange={(e) => setTxMethod(e.target.value as RefundTransferMethod)} className={field}>
                        {METHODS.map((m) => <option key={m}>{m}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-gray-500">Amount transferred (NPR) *
                      <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={field} />
                    </label>
                    <label className="text-xs font-semibold text-gray-500">Transfer date & time *
                      <input type="datetime-local" value={txDate} onChange={(e) => setTxDate(e.target.value)} className={field} />
                    </label>
                    <label className="text-xs font-semibold text-gray-500">Bank / wallet transaction reference *
                      <input value={txRef} onChange={(e) => setTxRef(e.target.value)} className={field} />
                    </label>
                  </div>
                  <label className="block text-xs font-semibold text-gray-500">Proof of payment (optional, JPG/PNG ≤ 5 MB)
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 w-full text-sm" onChange={async (e) => {
                      const input = e.currentTarget;
                      const f = input.files?.[0] ?? null;
                      if (f && !(await confirmImageUpload(f, { confirmLabel: 'Use image' }))) { input.value = ''; setProof(null); return; }
                      setProof(f);
                    }} />
                  </label>
                  <label className="block text-xs font-semibold text-gray-500">Admin notes (internal)
                    <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} className={field} />
                  </label>
                </div>
              )}

              {mode === 'extend' && (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <p className="text-sm font-semibold text-gray-800">Exceptional extension</p>
                  <p className="text-xs text-gray-600">
                    Reopens the deliverable with a new final deadline and cancels this refund request. Only use this when the business has explicitly agreed.
                    Maximum 2 extensions per deliverable; this one has had {r.deliverable.extensionCount}.
                  </p>
                  <label className="block text-xs font-semibold text-gray-500">New final deadline * (max 48h from now)
                    <input type="datetime-local" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} className={field} />
                  </label>
                  <label className="block text-xs font-semibold text-gray-500">Reason *
                    <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} className={field} />
                  </label>
                  <label className="flex items-start gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
                    {r.business.name ?? 'The business'} explicitly agreed to give the creator more time.
                  </label>
                </div>
              )}
            </div>

            {/* ── Footer actions ───────────────────────────────────────────── */}
            {!['COMPLETED', 'REJECTED', 'CANCELLED'].includes(r.status) && (
              <div className="p-5 border-t border-gray-100 flex flex-wrap gap-2">
                {mode === 'none' && (
                  <>
                    {can(['PENDING', 'APPROVED', 'FAILED']) && (
                      <button disabled={busy} onClick={() => open('recipient')} className={btn(r.recipient.verifiedAt ? 'ghost' : 'primary')}>
                        {r.recipient.verifiedAt ? 'Change recipient' : 'Verify recipient'}
                      </button>
                    )}
                    {can(['PENDING']) && <button disabled={busy} onClick={() => open('approve')} className={btn('green')}>{r.approval.firstApprovedBy ? 'Second approval' : 'Approve'}</button>}
                    {can(['APPROVED', 'FAILED']) && (
                      <button
                        disabled={busy || !r.recipient.verifiedAt}
                        title={!r.recipient.verifiedAt ? 'Verify the recipient first' : undefined}
                        onClick={async () => {
                          if (!(await confirmDialog({ title: r.status === 'FAILED' ? 'Retry transfer?' : 'Start the transfer?', message: `You're about to send ${rs(r.calculation.refundableAmount)} to ${r.recipient.name} (${r.recipient.method}). Record it once the money has left the account.`, confirmLabel: 'Start' }))) return;
                          run(() => api.admin.processRefund(r.id), 'Moved to processing');
                        }}
                        className={btn('primary')}
                      >
                        {r.status === 'FAILED' ? 'Retry transfer' : 'Start transfer'}
                      </button>
                    )}
                    {can(['PROCESSING']) && <button disabled={busy} onClick={() => open('complete')} className={btn('green')}>Record completed transfer</button>}
                    {can(['PROCESSING']) && <button disabled={busy} onClick={() => open('fail')} className={btn('amber')}>Transfer failed</button>}
                    {can(['PENDING', 'APPROVED', 'FAILED']) && <button disabled={busy} onClick={() => open('reject')} className="text-sm font-medium px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40">Reject</button>}
                    {canReopen && <button disabled={busy} onClick={() => open('extend')} className={btn('ghost')}>Exceptional extension…</button>}
                  </>
                )}

                {mode === 'recipient' && <>
                  <button disabled={busy || !verified || recName.trim().length < 2 || !Object.values(acct).some((v) => v.trim())}
                    onClick={() => run(() => api.admin.setRefundRecipient(r.id, { recipientName: recName.trim(), recipientMethod: recMethod, account: acct, verified: true }), 'Recipient verified')}
                    className={btn('primary')}>{busy ? 'Saving…' : 'Save verified recipient'}</button>
                  <button disabled={busy} onClick={() => setMode('none')} className={btn('ghost')}>Cancel</button>
                </>}

                {mode === 'approve' && <>
                  <button
                    disabled={busy || !(Number(amount) > 0) || (Number(amount) < (r.calculation.refundableAmount ?? 0) && text.trim().length < 3)}
                    onClick={async () => {
                      const amt = Number(amount);
                      if (!(await confirmDialog({ title: 'Approve this refund?', message: `Authorise a refund of ${rs(amt)} to ${r.business.name}.`, confirmLabel: 'Approve' }))) return;
                      run(() => api.admin.approveRefund(r.id, { note: text.trim() || undefined, amount: amt !== r.calculation.refundableAmount ? amt : undefined }), 'Refund approved');
                    }}
                    className={btn('green')}>Confirm approval</button>
                  <button disabled={busy} onClick={() => setMode('none')} className={btn('ghost')}>Cancel</button>
                </>}

                {mode === 'reject' && <>
                  <button disabled={busy || text.trim().length < 3}
                    onClick={async () => {
                      if (!(await confirmDialog({ title: 'Reject this refund?', message: 'The business will be told the refund was not approved, and the funds stay held. This cannot be undone.', confirmLabel: 'Reject', tone: 'danger' }))) return;
                      run(() => api.admin.rejectRefund(r.id, text.trim()), 'Refund rejected');
                    }}
                    className={btn('danger')}>Confirm reject</button>
                  <button disabled={busy} onClick={() => setMode('none')} className={btn('ghost')}>Cancel</button>
                </>}

                {mode === 'fail' && <>
                  <button disabled={busy || text.trim().length < 3} onClick={() => run(() => api.admin.failRefund(r.id, text.trim()), 'Marked as failed')} className={btn('danger')}>Mark failed</button>
                  <button disabled={busy} onClick={() => setMode('none')} className={btn('ghost')}>Cancel</button>
                </>}

                {mode === 'complete' && <>
                  <button disabled={busy || !(Number(amount) > 0) || !txRef.trim() || !txDate}
                    onClick={async () => {
                      const amt = Number(amount);
                      if (!(await confirmDialog({ title: 'Confirm the transfer is complete?', message: `Record ${rs(amt)} sent via ${txMethod}, reference ${txRef.trim()}. The business will be notified and the refund closed.`, confirmLabel: 'Mark completed' }))) return;
                      run(() => api.admin.completeRefund(r.id, { transferMethod: txMethod, amount: amt, transferredAt: new Date(txDate).toISOString(), transferReference: txRef.trim(), adminNotes: text.trim() || undefined }, proof), 'Refund completed');
                    }}
                    className={btn('green')}>{busy ? 'Saving…' : 'Mark completed'}</button>
                  <button disabled={busy} onClick={() => setMode('none')} className={btn('ghost')}>Cancel</button>
                </>}

                {mode === 'extend' && <>
                  <button disabled={busy || !consent || !newDeadline || text.trim().length < 5}
                    onClick={async () => {
                      if (!(await confirmDialog({ title: 'Reopen the deliverable?', message: 'This cancels the refund request and gives the creator a new final deadline. Both parties will be notified.', confirmLabel: 'Grant extension', tone: 'warning' }))) return;
                      run(() => api.admin.grantExceptionalExtension(r.deliverable.applicationId, { newDeadline: new Date(newDeadline).toISOString(), reason: text.trim(), businessConsent: true }), 'Deliverable reopened');
                    }}
                    className={btn('primary')}>Grant extension</button>
                  <button disabled={busy} onClick={() => setMode('none')} className={btn('ghost')}>Cancel</button>
                </>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
