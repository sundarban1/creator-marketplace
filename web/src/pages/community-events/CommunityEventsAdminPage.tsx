import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Eye, EyeOff, ExternalLink, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { api, type CommunityEventListRow, type CommunityEventStatus } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { ConfirmModal } from '../../components/ConfirmModal';
import { communityEventPath, formatEventDate, placeLine } from '../../app/community-events/format';
import { EVENT_TYPE_LABELS } from './formUtils';

const STATUS_STYLE: Record<CommunityEventStatus, string> = {
  UPCOMING: 'bg-indigo-50 text-indigo-700',
  ONGOING: 'bg-emerald-50 text-emerald-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-50 text-red-600',
};
const STATUS_LABEL: Record<CommunityEventStatus, string> = {
  UPCOMING: 'Upcoming', ONGOING: 'Ongoing', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};

export function CommunityEventsAdminPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CommunityEventListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommunityEventListRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    api.admin
      .communityEvents()
      .then((r) => setEvents(r.data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function togglePublished(e: CommunityEventListRow) {
    setBusyId(e.id);
    try {
      await api.admin.setCommunityEventPublished(e.id, !e.published);
      setEvents((list) => list.map((x) => (x.id === e.id ? { ...x, published: !e.published } : x)));
      setToast({ ok: true, msg: e.published ? 'Event unpublished.' : 'Event published.' });
    } catch (ex) {
      setToast({ ok: false, msg: (ex as Error).message });
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await api.admin.deleteCommunityEvent(deleteTarget.id);
      setEvents((list) => list.filter((x) => x.id !== deleteTarget.id));
      setToast({ ok: true, msg: 'Event deleted.' });
    } catch (ex) {
      setToast({ ok: false, msg: (ex as Error).message });
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  }

  const th = 'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider';
  const iconBtn = 'p-1.5 rounded-lg transition-colors disabled:opacity-40';

  return (
    <div>
      <PageHeader
        title="Community Events"
        subtitle="Manage Kolab community events, meetups, workshops and other activities."
        action={
          <button
            onClick={() => navigate('/admin/events/new')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} /> Create Event
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-gray-200 adm-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className={th}>Event</th>
              <th className={`${th} hidden md:table-cell`}>Type</th>
              <th className={th}>Date</th>
              <th className={`${th} hidden lg:table-cell`}>Location</th>
              <th className={th}>Status</th>
              <th className={th}>Published</th>
              <th className={`${th} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">Loading…</td></tr>
            )}
            {!loading && error && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-red-500 text-sm">{error}</td></tr>
            )}
            {!loading && !error && events.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center">
                  <CalendarDays className="mx-auto text-gray-300" size={28} />
                  <p className="mt-2 text-sm text-gray-500">No events yet.</p>
                  <button onClick={() => navigate('/admin/events/new')} className="mt-2 text-sm font-medium text-indigo-600 hover:underline">
                    Create the first one
                  </button>
                </td>
              </tr>
            )}
            {!loading && events.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <button onClick={() => navigate(`/admin/events/${e.id}/edit`)} className="flex items-center gap-3 text-left">
                    {e.coverImageUrl ? (
                      <img src={e.coverImageUrl} alt="" className="h-10 w-16 flex-shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-10 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-300">
                        <CalendarDays size={16} />
                      </div>
                    )}
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-medium text-gray-900">
                        <span className="line-clamp-1">{e.title}</span>
                        {e.featured && <Star size={12} className="flex-shrink-0 fill-amber-400 text-amber-400" />}
                      </span>
                      <span className="block text-xs text-gray-400">{e._count.images} photos · {e._count.speakers} speakers</span>
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-600">{EVENT_TYPE_LABELS[e.eventType]}</td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatEventDate(e.startDateTime, e.timezone, 'en', 'short')}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{placeLine(e.city, e.country) || e.venueName || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[e.status]}`}>{STATUS_LABEL[e.status]}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${e.published ? 'text-emerald-600' : 'text-gray-400'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${e.published ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    {e.published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => navigate(`/admin/events/${e.id}/edit`)} title="Edit" className={`${iconBtn} text-indigo-500 hover:bg-indigo-50`}>
                      <Pencil size={15} />
                    </button>
                    <a
                      href={e.published ? communityEventPath(e.slug) : `${communityEventPath(e.slug)}?preview=${e.id}`}
                      target="_blank"
                      rel="noreferrer"
                      title={e.published ? 'View live page' : 'Preview'}
                      className={`${iconBtn} text-gray-500 hover:bg-gray-100`}
                    >
                      <ExternalLink size={15} />
                    </a>
                    <button
                      onClick={() => togglePublished(e)}
                      disabled={busyId === e.id || (!e.published && !e.coverImageUrl)}
                      title={e.published ? 'Unpublish' : e.coverImageUrl ? 'Publish' : 'Add a cover image before publishing'}
                      className={`${iconBtn} ${e.published ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                    >
                      {e.published ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <button onClick={() => setDeleteTarget(e)} disabled={busyId === e.id} title="Delete" className={`${iconBtn} text-red-400 hover:bg-red-50`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete event?"
        body={`“${deleteTarget?.title ?? ''}” and all its photos, speakers, highlights and agenda will be permanently deleted. ${deleteTarget?.published ? 'Its public page will stop working. ' : ''}This cannot be undone.`}
        confirmLabel="Delete event"
        variant="danger"
        loading={busyId === deleteTarget?.id}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-medium text-white shadow-lg z-50 ${toast.ok ? 'bg-gray-900' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
