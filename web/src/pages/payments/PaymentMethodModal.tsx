import { useState, type FormEvent, type ChangeEvent } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import type { PaymentMethod, PaymentMethodStatus } from '../../context/PaymentMethodsContext';
import { usePaymentMethods } from '../../context/PaymentMethodsContext';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const COLORS = [
  { hex: '#60BB46', label: 'Green' },
  { hex: '#5C2D91', label: 'Purple' },
  { hex: '#003087', label: 'Navy' },
  { hex: '#3B82F6', label: 'Blue' },
  { hex: '#F59E0B', label: 'Amber' },
  { hex: '#DC2626', label: 'Red' },
  { hex: '#0EA5E9', label: 'Sky' },
  { hex: '#6366F1', label: 'Indigo' },
  { hex: '#6B7280', label: 'Gray' },
];

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

interface PaymentMethodModalProps {
  initial?: PaymentMethod;
  onClose: () => void;
}

export function PaymentMethodModal({ initial, onClose }: PaymentMethodModalProps) {
  const { addMethod, updateMethod, uploadIcon } = usePaymentMethods();

  const [name, setName] = useState(initial?.name ?? '');
  const [key, setKey] = useState(initial?.key ?? '');
  const [keyTouched, setKeyTouched] = useState(!!initial);
  const [color, setColor] = useState(initial?.color ?? COLORS[0].hex);
  const [order, setOrder] = useState(initial?.order ?? 0);
  const [status, setStatus] = useState<PaymentMethodStatus>(initial?.status ?? 'active');
  const [iconUrl, setIconUrl] = useState<string | null>(initial?.iconUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleNameChange(val: string) {
    setName(val);
    setErrors((p) => ({ ...p, name: '' }));
    if (!keyTouched) setKey(slugify(val));
  }

  async function handleIconChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrors((p) => ({ ...p, icon: 'Only JPEG, PNG, and WebP images are allowed.' }));
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setErrors((p) => ({ ...p, icon: 'Image must be under 5MB.' }));
      return;
    }

    setErrors((p) => ({ ...p, icon: '' }));
    setUploading(true);
    try {
      const url = await uploadIcon(file);
      setIconUrl(url);
    } catch (err) {
      setErrors((p) => ({ ...p, icon: (err as Error).message ?? 'Failed to upload icon.' }));
    } finally {
      setUploading(false);
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required.';
    if (!key.trim()) e.key = 'Key is required.';
    else if (!/^[a-z0-9-]+$/.test(key)) e.key = 'Key must be lowercase letters, numbers, or hyphens.';
    if (!initial && !iconUrl) e.icon = 'An icon is required for new payment methods.';
    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const data = { key: key.trim(), name: name.trim(), iconUrl, color, order, status };
      if (initial) {
        await updateMethod(initial.id, data);
      } else {
        await addMethod(data);
      }
      onClose();
    } catch (err) {
      setErrors((p) => ({ ...p, form: (err as Error).message ?? 'Failed to save payment method.' }));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{initial ? 'Edit Payment Method' : 'Add Payment Method'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5">
          {errors.form && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{errors.form}</div>
          )}

          {/* Icon */}
          <div className="flex items-center gap-5">
            <div className="relative w-16 h-16 flex-shrink-0">
              {uploading ? (
                <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-gray-100">
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
              ) : iconUrl ? (
                <img src={iconUrl} alt={name || 'Preview'} className="w-16 h-16 rounded-xl object-contain bg-gray-50 border border-gray-200 p-2" />
              ) : (
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-lg font-semibold select-none"
                  style={{ backgroundColor: color }}
                >
                  {name.trim() ? name.trim().charAt(0).toUpperCase() : '?'}
                </div>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors w-fit">
                <ImagePlus size={15} />
                {iconUrl ? 'Replace icon' : 'Upload icon'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleIconChange} disabled={uploading} />
              </label>
              <p className="text-xs text-gray-400 mt-1.5">JPEG, PNG, or WebP, up to 5MB.</p>
              {errors.icon && <p className="text-xs text-red-500 mt-1">{errors.icon}</p>}
            </div>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="pm-name" className="block text-xs font-medium text-gray-600 mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              id="pm-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. eSewa"
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Key */}
          <div>
            <label htmlFor="pm-key" className="block text-xs font-medium text-gray-600 mb-1.5">
              Key <span className="text-red-400">*</span>
              <span className="text-gray-400 font-normal ml-1">— unique identifier used in the API and app</span>
            </label>
            <input
              id="pm-key"
              type="text"
              value={key}
              onChange={(e) => { setKey(e.target.value.toLowerCase()); setKeyTouched(true); setErrors((p) => ({ ...p, key: '' })); }}
              placeholder="esewa"
              className={`w-full px-3 py-2.5 text-sm font-mono border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${errors.key ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
            />
            {errors.key && <p className="text-xs text-red-500 mt-1">{errors.key}</p>}
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Brand color</label>
            <div className="flex flex-wrap items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.label}
                  onClick={() => setColor(c.hex)}
                  className={`w-7 h-7 rounded-lg border-2 transition-all ${color === c.hex ? 'border-indigo-500 scale-110' : 'border-transparent hover:border-gray-300'}`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                title="Custom color"
                className="w-7 h-7 rounded-lg border-2 border-gray-300 cursor-pointer p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-[5px] [&::-webkit-color-swatch]:border-none"
              />
            </div>
          </div>

          {/* Order + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pm-order" className="block text-xs font-medium text-gray-600 mb-1.5">Display order</label>
              <input
                id="pm-order"
                type="number"
                min={0}
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {(['active', 'inactive'] as PaymentMethodStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                      status === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-3">Only active methods are shown to creators and businesses in the app.</p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Method'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
