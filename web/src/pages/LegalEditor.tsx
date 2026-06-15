import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Save, X } from 'lucide-react';
import { api, LegalSection } from '../lib/api';

type DocType = 'PRIVACY_POLICY' | 'TERMS' | 'GUIDELINES';

const TABS: { type: DocType; label: string }[] = [
  { type: 'PRIVACY_POLICY', label: 'Privacy Policy' },
  { type: 'TERMS',          label: 'Terms & Conditions' },
  { type: 'GUIDELINES',     label: 'Community Guidelines' },
];

const EMPTY_FORM = { title: '', body: '', icon: '', order: 0, published: true };

type FormState = typeof EMPTY_FORM;

export function LegalEditor() {
  const [activeTab, setActiveTab] = useState<DocType>('PRIVACY_POLICY');
  const [sections,  setSections]  = useState<LegalSection[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState<LegalSection | null>(null);
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<LegalSection | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  function notify(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function load(type: DocType) {
    setLoading(true);
    try {
      const res = await api.legal.listAll(type);
      setSections((res.data as LegalSection[]).filter((s) => s.type === type));
    } catch { notify('Failed to load sections', false); }
    finally   { setLoading(false); }
  }

  useEffect(() => { void load(activeTab); }, [activeTab]);

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(s: LegalSection) {
    setEditTarget(s);
    setForm({ title: s.title, body: s.body, icon: s.icon ?? '', order: s.order, published: s.published });
    setShowModal(true);
  }

  function closeModal() { setShowModal(false); setEditTarget(null); }

  async function handleSave() {
    if (!form.title.trim() || !form.body.trim()) return notify('Title and body are required', false);
    setSaving(true);
    try {
      if (editTarget) {
        const updated = await api.legal.update(editTarget.id, {
          title: form.title, body: form.body,
          icon: form.icon || null, order: form.order, published: form.published,
        });
        setSections((prev) => prev.map((s) => s.id === editTarget.id ? updated.data as LegalSection : s));
        notify('Section updated');
      } else {
        const created = await api.legal.create({
          type: activeTab, title: form.title, body: form.body,
          icon: form.icon || null, order: form.order, published: form.published,
        });
        setSections((prev) => [...prev, created.data as LegalSection].sort((a, b) => a.order - b.order));
        notify('Section created');
      }
      closeModal();
    } catch (e: unknown) {
      notify((e as Error).message ?? 'Save failed', false);
    } finally { setSaving(false); }
  }

  async function handleTogglePublish(s: LegalSection) {
    try {
      const updated = await api.legal.togglePublish(s.id, !s.published);
      setSections((prev) => prev.map((x) => x.id === s.id ? updated.data as LegalSection : x));
    } catch { notify('Toggle failed', false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.legal.delete(deleteTarget.id);
      setSections((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
      notify('Section deleted');
    } catch { notify('Delete failed', false); }
    finally { setDeleting(false); }
  }

  const tabSections = sections.filter((s) => s.type === activeTab);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Legal Editor</h1>
          <p className="text-sm text-gray-500 mt-1">Manage Privacy Policy, Terms & Conditions, and Community Guidelines</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Section
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.type}
            onClick={() => setActiveTab(tab.type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.type
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sections list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : tabSections.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 font-medium">No sections yet</p>
            <p className="text-gray-400 text-sm mt-1">Click "Add Section" to create the first one.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tabSections.map((s) => (
              <div key={s.id} className="flex items-start gap-4 p-5 hover:bg-gray-50 group">
                {s.icon && <span className="text-2xl mt-0.5 flex-shrink-0">{s.icon}</span>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 text-sm">{s.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.published ? 'Published' : 'Draft'}
                    </span>
                    <span className="text-xs text-gray-400">Order: {s.order}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{s.body}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => handleTogglePublish(s)}
                    title={s.published ? 'Unpublish' : 'Publish'}
                    className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    {s.published ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(s)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">{editTarget ? 'Edit Section' : 'Add Section'}</h2>
              <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Type display (readonly on create, fixed) */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Document Type</label>
                <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                  {TABS.find((t) => t.type === activeTab)?.label}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. 1. Information We Collect"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Body <span className="text-red-500">*</span></label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  rows={6}
                  placeholder="Section content…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Icon (optional emoji) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Icon (emoji, optional)</label>
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                    placeholder="e.g. ✅"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Order */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Display Order</label>
                  <input
                    type="number"
                    min={0}
                    value={form.order}
                    onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Published toggle */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                </label>
                <span className="text-sm text-gray-700">Published (visible in mobile app)</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
              >
                <Save size={15} />
                {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Create Section'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Section?</h3>
            <p className="text-sm text-gray-500 mb-6">
              "<span className="font-medium text-gray-700">{deleteTarget.title}</span>" will be permanently deleted.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
