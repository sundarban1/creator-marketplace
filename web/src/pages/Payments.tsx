import { useState } from 'react';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { payments, type Payment } from '../data/mockData';

const PAGE_SIZE = 10;

const columns = [
  {
    key: 'id',
    header: 'Transaction ID',
    render: (row: Payment) => (
      <span className="font-mono text-xs text-gray-500">#{row.id.toUpperCase()}</span>
    ),
  },
  {
    key: 'from',
    header: 'From',
    render: (row: Payment) => <span className="font-medium text-gray-800">{row.from}</span>,
  },
  {
    key: 'to',
    header: 'To',
    render: (row: Payment) => <span className="font-medium text-gray-800">{row.to}</span>,
  },
  {
    key: 'campaign',
    header: 'Event',
    render: (row: Payment) => <span className="text-gray-600 text-xs max-w-[160px] truncate block">{row.campaign}</span>,
  },
  {
    key: 'amount',
    header: 'Amount',
    render: (row: Payment) => (
      <span className="font-bold text-gray-900">{row.amount}</span>
    ),
  },
  {
    key: 'method',
    header: 'Method',
    render: (row: Payment) => <span className="text-gray-500 text-xs">{row.method}</span>,
  },
  {
    key: 'date',
    header: 'Date',
    render: (row: Payment) => (
      <span className="text-gray-500">{new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row: Payment) => <StatusBadge status={row.status} />,
  },
];

export function Payments() {
  const [page, setPage] = useState(1);
  const total = payments.reduce((sum, p) => {
    const val = parseFloat(p.amount.replace(/[$,]/g, ''));
    return p.status === 'paid' ? sum + val : sum;
  }, 0);
  const totalPages = Math.max(1, Math.ceil(payments.length / PAGE_SIZE));
  const pagePayments = payments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle={`${payments.length} transactions · $${total.toLocaleString()} settled`}
      />
      <DataTable columns={columns} data={pagePayments} keyField="id" />
      <Pagination page={page} totalPages={totalPages} total={payments.length} limit={PAGE_SIZE} onChange={setPage} />
    </div>
  );
}
