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

/**
 * Light syntax + provider check only. Any link on a supported host (e.g. any
 * drive.google.com link — file, folder, open?id=…) is accepted as-is; we don't
 * inspect the path or probe whether it's shared. Normalises a bare
 * "drive.google.com/…" to https.
 */
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
  u.protocol = 'https:';
  return { ok: true, url: u.toString(), provider };
}
