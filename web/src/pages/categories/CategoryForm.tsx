import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Category, CategoryStatus, CategoryScope } from '../../context/CategoriesContext';

const BG_COLORS = [
  { hex: '#f3e8ff', label: 'Purple' },
  { hex: '#dbeafe', label: 'Blue' },
  { hex: '#dcfce7', label: 'Green' },
  { hex: '#fce7f3', label: 'Pink' },
  { hex: '#fef9c3', label: 'Yellow' },
  { hex: '#e0f2fe', label: 'Sky' },
  { hex: '#fef3c7', label: 'Amber' },
  { hex: '#ede9fe', label: 'Violet' },
  { hex: '#fee2e2', label: 'Red' },
  { hex: '#d1fae5', label: 'Emerald' },
];

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

interface CategoryFormProps {
  initial?: Category;
  onSubmit: (data: Omit<Category, 'id' | 'createdAt' | 'itemCount'>) => void;
  submitLabel: string;
}

export function CategoryForm({ initial, onSubmit, submitLabel }: CategoryFormProps) {
  const navigate = useNavigate();

  const [icon, setIcon] = useState(initial?.icon ?? '');
  const [iconBg, setIconBg] = useState(initial?.iconBg ?? BG_COLORS[0].hex);
  const [name, setName] = useState(initial?.name ?? '');
  const [key, setKey] = useState(initial?.key ?? '');
  const [status, setStatus] = useState<CategoryStatus>(initial?.status ?? 'active');
  const [scope, setScope] = useState<CategoryScope>(initial?.scope ?? 'both');
  const [keyTouched, setKeyTouched] = useState(!!initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!keyTouched) {
      setKey(slugify(name));
    }
  }, [name, keyTouched]);

  function validate() {
    const e: Record<string, string> = {};
    if (!icon.trim()) e.icon = 'Icon is required.';
    if (!name.trim()) e.name = 'Name is required.';
    if (!key.trim()) e.key = 'Key is required.';
    else if (!/^[a-z0-9-]+$/.test(key)) e.key = 'Key must be lowercase letters, numbers, or hyphens.';
    return e;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    onSubmit({ icon: icon.trim(), iconBg, name: name.trim(), key: key.trim(), status, scope });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main fields */}
        <div className="lg:col-span-2 space-y-5">

          {/* Icon */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Icon & Appearance</h3>

            <div className="flex items-start gap-5">
              {/* Preview */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 select-none"
                style={{ backgroundColor: iconBg }}
              >
                {icon || <span className="text-gray-300 text-base">?</span>}
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Icon <span className="text-gray-400 font-normal">(paste an emoji)</span>
                  </label>
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => { setIcon(e.target.value); setErrors((p) => ({ ...p, icon: '' })); }}
                    placeholder="e.g. 👗"
                    maxLength={4}
                    className={`w-full px-3 py-2 text-lg border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${errors.icon ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                  />
                  {errors.icon && <p className="text-xs text-red-500 mt-1">{errors.icon}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Background color</label>
                  <div className="flex flex-wrap gap-2">
                    {BG_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        title={c.label}
                        onClick={() => setIconBg(c.hex)}
                        className={`w-7 h-7 rounded-lg border-2 transition-all ${iconBg === c.hex ? 'border-indigo-500 scale-110' : 'border-transparent hover:border-gray-300'}`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Name & Key */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">Category Details</h3>

            <div>
              <label htmlFor="cat-name" className="block text-xs font-medium text-gray-600 mb-1.5">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                id="cat-name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
                placeholder="e.g. Fashion"
                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="cat-key" className="block text-xs font-medium text-gray-600 mb-1.5">
                Key <span className="text-red-400">*</span>
                <span className="text-gray-400 font-normal ml-1">— unique identifier used in the API</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-mono select-none">
                  category/
                </span>
                <input
                  id="cat-key"
                  type="text"
                  value={key}
                  onChange={(e) => { setKey(e.target.value.toLowerCase()); setKeyTouched(true); setErrors((p) => ({ ...p, key: '' })); }}
                  placeholder="fashion"
                  className={`w-full pl-[88px] pr-3 py-2.5 text-sm font-mono border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${errors.key ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                />
              </div>
              {errors.key && <p className="text-xs text-red-500 mt-1">{errors.key}</p>}
              {!errors.key && (
                <p className="text-xs text-gray-400 mt-1">Full key: <span className="font-mono">category/{key || '…'}</span></p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: scope + status + actions */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Applies to</h3>
            <p className="text-xs text-gray-400 mb-4">Which onboarding/profile flows show this category.</p>
            <div className="flex flex-col gap-2">
              {(['both', 'creator', 'business'] as CategoryScope[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all ${
                    scope === s ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`text-sm font-medium capitalize ${scope === s ? 'text-gray-900' : 'text-gray-500'}`}>
                    {s === 'both' ? 'Creators & Businesses' : s === 'creator' ? 'Creators only' : 'Businesses only'}
                  </span>
                  {scope === s && (
                    <svg className="ml-auto w-4 h-4 text-indigo-600 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Status</h3>
            <div className="flex flex-col gap-2">
              {(['active', 'inactive'] as CategoryStatus[]).map((s) => (
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
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {submitLabel}
            </button>
            <button
              type="button"
              onClick={() => navigate('/categories')}
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
