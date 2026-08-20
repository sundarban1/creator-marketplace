import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { Pagination } from '../components/Pagination';
import { api, type ApiActivityLog } from '../lib/api';
import { useApi } from '../lib/useApi';

const PAGE_SIZE = 25;

// General product-usage activity feed (logins, campaign/application/message
// events, ...) — distinct from Audit Logs, which is specifically the
// sensitive-admin-action trail (§77). This is the broader, noisier stream.
function formatAction(action: string) {
  return action.split('.').join(' → ').replace(/_/g, ' ');
}

export function ActivityLogs() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const { data, loading, error, refetch } = useApi(() =>
    api.admin.activityLogs({ page, limit: PAGE_SIZE, action: actionFilter || undefined })
  );
  useEffect(() => { refetch(); }, [page, actionFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const logs = data?.data ?? [];
  const total = data?.pagination?.total ?? logs.length;
  const totalPages = data?.pagination?.totalPages ?? 1;

  const columns = [
    {
      key: 'action',
      header: 'Action',
      render: (row: ApiActivityLog) => (
        <span className="text-sm font-medium text-gray-900 capitalize">{formatAction(row.action)}</span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (row: ApiActivityLog) => <span className="text-sm text-gray-700">{row.userEmail ?? row.userId ?? '—'}</span>,
    },
    {
      key: 'entity',
      header: 'Entity',
      render: (row: ApiActivityLog) => (
        row.entityType
          ? <span className="text-xs font-mono text-gray-500">{row.entityType}{row.entityId ? ` #${row.entityId.slice(0, 8)}` : ''}</span>
          : <span className="text-gray-300">—</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row: ApiActivityLog) => <span className="text-sm text-gray-600">{row.description ?? '—'}</span>,
    },
    {
      key: 'platform',
      header: 'Platform',
      render: (row: ApiActivityLog) => <span className="text-xs text-gray-400">{row.platform ?? '—'}</span>,
    },
    {
      key: 'createdAt',
      header: 'When',
      render: (row: ApiActivityLog) => (
        <span className="text-xs text-gray-500">
          {new Date(row.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Activity Logs" subtitle={loading ? 'Loading...' : `${total} recorded events`} />

      <div className="relative max-w-sm mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Filter by action (e.g. campaign.created)..."
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
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
      ) : (
        <>
          <DataTable columns={columns} data={logs} keyField="id" />
          <Pagination page={page} totalPages={totalPages} total={total} limit={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
}
