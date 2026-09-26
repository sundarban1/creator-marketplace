import { useEffect, useState } from 'react';
import { Check, X, Search, UserCheck, Undo2 } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { api, type ApiMeetupRegistration } from '../../lib/api';
import { useApi } from '../../lib/useApi';

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'REJECTED', label: 'Rejected' },
] as const;

function creatorTypeLabel(t: string) {
  return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCheckedInTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function ActionButtons({ registration, onAccept, onReject, onCheckIn, onUndoCheckIn, busy }: {
  registration: ApiMeetupRegistration;
  onAccept: () => void;
  onReject: () => void;
  onCheckIn: () => void;
  onUndoCheckIn: () => void;
  busy: boolean;
}) {
  if (registration.status === 'PENDING') {
    return (
      <div className="flex gap-2">
        <button onClick={onAccept} disabled={busy}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium transition-colors disabled:opacity-50">
          <Check size={13} /> Accept
        </button>
        <button onClick={onReject} disabled={busy}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium transition-colors disabled:opacity-50">
          <X size={13} /> Reject
        </button>
      </div>
    );
  }

  if (registration.status === 'ACCEPTED') {
    if (registration.checkedInAt) {
      return (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
            <UserCheck size={13} /> Checked in {formatCheckedInTime(registration.checkedInAt)}
          </span>
          <button onClick={onUndoCheckIn} disabled={busy}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 text-xs font-medium transition-colors disabled:opacity-50">
            <Undo2 size={12} /> Undo
          </button>
        </div>
      );
    }
    return (
      <button onClick={onCheckIn} disabled={busy}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-medium transition-colors disabled:opacity-50">
        <UserCheck size={13} /> Check In
      </button>
    );
  }

  return null;
}

export function RegistrationsTab({ meetupId }: { meetupId: string }) {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(() =>
    api.admin.meetupRegistrations(meetupId, { status: statusFilter || undefined, search: search || undefined })
  );
  useEffect(() => { refetch(); }, [statusFilter, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const registrations = data?.data ?? [];

  async function handleAccept(id: string) {
    setBusyId(id);
    try {
      await api.admin.acceptMeetupRegistration(meetupId, id);
      refetch();
    } catch (err) {
      window.alert((err as Error).message ?? 'Failed to accept registration.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    try {
      await api.admin.rejectMeetupRegistration(meetupId, id);
      refetch();
    } catch (err) {
      window.alert((err as Error).message ?? 'Failed to reject registration.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleCheckIn(id: string) {
    setBusyId(id);
    try {
      await api.admin.checkInMeetupRegistration(meetupId, id);
      refetch();
    } catch (err) {
      window.alert((err as Error).message ?? 'Failed to check in.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleUndoCheckIn(id: string) {
    setBusyId(id);
    try {
      await api.admin.undoCheckInMeetupRegistration(meetupId, id);
      refetch();
    } catch (err) {
      window.alert((err as Error).message ?? 'Failed to undo check-in.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === f.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse bg-gray-50 rounded-xl border border-gray-200" />
          ))}
        </div>
      ) : registrations.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No registrations found.</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Creator Type</th>
                  <th className="px-4 py-3 font-medium">Attending</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {registrations.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.fullName}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{r.phoneNumber}</div>
                      {r.email && <div className="text-xs text-gray-400">{r.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.creatorTypes.map(creatorTypeLabel).join(', ')}</td>
                    <td className="px-4 py-3 text-gray-600">{r.attendancePreference === 'YES' ? "Yes, I'll attend" : "Not sure yet"}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status.toLowerCase()} /></td>
                    <td className="px-4 py-3">
                      <ActionButtons registration={r} busy={busyId === r.id}
                        onAccept={() => handleAccept(r.id)} onReject={() => handleReject(r.id)}
                        onCheckIn={() => handleCheckIn(r.id)} onUndoCheckIn={() => handleUndoCheckIn(r.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {registrations.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-200 adm-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{r.fullName}</p>
                    <p className="text-xs text-gray-500">{r.phoneNumber}</p>
                  </div>
                  <StatusBadge status={r.status.toLowerCase()} />
                </div>
                <p className="text-xs text-gray-500 mb-1">{r.creatorTypes.map(creatorTypeLabel).join(', ')}</p>
                <p className="text-xs text-gray-400 mb-3">{r.attendancePreference === 'YES' ? "Yes, I'll attend" : "Not sure yet"}</p>
                <ActionButtons registration={r} busy={busyId === r.id}
                  onAccept={() => handleAccept(r.id)} onReject={() => handleReject(r.id)}
                  onCheckIn={() => handleCheckIn(r.id)} onUndoCheckIn={() => handleUndoCheckIn(r.id)} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
