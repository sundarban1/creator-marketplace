import { DataTable }     from '../components/DataTable';
import { StatusBadge }   from '../components/StatusBadge';
import { Avatar }        from '../components/Avatar';
import { PageHeader }    from '../components/PageHeader';
import { api, type ApiBusiness } from '../lib/api';
import { useApi }        from '../lib/useApi';

function status(b: ApiBusiness): string {
  if (!b.user.isEmailVerified) return 'unverified';
  return b.isVerified ? 'active' : 'pending';
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
      </div>
    ),
  },
  {
    key:    'status',
    header: 'Status',
    render: (row: ApiBusiness) => <StatusBadge status={status(row)} />,
  },
  {
    key:    'campaigns',
    header: 'Campaigns',
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
    render: () => (
      <div className="flex gap-2">
        <button className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">View</button>
        <button className="text-xs text-gray-400 hover:text-gray-600 font-medium">Edit</button>
      </div>
    ),
  },
];

export function Businesses() {
  const { data, loading, error } = useApi(() => api.admin.businesses({ limit: 50 }));
  const businesses = data?.data ?? [];
  const total      = data?.pagination?.total ?? businesses.length;

  return (
    <div>
      <PageHeader
        title="Businesses"
        subtitle={loading ? 'Loading...' : `${total} registered businesses`}
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse bg-gray-50 first:rounded-t-xl last:rounded-b-xl" />
          ))}
        </div>
      ) : (
        <DataTable columns={columns} data={businesses} keyField="id" />
      )}
    </div>
  );
}
