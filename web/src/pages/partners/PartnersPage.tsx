import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { ImagePlus, Loader2, Pencil, Plus, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react';
import { api, type ApiPartner, type PartnerInput } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { confirmImageUpload } from '../../app/ui/uploadPreview';
import { FieldError, FormErrorBanner } from '../../app/ui/FieldError';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Admin → Partners: brand/business logos for the landing page marquee under
 * the hero. Only active partners are public; with none active the marquee
 * falls back to real creators.
 */
export function PartnersPage() {
  const [partners, setPartners] = useState<ApiPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ApiPartner | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiPartner | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await api.admin.partners();
      setPartners(res.data);
      setError(null);
    } catch (err) {
      setError((err as Error).message || 'Failed to load partners.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.admin.partners()
      .then((res) => { if (!cancelled) setPartners(res.data); })
      .catch((err: Error) => { if (!cancelled) setError(err.message || 'Failed to load partners.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function toggleStatus(p: ApiPartner) {
    await api.admin.setPartnerStatus(p.id, p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
    await refetch();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await api.admin.deletePartner(deleteTarget.id);
    setDeleteTarget(null);
    await refetch();
  }

  const activeCount = partners.filter((p) => p.status === 'ACTIVE').length;

  return (
    <div>
      <PageHeader
        title="Partners"
        subtitle={`${partners.length} total · ${activeCount} active — active logos scroll under the landing page hero`}
        action={
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            Add Partner
          </button>
        }
      />

      {error && <FormErrorBanner message={error} className="mb-4" />}

      <div className="bg-white rounded-2xl border border-gray-200 adm-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Logo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Website</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Order</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">Loading…</td></tr>
            )}
            {!loading && partners.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">No partners yet. The landing page shows creators until one is added.</td></tr>
            )}
            {!loading && partners.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex h-10 w-24 items-center justify-center rounded-lg bg-gray-50 p-1.5">
                    <img src={p.logoUrl} alt={p.name} className="max-h-full max-w-full object-contain" />
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-500 max-w-xs truncate">
                  {p.websiteUrl ? <a href={p.websiteUrl} target="_blank" rel="noreferrer" className="hover:text-indigo-600">{p.websiteUrl}</a> : '—'}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-gray-500">{p.order}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status === 'ACTIVE' ? 'active' : 'inactive'} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => toggleStatus(p)}
                      title={p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      className={`p-1.5 rounded-lg transition-colors ${p.status === 'ACTIVE' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                    >
                      {p.status === 'ACTIVE' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button onClick={() => setEditing(p)} title="Edit" className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-colors">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setDeleteTarget(p)} title="Delete" className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <PartnerFormModal
          initial={editing === 'new' ? undefined : editing}
          nextOrder={partners.length}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await refetch(); }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center">Delete partner?</h3>
            <p className="text-sm text-gray-500 text-center mt-2">
              <span className="font-medium text-gray-700">"{deleteTarget.name}"</span> will be removed from the landing page permanently.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-semibold text-white transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PartnerFormModal({
  initial,
  nextOrder,
  onClose,
  onSaved,
}: {
  initial?: ApiPartner;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [logoUrl, setLogoUrl] = useState<string | null>(initial?.logoUrl ?? null);
  const [websiteUrl, setWebsiteUrl] = useState(initial?.websiteUrl ?? '');
  const [order, setOrder] = useState(initial?.order ?? nextOrder);
  const [active, setActive] = useState((initial?.status ?? 'ACTIVE') === 'ACTIVE');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrors((p) => ({ ...p, logo: 'Only PNG, WebP or JPEG images are allowed.' }));
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setErrors((p) => ({ ...p, logo: 'Image must be under 5MB.' }));
      return;
    }
    setErrors((p) => ({ ...p, logo: '' }));
    if (!(await confirmImageUpload(file))) return;
    setUploading(true);
    try {
      const res = await api.admin.uploadPartnerLogo(file);
      setLogoUrl(res.data.logoUrl);
    } catch (err) {
      setErrors((p) => ({ ...p, logo: (err as Error).message || 'Failed to upload logo.' }));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Name is required.';
    if (!logoUrl) next.logo = 'Upload a logo.';
    const site = websiteUrl.trim();
    if (site && !/^https?:\/\/\S+\.\S+/.test(site)) next.website = 'Enter a full URL, e.g. https://example.com';
    if (Object.keys(next).length) { setErrors(next); return; }

    const data: PartnerInput = {
      name: name.trim(),
      logoUrl: logoUrl!,
      websiteUrl: site || null,
      order,
      status: active ? 'ACTIVE' : 'INACTIVE',
    };
    setSaving(true);
    try {
      if (initial) await api.admin.updatePartner(initial.id, data);
      else await api.admin.createPartner(data);
      await onSaved();
    } catch (err) {
      setErrors({ form: (err as Error).message || 'Failed to save partner.' });
      setSaving(false);
    }
  }

  const inputClass = (err?: string) =>
    `w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${err ? 'border-danger' : 'border-gray-200'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={handleSubmit} noValidate className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">{initial ? 'Edit partner' : 'Add partner'}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Close"><X size={18} /></button>
        </div>

        <div>
          <span className="block text-xs font-medium text-gray-600 mb-1.5">Logo <span className="text-red-400">*</span></span>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-32 flex-shrink-0 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 p-2">
              {uploading ? <Loader2 size={20} className="animate-spin text-gray-400" />
                : logoUrl ? <img src={logoUrl} alt={name || 'Logo preview'} className="max-h-full max-w-full object-contain" />
                : <ImagePlus size={20} className="text-gray-300" />}
            </div>
            <div>
              <label className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors w-fit">
                <ImagePlus size={15} />
                {logoUrl ? 'Replace logo' : 'Upload logo'}
                <input type="file" accept="image/png,image/webp,image/jpeg" className="hidden" onChange={handleLogoChange} disabled={uploading} />
              </label>
              <p className="text-xs text-gray-400 mt-1.5">Use a transparent PNG in a light colour — it sits directly on the dark landing background. Up to 5MB.</p>
            </div>
          </div>
          {errors.logo && <FieldError message={errors.logo} />}
        </div>

        <div>
          <label htmlFor="partner-name" className="block text-xs font-medium text-gray-600 mb-1.5">Name <span className="text-red-400">*</span></label>
          <input id="partner-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Himalayan Coffee Co." className={inputClass(errors.name)} />
          {errors.name && <FieldError message={errors.name} />}
        </div>

        <div>
          <label htmlFor="partner-site" className="block text-xs font-medium text-gray-600 mb-1.5">Website <span className="text-gray-400 font-normal">— optional</span></label>
          <input id="partner-site" type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://" className={inputClass(errors.website)} />
          {errors.website && <FieldError message={errors.website} />}
        </div>

        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label htmlFor="partner-order" className="block text-xs font-medium text-gray-600 mb-1.5">Display order</label>
            <input id="partner-order" type="number" min={0} value={order} onChange={(e) => setOrder(parseInt(e.target.value) || 0)} className={inputClass()} />
          </div>
          <label className="flex items-center gap-2 pb-2.5 text-sm text-gray-700">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
            Active
          </label>
        </div>

        {errors.form && <FormErrorBanner message={errors.form} />}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors">Cancel</button>
          <button type="submit" disabled={uploading || saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm font-semibold text-white transition-colors">
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add partner'}
          </button>
        </div>
      </form>
    </div>
  );
}
