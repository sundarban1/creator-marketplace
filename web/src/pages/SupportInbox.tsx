import { useEffect, useState } from 'react';
import { MessageSquare, AlertTriangle, Clock, CheckCircle, Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { api } from '../lib/api';

const PAGE_SIZE = 10;

type SupportStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

interface SupportRequest {
  id:          string;
  topic:       string;
  message:     string;
  status:      string;
  createdAt:   string;
  user?:       { email: string; role: string } | null;
  guestName?:  string | null;
  guestEmail?: string | null;
}

interface IssueReport {
  id:          string;
  type:        string;
  description: string;
  status:      string;
  createdAt:   string;
  user?:       { email: string; role: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN:        'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED:    'bg-green-100 text-green-700',
};

const STATUSES: SupportStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status === 'OPEN' && <Clock size={10} />}
      {status === 'IN_PROGRESS' && <Clock size={10} />}
      {status === 'RESOLVED' && <CheckCircle size={10} />}
      {status.replace('_', ' ')}
    </span>
  );
}

function ContactCard({ item, onStatusChange }: { item: SupportRequest; onStatusChange: (id: string, status: string) => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-indigo-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">{item.topic}</span>
          {!item.user && (
            <span className="text-[10px] font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">Guest</span>
          )}
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="text-sm text-gray-600 mb-3 line-clamp-3">{item.message}</p>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-400 space-y-0.5">
          {item.user
            ? <p className="font-medium text-gray-600">{item.user.email}</p>
            : (item.guestName || item.guestEmail) && (
              <p className="font-medium text-gray-600">{item.guestName} {item.guestEmail && `· ${item.guestEmail}`}</p>
            )}
          <p>{new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="flex gap-1.5">
          {STATUSES.filter((s) => s !== item.status).map((s) => (
            <button key={s} onClick={() => onStatusChange(item.id, s)}
              className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 text-gray-600 font-medium transition-colors">
              Mark {s.replace('_', ' ').toLowerCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportCard({ item, onStatusChange }: { item: IssueReport; onStatusChange: (id: string, status: string) => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">{item.type}</span>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="text-sm text-gray-600 mb-3 line-clamp-3">{item.description}</p>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-400 space-y-0.5">
          {item.user && <p className="font-medium text-gray-600">{item.user.email}</p>}
          <p>{new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="flex gap-1.5">
          {STATUSES.filter((s) => s !== item.status).map((s) => (
            <button key={s} onClick={() => onStatusChange(item.id, s)}
              className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-amber-100 hover:text-amber-700 text-gray-600 font-medium transition-colors">
              Mark {s.replace('_', ' ').toLowerCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SupportInbox() {
  const [tab, setTab]                       = useState<'contacts' | 'reports'>('contacts');
  const [contacts, setContacts]             = useState<SupportRequest[]>([]);
  const [reports, setReports]               = useState<IssueReport[]>([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState('');
  const [filterStatus, setFilterStatus]     = useState('ALL');
  const [toast, setToast]                   = useState('');
  const [page, setPage]                     = useState(1);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800); }

  async function loadContacts() {
    const res = await api.support.listContacts();
    setContacts(res.data as SupportRequest[]);
  }
  async function loadReports() {
    const res = await api.support.listReports();
    setReports(res.data as IssueReport[]);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadContacts(), loadReports()]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleContactStatus(id: string, status: string) {
    try {
      await api.support.updateContactStatus(id, status);
      setContacts((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
      showToast('Status updated');
    } catch { showToast('Failed to update'); }
  }

  async function handleReportStatus(id: string, status: string) {
    try {
      await api.support.updateReportStatus(id, status);
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
      showToast('Status updated');
    } catch { showToast('Failed to update'); }
  }

  const filteredContacts = contacts.filter((c) =>
    (filterStatus === 'ALL' || c.status === filterStatus) &&
    (!search || c.topic.toLowerCase().includes(search.toLowerCase()) || c.message.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredReports = reports.filter((r) =>
    (filterStatus === 'ALL' || r.status === filterStatus) &&
    (!search || r.type.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()))
  );

  const openContacts = contacts.filter((c) => c.status === 'OPEN').length;
  const openReports  = reports.filter((r) => r.status === 'OPEN').length;

  const activeList = tab === 'contacts' ? filteredContacts : filteredReports;
  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE));
  const pageContacts = filteredContacts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageReports  = filteredReports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <PageHeader title="Support Inbox" subtitle={`${openContacts} open contacts · ${openReports} open reports`} />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
        {([['contacts', 'Contact Requests', contacts.length], ['reports', 'Issue Reports', reports.length]] as const).map(([key, label, count]) => (
          <button key={key} onClick={() => { setTab(key); setSearch(''); setFilterStatus('ALL'); setPage(1); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
            {(count as number) > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'}`}>{count as number}</span>}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
        </div>
        <div className="flex gap-2">
          {(['ALL', ...STATUSES] as const).map((s) => (
            <button key={s} onClick={() => { setFilterStatus(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-400'}`}>
              {s === 'ALL' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-sm text-gray-400">Loading…</div>
      ) : tab === 'contacts' ? (
        filteredContacts.length === 0
          ? <div className="text-center py-16"><p className="text-4xl mb-3">💬</p><p className="text-sm font-medium text-gray-700">{contacts.length === 0 ? 'No support requests yet' : 'No matches found'}</p></div>
          : <>
              <div className="grid gap-3 sm:grid-cols-2">{pageContacts.map((c) => <ContactCard key={c.id} item={c} onStatusChange={handleContactStatus} />)}</div>
              <Pagination page={page} totalPages={totalPages} total={filteredContacts.length} limit={PAGE_SIZE} onChange={setPage} />
            </>
      ) : (
        filteredReports.length === 0
          ? <div className="text-center py-16"><p className="text-4xl mb-3">🚩</p><p className="text-sm font-medium text-gray-700">{reports.length === 0 ? 'No issue reports yet' : 'No matches found'}</p></div>
          : <>
              <div className="grid gap-3 sm:grid-cols-2">{pageReports.map((r) => <ReportCard key={r.id} item={r} onStatusChange={handleReportStatus} />)}</div>
              <Pagination page={page} totalPages={totalPages} total={filteredReports.length} limit={PAGE_SIZE} onChange={setPage} />
            </>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">{toast}</div>}
    </div>
  );
}
