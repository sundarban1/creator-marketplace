import { useState, useEffect }      from 'react';
import { Search, Eye, BarChart3, Trash2 } from 'lucide-react';
import { useNavigate }   from 'react-router-dom';
import { DataTable }     from '../components/DataTable';
import { StatusBadge }   from '../components/StatusBadge';
import { Avatar }        from '../components/Avatar';
import { PageHeader }    from '../components/PageHeader';
import { ConfirmModal }  from '../components/ConfirmModal';
import { DetailModal }   from '../components/DetailModal';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import { ActionButton } from '../components/ActionButton';
import { Pagination }    from '../components/Pagination';
import { api, type ApiCreator } from '../lib/api';
import { useApi }        from '../lib/useApi';
import { displayEmailOrPhone, isPhonePlaceholderEmail } from '../lib/identity';

const PAGE_SIZE = 10;

type Action = { type: 'suspend' | 'activate' | 'delete' | 'verify' | 'unverify'; creator: ApiCreator };

function creatorStatus(c: ApiCreator): string {
  if (c.user.isActive === false) return 'suspended';
  if (!c.user.isEmailVerified) return 'unverified';
  return c.isVerified ? 'active' : 'pending';
}

function docStatus(status?: string | null): 'approved' | 'unapproved' {
  return status === 'APPROVED' ? 'approved' : 'unapproved';
}

export function Creators() {
  const navigate = useNavigate();
  const [search,          setSearch]          = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [action,  setAction]  = useState<Action | null>(null);
  const [viewing, setViewing] = useState<ApiCreator | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ doc: 'citizenship' | 'pan'; url: string; title: string; status?: string } | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null);
  const [page, setPage] = useState(1);

  const { data, loading: fetching, error, refetch } = useApi(() =>
    api.admin.creators({ page, limit: PAGE_SIZE, search: debouncedSearch || undefined })
  );
  useEffect(() => { refetch(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const creators = data?.data ?? [];
  const total    = data?.pagination?.total ?? creators.length;
  const totalPages = data?.pagination?.totalPages ?? 1;

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function handleSearchChange(val: string) {
    setSearch(val);
    clearTimeout((window as { _ct?: ReturnType<typeof setTimeout> })._ct);
    (window as { _ct?: ReturnType<typeof setTimeout> })._ct = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
      refetch();
    }, 400);
  }

  async function handleConfirm() {
    if (!action) return;
    setLoading(true);
    try {
      const userId = action.creator.user.id;
      if (action.type === 'delete') {
        await api.admin.deleteUser(userId);
        showToast(`${action.creator.fullName ?? 'Creator'} deleted.`);
      } else if (action.type === 'verify' || action.type === 'unverify') {
        await api.admin.verifyCreator(action.creator.id, action.type === 'verify');
        showToast(`${action.creator.fullName ?? 'Creator'} ${action.type === 'verify' ? 'verified' : 'unverified'}.`);
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
      await api.admin.setCreatorDocumentStatus(viewing.id, previewDoc.doc, approved);
      const status = approved ? 'APPROVED' : 'REJECTED';
      const patch = previewDoc.doc === 'citizenship' ? { citizenshipStatus: status } : { panDocStatus: status };
      setViewing({ ...viewing, ...patch } as ApiCreator);
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
      header: 'Creator',
      render: (row: ApiCreator) => (
        <button
          onClick={() => setViewing(row)}
          className="flex items-center gap-3 text-left group"
        >
          {row.avatarUrl ? (
            <img src={row.avatarUrl} alt={row.fullName ?? ''} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <Avatar initials={(row.fullName ?? '?').slice(0, 2).toUpperCase()} size="sm" />
          )}
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate group-hover:text-indigo-600 group-hover:underline">{row.fullName ?? '(No name)'}</p>
            <p className="text-xs text-gray-500 truncate">{displayEmailOrPhone(row.user.email)}</p>
          </div>
        </button>
      ),
    },
    {
      key:    'categories',
      header: 'Categories',
      render: (row: ApiCreator) => (
        <div className="flex flex-wrap gap-1">
          {row.categories.slice(0, 2).map((c) => (
            <span key={c} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">{c}</span>
          ))}
          {row.categories.length === 0 && <span className="text-xs text-gray-400">—</span>}
        </div>
      ),
    },
    {
      key:    'location',
      header: 'Location',
      render: (row: ApiCreator) => (
        <span className="text-sm text-gray-600">{row.location ?? '—'}</span>
      ),
    },
    {
      key:    'status',
      header: 'Status',
      render: (row: ApiCreator) => <StatusBadge status={creatorStatus(row)} />,
    },
    {
      key:    'applications',
      header: 'Applications',
      render: (row: ApiCreator) => (
        <span className="font-medium text-gray-800">{row._count.applications}</span>
      ),
    },
    {
      key:    'services',
      header: 'Services',
      render: (row: ApiCreator) => (
        <span className={`font-medium ${row._count.services > 0 ? 'text-gray-800' : 'text-gray-400'}`}>{row._count.services}</span>
      ),
    },
    {
      key:    'joinedAt',
      header: 'Joined',
      render: (row: ApiCreator) => (
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
      render: (row: ApiCreator) => (
        <div className="flex items-center gap-1.5">
          <ActionButton icon={Eye} title="View" onClick={() => setViewing(row)} />
          <ActionButton
            variant="primary"
            icon={BarChart3}
            title="Analytics"
            onClick={() => navigate(`/analytics/${row.user.id}`, { state: { name: row.fullName ?? row.user.email, email: row.user.email } })} />
          <ActionButton variant="danger" icon={Trash2} title="Delete" onClick={() => setAction({ type: 'delete', creator: row })} />
        </div>
      ),
    },
  ];

  const name = action?.creator.fullName ?? 'this creator';
  const email = action ? displayEmailOrPhone(action.creator.user.email) : '';
  const modalCfg = action
    ? action.type === 'delete'
      ? { title: `Delete ${name}?`, body: `Permanently deletes the account and all data. An email will be sent to ${email}.`, confirmLabel: 'Delete account', variant: 'danger' as const }
      : action.type === 'suspend'
      ? { title: `Suspend ${name}?`, body: `The creator will be unable to log in. An email will be sent to ${email}.`, confirmLabel: 'Suspend account', variant: 'warning' as const }
      : action.type === 'activate'
      ? { title: `Reactivate ${name}?`, body: `The creator will regain full access. An email will be sent to ${email}.`, confirmLabel: 'Reactivate', variant: 'success' as const }
      : action.type === 'verify'
      ? { title: `Verify ${name}?`, body: `This marks ${name} as a verified creator.`, confirmLabel: 'Verify creator', variant: 'success' as const }
      : { title: `Unverify ${name}?`, body: `This removes ${name}'s verified badge.`, confirmLabel: 'Unverify creator', variant: 'warning' as const }
    : null;

  return (
    <div>
      <PageHeader
        title="Creators"
        subtitle={fetching ? 'Loading...' : `${total} registered creators`}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search creators..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {fetching ? (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse bg-gray-50 first:rounded-t-xl last:rounded-b-xl" />
          ))}
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={creators} keyField="id" />
          <Pagination page={page} totalPages={totalPages} total={total} limit={PAGE_SIZE} onChange={setPage} />
        </>
      )}

      {viewing && (
        <DetailModal
          open={!!viewing}
          onClose={() => setViewing(null)}
          avatar={
            viewing.avatarUrl
              ? <img src={viewing.avatarUrl} alt={viewing.fullName ?? ''} className="w-12 h-12 rounded-full object-cover" />
              : <Avatar initials={(viewing.fullName ?? '?').slice(0, 2).toUpperCase()} size="md" />
          }
          title={viewing.fullName ?? '(No name)'}
          subtitle={displayEmailOrPhone(viewing.user.email)}
          badges={<StatusBadge status={creatorStatus(viewing)} />}
          sections={[
            {
              heading: 'Profile',
              fields: [
                { label: 'Location', value: viewing.location ?? '—' },
                { label: 'Applications', value: viewing._count.applications },
                { label: 'Bio', value: viewing.bio ?? '—' },
                {
                  label: 'Categories',
                  value: viewing.categories.length
                    ? <div className="flex flex-wrap gap-1">{viewing.categories.map((c) => <span key={c} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{c}</span>)}</div>
                    : '—',
                },
              ],
            },
            ...(viewing.services.length
              ? [{
                  heading: `Services (${viewing.services.length})`,
                  fields: viewing.services.map((svc) => ({
                    label: svc.name,
                    value: (
                      <span className="flex items-center gap-2">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{svc.category.name}</span>
                        <span>{svc.startingPrice != null ? `NPR ${svc.startingPrice.toLocaleString()}` : 'No price set'} · {svc.pricingModel.replace(/_/g, ' ').toLowerCase()}</span>
                        {svc.status !== 'ACTIVE' && <StatusBadge status={svc.status.toLowerCase()} />}
                      </span>
                    ),
                  })),
                }]
              : []),
            ...(viewing.citizenshipDocUrl || viewing.panDocUrl
              ? [{
                  heading: 'Documents',
                  fields: [
                    ...(viewing.citizenshipDocUrl ? [{ label: 'Citizenship', value: <button onClick={() => setPreviewDoc({ doc: 'citizenship', url: viewing.citizenshipDocUrl!, title: 'Citizenship', status: viewing.citizenshipStatus ?? undefined })} className="text-indigo-600 hover:underline font-medium">View document</button> }] : []),
                    ...(viewing.citizenshipDocUrl ? [{ label: 'Citizenship status', value: <StatusBadge status={docStatus(viewing.citizenshipStatus)} /> }] : []),
                    ...(viewing.panDocUrl ? [{ label: 'PAN', value: <button onClick={() => setPreviewDoc({ doc: 'pan', url: viewing.panDocUrl!, title: 'PAN', status: viewing.panDocStatus ?? undefined })} className="text-indigo-600 hover:underline font-medium">View document</button> }] : []),
                    ...(viewing.panDocUrl ? [{ label: 'PAN status', value: <StatusBadge status={docStatus(viewing.panDocStatus)} /> }] : []),
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
            ...(Object.keys(viewing.socialLinks ?? {}).length
              ? [{
                  heading: 'Social links',
                  fields: Object.entries(viewing.socialLinks).map(([platform, url]) => ({
                    label: platform,
                    value: <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{url}</a>,
                  })),
                }]
              : []),
          ]}
          footer={
            <>
              <button
                onClick={() => setAction({ type: viewing.isVerified ? 'unverify' : 'verify', creator: viewing })}
                className="px-4 py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
              >
                {viewing.isVerified ? 'Unverify' : 'Verify'}
              </button>
              {viewing.user.isActive === false ? (
                <button
                  onClick={() => setAction({ type: 'activate', creator: viewing })}
                  className="px-4 py-2.5 text-sm font-medium text-green-600 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
                >
                  Activate
                </button>
              ) : (
                <button
                  onClick={() => setAction({ type: 'suspend', creator: viewing })}
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
          onConfirm={handleConfirm}
          onCancel={() => setAction(null)}
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
