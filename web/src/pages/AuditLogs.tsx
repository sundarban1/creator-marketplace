import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { Pagination } from '../components/Pagination';
import { api, type ApiAuditLog } from '../lib/api';
import { useApi } from '../lib/useApi';

const PAGE_SIZE = 25;

// §77 — every sensitive admin action (verification, suspension, payment
// actions, refunds, deletion, report review, ...) is already written here by
// logAudit(); this is the first page that actually surfaces that trail.
function formatAction(action: string) {
  return action.split('.').join(' → ').replace(/_/g, ' ');
}

function ValueCell({ value }: { value: Record<string, unknown> | null }) {
  if (!value || Object.keys(value).length === 0) return <span className="text-gray-300">—</span>;
  return (
    <div className="text-xs text-gray-600 space-y-0.5">
      {Object.entries(value).map(([k, v]) => (
        <div key={k}><span className="text-gray-400">{k}:</span> {String(v)}</div>
      ))}
    </div>
  );
}

export function AuditLogs() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const { data, loading, error, refetch } = useApi(() =>
    api.admin.auditLogs({ page, limit: PAGE_SIZE, action: actionFilter || undefined })
  );
  useEffect(() => { refetch(); }, [page, actionFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const logs = data?.data ?? [];
  const total = data?.pagination?.total ?? logs.length;
  const totalPages = data?.pagination?.totalPages ?? 1;

  const columns = [
    {
      key: 'action',
      header: 'Action',
      render: (row: ApiAuditLog) => (
        <span className="text-sm font-medium text-gray-900 capitalize">{formatAction(row.action)}</span>
      ),
    },
    {
      key: 'performedBy',
      header: 'Performed By',
      render: (row: ApiAuditLog) => (
        <span className="text-sm text-gray-700">{row.performedByEmail ?? row.performedBy ?? '—'}</span>
      ),
    },
    {
      key: 'user',
      header: 'Affected User',
      render: (row: ApiAuditLog) => (
        <span className="text-sm text-gray-700">{row.userEmail ?? row.userId ?? '—'}</span>
      ),
    },
    {
      key: 'oldValue',
      header: 'Before',
      render: (row: ApiAuditLog) => <ValueCell value={row.oldValue} />,
    },
    {
      key: 'newValue',
      header: 'After',
      render: (row: ApiAuditLog) => <ValueCell value={row.newValue} />,
    },
    {
      key: 'ipAddress',
      header: 'IP',
      render: (row: ApiAuditLog) => <span className="text-xs font-mono text-gray-400">{row.ipAddress ?? '—'}</span>,
    },
    {
      key: 'createdAt',
      header: 'When',
      render: (row: ApiAuditLog) => (
        <span className="text-xs text-gray-500">
          {new Date(row.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle={loading ? 'Loading...' : `${total} recorded actions`} />

      <div className="relative max-w-sm mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Filter by action (e.g. account.suspended)..."
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
