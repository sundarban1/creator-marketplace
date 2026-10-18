// Shared by <RichTextEditor> and <MarkdownText>.

/** Typography shared by the editor surface and read-only <MarkdownText>. */
export const RICH_TEXT_CLASSES = [
  '[&_p]:my-0 [&_p+p]:mt-2',
  '[&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-ink first:[&_h3]:mt-0',
  '[&_strong]:font-semibold [&_strong]:text-ink [&_em]:italic',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_li>p]:my-0',
  '[&_a]:font-medium [&_a]:text-violet-dark [&_a]:underline [&_a]:underline-offset-2',
].join(' ');

/** Markdown → one line of plain text, for summaries and clamped previews. */
export function markdownToPlain(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, '')
    .replace(/(\*\*|__|\*|_)(.+?)\1/g, '$2')
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1')
    .replace(/\s*\n+\s*/g, ' ')
    .trim();
}
