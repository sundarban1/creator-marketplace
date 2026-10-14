import { ExternalLink, Link2, Plus, Trash2 } from 'lucide-react';
import { useT, type TFn } from '../i18n';
import { Button } from './Button';
import { TextField } from './TextField';

/*
 * Deliverable links — Google Drive / Dropbox / YouTube share links, the path
 * for content too large to upload directly. Stored on the application as one
 * newline/comma separated string (`deliverableUrls`), same as mobile's
 * activity-timeline upload modal.
 */

export const MAX_DELIVERABLE_LINKS = 10;

export function parseDeliverableLinks(raw?: string | null): string[] {
  if (!raw) return [];
  return raw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
}

// Creators often paste a bare domain ("drive.google.com/…") — treat that as
// https:// rather than rejecting it.
export function normalizeLink(url: string): string {
  const u = url.trim();
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export function isValidLink(url: string): boolean {
  try {
    const u = new URL(normalizeLink(url));
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.');
  } catch {
    return false;
  }
}

function linkLabel(url: string): string {
  try {
    const host = new URL(normalizeLink(url)).hostname.replace(/^www\./, '');
    if (host.endsWith('drive.google.com') || host.endsWith('docs.google.com')) return 'Google Drive';
    if (host.endsWith('dropbox.com') || host === 'db.tt') return 'Dropbox';
    if (host.endsWith('youtube.com') || host === 'youtu.be') return 'YouTube';
    if (host.endsWith('onedrive.live.com') || host === '1drv.ms' || host.endsWith('sharepoint.com')) return 'OneDrive';
    if (host.endsWith('wetransfer.com') || host === 'we.tl') return 'WeTransfer';
    return host;
  } catch {
    return url;
  }
}

/** Read-only (or removable) list of submitted links. */
export function DeliverableLinkList({
  links,
  onRemove,
}: {
  links: string[];
  onRemove?: (url: string) => void;
}) {
  const t = useT();
  if (links.length === 0) return null;
  return (
    <ul className="space-y-2">
      {links.map((url) => (
        <li key={url} className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5">
          <Link2 size={16} className="shrink-0 text-brand" />
          <a
            href={normalizeLink(url)}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 hover:underline"
            title={url}
          >
            <span className="block text-[13px] font-semibold text-ink">{linkLabel(url)}</span>
            <span className="block truncate text-[12px] text-ink-soft">{url}</span>
          </a>
          <a
            href={normalizeLink(url)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('deliv.openLink')}
            className="shrink-0 rounded-lg p-1.5 text-ink-soft hover:bg-surface-dim hover:text-brand"
          >
            <ExternalLink size={15} />
          </a>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(url)}
              aria-label={t('deliv.removeLink')}
              className="shrink-0 rounded-lg p-1.5 text-ink-soft hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 size={15} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Add-a-link input + removable list. `draft` is lifted to the parent so a
 * link typed but not yet "added" still gets picked up on submit.
 */
export function DeliverableLinksEditor({
  links,
  onChange,
  draft,
  onDraftChange,
  error,
  onError,
  disabled,
}: {
  links: string[];
  onChange: (links: string[]) => void;
  draft: string;
  onDraftChange: (v: string) => void;
  error?: string;
  onError: (msg: string) => void;
  disabled?: boolean;
}) {
  const t = useT();

  const add = () => {
    const raw = draft.trim();
    if (!raw) return onError(t('deliv.linkEmpty'));
    const result = tryAddLinks(links, raw, t);
    if (result.error) return onError(result.error);
    onChange(result.links);
    onDraftChange('');
    onError('');
  };

  return (
    <div>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <TextField
            label={t('deliv.linksHeading')}
            hint={error ? undefined : t('deliv.linksHint')}
            error={error}
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="https://drive.google.com/…"
            icon={<Link2 />}
            value={draft}
            disabled={disabled || links.length >= MAX_DELIVERABLE_LINKS}
            onChange={(e) => {
              onDraftChange(e.target.value);
              if (error) onError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-[26px] h-11 shrink-0"
          disabled={disabled || links.length >= MAX_DELIVERABLE_LINKS}
          onClick={add}
        >
          <Plus size={16} />
          {t('deliv.addLink')}
        </Button>
      </div>

      {links.length > 0 && (
        <div className="mt-3">
          <DeliverableLinkList links={links} onRemove={disabled ? undefined : (url) => onChange(links.filter((l) => l !== url))} />
        </div>
      )}
    </div>
  );
}

/**
 * Validate and merge pasted text (one or several links, newline/comma
 * separated) into the current list. Returns a user-facing error on failure.
 */
export function tryAddLinks(
  current: string[],
  raw: string,
  t: TFn,
): { links: string[]; error?: string } {
  const incoming = parseDeliverableLinks(raw);
  const invalid = incoming.find((u) => !isValidLink(u));
  if (invalid) return { links: current, error: t('deliv.linkInvalid', { url: invalid }) };
  const next = [...current];
  for (const u of incoming.map(normalizeLink)) {
    if (next.includes(u)) return { links: current, error: t('deliv.linkDuplicate') };
    next.push(u);
  }
  if (next.length > MAX_DELIVERABLE_LINKS) {
    return { links: current, error: t('deliv.linkLimit', { max: MAX_DELIVERABLE_LINKS }) };
  }
  return { links: next };
}
