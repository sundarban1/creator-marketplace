import { DataTable }     from '../components/DataTable';
import { StatusBadge }   from '../components/StatusBadge';
import { Avatar }        from '../components/Avatar';
import { PageHeader }    from '../components/PageHeader';
import { ConfirmModal }  from '../components/ConfirmModal';
import { DetailModal }   from '../components/DetailModal';
import { Pagination }    from '../components/Pagination';
import { api, type ApiBusiness } from '../lib/api';
import { useApi }        from '../lib/useApi';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 10;

type Action = { type: 'suspend' | 'activate' | 'delete'; business: ApiBusiness };

function businessStatus(b: ApiBusiness): string {
  if (b.user.isActive === false) return 'suspended';
  if (!b.user.isEmailVerified) return 'unverified';
  return b.isVerified ? 'active' : 'pending';
}

export function Businesses() {
  const navigate = useNavigate();
  const [action,  setAction]  = useState<Action | null>(null);
  const [viewing, setViewing] = useState<ApiBusiness | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data, loading: fetching, error, refetch } = useApi(() => api.admin.businesses({ page, limit: PAGE_SIZE }));
  useEffect(() => { refetch(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const businesses = data?.data ?? [];
  const total      = data?.pagination?.total ?? businesses.length;
  const totalPages = data?.pagination?.totalPages ?? 1;

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleToggleVerified(row: ApiBusiness) {
    setVerifyingId(row.id);
    try {
      await api.admin.verifyBusiness(row.id, !row.isVerified);
      showToast(`${row.businessName} ${row.isVerified ? 'unverified' : 'verified'}.`);
      refetch();
    } catch (e) {
      showToast((e as Error).message ?? 'Something went wrong.', false);
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleConfirm() {
    if (!action) return;
    setLoading(true);
    try {
      const userId = action.business.user.id;
      if (action.type === 'delete') {
        await api.admin.deleteUser(userId);
        showToast(`${action.business.businessName} deleted.`);
      } else {
        const isActive = action.type === 'activate';
        await api.admin.suspendUser(userId, isActive);
        showToast(`Account ${isActive ? 'reactivated' : 'suspended'}.`);
      }
      setAction(null);
      refetch();
    } catch (e) {
      showToast((e as Error).message ?? 'Something went wrong.', false);
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    {
      key:    'name',
      header: 'Business',
      render: (row: ApiBusiness) => (
        <div className="flex items-center gap-3">
          {row.logoUrl ? (
            <img src={row.logoUrl} alt={row.businessName} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <Avatar initials={row.businessName.slice(0, 2).toUpperCase()} size="sm" />
          )}
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{row.businessName}</p>
            <p className="text-xs text-gray-500 truncate">{row.user.email}</p>
          </div>
        </div>
      ),
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
      render: (row: ApiBusiness) => {
        const suspended = row.user.isActive === false;
        return (
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="text-xs text-gray-600 hover:text-gray-900 font-medium"
              onClick={() => setViewing(row)}>
              View
            </button>
            <button
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              onClick={() => navigate(`/analytics/${row.user.id}`, { state: { name: row.businessName, email: row.user.email } })}>
              Analytics
            </button>
            <button
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
              disabled={verifyingId === row.id}
              onClick={() => handleToggleVerified(row)}>
              {row.isVerified ? 'Unverify' : 'Verify'}
            </button>
            {row.panDocUrl && (
              <button
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                onClick={() => window.open(row.panDocUrl!, '_blank')}>
                View PAN
              </button>
            )}
            {row.panDocStatus === 'PENDING' && <StatusBadge status="pending" />}
            {row.companyRegDocUrl && (
              <button
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                onClick={() => window.open(row.companyRegDocUrl!, '_blank')}>
                View Reg. Cert
              </button>
            )}
            {row.companyRegDocStatus === 'PENDING' && <StatusBadge status="pending" />}
            {suspended ? (
              <button className="text-xs text-green-600 hover:text-green-800 font-medium" onClick={() => setAction({ type: 'activate', business: row })}>
                Activate
              </button>
            ) : (
              <button className="text-xs text-orange-500 hover:text-orange-700 font-medium" onClick={() => setAction({ type: 'suspend', business: row })}>
                Suspend
              </button>
            )}
            <button className="text-xs text-red-500 hover:text-red-700 font-medium" onClick={() => setAction({ type: 'delete', business: row })}>
              Delete
            </button>
          </div>
        );
      },
    },
  ];

  const bName = action?.business.businessName ?? '';
  const bEmail = action?.business.user.email ?? '';
  const modalCfg = action
    ? action.type === 'delete'
      ? { title: `Delete ${bName}?`, body: `Permanently deletes the account and all data. An email will be sent to ${bEmail}.`, confirmLabel: 'Delete account', variant: 'danger' as const }
      : action.type === 'suspend'
      ? { title: `Suspend ${bName}?`, body: `The business will be unable to log in. An email will be sent to ${bEmail}.`, confirmLabel: 'Suspend account', variant: 'warning' as const }
      : { title: `Reactivate ${bName}?`, body: `The business will regain full access. An email will be sent to ${bEmail}.`, confirmLabel: 'Reactivate', variant: 'success' as const }
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

      {viewing && (
        <DetailModal
          open={!!viewing}
          onClose={() => setViewing(null)}
          avatar={
            viewing.logoUrl
              ? <img src={viewing.logoUrl} alt={viewing.businessName} className="w-12 h-12 rounded-lg object-cover" />
              : <Avatar initials={viewing.businessName.slice(0, 2).toUpperCase()} size="md" />
          }
          title={viewing.businessName}
          subtitle={viewing.user.email}
          badges={<StatusBadge status={businessStatus(viewing)} />}
          sections={[
            {
              heading: 'Profile',
              fields: [
                { label: 'Website', value: viewing.website ? <a href={viewing.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{viewing.website}</a> : '—' },
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
            {
              heading: 'Account',
              fields: [
                { label: 'Email verified', value: viewing.user.isEmailVerified ? 'Yes' : 'No' },
                { label: 'Account active', value: viewing.user.isActive === false ? 'Suspended' : 'Active' },
                { label: 'Joined', value: new Date(viewing.user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
              ],
            },
            ...(viewing.panDocUrl || viewing.companyRegDocUrl
              ? [{
                  heading: 'Documents',
                  fields: [
                    ...(viewing.panDocUrl ? [{ label: 'PAN', value: <a href={viewing.panDocUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">View document</a> }] : []),
                    ...(viewing.panDocStatus ? [{ label: 'PAN status', value: viewing.panDocStatus }] : []),
                    ...(viewing.companyRegDocUrl ? [{ label: 'Company reg.', value: <a href={viewing.companyRegDocUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">View document</a> }] : []),
                    ...(viewing.companyRegDocStatus ? [{ label: 'Reg. status', value: viewing.companyRegDocStatus }] : []),
                  ],
                }]
              : []),
          ]}
          footer={
            <button
              onClick={() => setViewing(null)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          }
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
