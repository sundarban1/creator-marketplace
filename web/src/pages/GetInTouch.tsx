import { useEffect, useState } from 'react';
import { Mail, Clock, CheckCircle, Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { api } from '../lib/api';

const PAGE_SIZE = 10;

type SupportStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

interface ContactMessage {
  id:          string;
  topic:       string;
  message:     string;
  status:      string;
  createdAt:   string;
  guestName?:  string | null;
  guestEmail?: string | null;
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
      {status === 'RESOLVED' ? <CheckCircle size={10} /> : <Clock size={10} />}
      {status.replace('_', ' ')}
    </span>
  );
}

function MessageCard({ item, onStatusChange }: { item: ContactMessage; onStatusChange: (id: string, status: string) => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Mail size={15} className="text-indigo-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">{item.topic}</span>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="text-sm text-gray-600 mb-3 line-clamp-3">{item.message}</p>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-400 space-y-0.5">
          {(item.guestName || item.guestEmail) && (
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

export function GetInTouch() {
  const [messages, setMessages]         = useState<ContactMessage[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [toast, setToast]               = useState('');
  const [page, setPage]                 = useState(1);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800); }

  useEffect(() => {
    api.support.listContacts({ guestOnly: true })
      .then((res) => setMessages(res.data as ContactMessage[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleStatusChange(id: string, status: string) {
    try {
      await api.support.updateContactStatus(id, status);
      setMessages((prev) => prev.map((m) => m.id === id ? { ...m, status } : m));
      showToast('Status updated');
    } catch { showToast('Failed to update'); }
  }

  const filtered = messages.filter((m) =>
    (filterStatus === 'ALL' || m.status === filterStatus) &&
    (!search || m.topic.toLowerCase().includes(search.toLowerCase()) || m.message.toLowerCase().includes(search.toLowerCase()))
  );

  const openCount = messages.filter((m) => m.status === 'OPEN').length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <PageHeader title="Get in Touch" subtitle={`Messages submitted from the public landing page · ${openCount} open`} />

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
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">✉️</p>
          <p className="text-sm font-medium text-gray-700">{messages.length === 0 ? 'No messages yet' : 'No matches found'}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {pageItems.map((m) => <MessageCard key={m.id} item={m} onStatusChange={handleStatusChange} />)}
          </div>
          <Pagination page={page} totalPages={totalPages} total={filtered.length} limit={PAGE_SIZE} onChange={setPage} />
        </>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">{toast}</div>}
    </div>
  );
}
