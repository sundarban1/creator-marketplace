import { useEffect, useState } from 'react';
import { FileText, Image as ImageIcon, ShieldCheck, ShieldX } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from '../components/Avatar';
import { ConfirmModal } from '../components/ConfirmModal';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import { api, type ApiVerificationQueueProvider, type ApiVerificationQueueBusiness } from '../lib/api';
import { useApi } from '../lib/useApi';

// §74 — separate Provider/Business pending-review queues, distinct from the
// general Creators/Businesses admin pages (which list everyone, not just
// what's waiting on a decision). Reuses the same approve/reject endpoints
// those pages already call — this is a focused view over the same actions.

type Tab = 'providers' | 'businesses';

type Doc = { key: string; label: string; url: string | null; status: string };

function docsFor(kind: Tab, item: ApiVerificationQueueProvider | ApiVerificationQueueBusiness): Doc[] {
  if (kind === 'providers') {
    const p = item as ApiVerificationQueueProvider;
    return [
      { key: 'citizenship', label: 'Citizenship', url: p.citizenshipDocUrl, status: p.citizenshipStatus },
      { key: 'pan',         label: 'PAN',          url: p.panDocUrl,         status: p.panDocStatus },
    ];
  }
  const b = item as ApiVerificationQueueBusiness;
  return [
    { key: 'pan',        label: 'PAN',                 url: b.panDocUrl,         status: b.panDocStatus },
    { key: 'companyReg', label: 'Company Registration', url: b.companyRegDocUrl, status: b.companyRegDocStatus },
  ];
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    PENDING:  'bg-amber-50 text-amber-700',
    APPROVED: 'bg-emerald-50 text-emerald-700',
    REJECTED: 'bg-red-50 text-red-700',
    NONE:     'bg-gray-50 text-gray-400',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg[status] ?? cfg.NONE}`}>{status}</span>;
}

export function VerificationDashboard() {
  const [tab, setTab] = useState<Tab>('providers');
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const providersQuery = useApi(() => api.admin.verificationProviders({ page: 1, limit: 50 }));
  const businessesQuery = useApi(() => api.admin.verificationBusinesses({ page: 1, limit: 50 }));
  const active = tab === 'providers' ? providersQuery : businessesQuery;

  useEffect(() => { active.refetch(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = (active.data?.data ?? []) as (ApiVerificationQueueProvider | ApiVerificationQueueBusiness)[];

  async function handleApproveDoc(id: string, doc: Doc) {
    setActionLoading(true);
    setActionError('');
    try {
      if (tab === 'providers') await api.admin.setCreatorDocumentStatus(id, doc.key as 'citizenship' | 'pan', true);
      else await api.admin.setBusinessDocumentStatus(id, doc.key as 'pan' | 'companyReg', true);
      active.refetch();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    setActionLoading(true);
    setActionError('');
    try {
      if (tab === 'providers') await api.admin.rejectCreator(rejectTarget.id, rejectReason.trim());
      else await api.admin.rejectBusiness(rejectTarget.id, rejectReason.trim());
      setRejectTarget(null);
      setRejectReason('');
      active.refetch();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Verification" subtitle="Pending provider and business document reviews" />

      <div className="flex gap-2 mb-5">
        {(['providers', 'businesses'] as Tab[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === k ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {k === 'providers' ? 'Providers' : 'Businesses'}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{actionError}</div>
      )}

      {active.loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse bg-gray-50 rounded-xl border border-gray-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">Nothing pending review — all caught up.</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isProvider = tab === 'providers';
            const name = isProvider ? (item as ApiVerificationQueueProvider).fullName : (item as ApiVerificationQueueBusiness).businessName;
            const image = isProvider ? (item as ApiVerificationQueueProvider).avatarUrl : (item as ApiVerificationQueueBusiness).logoUrl;
            const docs = docsFor(tab, item);
            return (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4">
                {image ? (
                  <img src={image} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <Avatar initials={(name ?? '?').slice(0, 2)} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{name ?? 'Unnamed'}</p>
                      <p className="text-xs text-gray-400">{item.user?.email ?? item.user?.phone ?? '—'}</p>
                    </div>
                    <button
                      onClick={() => setRejectTarget({ id: item.id, name: name ?? 'this account' })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <ShieldX size={13} /> Reject
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {docs.filter((d) => d.url).map((doc) => (
                      <div key={doc.key} className="flex items-center gap-2 border border-gray-200 rounded-lg pl-2.5 pr-1.5 py-1.5">
                        {doc.url!.match(/\.pdf(\?|#|$)/i) ? <FileText size={13} className="text-gray-400" /> : <ImageIcon size={13} className="text-gray-400" />}
                        <button onClick={() => setPreviewDoc(doc)} className="text-xs text-indigo-600 hover:underline font-medium">
                          {doc.label}
                        </button>
                        <StatusPill status={doc.status} />
                        {doc.status === 'PENDING' && (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleApproveDoc(item.id, doc)}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md disabled:opacity-50 transition-colors"
                          >
                            <ShieldCheck size={12} /> Approve
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewDoc?.url && (
        <DocumentPreviewModal url={previewDoc.url} title={previewDoc.label} onClose={() => setPreviewDoc(null)} />
      )}

      <ConfirmModal
        open={!!rejectTarget}
        title={`Reject ${rejectTarget?.name ?? ''}'s verification`}
        body="This rejects all pending documents for this account and notifies them with your reason."
        confirmLabel="Reject"
        variant="danger"
        loading={actionLoading}
        confirmDisabled={!rejectReason.trim()}
        extra={
          <textarea
            autoFocus
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (shown to the user)…"
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
        }
        onConfirm={handleReject}
        onCancel={() => { setRejectTarget(null); setRejectReason(''); }}
      />
    </div>
  );
}
