import { useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import { cn } from './cn';
import { RICH_TEXT_CLASSES } from './richText';

// html:false escapes any raw HTML, so organizer text can't inject markup.
// breaks:true keeps older plain-text entries (single newlines) looking as they did.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true });
const defaultLinkOpen = md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank');
  tokens[idx].attrSet('rel', 'noopener noreferrer nofollow');
  return defaultLinkOpen(tokens, idx, options, env, self);
};

/** Read-only render of text written with <RichTextEditor> (or legacy plain text). */
export function MarkdownText({ children, className }: { children?: string | null; className?: string }) {
  const html = useMemo(() => (children ? md.render(children) : ''), [children]);
  if (!html) return null;
  return <div className={cn(RICH_TEXT_CLASSES, className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
