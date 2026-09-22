import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Pencil, MapPin, Users } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { MeetupFormModal } from './MeetupFormModal';
import { RegistrationsTab } from './RegistrationsTab';

const TABS = [
  { key: 'overview',      label: 'Overview' },
  { key: 'registrations', label: 'Registrations' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

function formatEventDate(iso: string | null): string {
  if (!iso) return 'Not yet announced';
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function CreatorMeetupDetail() {
  const { meetupId } = useParams<{ meetupId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showEdit, setShowEdit] = useState(false);

  const paramTab = searchParams.get('tab');
  const tab: TabKey = TABS.some((t) => t.key === paramTab) ? (paramTab as TabKey) : 'overview';
  const setTab = (key: TabKey) => setSearchParams(key === 'overview' ? {} : { tab: key }, { replace: true });

  const { data, loading, error, refetch } = useApi(() => api.admin.meetup(meetupId!));
  const meetup = data?.data;

  if (loading) return <div className="p-12 text-center text-sm text-gray-400">Loading…</div>;
  if (error || !meetup) {
    return (
      <div>
        <button onClick={() => navigate('/admin/creator-meetups')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={15} /> Back to Creator Meetups
        </button>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error || 'Meetup not found.'}</div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate('/admin/creator-meetups')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={15} /> Back to Creator Meetups
      </button>

      <PageHeader
        title={meetup.title}
        subtitle={`${meetup.city}${meetup.district ? `, ${meetup.district}` : ''} · ${formatEventDate(meetup.eventDate)}`}
        action={
          <button onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition-colors">
            <Pencil size={15} /> Edit Meetup
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Total Registrations</p>
          <p className="text-xl font-bold text-gray-900">{meetup.stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Pending</p>
          <p className="text-xl font-bold text-amber-600">{meetup.stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Accepted</p>
          <p className="text-xl font-bold text-emerald-600">{meetup.stats.accepted}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Checked In</p>
          <p className="text-xl font-bold text-indigo-600">
            {meetup.stats.checkedIn}{meetup.stats.accepted > 0 ? ` / ${meetup.stats.accepted}` : ''}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Capacity</p>
          <p className="text-xl font-bold text-gray-900">
            {meetup.capacity != null ? `${meetup.stats.accepted} / ${meetup.capacity}` : 'Unlimited'}
          </p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5 w-fit">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <StatusBadge status={meetup.status.toLowerCase()} />
            <StatusBadge status={meetup.registrationStatus.toLowerCase()} />
          </div>

          {meetup.description && <p className="text-sm text-gray-600">{meetup.description}</p>}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Location</p>
              <p className="text-gray-800 flex items-center gap-1.5"><MapPin size={14} className="text-gray-400" />
                {meetup.city}{meetup.district ? `, ${meetup.district}` : ''}{meetup.province ? `, ${meetup.province}` : ''}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Event Date</p>
              <p className="text-gray-800">{formatEventDate(meetup.eventDate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Time</p>
              <p className="text-gray-800">
                {meetup.eventStartTime ? `${meetup.eventStartTime}${meetup.eventEndTime ? ` – ${meetup.eventEndTime}` : ''}` : 'Not yet announced'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Venue</p>
              <p className="text-gray-800">
                {meetup.venueName ? `${meetup.venueName}${meetup.venueAddress ? `, ${meetup.venueAddress}` : ''}` : 'Not yet announced'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1.5"><Users size={13} /> Capacity</p>
              <p className="text-gray-800">{meetup.capacity ?? 'Unlimited — admin decides who to accept'}</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'registrations' && <RegistrationsTab meetupId={meetup.id} />}

      {showEdit && (
        <MeetupFormModal
          meetup={meetup}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); refetch(); }}
        />
      )}
    </div>
  );
}
