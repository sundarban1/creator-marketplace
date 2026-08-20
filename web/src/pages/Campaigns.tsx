import { useState, useMemo } from 'react';
import { useNavigate }       from 'react-router-dom';
import { ChevronDown, ToggleLeft, ToggleRight, Eye, Pencil, Trash2 } from 'lucide-react';
import { DataTable }    from '../components/DataTable';
import { StatusBadge }  from '../components/StatusBadge';
import { PageHeader }   from '../components/PageHeader';
import { Pagination }   from '../components/Pagination';
import { EditEventModal } from '../components/EditEventModal';
import { ActionButton } from '../components/ActionButton';
import { api, type ApiCampaign } from '../lib/api';
import { useApi }       from '../lib/useApi';

const PAGE_SIZE = 10;

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: 'text-pink-600 bg-pink-50 border-pink-200',
  TikTok:    'text-gray-800 bg-gray-100 border-gray-300',
  YouTube:   'text-red-600 bg-red-50 border-red-200',
  LinkedIn:  'text-blue-600 bg-blue-50 border-blue-200',
  Twitter:   'text-sky-600 bg-sky-50 border-sky-200',
};

const STATUS_FILTERS = ['All', 'PENDING_APPROVAL', 'ACTIVE', 'PAUSED', 'CLOSED'] as const;
const STATUS_FILTER_LABELS: Record<(typeof STATUS_FILTERS)[number], string> = {
  All: 'All',
  PENDING_APPROVAL: 'Pending Review',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  CLOSED: 'CLOSED',
};

function mapStatus(s: string): string {
  if (s === 'PENDING_APPROVAL') return 'pending';
  return s.toLowerCase();
}

function formatBudget(min: number, max: number): string {
  const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;
  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}

export function Campaigns() {
  const navigate = useNavigate();
  const [statusFilter,   setStatusFilter]   = useState<string>('All');
  const [businessFilter, setBusinessFilter] = useState<string>('All');
  const [page, setPage] = useState(1);
  const [editId, setEditId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(() =>
    api.admin.campaigns({
      limit:  200,
      status: statusFilter === 'All' ? undefined : statusFilter,
    })
  );

  const allCampaigns = data?.data ?? [];

  const businessNames = useMemo(() => {
    const names = [...new Set(allCampaigns.map((c) => c.business.businessName))].sort();
    return names;
  }, [allCampaigns]);

  const campaigns = useMemo(() =>
    businessFilter === 'All'
      ? allCampaigns
      : allCampaigns.filter((c) => c.business.businessName === businessFilter),
    [allCampaigns, businessFilter]
  );

  const total     = campaigns.length;
  const activeCnt = campaigns.filter((c) => c.status === 'ACTIVE').length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageCampaigns = useMemo(() =>
    campaigns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [campaigns, page]
  );

  function handleStatusChange(s: string) {
    setStatusFilter(s);
    setBusinessFilter('All');
    setPage(1);
    setTimeout(() => refetch(), 0);
  }

  function handleBusinessChange(name: string) {
    setBusinessFilter(name);
    setPage(1);
  }

  // Admin-only activate/deactivate — reuses the existing ACTIVE/PAUSED status
  // pair (businesses have no self-service way to set either; their only
  // status action is cancel). Only meaningful once a event is live, so it's
  // restricted to campaigns already in one of those two states.
  async function handleToggleActive(row: ApiCampaign) {
    const next = row.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setTogglingId(row.id);
    try {
      await api.admin.updateCampaignStatus(row.id, next);
      refetch();
    } catch (e) {
      window.alert((e as Error).message ?? 'Failed to update event status.');
    } finally {
      setTogglingId(null);
    }
  }

  // Soft delete — the event row stays (audit trail) but every proposal/
  // requirement/invitation tied to it is force-deleted regardless of status
  // (accepted, paid, in progress...), so this needs an explicit confirmation.
  async function handleDelete(row: ApiCampaign) {
    const confirmed = window.confirm(
      `Delete "${row.title}"? This permanently removes all of its proposals (accepted, paid, or in progress included) and can't be undone.`
    );
    if (!confirmed) return;
    setDeletingId(row.id);
    try {
      await api.admin.deleteCampaign(row.id);
      refetch();
    } catch (e) {
      window.alert((e as Error).message ?? 'Failed to delete event.');
    } finally {
      setDeletingId(null);
    }
  }

  const columns = [
    {
      key:    'title',
      header: 'Event',
      render: (row: ApiCampaign) => (
        <button
          onClick={() => navigate(`/campaigns/${row.id}`)}
          className="min-w-0 text-left group"
        >
          <p className="font-medium text-gray-900 truncate max-w-[220px] group-hover:text-indigo-600 group-hover:underline">{row.title}</p>
          <p className="text-xs text-gray-500 truncate">{row.business.businessName}</p>
        </button>
      ),
    },
    {
      key:    'platform',
      header: 'Platform',
      render: (row: ApiCampaign) => (
        <div className="flex flex-wrap gap-1.5">
          {row.platforms.map((p) => (
            <span
              key={p}
              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                PLATFORM_COLORS[p] ?? 'bg-gray-100 text-gray-700 border-gray-300'
              }`}
            >
              {p}
            </span>
          ))}
        </div>
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
      render: (row: ApiCampaign) => <StatusBadge status={row.deletedAt ? 'deleted' : mapStatus(row.status)} />,
    },
    {
      key:    'actions',
      header: 'Actions',
      render: (row: ApiCampaign) => {
        const isDeleted = !!row.deletedAt;
        const canToggle = !isDeleted && (row.status === 'ACTIVE' || row.status === 'PAUSED');
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => canToggle && handleToggleActive(row)}
              disabled={!canToggle || togglingId === row.id}
              title={
                isDeleted ? 'Event has been deleted'
                : canToggle ? (row.status === 'ACTIVE' ? 'Deactivate' : 'Activate')
                : 'Only active or inactive events can be toggled'
              }
              className={`p-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                row.status === 'ACTIVE'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                  : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
              }`}
            >
              {row.status === 'ACTIVE' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            </button>
            <ActionButton variant="primary" icon={Eye} title="View" onClick={() => navigate(`/campaigns/${row.id}`)} />
            <ActionButton
              variant="primary"
              icon={Pencil}
              title={isDeleted ? 'Event has been deleted' : 'Edit'}
              disabled={isDeleted}
              onClick={() => setEditId(row.id)}
            />
            <ActionButton
              variant="danger"
              icon={Trash2}
              title={isDeleted ? 'Already deleted' : 'Delete'}
              disabled={isDeleted || deletingId === row.id}
              onClick={() => handleDelete(row)}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Events"
        subtitle={
          loading
            ? 'Loading...'
            : `${total} total · ${activeCnt} active`
        }
      />

      {/* Filters */}
      <div className="flex items-center justify-between gap-3 mb-4">
        {/* Status tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
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
              {STATUS_FILTER_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Business dropdown */}
        <div className="relative">
          <select
            value={businessFilter}
            onChange={(e) => handleBusinessChange(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 text-xs font-medium border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="All">All Companies</option>
            {businessNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
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
        <>
          <DataTable columns={columns} data={pageCampaigns} keyField="id" />
          <Pagination page={page} totalPages={totalPages} total={total} limit={PAGE_SIZE} onChange={setPage} />
        </>
      )}

      {editId && (
        <EditEventModal
          campaignId={editId}
          onClose={() => setEditId(null)}
          onSaved={() => { setEditId(null); refetch(); }}
        />
      )}
    </div>
  );
}
