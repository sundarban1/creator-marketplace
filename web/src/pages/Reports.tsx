import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { Avatar } from '../components/Avatar';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { api, type ApiReport } from '../lib/api';
import { useApi } from '../lib/useApi';

const PAGE_SIZE = 10;

const reasonColors: Record<string, string> = {
  SPAM:                  'bg-amber-50 text-amber-700',
  SCAM:                  'bg-red-50 text-red-700',
  FRAUD:                 'bg-red-50 text-red-800',
  HARASSMENT:            'bg-orange-50 text-orange-700',
  INAPPROPRIATE_CONTENT: 'bg-purple-50 text-purple-700',
  FAKE_PROFILE:          'bg-orange-50 text-orange-700',
  PAYMENT_ISSUE:         'bg-red-50 text-red-800',
  OTHER:                 'bg-gray-100 text-gray-700',
};

function reasonLabel(reason: string) {
  return reason.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function ReportCard({ report, onUpdateStatus }: {
  report: ApiReport;
  onUpdateStatus: (id: string, status: 'UNDER_REVIEW' | 'ACTION_TAKEN' | 'DISMISSED') => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${reasonColors[report.reason] ?? 'bg-gray-100 text-gray-700'}`}>
            {reasonLabel(report.reason)}
          </span>
        </div>
        <StatusBadge status={report.status.toLowerCase()} />
      </div>

      {report.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{report.description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400">Reporter:</span>
          <div className="flex items-center gap-1.5">
            <Avatar initials={report.reporter.email.slice(0, 2).toUpperCase()} size="sm" />
            <span className="font-medium text-gray-700">{report.reporter.email}</span>
          </div>
        </div>
        <span>→</span>
        <div className="flex items-center gap-1">
          <span className="text-gray-400">Reported:</span>
          <span className="font-medium text-gray-700 capitalize">{report.targetType.toLowerCase()}</span>
          <span className="font-mono text-gray-400">#{report.targetId.slice(0, 8)}</span>
        </div>
      </div>

      {report.actionNote && (
        <p className="text-xs text-gray-500 italic mb-3 bg-gray-50 rounded-lg px-3 py-2">Note: {report.actionNote}</p>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="text-xs text-gray-400">
          {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        {report.status === 'NEW' || report.status === 'UNDER_REVIEW' ? (
          <div className="flex gap-2">
            {report.status === 'NEW' && (
              <button
                onClick={() => onUpdateStatus(report.id, 'UNDER_REVIEW')}
                className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium transition-colors"
              >
                Review
              </button>
            )}
            <button
              onClick={() => onUpdateStatus(report.id, 'ACTION_TAKEN')}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors"
            >
              Mark Action Taken
            </button>
            <button
              onClick={() => onUpdateStatus(report.id, 'DISMISSED')}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Reports() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, loading, error, refetch } = useApi(() =>
    api.admin.reports({ page, limit: PAGE_SIZE, status: statusFilter || undefined })
  );
  useEffect(() => { refetch(); }, [page, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const reports = data?.data.items ?? [];
  const total = data?.data.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const newCount = reports.filter((r) => r.status === 'NEW').length;

  async function handleUpdateStatus(id: string, status: 'UNDER_REVIEW' | 'ACTION_TAKEN' | 'DISMISSED') {
    try {
      await api.admin.updateReportStatus(id, status);
      refetch();
    } catch (err) {
      window.alert((err as Error).message ?? 'Failed to update report.');
    }
  }

  return (
    <div>
      <PageHeader title="Reports" subtitle={loading ? 'Loading...' : `${total} total · ${newCount} new on this page`} />

      <div className="flex gap-2 mb-4">
        {[
          { key: '', label: 'All' },
          { key: 'NEW', label: 'New' },
          { key: 'UNDER_REVIEW', label: 'Under Review' },
          { key: 'ACTION_TAKEN', label: 'Action Taken' },
          { key: 'DISMISSED', label: 'Dismissed' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => { setStatusFilter(f.key); setPage(1); }}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === f.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse bg-gray-50 rounded-xl border border-gray-200" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No reports found.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} onUpdateStatus={handleUpdateStatus} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} limit={PAGE_SIZE} onChange={setPage} />
    </div>
  );
}
