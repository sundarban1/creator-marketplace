import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { api } from '../lib/api';
import type { HelpArticle } from '../lib/api';

const CATEGORIES = ['General', 'Campaigns', 'Payments', 'Account', 'Content', 'Other'];
const EMPTY_FORM = { question: '', answer: '', category: 'General', order: 0, published: true };

function DeleteModal({ question, onConfirm, onCancel }: { question: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-red-600" />
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center">Delete FAQ?</h3>
        <p className="text-sm text-gray-500 text-center mt-2 line-clamp-2">
          "<span className="font-medium text-gray-700">{question}</span>" will be permanently deleted.
        </p>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-semibold text-white transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

function FaqModal({ initial, onSave, onClose, saving }: { initial: Partial<HelpArticle> | null; onSave: (data: typeof EMPTY_FORM) => Promise<void>; onClose: () => void; saving: boolean }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!form.question.trim() || form.question.trim().length < 5) e['question'] = 'At least 5 characters';
    if (!form.answer.trim() || form.answer.trim().length < 10)   e['answer']   = 'At least 10 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSave({ ...form, question: form.question.trim(), answer: form.answer.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{initial?.id ? 'Edit FAQ' : 'New FAQ'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Question <span className="text-red-500">*</span></label>
            <input value={form.question} onChange={(e) => { setForm((f) => ({ ...f, question: e.target.value })); setErrors((err) => ({ ...err, question: '' })); }}
              placeholder="e.g. Is CreatorMarket free to use?"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${errors['question'] ? 'border-red-400' : 'border-gray-200'}`} />
            {errors['question'] && <p className="text-xs text-red-500 mt-1">{errors['question']}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Answer <span className="text-red-500">*</span></label>
            <textarea value={form.answer} onChange={(e) => { setForm((f) => ({ ...f, answer: e.target.value })); setErrors((err) => ({ ...err, answer: '' })); }}
              placeholder="Write a clear, concise answer…" rows={5}
              className={`w-full px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${errors['answer'] ? 'border-red-400' : 'border-gray-200'}`} />
            {errors['answer'] && <p className="text-xs text-red-500 mt-1">{errors['answer']}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Display Order</label>
              <input type="number" min={0} value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={() => setForm((f) => ({ ...f, published: !f.published }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${form.published ? 'bg-indigo-600' : 'bg-gray-200'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.published ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm font-medium text-gray-700">{form.published ? 'Published — visible in mobile app' : 'Draft — hidden from mobile app'}</span>
          </div>
        </form>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors">Cancel</button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white transition-colors disabled:opacity-60">
            {saving ? 'Saving…' : (initial?.id ? 'Save Changes' : 'Create FAQ')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FAQManager() {
  const [faqs, setFaqs]           = useState<HelpArticle[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [editTarget, setEditTarget]   = useState<Partial<HelpArticle> | null>(null);
  const [showModal, setShowModal]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HelpArticle | null>(null);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState('');

  async function load() {
    setLoading(true);
    try { const res = await api.faq.listAll(); setFaqs(res.data); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800); }

  async function handleSave(form: typeof EMPTY_FORM) {
    setSaving(true);
    try {
      if (editTarget?.id) { await api.faq.update(editTarget.id, form); showToast('FAQ updated'); }
      else { await api.faq.create(form); showToast('FAQ created'); }
      setShowModal(false); setEditTarget(null); await load();
    } catch (err) { showToast((err as Error).message ?? 'Something went wrong'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try { await api.faq.delete(id); setFaqs((prev) => prev.filter((a) => a.id !== id)); showToast('FAQ deleted'); }
    catch { showToast('Failed to delete'); }
    finally { setDeleteTarget(null); }
  }

  async function togglePublish(faq: HelpArticle) {
    const next = !faq.published;
    setFaqs((prev) => prev.map((a) => a.id === faq.id ? { ...a, published: next } : a));
    try { await api.faq.togglePublish(faq.id, next); showToast(next ? 'FAQ published' : 'FAQ unpublished'); }
    catch { setFaqs((prev) => prev.map((a) => a.id === faq.id ? { ...a, published: faq.published } : a)); showToast('Failed to update'); }
  }

  const categories = ['All', ...CATEGORIES];
  const filtered = faqs.filter((a) => {
    const matchSearch = !search || a.question.toLowerCase().includes(search.toLowerCase()) || a.answer.toLowerCase().includes(search.toLowerCase());
    const matchCat    = filterCat === 'All' || a.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div>
      <PageHeader title="FAQ Manager" subtitle={`${faqs.length} FAQs · ${faqs.filter((f) => f.published).length} published`}
        action={<button onClick={() => { setEditTarget(null); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"><Plus size={16} />New FAQ</button>} />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search FAQs…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterCat === c ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-400 hover:text-indigo-600'}`}>{c}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-sm font-medium text-gray-700">{faqs.length === 0 ? 'No FAQs yet' : 'No matches found'}</p>
              <p className="text-xs text-gray-400 mt-1">{faqs.length === 0 ? 'Click "New FAQ" to create your first FAQ.' : 'Try a different search or category.'}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Question</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((faq) => (
                  <tr key={faq.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 line-clamp-1">{faq.question}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{faq.answer}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-700">{faq.category}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs font-mono">#{faq.order}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => togglePublish(faq)}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold transition-colors ${faq.published ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {faq.published ? <><Eye size={11} /> Published</> : <><EyeOff size={11} /> Draft</>}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditTarget(faq); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteTarget(faq)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {showModal && <FaqModal initial={editTarget} onSave={handleSave} onClose={() => { setShowModal(false); setEditTarget(null); }} saving={saving} />}
      {deleteTarget && <DeleteModal question={deleteTarget.question} onConfirm={() => handleDelete(deleteTarget.id)} onCancel={() => setDeleteTarget(null)} />}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">{toast}</div>}
    </div>
  );
}
