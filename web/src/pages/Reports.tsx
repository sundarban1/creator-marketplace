import { AlertTriangle } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { Avatar } from '../components/Avatar';
import { PageHeader } from '../components/PageHeader';
import { reports, type Report } from '../data/mockData';

const reasonColors: Record<string, string> = {
  'Spam / Fake Account': 'bg-amber-50 text-amber-700',
  'Fraudulent Activity': 'bg-red-50 text-red-700',
  'Misleading Event': 'bg-orange-50 text-orange-700',
  'Content Violation': 'bg-purple-50 text-purple-700',
  'Payment Fraud': 'bg-red-50 text-red-800',
};

function ReportCard({ report }: { report: Report }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${reasonColors[report.reason] ?? 'bg-gray-100 text-gray-700'}`}>
            {report.reason}
          </span>
        </div>
        <StatusBadge status={report.status} />
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{report.description}</p>

      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400">Reporter:</span>
          <div className="flex items-center gap-1.5">
            <Avatar initials={report.reporter.slice(0, 2).toUpperCase()} size="sm" />
            <span className="font-medium text-gray-700">{report.reporter}</span>
          </div>
        </div>
        <span>→</span>
        <div className="flex items-center gap-1">
          <span className="text-gray-400">Reported:</span>
          <span className="font-medium text-gray-700">{report.reported}</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="text-xs text-gray-400">
          {new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <div className="flex gap-2">
          <button className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium transition-colors">
            Review
          </button>
          <button className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors">
            Ban User
          </button>
          <button className="text-xs px-3 py-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 font-medium transition-colors">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export function Reports() {
  const open = reports.filter((r) => r.status === 'open').length;
  return (
    <div>
      <PageHeader title="Reports" subtitle={`${reports.length} total · ${open} open`} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {reports.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>
    </div>
  );
}
