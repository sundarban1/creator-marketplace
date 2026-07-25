import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { api, type ApiPaymentTransaction } from '../lib/api';
import { useApi } from '../lib/useApi';

const PAGE_SIZE = 10;

const TYPE_FILTERS = ['All', 'ESCROW_IN', 'PAYOUT'] as const;

const TYPE_LABELS: Record<string, string> = {
  ESCROW_IN: 'Escrow In',
  PAYOUT:    'Payout',
};

const columns = [
  {
    key: 'id',
    header: 'Transaction ID',
    render: (row: ApiPaymentTransaction) => (
      <span className="font-mono text-xs text-gray-500">#{row.id.slice(-8).toUpperCase()}</span>
    ),
  },
  {
    key: 'from',
    header: 'From',
    render: (row: ApiPaymentTransaction) => <span className="font-medium text-gray-800">{row.from}</span>,
  },
  {
    key: 'to',
    header: 'To',
    render: (row: ApiPaymentTransaction) => <span className="font-medium text-gray-800">{row.to}</span>,
  },
  {
    key: 'campaign',
    header: 'Event',
    render: (row: ApiPaymentTransaction) => (
      <span className="text-gray-600 text-xs max-w-[160px] truncate block">{row.campaign}</span>
    ),
  },
  {
    key: 'amount',
    header: 'Amount',
    render: (row: ApiPaymentTransaction) => (
      <span className="font-bold text-gray-900">Rs. {row.amount.toLocaleString()}</span>
    ),
  },
  {
    key: 'type',
    header: 'Type',
    render: (row: ApiPaymentTransaction) => (
      <span className={`text-xs font-medium ${row.type === 'ESCROW_IN' ? 'text-blue-600' : 'text-emerald-600'}`}>
        {TYPE_LABELS[row.type] ?? row.type}
      </span>
    ),
  },
  {
    key: 'date',
    header: 'Date',
    render: (row: ApiPaymentTransaction) => (
      <span className="text-gray-500">
        {new Date(row.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: () => <StatusBadge status="completed" />,
  },
];

export function Payments() {
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, loading: fetching, error, refetch } = useApi(() =>
    api.admin.payments({
      page,
      limit:  PAGE_SIZE,
      type:   typeFilter === 'All' ? undefined : typeFilter,
      search: debouncedSearch || undefined,
    })
  );

  useEffect(() => { refetch(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const transactions = data?.data ?? [];
  const total = data?.pagination?.total ?? transactions.length;
  const totalPages = data?.pagination?.totalPages ?? 1;

  function handleSearchChange(val: string) {
    setSearch(val);
    clearTimeout((window as { _st?: ReturnType<typeof setTimeout> })._st);
    (window as { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
      refetch();
    }, 400);
  }

  function handleTypeChange(type: string) {
    setTypeFilter(type);
    setPage(1);
    setTimeout(() => refetch(), 0);
  }

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle={fetching ? 'Loading...' : `${total} transaction${total === 1 ? '' : 's'}`}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by business, creator, or event..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                typeFilter === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'All' ? 'All' : TYPE_LABELS[t]}
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
          <DataTable columns={columns} data={transactions} keyField="id" />
          {transactions.length === 0 && (
            <div className="text-center py-10 text-sm text-gray-500">No payment transactions yet.</div>
          )}
          <Pagination page={page} totalPages={totalPages} total={total} limit={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
}
