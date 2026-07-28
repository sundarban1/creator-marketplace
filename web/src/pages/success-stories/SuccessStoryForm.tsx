import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import type { SuccessStory, SuccessStoryStatus } from '../../context/SuccessStoriesContext';
import { useSuccessStories } from '../../context/SuccessStoriesContext';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

interface SuccessStoryFormProps {
  initial?: SuccessStory;
  onSubmit: (data: Omit<SuccessStory, 'id' | 'createdAt'>) => void;
  submitLabel: string;
}

export function SuccessStoryForm({ initial, onSubmit, submitLabel }: SuccessStoryFormProps) {
  const navigate = useNavigate();
  const { uploadPhoto } = useSuccessStories();

  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [quote, setQuote] = useState(initial?.quote ?? '');
  const [order, setOrder] = useState(initial?.order ?? 0);
  const [status, setStatus] = useState<SuccessStoryStatus>(initial?.status ?? 'active');
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial?.photoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required.';
    if (!role.trim()) e.role = 'Role is required.';
    if (!quote.trim()) e.quote = 'Quote is required.';
    return e;
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrors((p) => ({ ...p, photo: 'Only JPEG, PNG, and WebP images are allowed.' }));
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setErrors((p) => ({ ...p, photo: 'Image must be under 5MB.' }));
      return;
    }

    setErrors((p) => ({ ...p, photo: '' }));
    setUploading(true);
    try {
      const url = await uploadPhoto(file);
      setPhotoUrl(url);
    } catch (err) {
      setErrors((p) => ({ ...p, photo: (err as Error).message ?? 'Failed to upload photo.' }));
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors((p) => ({ ...p, ...e2 })); return; }
    onSubmit({ name: name.trim(), role: role.trim(), quote: quote.trim(), photoUrl, order, status });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main fields */}
        <div className="lg:col-span-2 space-y-5">

          {/* Photo */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Photo</h3>
            <div className="flex items-center gap-5">
              <div className="relative w-16 h-16 flex-shrink-0">
                {uploading ? (
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gray-100">
                    <Loader2 size={20} className="animate-spin text-gray-400" />
                  </div>
                ) : photoUrl ? (
                  <img src={photoUrl} alt={name || 'Preview'} className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-lg font-semibold select-none">
                    {name.trim() ? initials(name) : '?'}
                  </div>
                )}
                {photoUrl && !uploading && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl(null)}
                    title="Remove photo"
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-red-600 hover:border-red-200 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors w-fit">
                  <ImagePlus size={15} />
                  {photoUrl ? 'Replace photo' : 'Upload photo'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} disabled={uploading} />
                </label>
                <p className="text-xs text-gray-400 mt-1.5">Optional — falls back to initials if left blank. JPEG, PNG, or WebP, up to 5MB.</p>
                {errors.photo && <p className="text-xs text-red-500 mt-1">{errors.photo}</p>}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">Story Details</h3>

            <div>
              <label htmlFor="story-name" className="block text-xs font-medium text-gray-600 mb-1.5">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                id="story-name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
                placeholder="e.g. Sarah Karki"
                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="story-role" className="block text-xs font-medium text-gray-600 mb-1.5">
                Role <span className="text-red-400">*</span>
                <span className="text-gray-400 font-normal ml-1">— e.g. job title or business name</span>
              </label>
              <input
                id="story-role"
                type="text"
                value={role}
                onChange={(e) => { setRole(e.target.value); setErrors((p) => ({ ...p, role: '' })); }}
                placeholder="e.g. Content Creator"
                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${errors.role ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
              />
              {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role}</p>}
            </div>

            <div>
              <label htmlFor="story-quote" className="block text-xs font-medium text-gray-600 mb-1.5">
                Quote <span className="text-red-400">*</span>
              </label>
              <textarea
                id="story-quote"
                value={quote}
                onChange={(e) => { setQuote(e.target.value); setErrors((p) => ({ ...p, quote: '' })); }}
                placeholder="What did they say about their experience?"
                rows={4}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none ${errors.quote ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
              />
              {errors.quote && <p className="text-xs text-red-500 mt-1">{errors.quote}</p>}
            </div>

            <div>
              <label htmlFor="story-order" className="block text-xs font-medium text-gray-600 mb-1.5">Display Order</label>
              <input
                id="story-order"
                type="number"
                min={0}
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <p className="text-xs text-gray-400 mt-1">Lower numbers show first on the landing page.</p>
            </div>
          </div>
        </div>

        {/* Sidebar: status + actions */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Status</h3>
            <div className="flex flex-col gap-2">
              {(['active', 'inactive'] as SuccessStoryStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all ${
                    status === s
                      ? s === 'active'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-400 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${s === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  <span className={`text-sm font-medium capitalize ${status === s ? 'text-gray-900' : 'text-gray-500'}`}>{s}</span>
                  {status === s && (
                    <svg className="ml-auto w-4 h-4 text-indigo-600" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">Only active stories appear on the public landing page.</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <button
              type="submit"
              disabled={uploading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {submitLabel}
            </button>
            <button
              type="button"
              onClick={() => navigate('/success-stories')}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
