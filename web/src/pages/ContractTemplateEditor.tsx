import { useState, useEffect } from 'react';
import { Save, Info, Bold, Heading1, Heading2, List, Minus, Undo2, Redo2 } from 'lucide-react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown, type MarkdownStorage } from 'tiptap-markdown';
import { api } from '../lib/api';
import type { ContractTemplate } from '../lib/api';

// tiptap-markdown ships its Storage shape but doesn't declare the module
// augmentation itself — without this, `editor.storage.markdown` isn't typed.
declare module '@tiptap/core' {
  interface Storage {
    markdown: MarkdownStorage;
  }
}

// Editable subset kept intentionally narrow: it must stay inside the
// lightweight Markdown ("## " headers, "**bold**", "* "/"- " bullets, "---")
// that both the mobile app's ContractModal and the backend's PDF renderer
// hand-parse (contract.service.ts renderMarkdownBody) — neither understands
// arbitrary HTML, so the toolbar only exposes constructs both already support.
function ToolbarButton({ onClick, active, disabled, label, children }: {
  onClick: () => void; active?: boolean; disabled?: boolean; label: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  return (
    <div className="flex items-center gap-1 border border-b-0 border-gray-200 rounded-t-lg bg-gray-50 px-2 py-1.5">
      <ToolbarButton label="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 size={16} />
      </ToolbarButton>
      <ToolbarButton label="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={16} />
      </ToolbarButton>
      <ToolbarButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton label="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus size={16} />
      </ToolbarButton>
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <ToolbarButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 size={16} />
      </ToolbarButton>
      <ToolbarButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 size={16} />
      </ToolbarButton>
    </div>
  );
}

// Kept in sync with TOKENS in backend/src/modules/contract/contract.service.ts —
// these are the only {{...}} placeholders the contract renderer substitutes.
const TOKENS = [
  'creatorName', 'businessName', 'campaignTitle', 'effectiveDate', 'acceptanceDate', 'deadline',
  'price', 'deliverables', 'timeline', 'platforms', 'contentGuidelines',
  'approvalRequirements', 'location', 'platformCommission', 'role', 'deliveryFormat',
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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disabled: no equivalent in the mobile/PDF markdown-subset parsers,
        // so allowing them would let content silently fail to round-trip.
        italic: false, strike: false, code: false, codeBlock: false, blockquote: false, orderedList: false,
        heading: { levels: [1, 2] },
      }),
      Markdown.configure({
        html: false,            // never emit raw HTML — keep output inside the supported subset
        bulletListMarker: '*',  // matches DEFAULT_TEMPLATE's existing bullet style
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => setBody(editor.storage.markdown.getMarkdown()),
  });

  useEffect(() => {
    setLoading(true);
    api.contractTemplate.get()
      .then((res) => {
        const t = res.data as ContractTemplate;
        setTemplate(t);
        setTitle(t.title);
        setBody(t.body);
        editor?.commands.setContent(t.body);
      })
      .catch(() => notify('Failed to load contract template', false))
      .finally(() => setLoading(false));
  }, [editor]);

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
              <EditorToolbar editor={editor} />
              <EditorContent
                editor={editor}
                className={[
                  'w-full border border-gray-200 rounded-b-lg px-3 py-2.5 text-sm leading-relaxed',
                  'focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500',
                  '[&_.tiptap]:min-h-[480px] [&_.tiptap]:outline-none',
                  '[&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1',
                  '[&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1',
                  '[&_strong]:font-semibold',
                  '[&_ul]:list-disc [&_ul]:pl-5 [&_p]:mb-1',
                  '[&_hr]:my-3 [&_hr]:border-gray-200',
                ].join(' ')}
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
              Click to insert at your cursor — each is replaced with the actual deal's values when a contract is generated for a specific proposal.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TOKENS.map((tok) => (
                <code
                  key={tok}
                  className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono cursor-pointer hover:bg-indigo-100 transition-colors"
                  onClick={() => editor?.chain().focus().insertContent(`{{${tok}}}`).run()}
                  title="Click to insert"
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
