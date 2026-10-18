import { useEffect, useId, useReducer, type ReactNode } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown, type MarkdownStorage } from 'tiptap-markdown';
import { Bold, Heading2, Italic, List, ListOrdered, Redo2, Undo2 } from 'lucide-react';
import { useOptionalT } from '../i18n';
import { cn } from './cn';
import { RICH_TEXT_CLASSES } from './richText';

// tiptap-markdown ships its Storage shape but doesn't declare the module augmentation.
declare module '@tiptap/core' {
  interface Storage {
    markdown: MarkdownStorage;
  }
}


/**
 * Small WYSIWYG editor that reads and writes Markdown, so the value stays a
 * plain string on the API (and degrades to readable text where it isn't rendered).
 * Only bold / italic / heading / lists — the subset <MarkdownText> renders.
 */
export function RichTextEditor({
  label, ariaLabel, hint, error, value, onChange, maxLength, placeholder, minHeight = 140, labelAccessory, disabled,
}: {
  /** Visible label; omit when the surrounding form already renders one (then pass `ariaLabel`). */
  label?: string;
  ariaLabel?: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (markdown: string) => void;
  maxLength?: number;
  placeholder?: string;
  minHeight?: number;
  labelAccessory?: ReactNode;
  disabled?: boolean;
}) {
  const labelId = useId();
  // Toolbar active states read from the editor, so re-render on every transaction.
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        strike: false, code: false, codeBlock: false, blockquote: false, horizontalRule: false, underline: false, link: false,
        heading: { levels: [3] },
      }),
      Markdown.configure({ html: false, bulletListMarker: '-', linkify: false, breaks: false }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor: e }) => {
      const md = e.storage.markdown.getMarkdown();
      onChange(e.isEmpty ? '' : md);
    },
    onTransaction: rerender,
    editorProps: { attributes: { ...(label ? { 'aria-labelledby': labelId } : { 'aria-label': ariaLabel ?? '' }), 'aria-multiline': 'true', role: 'textbox' } },
  });

  // Follow external resets (e.g. loading a saved draft) without fighting the cursor while typing.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = editor.isEmpty ? '' : editor.storage.markdown.getMarkdown();
    if (current !== value) editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);

  const count = value.length;
  const over = maxLength != null && count > maxLength;

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span id={labelId} className="text-[13px] font-semibold text-ink">{label}</span>
          {labelAccessory}
        </div>
      )}
      <div
        className={cn(
          'overflow-hidden rounded-xl border bg-surface transition-[border-color,box-shadow]',
          'focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/35',
          error || over ? 'border-danger' : 'border-line-strong',
          disabled && 'opacity-60',
        )}
      >
        <Toolbar editor={editor} disabled={disabled} />
        <div className="relative">
          {editor?.isEmpty && placeholder && (
            <p aria-hidden className="pointer-events-none absolute left-3.5 top-2.5 text-[15px] text-ink-soft/60">{placeholder}</p>
          )}
          <EditorContent
            editor={editor}
            style={{ ['--rte-min-h' as string]: `${minHeight}px` }}
            className={cn(
              'px-3.5 py-2.5 text-[15px] leading-relaxed text-ink',
              '[&_.tiptap]:min-h-[var(--rte-min-h)] [&_.tiptap]:outline-none',
              RICH_TEXT_CLASSES,
            )}
          />
        </div>
      </div>
      {(error || hint || maxLength != null) && <div className="mt-1.5 flex items-center justify-between gap-3">
        <p className={cn('text-[13px]', error ? 'font-medium text-danger' : 'text-ink-soft')}>{error || hint}</p>
        {maxLength != null && (
          <span className={cn('text-[12px] tabular-nums', over ? 'font-semibold text-danger' : 'text-ink-soft')}>{count} / {maxLength}</span>
        )}
      </div>}
    </div>
  );
}

function Toolbar({ editor, disabled }: { editor: Editor | null; disabled?: boolean }) {
  const t = useOptionalT();
  if (!editor) return <div className="h-10 border-b border-line bg-surface-dim/60" />;
  const chain = () => editor.chain().focus();
  const items: Array<{ key: string; icon: ReactNode; label: string; active?: boolean; run: () => void; can?: boolean }> = [
    { key: 'bold', icon: <Bold size={15} />, label: t('rte.bold'), active: editor.isActive('bold'), run: () => chain().toggleBold().run() },
    { key: 'italic', icon: <Italic size={15} />, label: t('rte.italic'), active: editor.isActive('italic'), run: () => chain().toggleItalic().run() },
    { key: 'heading', icon: <Heading2 size={15} />, label: t('rte.heading'), active: editor.isActive('heading', { level: 3 }), run: () => chain().toggleHeading({ level: 3 }).run() },
    { key: 'bullet', icon: <List size={15} />, label: t('rte.bulletList'), active: editor.isActive('bulletList'), run: () => chain().toggleBulletList().run() },
    { key: 'ordered', icon: <ListOrdered size={15} />, label: t('rte.numberedList'), active: editor.isActive('orderedList'), run: () => chain().toggleOrderedList().run() },
  ];
  const history = [
    { key: 'undo', icon: <Undo2 size={15} />, label: t('rte.undo'), run: () => chain().undo().run(), can: editor.can().undo() },
    { key: 'redo', icon: <Redo2 size={15} />, label: t('rte.redo'), run: () => chain().redo().run(), can: editor.can().redo() },
  ];
  const btn = (it: (typeof items)[number]) => (
    <button
      key={it.key}
      type="button"
      title={it.label}
      aria-label={it.label}
      aria-pressed={it.active}
      disabled={disabled || it.can === false}
      onMouseDown={(e) => e.preventDefault()}
      onClick={it.run}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-35',
        it.active ? 'bg-violet/12 text-violet-dark' : 'text-ink-soft hover:bg-ink/[0.06] hover:text-ink',
      )}
    >
      {it.icon}
    </button>
  );
  return (
    <div role="toolbar" aria-label={t('rte.toolbar')} className="flex items-center gap-0.5 border-b border-line bg-surface-dim/60 px-1.5 py-1">
      {items.map(btn)}
      <span className="mx-1 h-5 w-px bg-line" aria-hidden />
      {history.map(btn)}
    </div>
  );
}
