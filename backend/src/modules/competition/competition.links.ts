import { logger } from '../../config/logger';

// External video links for competition submissions — the "too big to upload"
// path, same idea as deliverable links (web/src/app/ui/DeliverableLinks.tsx)
// but restricted to video hosts a reviewer can actually open.

const PROVIDERS: Array<{ name: string; hosts: string[] }> = [
  { name: 'Google Drive', hosts: ['drive.google.com'] },
  { name: 'YouTube', hosts: ['youtube.com', 'm.youtube.com', 'youtu.be'] },
  { name: 'Vimeo', hosts: ['vimeo.com', 'player.vimeo.com'] },
  { name: 'Dropbox', hosts: ['dropbox.com'] },
  { name: 'OneDrive', hosts: ['onedrive.live.com', '1drv.ms', 'sharepoint.com'] },
  { name: 'TikTok', hosts: ['tiktok.com', 'vm.tiktok.com'] },
  { name: 'Instagram', hosts: ['instagram.com'] },
  { name: 'Facebook', hosts: ['facebook.com', 'fb.watch'] },
];

export const SUPPORTED_LINK_PROVIDERS = PROVIDERS.map((p) => p.name);

export type LinkCheck =
  | { ok: true; url: string; provider: string }
  | { ok: false; message: string };

function providerFor(host: string): string | null {
  const h = host.toLowerCase().replace(/^www\./, '');
  for (const p of PROVIDERS) {
    if (p.hosts.some((ph) => h === ph || h.endsWith(`.${ph}`))) return p.name;
  }
  return null;
}

// Drive share links: /file/d/{id}/view, /open?id={id}, /uc?id={id}. A folder
// link is rejected — reviewers need the video itself.
function isDriveFileLink(u: URL): boolean {
  if (/^\/file\/d\/[\w-]{10,}/.test(u.pathname)) return true;
  if ((u.pathname === '/open' || u.pathname === '/uc') && /^[\w-]{10,}$/.test(u.searchParams.get('id') ?? '')) return true;
  return false;
}

/** Syntax + provider validation. Normalises a bare "drive.google.com/…" to https. */
export function validateSubmissionLink(raw: string): LinkCheck {
  const trimmed = raw.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return { ok: false, message: 'That doesn’t look like a valid link' };
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false, message: 'Only web links (https://) are supported' };
  const provider = providerFor(u.hostname);
  if (!provider) {
    return { ok: false, message: `Links from ${u.hostname} aren’t supported. Use ${SUPPORTED_LINK_PROVIDERS.join(', ')}.` };
  }
  if (provider === 'Google Drive') {
    if (u.pathname.startsWith('/drive/folders')) return { ok: false, message: 'Share a link to the video file, not a Drive folder' };
    if (!isDriveFileLink(u)) return { ok: false, message: 'Use the Google Drive “Share → Copy link” link to the video file' };
  }
  u.protocol = 'https:';
  return { ok: true, url: u.toString(), provider };
}

export type Accessibility = 'ACCESSIBLE' | 'RESTRICTED' | 'UNKNOWN';

/**
 * Best-effort public-access check for Google Drive links only. A file that
 * isn't shared as "Anyone with the link" redirects to accounts.google.com.
 * Anything inconclusive (timeouts, other hosts, Google changing behaviour)
 * returns UNKNOWN and the submission is accepted — the UI still tells the
 * creator to share the file publicly. Only Drive hosts are ever fetched, so
 * this can't be pointed at arbitrary/internal addresses.
 */
export async function checkLinkAccessibility(url: string, provider: string): Promise<Accessibility> {
  if (provider !== 'Google Drive') return 'UNKNOWN';
  const u = new URL(url);
  if (u.hostname !== 'drive.google.com') return 'UNKNOWN';
  try {
    const res = await fetch(u.toString(), { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(4000) });
    const loc = res.headers.get('location') ?? '';
    if (res.status >= 300 && res.status < 400 && /accounts\.google\.com|ServiceLogin/i.test(loc)) return 'RESTRICTED';
    if (res.status === 401 || res.status === 403) return 'RESTRICTED';
    if (res.status === 200) return 'ACCESSIBLE';
    return 'UNKNOWN';
  } catch (err) {
    logger.debug({ err: err instanceof Error ? err.message : err }, 'competition: drive accessibility check inconclusive');
    return 'UNKNOWN';
  }
}
