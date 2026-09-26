import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, Users } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import { useApi } from '../lib/useApi';
import { MeetupFormModal } from './creator-meetups/MeetupFormModal';

function formatEventDate(iso: string | null): string {
  if (!iso) return 'TBD';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function CreatorMeetups() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const { data, loading, error, refetch } = useApi(() => api.admin.meetups());
  const meetups = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Creator Meetups"
        subtitle={loading ? 'Loading…' : `${meetups.length} meetup${meetups.length === 1 ? '' : 's'} across all cities`}
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white transition-colors"
          >
            <Plus size={16} /> Create Meetup
          </button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse bg-gray-50 rounded-xl border border-gray-200" />
          ))}
        </div>
      ) : meetups.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No meetups yet. Create one to open registration in a city.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetups.map((m) => (
            <button
              key={m.id}
              onClick={() => navigate(`/admin/creator-meetups/${m.id}`)}
              className="text-left bg-white rounded-2xl border border-gray-200 adm-card p-5 hover:shadow-md hover:border-indigo-200 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <MapPin size={13} />
                  {m.city}{m.district ? `, ${m.district}` : ''}
                </div>
                <StatusBadge status={m.registrationStatus.toLowerCase()} />
              </div>

              <h3 className="text-sm font-bold text-gray-900 mb-1">{m.title}</h3>
              <p className="text-xs text-gray-400 mb-4">{formatEventDate(m.eventDate)}</p>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Users size={13} />
                  {m.stats.total} registered
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-amber-600 font-medium">{m.stats.pending} pending</span>
                  <span className="text-emerald-600 font-medium">{m.stats.accepted} accepted</span>
                </div>
              </div>
              <div className="mt-2">
                <StatusBadge status={m.status.toLowerCase()} />
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <MeetupFormModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); refetch(); }}
        />
      )}
    </div>
  );
}
