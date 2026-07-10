import { useState, useEffect }      from 'react';
import { Search }        from 'lucide-react';
import { useNavigate }   from 'react-router-dom';
import { DataTable }     from '../components/DataTable';
import { StatusBadge }   from '../components/StatusBadge';
import { Avatar }        from '../components/Avatar';
import { PageHeader }    from '../components/PageHeader';
import { ConfirmModal }  from '../components/ConfirmModal';
import { DetailModal }   from '../components/DetailModal';
import { Pagination }    from '../components/Pagination';
import { api, type ApiUser } from '../lib/api';
import { useApi }        from '../lib/useApi';

const PAGE_SIZE = 10;

const ROLE_FILTERS = ['All', 'CREATOR', 'BUSINESS', 'ADMIN'] as const;

type Action = { type: 'suspend' | 'activate' | 'delete'; user: ApiUser };

function initials(u: ApiUser): string {
  const name =
    u.creatorProfile?.fullName ??
    u.businessProfile?.businessName ??
    u.email;
  return name.slice(0, 2).toUpperCase();
}

function displayName(u: ApiUser): string {
  return (
    u.creatorProfile?.fullName ??
    u.businessProfile?.businessName ??
    u.email.split('@')[0]!
  );
}

function verifiedStatus(u: ApiUser): string {
  if (u.isActive === false) return 'suspended';
  if (!u.isEmailVerified) return 'unverified';
  const profileVerified =
    u.creatorProfile?.isVerified ?? u.businessProfile?.isVerified ?? true;
  return profileVerified ? 'active' : 'pending';
}

export function Users() {
  const navigate = useNavigate();
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [search,     setSearch]     = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page,    setPage]    = useState(1);
  const [action,  setAction]  = useState<Action | null>(null);
  const [viewing, setViewing] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null);

  const { data, loading: fetching, error, refetch } = useApi(() =>
    api.admin.users({
      page,
      limit:  PAGE_SIZE,
      role:   roleFilter === 'All' ? undefined : roleFilter,
      search: debouncedSearch || undefined,
    })
  );

  useEffect(() => { refetch(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const users = data?.data ?? [];
  const total = data?.pagination?.total ?? users.length;
  const totalPages = data?.pagination?.totalPages ?? 1;

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function handleSearchChange(val: string) {
    setSearch(val);
    clearTimeout((window as { _st?: ReturnType<typeof setTimeout> })._st);
    (window as { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
      refetch();
    }, 400);
  }

  function handleRoleChange(role: string) {
    setRoleFilter(role);
    setPage(1);
    setTimeout(() => refetch(), 0);
  }

  async function handleConfirm() {
    if (!action) return;
    setLoading(true);
    try {
      if (action.type === 'delete') {
        await api.admin.deleteUser(action.user.id);
        showToast(`${displayName(action.user)} deleted.`);
      } else {
        const isActive = action.type === 'activate';
        await api.admin.suspendUser(action.user.id, isActive);
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
      header: 'User',
      render: (row: ApiUser) => (
        <div className="flex items-center gap-3">
          <Avatar initials={initials(row)} size="sm" />
          <div>
            <p className="font-medium text-gray-900">{displayName(row)}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key:    'role',
      header: 'Role',
      render: (row: ApiUser) => (
        <span className="capitalize text-gray-700 text-sm">{row.role.toLowerCase()}</span>
      ),
    },
    {
      key:    'status',
      header: 'Status',
      render: (row: ApiUser) => <StatusBadge status={verifiedStatus(row)} />,
    },
    {
      key:    'joinedAt',
      header: 'Joined',
      render: (row: ApiUser) => (
        <span className="text-gray-500 text-sm">
          {new Date(row.createdAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key:    'actions',
      header: 'Actions',
      render: (row: ApiUser) => (
        <div className="flex gap-2">
          <button
            className="text-xs text-gray-600 hover:text-gray-900 font-medium"
            onClick={() => setViewing(row)}
          >
            View
          </button>
          {(row.role === 'CREATOR' || row.role === 'BUSINESS') && (
            <button
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              onClick={() => navigate(`/analytics/${row.id}`, { state: { name: displayName(row), email: row.email } })}
            >
              Analytics
            </button>
          )}
          {row.isActive === false ? (
            <button
              className="text-xs text-green-600 hover:text-green-800 font-medium"
              onClick={() => setAction({ type: 'activate', user: row })}
            >
              Activate
            </button>
          ) : (
            <button
              className="text-xs text-orange-500 hover:text-orange-700 font-medium"
              onClick={() => setAction({ type: 'suspend', user: row })}
            >
              Suspend
            </button>
          )}
          <button
            className="text-xs text-red-500 hover:text-red-700 font-medium"
            onClick={() => setAction({ type: 'delete', user: row })}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const modalCfg = action
    ? action.type === 'delete'
      ? {
          title:        `Delete ${displayName(action.user)}?`,
          body:         `This permanently deletes the account and all associated data. An email will be sent to ${action.user.email}. This cannot be undone.`,
          confirmLabel: 'Delete account',
          variant:      'danger' as const,
        }
      : action.type === 'suspend'
      ? {
          title:        `Suspend ${displayName(action.user)}?`,
          body:         `The user will be unable to log in. An email notification will be sent to ${action.user.email}.`,
          confirmLabel: 'Suspend account',
          variant:      'warning' as const,
        }
      : {
          title:        `Reactivate ${displayName(action.user)}?`,
          body:         `The user will regain full access to their account. An email notification will be sent to ${action.user.email}.`,
          confirmLabel: 'Reactivate',
          variant:      'success' as const,
        }
    : null;

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={fetching ? 'Loading...' : `${total} total users`}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => handleRoleChange(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                roleFilter === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r}
            </button>
          ))}
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
          <DataTable columns={columns} data={users} keyField="id" />
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
          avatar={<Avatar initials={initials(viewing)} size="md" />}
          title={displayName(viewing)}
          subtitle={viewing.email}
          badges={<StatusBadge status={verifiedStatus(viewing)} />}
          sections={[
            {
              heading: 'Account',
              fields: [
                { label: 'Role', value: <span className="capitalize">{viewing.role.toLowerCase()}</span> },
                { label: 'Email verified', value: viewing.isEmailVerified ? 'Yes' : 'No' },
                { label: 'Account active', value: viewing.isActive === false ? 'Suspended' : 'Active' },
                { label: 'Joined', value: new Date(viewing.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
              ],
            },
            ...(viewing.creatorProfile
              ? [{
                  heading: 'Creator profile',
                  fields: [
                    { label: 'Name', value: viewing.creatorProfile.fullName },
                    { label: 'Verified', value: viewing.creatorProfile.isVerified ? 'Yes' : 'No' },
                  ],
                }]
              : []),
            ...(viewing.businessProfile
              ? [{
                  heading: 'Business profile',
                  fields: [
                    { label: 'Business name', value: viewing.businessProfile.businessName },
                    { label: 'Verified', value: viewing.businessProfile.isVerified ? 'Yes' : 'No' },
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
