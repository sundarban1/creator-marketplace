import { useState }      from 'react';
import { Search }        from 'lucide-react';
import { DataTable }     from '../components/DataTable';
import { StatusBadge }   from '../components/StatusBadge';
import { Avatar }        from '../components/Avatar';
import { PageHeader }    from '../components/PageHeader';
import { ConfirmModal }  from '../components/ConfirmModal';
import { api, type ApiCreator } from '../lib/api';
import { useApi }        from '../lib/useApi';

type Action = { type: 'suspend' | 'activate' | 'delete'; creator: ApiCreator };

function creatorStatus(c: ApiCreator): string {
  if (c.user.isActive === false) return 'suspended';
  if (!c.user.isEmailVerified) return 'unverified';
  return c.isVerified ? 'active' : 'pending';
}

export function Creators() {
  const [search,          setSearch]          = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [action,  setAction]  = useState<Action | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const { data, loading: fetching, error, refetch } = useApi(() =>
    api.admin.creators({ limit: 50, search: debouncedSearch || undefined })
  );

  const creators = data?.data ?? [];
  const total    = data?.pagination?.total ?? creators.length;

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function handleSearchChange(val: string) {
    setSearch(val);
    clearTimeout((window as { _ct?: ReturnType<typeof setTimeout> })._ct);
    (window as { _ct?: ReturnType<typeof setTimeout> })._ct = setTimeout(() => {
      setDebouncedSearch(val);
      refetch();
    }, 400);
  }

  async function handleToggleVerified(row: ApiCreator) {
    setVerifyingId(row.id);
    try {
      await api.admin.verifyCreator(row.id, !row.isVerified);
      showToast(`${row.fullName ?? 'Creator'} ${row.isVerified ? 'unverified' : 'verified'}.`);
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
      const userId = action.creator.user.id;
      if (action.type === 'delete') {
        await api.admin.deleteUser(userId);
        showToast(`${action.creator.fullName ?? 'Creator'} deleted.`);
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
      header: 'Creator',
      render: (row: ApiCreator) => (
        <div className="flex items-center gap-3">
          {row.avatarUrl ? (
            <img src={row.avatarUrl} alt={row.fullName ?? ''} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <Avatar initials={(row.fullName ?? '?').slice(0, 2).toUpperCase()} size="sm" />
          )}
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{row.fullName ?? '(No name)'}</p>
            <p className="text-xs text-gray-500 truncate">{row.user.email}</p>
          </div>
        </div>
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
      render: (row: ApiCreator) => {
        const suspended = row.user.isActive === false;
        return (
          <div className="flex gap-2">
            <button
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
              disabled={verifyingId === row.id}
              onClick={() => handleToggleVerified(row)}>
              {row.isVerified ? 'Unverify' : 'Verify'}
            </button>
            {suspended ? (
              <button className="text-xs text-green-600 hover:text-green-800 font-medium" onClick={() => setAction({ type: 'activate', creator: row })}>
                Activate
              </button>
            ) : (
              <button className="text-xs text-orange-500 hover:text-orange-700 font-medium" onClick={() => setAction({ type: 'suspend', creator: row })}>
                Suspend
              </button>
            )}
            <button className="text-xs text-red-500 hover:text-red-700 font-medium" onClick={() => setAction({ type: 'delete', creator: row })}>
              Delete
            </button>
          </div>
        );
      },
    },
  ];

  const name = action?.creator.fullName ?? 'this creator';
  const email = action?.creator.user.email ?? '';
  const modalCfg = action
    ? action.type === 'delete'
      ? { title: `Delete ${name}?`, body: `Permanently deletes the account and all data. An email will be sent to ${email}.`, confirmLabel: 'Delete account', variant: 'danger' as const }
      : action.type === 'suspend'
      ? { title: `Suspend ${name}?`, body: `The creator will be unable to log in. An email will be sent to ${email}.`, confirmLabel: 'Suspend account', variant: 'warning' as const }
      : { title: `Reactivate ${name}?`, body: `The creator will regain full access. An email will be sent to ${email}.`, confirmLabel: 'Reactivate', variant: 'success' as const }
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
        <DataTable columns={columns} data={creators} keyField="id" />
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

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-medium text-white shadow-lg z-50 ${toast.ok ? 'bg-gray-900' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
