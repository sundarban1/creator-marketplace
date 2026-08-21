import { Eye, BarChart3, Trash2 } from 'lucide-react';
import { DataTable }     from '../components/DataTable';
import { StatusBadge }   from '../components/StatusBadge';
import { Avatar }        from '../components/Avatar';
import { PageHeader }    from '../components/PageHeader';
import { ConfirmModal }  from '../components/ConfirmModal';
import { DetailModal }   from '../components/DetailModal';
import { ActionButton }  from '../components/ActionButton';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import { Pagination }    from '../components/Pagination';
import { api, type ApiBusiness } from '../lib/api';
import { useApi }        from '../lib/useApi';
import { displayEmailOrPhone, displayBusinessName, isPhonePlaceholderEmail } from '../lib/identity';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 10;

type Action = { type: 'suspend' | 'activate' | 'delete' | 'verify' | 'unverify' | 'reject'; business: ApiBusiness };

function businessStatus(b: ApiBusiness): string {
  if (b.user.isActive === false) return 'suspended';
  if (!b.user.isEmailVerified) return 'unverified';
  return b.isVerified ? 'active' : 'pending';
}

function docStatus(status?: string | null): 'approved' | 'unapproved' {
  return status === 'APPROVED' ? 'approved' : 'unapproved';
}

export function Businesses() {
  const navigate = useNavigate();
  const [action,  setAction]  = useState<Action | null>(null);
  const [viewing, setViewing] = useState<ApiBusiness | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ doc: 'pan' | 'companyReg' | 'identity'; url: string; title: string; status?: string } | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null);
  const [page, setPage] = useState(1);
  const [rejectReason, setRejectReason] = useState('');

  const { data, loading: fetching, error, refetch } = useApi(() => api.admin.businesses({ page, limit: PAGE_SIZE }));
  useEffect(() => { refetch(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const businesses = data?.data ?? [];
  const total      = data?.pagination?.total ?? businesses.length;
  const totalPages = data?.pagination?.totalPages ?? 1;

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleConfirm() {
    if (!action) return;
    setLoading(true);
    try {
      const userId = action.business.user.id;
      if (action.type === 'delete') {
        await api.admin.deleteUser(userId);
        showToast(`${displayBusinessName(action.business.businessName)} deleted.`);
      } else if (action.type === 'verify' || action.type === 'unverify') {
        await api.admin.verifyBusiness(action.business.id, action.type === 'verify');
        showToast(`${displayBusinessName(action.business.businessName)} ${action.type === 'verify' ? 'verified' : 'unverified'}.`);
      } else if (action.type === 'reject') {
        await api.admin.rejectBusiness(action.business.id, rejectReason.trim());
        showToast(`${displayBusinessName(action.business.businessName)}'s verification was rejected.`);
        setRejectReason('');
      } else {
        const isActive = action.type === 'activate';
        await api.admin.suspendUser(userId, isActive);
        showToast(`Account ${isActive ? 'reactivated' : 'suspended'}.`);
      }
      setAction(null);
      setViewing(null);
      refetch();
    } catch (e) {
      showToast((e as Error).message ?? 'Something went wrong.', false);
    } finally {
      setLoading(false);
    }
  }

  async function handleDocApproval(approved: boolean) {
    if (!viewing || !previewDoc) return;
    setDocLoading(true);
    try {
      await api.admin.setBusinessDocumentStatus(viewing.id, previewDoc.doc, approved);
      const status = approved ? 'APPROVED' : 'REJECTED';
      const patch =
        previewDoc.doc === 'pan'      ? { panDocStatus: status }
        : previewDoc.doc === 'identity' ? { identityDocStatus: status }
        : { companyRegDocStatus: status };
      setViewing({ ...viewing, ...patch } as ApiBusiness);
      setPreviewDoc({ ...previewDoc, status });
      showToast(`Document ${approved ? 'approved' : 'unapproved'}.`);
      refetch();
    } catch (e) {
      showToast((e as Error).message ?? 'Failed to update document status.', false);
    } finally {
      setDocLoading(false);
    }
  }

  const columns = [
    {
      key:    'name',
      header: 'Business',
      render: (row: ApiBusiness) => {
        const name = displayBusinessName(row.businessName);
        return (
        <button
          onClick={() => setViewing(row)}
          className="flex items-center gap-3 text-left group"
        >
          {row.logoUrl ? (
            <img src={row.logoUrl} alt={name} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <Avatar initials={name.slice(0, 2).toUpperCase()} size="sm" />
          )}
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate group-hover:text-indigo-600 group-hover:underline">{name}</p>
            <p className="text-xs text-gray-500 truncate">{displayEmailOrPhone(row.user.email)}</p>
          </div>
        </button>
        );
      },
    },
    {
      key:    'categories',
      header: 'Industry',
      render: (row: ApiBusiness) => (
        <div className="flex flex-wrap gap-1">
          {row.categories.slice(0, 2).map((c) => (
            <span key={c} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{c}</span>
          ))}
          {row.categories.length === 0 && <span className="text-xs text-gray-400">—</span>}
        </div>
      ),
    },
    {
      key:    'location',
      header: 'Location',
      render: (row: ApiBusiness) => (
        <span className="text-sm text-gray-600">{[row.city, row.district].filter(Boolean).join(', ') || '—'}</span>
      ),
    },
    {
      key:    'status',
      header: 'Status',
      render: (row: ApiBusiness) => <StatusBadge status={businessStatus(row)} />,
    },
    {
      key:    'campaigns',
      header: 'Events',
      render: (row: ApiBusiness) => (
        <span className="font-medium text-gray-800">{row._count.campaigns}</span>
      ),
    },
    {
      key:    'website',
      header: 'Website',
      render: (row: ApiBusiness) =>
        row.website ? (
          <a
            href={row.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-600 hover:underline truncate max-w-[120px] block"
          >
            {row.website.replace(/^https?:\/\//, '')}
          </a>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      key:    'joinedAt',
      header: 'Joined',
      render: (row: ApiBusiness) => (
        <span className="text-gray-500 text-sm">
          {new Date(row.user.createdAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key:    'actions',
      header: 'Actions',
      render: (row: ApiBusiness) => (
        <div className="flex items-center gap-1.5">
          <ActionButton icon={Eye} title="View" onClick={() => setViewing(row)} />
          <ActionButton
            variant="primary"
            icon={BarChart3}
            title="Analytics"
            onClick={() => navigate(`/analytics/${row.user.id}`, { state: { name: displayBusinessName(row.businessName), email: row.user.email } })} />
          <ActionButton variant="danger" icon={Trash2} title="Delete" onClick={() => setAction({ type: 'delete', business: row })} />
        </div>
      ),
    },
  ];

  const bName = action ? displayBusinessName(action.business.businessName) : '';
  const bEmail = action ? displayEmailOrPhone(action.business.user.email) : '';
  const modalCfg = action
    ? action.type === 'delete'
      ? { title: `Delete ${bName}?`, body: `Permanently deletes the account and all data. An email will be sent to ${bEmail}.`, confirmLabel: 'Delete account', variant: 'danger' as const }
      : action.type === 'suspend'
      ? { title: `Suspend ${bName}?`, body: `The business will be unable to log in. An email will be sent to ${bEmail}.`, confirmLabel: 'Suspend account', variant: 'warning' as const }
      : action.type === 'activate'
      ? { title: `Reactivate ${bName}?`, body: `The business will regain full access. An email will be sent to ${bEmail}.`, confirmLabel: 'Reactivate', variant: 'success' as const }
      : action.type === 'verify'
      ? { title: `Verify ${bName}?`, body: `This marks ${bName} as a verified business.`, confirmLabel: 'Verify business', variant: 'success' as const }
      : action.type === 'reject'
      ? { title: `Reject ${bName}'s verification?`, body: `${bName} will be notified by email (and SMS, once a gateway is configured) with the reason below.`, confirmLabel: 'Reject verification', variant: 'danger' as const }
      : { title: `Unverify ${bName}?`, body: `This removes ${bName}'s verified badge.`, confirmLabel: 'Unverify business', variant: 'warning' as const }
    : null;

  return (
    <div>
      <PageHeader
        title="Businesses"
        subtitle={fetching ? 'Loading...' : `${total} registered businesses`}
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {fetching ? (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse bg-gray-50 first:rounded-t-xl last:rounded-b-xl" />
          ))}
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={businesses} keyField="id" />
          <Pagination page={page} totalPages={totalPages} total={total} limit={PAGE_SIZE} onChange={setPage} />
        </>
      )}

      {viewing && (
        <DetailModal
          open={!!viewing}
          onClose={() => setViewing(null)}
          avatar={
            viewing.logoUrl
              ? <img src={viewing.logoUrl} alt={displayBusinessName(viewing.businessName)} className="w-12 h-12 rounded-lg object-cover" />
              : <Avatar initials={displayBusinessName(viewing.businessName).slice(0, 2).toUpperCase()} size="md" />
          }
          title={displayBusinessName(viewing.businessName)}
          subtitle={displayEmailOrPhone(viewing.user.email)}
          badges={<StatusBadge status={businessStatus(viewing)} />}
          sections={[
            {
              heading: 'Profile',
              fields: [
                { label: 'Website', value: viewing.website ? <a href={viewing.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{viewing.website}</a> : '—' },
                { label: 'Location', value: [viewing.area, viewing.city, viewing.district, viewing.province].filter(Boolean).join(', ') || '—' },
                { label: 'Business size', value: viewing.businessSize ? viewing.businessSize.charAt(0) + viewing.businessSize.slice(1).toLowerCase() : '—' },
                { label: 'Events posted', value: viewing._count.campaigns },
                { label: 'Description', value: viewing.description ?? '—' },
                {
                  label: 'Industry',
                  value: viewing.categories.length
                    ? <div className="flex flex-wrap gap-1">{viewing.categories.map((c) => <span key={c} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{c}</span>)}</div>
                    : '—',
                },
              ],
            },
            ...(viewing.panDocUrl || viewing.companyRegDocUrl || viewing.identityDocUrl
              ? [{
                  heading: 'Documents',
                  fields: [
                    ...(viewing.panDocUrl ? [{ label: 'PAN registration', value: <button onClick={() => setPreviewDoc({ doc: 'pan', url: viewing.panDocUrl!, title: 'PAN registration', status: viewing.panDocStatus ?? undefined })} className="text-indigo-600 hover:underline font-medium">View document</button> }] : []),
                    ...(viewing.panDocUrl ? [{ label: 'PAN status', value: <StatusBadge status={docStatus(viewing.panDocStatus)} /> }] : []),
                    ...(viewing.companyRegDocUrl ? [{ label: 'Company registration certificate', value: <button onClick={() => setPreviewDoc({ doc: 'companyReg', url: viewing.companyRegDocUrl!, title: 'Company registration certificate', status: viewing.companyRegDocStatus ?? undefined })} className="text-indigo-600 hover:underline font-medium">View document</button> }] : []),
                    ...(viewing.companyRegDocUrl ? [{ label: 'Reg. status', value: <StatusBadge status={docStatus(viewing.companyRegDocStatus)} /> }] : []),
                    // Individual service takers verify with one identity document
                    // (citizenship / national ID / personal PAN) instead.
                    ...(viewing.identityDocUrl ? [{ label: 'Identity document', value: <button onClick={() => setPreviewDoc({ doc: 'identity', url: viewing.identityDocUrl!, title: 'Identity document', status: viewing.identityDocStatus ?? undefined })} className="text-indigo-600 hover:underline font-medium">View document</button> }] : []),
                    ...(viewing.identityDocUrl ? [{ label: 'Identity status', value: <StatusBadge status={docStatus(viewing.identityDocStatus)} /> }] : []),
                    ...(viewing.verificationRejectReason ? [{ label: 'Reject reason', value: viewing.verificationRejectReason }] : []),
                  ],
                }]
              : []),
            {
              heading: 'Account',
              fields: [
                { label: 'Email', value: isPhonePlaceholderEmail(viewing.user.email) ? '—' : viewing.user.email },
                { label: 'Phone', value: viewing.user.phone ?? (isPhonePlaceholderEmail(viewing.user.email) ? displayEmailOrPhone(viewing.user.email) : '—') },
                { label: 'Email verified', value: viewing.user.isEmailVerified ? 'Yes' : 'No' },
                { label: 'Account active', value: viewing.user.isActive === false ? 'Suspended' : 'Active' },
                { label: 'Joined', value: new Date(viewing.user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
              ],
            },
          ]}
          footer={
            <>
              <button
                onClick={() => setAction({ type: viewing.isVerified ? 'unverify' : 'verify', business: viewing })}
                className="px-4 py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
              >
                {viewing.isVerified ? 'Unverify' : 'Verify'}
              </button>
              {!viewing.isVerified && (
                <button
                  onClick={() => { setRejectReason(''); setAction({ type: 'reject', business: viewing }); }}
                  className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                >
                  Reject
                </button>
              )}
              {viewing.user.isActive === false ? (
                <button
                  onClick={() => setAction({ type: 'activate', business: viewing })}
                  className="px-4 py-2.5 text-sm font-medium text-green-600 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
                >
                  Activate
                </button>
              ) : (
                <button
                  onClick={() => setAction({ type: 'suspend', business: viewing })}
                  className="px-4 py-2.5 text-sm font-medium text-orange-600 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
                >
                  Suspend
                </button>
              )}
              <button
                onClick={() => setViewing(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </>
          }
        />
      )}

      {modalCfg && (
        <ConfirmModal
          open={!!action}
          title={modalCfg.title}
          body={modalCfg.body}
          confirmLabel={modalCfg.confirmLabel}
          variant={modalCfg.variant}
          loading={loading}
          confirmDisabled={action?.type === 'reject' && !rejectReason.trim()}
          extra={action?.type === 'reject' ? (
            <textarea
              autoFocus
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (shown to the business)…"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
          ) : undefined}
          onConfirm={handleConfirm}
          onCancel={() => { setAction(null); setRejectReason(''); }}
        />
      )}

      {previewDoc && (
        <DocumentPreviewModal
          url={previewDoc.url}
          title={previewDoc.title}
          approved={previewDoc.status === 'APPROVED'}
          actionLoading={docLoading}
          onApprove={() => handleDocApproval(true)}
          onUnapprove={() => handleDocApproval(false)}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-medium text-white shadow-lg z-50 ${toast.ok ? 'bg-gray-900' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
