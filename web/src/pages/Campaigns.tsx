import { useState }     from 'react';
import { DataTable }    from '../components/DataTable';
import { StatusBadge }  from '../components/StatusBadge';
import { PageHeader }   from '../components/PageHeader';
import { api, type ApiCampaign } from '../lib/api';
import { useApi }       from '../lib/useApi';

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: 'text-pink-600 bg-pink-50',
  TikTok:    'text-gray-800 bg-gray-100',
  YouTube:   'text-red-600 bg-red-50',
  LinkedIn:  'text-blue-600 bg-blue-50',
  Twitter:   'text-sky-600 bg-sky-50',
};

const STATUS_FILTERS = ['All', 'ACTIVE', 'PAUSED', 'CLOSED'] as const;

function mapStatus(s: string): string {
  return s.toLowerCase();
}

function formatBudget(min: number, max: number): string {
  const fmt = (n: number) => `$${n.toLocaleString()}`;
  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}

export function Campaigns() {
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const { data, loading, error, refetch } = useApi(() =>
    api.admin.campaigns({
      limit:  50,
      status: statusFilter === 'All' ? undefined : statusFilter,
    })
  );

  const campaigns = data?.data ?? [];
  const total     = data?.pagination?.total ?? campaigns.length;
  const activeCnt = campaigns.filter((c) => c.status === 'ACTIVE').length;

  function handleStatusChange(s: string) {
    setStatusFilter(s);
    setTimeout(() => refetch(), 0);
  }

  const columns = [
    {
      key:    'title',
      header: 'Campaign',
      render: (row: ApiCampaign) => (
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate max-w-[220px]">{row.title}</p>
          <p className="text-xs text-gray-500 truncate">{row.business.businessName}</p>
        </div>
      ),
    },
    {
      key:    'platform',
      header: 'Platform',
      render: (row: ApiCampaign) => (
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            PLATFORM_COLORS[row.platform] ?? 'bg-gray-100 text-gray-700'
          }`}
        >
          {row.platform}
        </span>
      ),
    },
    {
      key:    'category',
      header: 'Category',
      render: (row: ApiCampaign) => (
        <span className="text-gray-600 text-sm">{row.category}</span>
      ),
    },
    {
      key:    'budget',
      header: 'Budget',
      render: (row: ApiCampaign) => (
        <span className="font-semibold text-gray-800 text-sm">
          {formatBudget(row.budgetMin, row.budgetMax)}
        </span>
      ),
    },
    {
      key:    'proposals',
      header: 'Applications',
      render: (row: ApiCampaign) => (
        <span className="font-medium text-gray-700">{row._count.applications}</span>
      ),
    },
    {
      key:    'deadline',
      header: 'Deadline',
      render: (row: ApiCampaign) => (
        <span className="text-gray-500 text-sm">
          {new Date(row.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      ),
    },
    {
      key:    'status',
      header: 'Status',
      render: (row: ApiCampaign) => <StatusBadge status={mapStatus(row.status)} />,
    },
    {
      key:    'actions',
      header: 'Actions',
      render: () => (
        <div className="flex gap-2">
          <button className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">View</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Campaigns"
        subtitle={
          loading
            ? 'Loading...'
            : `${total} total · ${activeCnt} active`
        }
      />

      {/* Status filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 w-fit">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              statusFilter === s
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

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
        <DataTable columns={columns} data={campaigns} keyField="id" />
      )}
    </div>
  );
}
