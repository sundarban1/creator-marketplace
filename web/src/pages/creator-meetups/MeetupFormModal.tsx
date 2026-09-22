import { useState, type FormEvent } from 'react';
import { api, type ApiMeetup } from '../../lib/api';

const REGISTRATION_STATUS_OPTIONS = ['DRAFT', 'OPEN', 'CLOSED'] as const;
const MEETUP_STATUS_OPTIONS = ['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const;

function toDateTimeInputValue(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 16);
}

function toDateInputValue(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

type FormState = {
  title: string;
  city: string;
  district: string;
  province: string;
  country: string;
  description: string;
  registrationStatus: (typeof REGISTRATION_STATUS_OPTIONS)[number];
  registrationStartsAt: string;
  registrationEndsAt: string;
  eventDate: string;
  eventStartTime: string;
  eventEndTime: string;
  venueName: string;
  venueAddress: string;
  capacity: string;
  status: (typeof MEETUP_STATUS_OPTIONS)[number];
};

function toForm(m?: ApiMeetup): FormState {
  return {
    title:                 m?.title ?? '',
    city:                  m?.city ?? '',
    district:              m?.district ?? '',
    province:              m?.province ?? '',
    country:               m?.country ?? 'Nepal',
    description:           m?.description ?? '',
    registrationStatus:    m?.registrationStatus ?? 'DRAFT',
    registrationStartsAt:  toDateTimeInputValue(m?.registrationStartsAt),
    registrationEndsAt:    toDateTimeInputValue(m?.registrationEndsAt),
    eventDate:             toDateInputValue(m?.eventDate),
    eventStartTime:        m?.eventStartTime ?? '',
    eventEndTime:          m?.eventEndTime ?? '',
    venueName:             m?.venueName ?? '',
    venueAddress:          m?.venueAddress ?? '',
    capacity:              m?.capacity != null ? String(m.capacity) : '',
    status:                m?.status ?? 'UPCOMING',
  };
}

const inputClass = (hasError?: boolean) =>
  `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${hasError ? 'border-red-400' : 'border-gray-200'}`;
const labelClass = 'block text-xs font-semibold text-gray-600 mb-1.5';

export function MeetupFormModal({ meetup, onClose, onSaved }: {
  meetup?: ApiMeetup;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!meetup;
  const [form, setForm] = useState<FormState>(() => toForm(meetup));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  }

  function validate(f: FormState): Record<string, string> {
    const e: Record<string, string> = {};
    if (!f.title.trim() || f.title.trim().length < 3) e['title'] = 'At least 3 characters';
    if (!f.city.trim()) e['city'] = 'Required';
    if (f.capacity !== '' && (isNaN(Number(f.capacity)) || Number(f.capacity) <= 0)) e['capacity'] = 'Must be a positive number';
    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setSaveError('');
    try {
      const payload: Partial<ApiMeetup> & Record<string, unknown> = {
        title:                 form.title.trim(),
        city:                  form.city.trim(),
        district:              form.district.trim() || null,
        province:              form.province.trim() || null,
        country:               form.country.trim() || 'Nepal',
        description:           form.description.trim() || null,
        registrationStatus:    form.registrationStatus,
        registrationStartsAt:  form.registrationStartsAt ? new Date(form.registrationStartsAt).toISOString() : null,
        registrationEndsAt:    form.registrationEndsAt ? new Date(form.registrationEndsAt).toISOString() : null,
        eventDate:             form.eventDate ? new Date(form.eventDate).toISOString() : null,
        eventStartTime:        form.eventStartTime.trim() || null,
        eventEndTime:          form.eventEndTime.trim() || null,
        venueName:             form.venueName.trim() || null,
        venueAddress:          form.venueAddress.trim() || null,
        capacity:              form.capacity ? Number(form.capacity) : null,
        status:                form.status,
      };
      if (isEdit) {
        await api.admin.updateMeetup(meetup.id, payload);
      } else {
        await api.admin.createMeetup(payload);
      }
      onSaved();
    } catch (err) {
      setSaveError((err as Error).message ?? 'Failed to save meetup');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">{isEdit ? 'Edit Meetup' : 'Create Meetup'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">City, dates and venue are all optional except the title and city.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className={labelClass}>Meetup Title <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Kolab Creators Meetup — Itahari"
              className={inputClass(!!errors['title'])} />
            {errors['title'] && <p className="text-xs text-red-500 mt-1">{errors['title']}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>City <span className="text-red-500">*</span></label>
              <input value={form.city} onChange={(e) => update('city', e.target.value)}
                className={inputClass(!!errors['city'])} />
              {errors['city'] && <p className="text-xs text-red-500 mt-1">{errors['city']}</p>}
            </div>
            <div>
              <label className={labelClass}>District</label>
              <input value={form.district} onChange={(e) => update('district', e.target.value)} className={inputClass()} />
            </div>
            <div>
              <label className={labelClass}>Province</label>
              <input value={form.province} onChange={(e) => update('province', e.target.value)} className={inputClass()} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Country</label>
            <input value={form.country} onChange={(e) => update('country', e.target.value)} className={inputClass()} />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Registration Status</label>
              <select value={form.registrationStatus} onChange={(e) => update('registrationStatus', e.target.value as FormState['registrationStatus'])}
                className={`${inputClass()} bg-white`}>
                {REGISTRATION_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Meetup Status</label>
              <select value={form.status} onChange={(e) => update('status', e.target.value as FormState['status'])}
                className={`${inputClass()} bg-white`}>
                {MEETUP_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Registration Start</label>
              <input type="datetime-local" value={form.registrationStartsAt} onChange={(e) => update('registrationStartsAt', e.target.value)} className={inputClass()} />
            </div>
            <div>
              <label className={labelClass}>Registration End</label>
              <input type="datetime-local" value={form.registrationEndsAt} onChange={(e) => update('registrationEndsAt', e.target.value)} className={inputClass()} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Event Date</label>
              <input type="date" value={form.eventDate} onChange={(e) => update('eventDate', e.target.value)} className={inputClass()} />
            </div>
            <div>
              <label className={labelClass}>Start Time</label>
              <input value={form.eventStartTime} onChange={(e) => update('eventStartTime', e.target.value)} placeholder="10:00 AM" className={inputClass()} />
            </div>
            <div>
              <label className={labelClass}>End Time</label>
              <input value={form.eventEndTime} onChange={(e) => update('eventEndTime', e.target.value)} placeholder="1:00 PM" className={inputClass()} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Venue Name</label>
              <input value={form.venueName} onChange={(e) => update('venueName', e.target.value)} className={inputClass()} />
            </div>
            <div>
              <label className={labelClass}>Capacity <span className="text-gray-400 font-normal">(informational only)</span></label>
              <input type="number" min={1} value={form.capacity} onChange={(e) => update('capacity', e.target.value)}
                className={inputClass(!!errors['capacity'])} />
              {errors['capacity'] && <p className="text-xs text-red-500 mt-1">{errors['capacity']}</p>}
            </div>
          </div>

          <div>
            <label className={labelClass}>Venue Address</label>
            <input value={form.venueAddress} onChange={(e) => update('venueAddress', e.target.value)} className={inputClass()} />
          </div>

          {saveError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{saveError}</div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors">Cancel</button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white transition-colors disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Meetup'}
          </button>
        </div>
      </div>
    </div>
  );
}
