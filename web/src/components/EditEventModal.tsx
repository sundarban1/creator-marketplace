import { useEffect, useState, type FormEvent } from 'react';
import { api, type ApiCampaignDetail } from '../lib/api';

const PLATFORM_OPTIONS = ['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Twitter'];
const STATUS_OPTIONS = ['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'CANCELLED'];

function toDateInputValue(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

function parseTags(raw: string): string[] {
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

type FormState = {
  title: string;
  description: string;
  category: string;
  platforms: string[];
  budgetMin: string;
  budgetMax: string;
  deliverables: string;
  deadline: string;
  location: string;
  creatorsNeeded: string;
  status: string;
  isFeatured: boolean;
  eventDate: string;
  venue: string;
  capacity: string;
  benefitsRaw: string;
};

function toForm(c: ApiCampaignDetail): FormState {
  return {
    title:          c.title,
    description:    c.description ?? '',
    category:       c.category ?? '',
    platforms:      c.platforms ?? [],
    budgetMin:      String(c.budgetMin ?? 0),
    budgetMax:      String(c.budgetMax ?? 0),
    deliverables:   c.deliverables ?? '',
    deadline:       toDateInputValue(c.deadline),
    location:       c.location ?? '',
    creatorsNeeded: String(c.creatorsNeeded ?? 1),
    status:         c.status,
    isFeatured:     c.isFeatured,
    eventDate:      toDateInputValue(c.eventDate),
    venue:          c.venue ?? '',
    capacity:       c.capacity != null ? String(c.capacity) : '',
    benefitsRaw:    (c.benefits ?? []).join(', '),
  };
}

export function EditEventModal({ campaignId, onClose, onSaved }: {
  campaignId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [campaign, setCampaign] = useState<ApiCampaignDetail | null>(null);
  const [form, setForm]       = useState<FormState | null>(null);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.admin.campaignDetail(campaignId)
      .then((res) => { if (!cancelled) { setCampaign(res.data); setForm(toForm(res.data)); } })
      .catch((e) => { if (!cancelled) setLoadError((e as Error).message ?? 'Failed to load event'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [campaignId]);

  const isEvent = campaign?.campaignType === 'OPEN_EVENT';

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setErrors((e) => ({ ...e, [key]: '' }));
  }

  function togglePlatform(p: string) {
    if (!form) return;
    const has = form.platforms.includes(p);
    if (has) update('platforms', form.platforms.filter((x) => x !== p));
    else if (form.platforms.length < 3) update('platforms', [...form.platforms, p]);
  }

  function validate(f: FormState): Record<string, string> {
    const e: Record<string, string> = {};
    if (!f.title.trim() || f.title.trim().length < 3) e['title'] = 'At least 3 characters';
    if (!f.deadline) e['deadline'] = 'Required';
    if (f.budgetMin === '' || isNaN(Number(f.budgetMin)) || Number(f.budgetMin) < 0) e['budgetMin'] = 'Invalid amount';
    if (f.budgetMax === '' || isNaN(Number(f.budgetMax)) || Number(f.budgetMax) < Number(f.budgetMin)) e['budgetMax'] = 'Must be ≥ minimum';
    if (isEvent && !f.venue.trim()) e['venue'] = 'Required for events';
    if (isEvent && !f.eventDate) e['eventDate'] = 'Required for events';
    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setSaveError('');
    try {
      const payload: Record<string, unknown> = {
        title:          form.title.trim(),
        description:    form.description.trim(),
        category:       form.category.trim(),
        platforms:      form.platforms,
        budgetMin:      Number(form.budgetMin),
        budgetMax:      Number(form.budgetMax),
        deliverables:   form.deliverables.trim(),
        deadline:       new Date(form.deadline).toISOString(),
        location:       form.location.trim() || null,
        creatorsNeeded: Number(form.creatorsNeeded) || 1,
        status:         form.status,
        isFeatured:     form.isFeatured,
        benefits:       parseTags(form.benefitsRaw),
      };
      if (isEvent) {
        payload['eventDate'] = form.eventDate ? new Date(form.eventDate).toISOString() : undefined;
        payload['venue']     = form.venue.trim();
        payload['capacity']  = form.capacity ? Number(form.capacity) : undefined;
      }
      await api.admin.updateCampaign(campaignId, payload);
      onSaved();
    } catch (err) {
      setSaveError((err as Error).message ?? 'Failed to save changes');
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
            <h2 className="text-base font-bold text-gray-900">Edit Event</h2>
            <p className="text-xs text-gray-400 mt-0.5">Admin edits aren't restricted by the proposal lock a business normally has.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">✕</button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">Loading…</div>
        ) : loadError || !form ? (
          <div className="p-6">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{loadError || 'Event not found.'}</div>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Title <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={(e) => update('title', e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${errors['title'] ? 'border-red-400' : 'border-gray-200'}`} />
                {errors['title'] && <p className="text-xs text-red-500 mt-1">{errors['title']}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
                  <input value={form.category} onChange={(e) => update('category', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => update('status', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white">
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Platforms <span className="text-gray-400 font-normal">(up to 3)</span></label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map((p) => {
                    const selected = form.platforms.includes(p);
                    const disabled = !selected && form.platforms.length >= 3;
                    return (
                      <button type="button" key={p} disabled={disabled} onClick={() => togglePlatform(p)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          selected ? 'bg-indigo-600 border-indigo-600 text-white'
                            : disabled ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                            : 'border-gray-200 text-gray-600 hover:border-indigo-400 hover:text-indigo-600'
                        }`}>
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Deliverables</label>
                <input value={form.deliverables} onChange={(e) => update('deliverables', e.target.value)}
                  placeholder="e.g. 1 Reel, 2 Story"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Budget Min (NPR) <span className="text-red-500">*</span></label>
                  <input type="number" min={0} value={form.budgetMin} onChange={(e) => update('budgetMin', e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${errors['budgetMin'] ? 'border-red-400' : 'border-gray-200'}`} />
                  {errors['budgetMin'] && <p className="text-xs text-red-500 mt-1">{errors['budgetMin']}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Budget Max (NPR) <span className="text-red-500">*</span></label>
                  <input type="number" min={0} value={form.budgetMax} onChange={(e) => update('budgetMax', e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${errors['budgetMax'] ? 'border-red-400' : 'border-gray-200'}`} />
                  {errors['budgetMax'] && <p className="text-xs text-red-500 mt-1">{errors['budgetMax']}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Deadline <span className="text-red-500">*</span></label>
                  <input type="date" value={form.deadline} onChange={(e) => update('deadline', e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${errors['deadline'] ? 'border-red-400' : 'border-gray-200'}`} />
                  {errors['deadline'] && <p className="text-xs text-red-500 mt-1">{errors['deadline']}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Creators Needed</label>
                  <input type="number" min={1} value={form.creatorsNeeded} onChange={(e) => update('creatorsNeeded', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Location</label>
                <input value={form.location} onChange={(e) => update('location', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
              </div>

              {isEvent && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Event Date <span className="text-red-500">*</span></label>
                      <input type="date" value={form.eventDate} onChange={(e) => update('eventDate', e.target.value)}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${errors['eventDate'] ? 'border-red-400' : 'border-gray-200'}`} />
                      {errors['eventDate'] && <p className="text-xs text-red-500 mt-1">{errors['eventDate']}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Capacity</label>
                      <input type="number" min={1} value={form.capacity} onChange={(e) => update('capacity', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Venue <span className="text-red-500">*</span></label>
                    <input value={form.venue} onChange={(e) => update('venue', e.target.value)}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${errors['venue'] ? 'border-red-400' : 'border-gray-200'}`} />
                    {errors['venue'] && <p className="text-xs text-red-500 mt-1">{errors['venue']}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Creator Benefits <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                    <input value={form.benefitsRaw} onChange={(e) => update('benefitsRaw', e.target.value)}
                      placeholder="e.g. Free entry, Meet & greet"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                  </div>
                </>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={() => update('isFeatured', !form.isFeatured)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${form.isFeatured ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isFeatured ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm font-medium text-gray-700">{form.isFeatured ? 'Featured — highlighted to creators' : 'Not featured'}</span>
              </div>

              {saveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{saveError}</div>
              )}
            </form>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors">Cancel</button>
              <button onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
