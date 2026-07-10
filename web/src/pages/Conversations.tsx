import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Briefcase,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { api, type ApiConversationAdmin, type ConversationStats, type Pagination } from '../lib/api';

// ── Helpers ────────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

const STATUS_CFG = {
  PENDING:  { label: 'Pending',  bg: 'bg-amber-100',  text: 'text-amber-700',  icon: Clock       },
  ACCEPTED: { label: 'Active',   bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
  DECLINED: { label: 'Declined', bg: 'bg-red-100',     text: 'text-red-700',    icon: XCircle     },
};

function StatusBadge({ status }: { status: 'PENDING' | 'ACCEPTED' | 'DECLINED' }) {
  const cfg  = STATUS_CFG[status] ?? STATUS_CFG.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function Avatar({ name, url, size = 32 }: { name: string; url?: string | null; size?: number }) {
  const COLORS = ['bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'];
  const idx    = name.charCodeAt(0) % COLORS.length;
  if (url) {
    return <img src={url} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className={`${COLORS[idx]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function formatTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type StatusFilter = '' | 'PENDING' | 'ACCEPTED' | 'DECLINED';

// ── Main component ─────────────────────────────────────────────────────────────

export function Conversations() {
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState<StatusFilter>('');
  const [page,    setPage]    = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ApiConversationAdmin | null>(null);

  const LIMIT = 10;

  const [stats,         setStats]         = useState<ConversationStats | null>(null);
  const [conversations, setConversations] = useState<ApiConversationAdmin[]>([]);
  const [pagination,    setPagination]    = useState<Pagination | null>(null);
  const [listLoading,   setListLoading]   = useState(true);
  const [statsLoading,  setStatsLoading]  = useState(true);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try { const r = await api.admin.conversationStats(); setStats(r.data); } finally { setStatsLoading(false); }
  }, []);

  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const r = await api.admin.conversations({ page, limit: LIMIT, status: status || undefined, search: search || undefined });
      setConversations(r.data);
      setPagination(r.pagination ?? null);
    } finally { setListLoading(false); }
  }, [page, status, search]);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rawSearch, setRawSearch] = useState('');

  useEffect(() => { void fetchStats(); }, [fetchStats]);
  useEffect(() => { void fetchList(); }, [fetchList]);

  const totalPages = pagination?.totalPages ?? 1;

  async function handleDelete(conv: ApiConversationAdmin) {
    setDeleting(conv.id);
    try {
      await api.admin.deleteConversation(conv.id);
      setToDelete(null);
      void fetchList();
      void fetchStats();
    } finally {
      setDeleting(null);
    }
  }

  function handleSearch(val: string) {
    setRawSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 350);
  }

  function handleStatusChange(val: StatusFilter) {
    setStatus(val);
    setPage(1);
  }

  return (
    <div>
      <PageHeader title="Conversations" subtitle="Monitor and moderate all creator–business conversations" />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-20" />
          ))
        ) : (
          <>
            <StatCard label="Total Conversations" value={stats?.total         ?? 0} color="text-indigo-600" />
            <StatCard label="Active Chats"        value={stats?.accepted      ?? 0} color="text-emerald-600" />
            <StatCard label="Pending Requests"    value={stats?.pending       ?? 0} sub="Awaiting response" color="text-amber-600" />
            <StatCard label="Declined"            value={stats?.declined      ?? 0} color="text-red-500" />
            <StatCard label="Total Messages"      value={stats?.totalMessages ?? 0} color="text-sky-600" />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search creator, business or event…"
            value={rawSearch}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as StatusFilter)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ACCEPTED">Active</option>
          <option value="DECLINED">Declined</option>
        </select>
        <button
          onClick={() => { void fetchList(); void fetchStats(); }}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {listLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageSquare size={26} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">No conversations found</p>
            <p className="text-xs text-gray-400 mt-1">
              {search || status ? 'Try changing your filters' : 'Conversations will appear here once users start messaging'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Creator</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Business</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Event</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Messages</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Activity</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {conversations.map((conv) => (
                  <tr key={conv.id} className="hover:bg-gray-50 transition-colors">
                    {/* Creator */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={conv.creator.fullName} url={conv.creator.avatarUrl} size={32} />
                        <div>
                          <p className="font-medium text-gray-800 text-sm leading-tight">{conv.creator.fullName}</p>
                          <p className="text-xs text-gray-400">Creator</p>
                        </div>
                      </div>
                    </td>

                    {/* Business */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={conv.business.businessName} url={conv.business.logoUrl} size={32} />
                        <div>
                          <p className="font-medium text-gray-800 text-sm leading-tight">{conv.business.businessName}</p>
                          <p className="text-xs text-gray-400">Business</p>
                        </div>
                      </div>
                    </td>

                    {/* Campaign */}
                    <td className="px-4 py-3.5">
                      {conv.campaign ? (
                        <span className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                          <Briefcase size={10} />
                          {conv.campaign.title.length > 22 ? conv.campaign.title.slice(0, 22) + '…' : conv.campaign.title}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Direct</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge status={conv.status} />
                    </td>

                    {/* Messages */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                        <MessageSquare size={13} className="text-gray-400" />
                        {conv._count.messages}
                      </span>
                    </td>

                    {/* Last Activity */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-500">
                        {formatTime(conv.lastMessageAt ?? conv.createdAt)}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => setToDelete(conv)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete conversation"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!listLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages} · {pagination?.total ?? 0} total
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {toDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Delete Conversation?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will permanently delete the conversation between{' '}
              <strong>{toDelete.creator.fullName}</strong> and{' '}
              <strong>{toDelete.business.businessName}</strong> and all{' '}
              {toDelete._count.messages} message{toDelete._count.messages !== 1 ? 's' : ''}. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setToDelete(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(toDelete)}
                disabled={deleting === toDelete.id}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-60 transition-colors"
              >
                {deleting === toDelete.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
