import { useState }      from 'react';
import { Search }        from 'lucide-react';
import { DataTable }     from '../components/DataTable';
import { StatusBadge }   from '../components/StatusBadge';
import { Avatar }        from '../components/Avatar';
import { PageHeader }    from '../components/PageHeader';
import { api, type ApiUser } from '../lib/api';
import { useApi }        from '../lib/useApi';

const ROLE_FILTERS = ['All', 'CREATOR', 'BUSINESS', 'ADMIN'] as const;

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
  if (!u.isEmailVerified) return 'unverified';
  const profileVerified =
    u.creatorProfile?.isVerified ?? u.businessProfile?.isVerified ?? true;
  return profileVerified ? 'active' : 'pending';
}

export function Users() {
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [search,     setSearch]     = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data, loading, error, refetch } = useApi(() =>
    api.admin.users({
      limit:  50,
      role:   roleFilter === 'All' ? undefined : roleFilter,
      search: debouncedSearch || undefined,
    })
  );

  const users = data?.data ?? [];
  const total = data?.pagination?.total ?? users.length;

  function handleSearchChange(val: string) {
    setSearch(val);
    clearTimeout((window as { _st?: ReturnType<typeof setTimeout> })._st);
    (window as { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => {
      setDebouncedSearch(val);
      refetch();
    }, 400);
  }

  function handleRoleChange(role: string) {
    setRoleFilter(role);
    // trigger refetch by re-running useApi — we do it via search change trick
    setTimeout(() => refetch(), 0);
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
        <span className="capitalize text-gray-700 text-sm">{row.role}</span>
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
      render: () => (
        <div className="flex gap-2">
          <button className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">View</button>
          <button className="text-xs text-gray-400 hover:text-gray-600 font-medium">Edit</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={loading ? 'Loading...' : `${total} total users`}
      />

      {/* Filters */}
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
                roleFilter === r
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse bg-gray-50 first:rounded-t-xl last:rounded-b-xl" />
          ))}
        </div>
      ) : (
        <DataTable columns={columns} data={users} keyField="id" />
      )}
    </div>
  );
}
