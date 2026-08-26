import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Pagination } from '../../components/Pagination';
import { api, type ApiAdminWithdrawal, type ApiAdminWithdrawalDetail } from '../../lib/api';
import { useApi } from '../../lib/useApi';

const PAGE_SIZE = 10;

const STATUS_TABS = ['PENDING', 'PROCESSING', 'PAID', 'REJECTED'] as const;
type StatusTab = typeof STATUS_TABS[number];

function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export function WithdrawalsTab() {
  const [statusFilter, setStatusFilter] = useState<StatusTab>('PENDING');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const { data, loading, error, refetch } = useApi(() =>
    api.admin.withdrawals({
      page,
      limit:  PAGE_SIZE,
      status: statusFilter,
      search: debouncedSearch || undefined,
    })
  );

  useEffect(() => { refetch(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const withdrawals = data?.data?.withdrawals ?? [];
  const total = data?.data?.total ?? 0;
  const counts = data?.data?.counts ?? {};
  const totalPages = Math.max(1, Math.ceil((statusFilter ? (counts[statusFilter] ?? 0) : total) / PAGE_SIZE));

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout((window as { _wst?: ReturnType<typeof setTimeout> })._wst);
    (window as { _wst?: ReturnType<typeof setTimeout> })._wst = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
      refetch();
    }, 400);
  }

  function switchStatus(s: StatusTab) {
    setStatusFilter(s);
    setPage(1);
    setTimeout(refetch, 0);
  }

  const columns = [
    {
      key: 'creator',
      header: 'Creator',
      render: (row: ApiAdminWithdrawal) => (
        <span className="font-medium text-gray-900">{row.creator.name ?? '—'}</span>
      ),
    },
    {
      key: 'referenceCode',
      header: 'Reference',
      render: (row: ApiAdminWithdrawal) => (
        <span className="text-xs font-mono font-medium text-gray-700">{row.referenceCode}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row: ApiAdminWithdrawal) => (
        <span className="font-bold text-gray-900">Rs. {row.amount.toLocaleString()}</span>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      render: (row: ApiAdminWithdrawal) => <span className="text-xs font-medium text-gray-600">{row.method}</span>,
    },
    {
      key: 'account',
      header: 'Account',
      render: (row: ApiAdminWithdrawal) => (
        <span className="text-xs text-gray-500 font-mono">{row.account || '—'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Requested',
      render: (row: ApiAdminWithdrawal) => <span className="text-sm text-gray-500">{fmtDate(row.createdAt)}</span>,
    },
    {
      key: 'ref',
      header: 'Transfer Ref',
      render: (row: ApiAdminWithdrawal) => (
        <span className="text-xs text-gray-500 font-mono">{row.transactionReference ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: ApiAdminWithdrawal) => <StatusBadge status={row.status.toLowerCase()} />,
    },
    {
      key: 'actions',
      header: '',
      render: (row: ApiAdminWithdrawal) => (
        <button
          onClick={() => setSelectedId(row.id)}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
          View
        </button>
      ),
    },
  ];

  return (
    <div>
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
              {counts[s] ? <span className="ml-1.5 opacity-70">{counts[s]}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="relative max-w-sm mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search creator, reference, withdrawal ID, amount…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
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
      ) : withdrawals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400 text-sm">
          No {statusFilter.toLowerCase()} withdrawals.
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={withdrawals} keyField="id" />
          <Pagination page={page} totalPages={totalPages} total={counts[statusFilter] ?? total} limit={PAGE_SIZE} onChange={setPage} />
        </>
      )}

      {selectedId && (
        <WithdrawalDetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => { refetch(); }}
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

// ── Detail modal ──────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-800 break-words">{value ?? '—'}</dd>
    </div>
  );
}

function WithdrawalDetailModal({
  id, onClose, onChanged, onToast,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
  onToast: (msg: string, ok?: boolean) => void;
}) {
  const { data, loading, error, refetch } = useApi(() => api.admin.withdrawal(id));
  const w: ApiAdminWithdrawalDetail | undefined = data?.data;

  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'none' | 'reject' | 'pay'>('none');
  const [reason, setReason] = useState('');
  const [txnRef, setTxnRef] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

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

  const snap = w?.payoutSnapshot ?? {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[88vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
          <X size={18} />
        </button>

        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Loading…</div>
        ) : error || !w ? (
          <div className="p-10 text-center text-sm text-red-600">{error ?? 'Not found'}</div>
        ) : (
          <>
            <div className="p-6 pb-4 border-b border-gray-100 pr-10">
              <h3 className="text-base font-semibold text-gray-900">
                Withdrawal · Rs. {w.amount.toLocaleString()}
              </h3>
              <p className="text-sm text-gray-500">{w.creator.name ?? '—'} · {w.method}</p>
              <p className="mt-1 text-xs font-mono text-gray-400">Ref {w.referenceCode}</p>
              <div className="mt-2"><StatusBadge status={w.status.toLowerCase()} /></div>
            </div>

            <div className="overflow-y-auto p-6 space-y-5">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Row label="Reference" value={<span className="font-mono">{w.referenceCode}</span>} />
                <Row label="Requested" value={fmtDate(w.createdAt)} />
                <Row label="Account name" value={snap.accountName} />
                {w.method === 'BANK' ? (
                  <>
                    <Row label="Bank" value={snap.bankName} />
                    <Row label="Branch" value={snap.branch} />
                    <Row label="Account number" value={<span className="font-mono">{snap.accountNumber}</span>} />
                  </>
                ) : (
                  <Row label={`${w.method} ID / number`} value={<span className="font-mono">{snap.walletId}</span>} />
                )}
              </dl>

              {(w.status === 'PAID') && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Payment</h4>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Row label="Transfer ref" value={<span className="font-mono">{w.transactionReference}</span>} />
                    <Row label="Payment date" value={fmtDate(w.paymentDate)} />
                    {w.adminNotes && <div className="col-span-2"><Row label="Admin note" value={w.adminNotes} /></div>}
                  </dl>
                  {w.screenshotUrl && (
                    <a href={w.screenshotUrl} target="_blank" rel="noreferrer" className="block mt-3">
                      <img src={w.screenshotUrl} alt="Payment proof" className="max-h-52 rounded-lg border border-gray-200" />
                    </a>
                  )}
                </div>
              )}

              {w.status === 'REJECTED' && (
                <Row label="Rejection reason" value={<span className="text-red-600">{w.rejectionReason}</span>} />
              )}

              {mode === 'reject' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500">Rejection reason *</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Shown to the creator"
                  />
                </div>
              )}

              {mode === 'pay' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Transfer reference * (bank/wallet txn id)</label>
                    <input value={txnRef} onChange={(e) => setTxnRef(e.target.value)}
                      className="mt-1 w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Payment date *</label>
                    <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)}
                      className="mt-1 w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Transaction screenshot * (JPG/PNG, ≤5 MB)</label>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="mt-1 w-full text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Admin note (optional)</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                      className="mt-1 w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
              )}
            </div>

            {(w.status === 'PENDING' || w.status === 'PROCESSING') && (
              <div className="p-6 pt-4 border-t border-gray-100 flex flex-wrap gap-3">
                {mode === 'none' && (
                  <>
                    {w.status === 'PENDING' && (
                      <button disabled={busy}
                        onClick={() => run(() => api.admin.processWithdrawal(w.id), 'Moved to processing')}
                        className="text-sm font-medium px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40">
                        Start Processing
                      </button>
                    )}
                    <button disabled={busy}
                      onClick={() => setMode('pay')}
                      className="text-sm font-medium px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40">
                      Mark as Paid
                    </button>
                    <button disabled={busy}
                      onClick={() => setMode('reject')}
                      className="text-sm font-medium px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40">
                      Reject
                    </button>
                  </>
                )}

                {mode === 'reject' && (
                  <>
                    <button disabled={busy || reason.trim().length < 3}
                      onClick={() => run(() => api.admin.rejectWithdrawal(w.id, reason.trim()), 'Withdrawal rejected')}
                      className="text-sm font-medium px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40">
                      {busy ? 'Rejecting…' : 'Confirm Reject'}
                    </button>
                    <button disabled={busy} onClick={() => setMode('none')}
                      className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
                      Cancel
                    </button>
                  </>
                )}

                {mode === 'pay' && (
                  <>
                    <button disabled={busy || !txnRef.trim() || !payDate || !file}
                      onClick={() => run(
                        () => api.admin.markWithdrawalPaid(w.id, { transactionReference: txnRef.trim(), paymentDate: payDate, adminNotes: notes.trim() || undefined }, file!),
                        'Withdrawal marked as paid',
                      )}
                      className="text-sm font-medium px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40">
                      {busy ? 'Saving…' : 'Confirm Payment'}
                    </button>
                    <button disabled={busy} onClick={() => setMode('none')}
                      className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
                      Cancel
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
