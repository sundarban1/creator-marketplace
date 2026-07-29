import { useState, useEffect } from 'react';
import { Save, Info } from 'lucide-react';
import { api } from '../lib/api';
import type { ContractTemplate } from '../lib/api';

// Kept in sync with TOKENS in backend/src/modules/contract/contract.service.ts —
// these are the only {{...}} placeholders the contract renderer substitutes.
const TOKENS = [
  'creatorName', 'businessName', 'campaignTitle', 'effectiveDate', 'acceptanceDate', 'deadline',
  'price', 'deliverables', 'timeline', 'platforms', 'contentGuidelines',
  'approvalRequirements', 'location', 'platformCommission',
];

export function ContractTemplateEditor() {
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [title,    setTitle]    = useState('');
  const [body,     setBody]     = useState('');
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);

  function notify(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    setLoading(true);
    api.contractTemplate.get()
      .then((res) => {
        const t = res.data as ContractTemplate;
        setTemplate(t);
        setTitle(t.title);
        setBody(t.body);
      })
      .catch(() => notify('Failed to load contract template', false))
      .finally(() => setLoading(false));
  }, []);

  const dirty = template != null && (title !== template.title || body !== template.body);

  async function handleSave() {
    if (!title.trim() || !body.trim()) return notify('Title and body are required', false);
    setSaving(true);
    try {
      const updated = await api.contractTemplate.update({ title, body });
      setTemplate(updated.data as ContractTemplate);
      notify('Contract template saved');
    } catch (e: unknown) {
      notify((e as Error).message ?? 'Save failed', false);
    } finally {
      setSaving(false);
    }
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Contract Editor</h1>
          <p className="text-sm text-gray-500 mt-1">
            This is the agreement text the creator and business each see and sign — once when a creator submits a proposal, and again when the business accepts it. Applies to paid campaigns only.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !dirty || loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Save size={16} />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400 text-sm">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Agreement Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Creator Collaboration Agreement"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Agreement Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={24}
                placeholder="Agreement text…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
            </div>
          </div>

          {/* Token legend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit space-y-3">
            <div className="flex items-center gap-2 text-gray-900">
              <Info size={16} />
              <h3 className="font-semibold text-sm">Available Placeholders</h3>
            </div>
            <p className="text-xs text-gray-500">
              Use these anywhere in the body — each is replaced with the actual deal's values when a contract is generated for a specific proposal.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TOKENS.map((tok) => (
                <code
                  key={tok}
                  className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono cursor-pointer hover:bg-indigo-100 transition-colors"
                  onClick={() => navigator.clipboard?.writeText(`{{${tok}}}`)}
                  title="Click to copy"
                >
                  {`{{${tok}}}`}
                </code>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
