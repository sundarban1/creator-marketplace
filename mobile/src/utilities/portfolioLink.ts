// Detects which platform a portfolio item's external link points at, so a
// link-only item can show the platform's brand icon/colour and a readable
// label ("Instagram video") instead of a generic link glyph and "Untitled".
// Unknown hosts fall back to a plain video icon. Keep in sync with
// web/src/app/ui/portfolioLink.ts.

export type LinkPlatformKey =
  | 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'twitter' | 'linkedin'
  | 'pinterest' | 'snapchat' | 'twitch' | 'vimeo' | 'other';

export interface LinkPlatform {
  key: LinkPlatformKey;
  /** Brand name, or null for an unknown host. */
  label: string | null;
  /** FontAwesome5 icon name (brand icons for known platforms, `video` otherwise). */
  icon: string;
  color: string;
  /** FontAwesome5 brand icons must not be rendered with the `solid` prop. */
  brand: boolean;
}

const PLATFORMS: { key: Exclude<LinkPlatformKey, 'other'>; hosts: string[]; label: string; icon: string; color: string }[] = [
  { key: 'instagram', hosts: ['instagram.com', 'instagr.am'],                 label: 'Instagram', icon: 'instagram', color: '#E1306C' },
  { key: 'tiktok',    hosts: ['tiktok.com'],                                  label: 'TikTok',    icon: 'tiktok',    color: '#010101' },
  { key: 'youtube',   hosts: ['youtube.com', 'youtu.be', 'youtube-nocookie.com'], label: 'YouTube', icon: 'youtube', color: '#FF0000' },
  { key: 'facebook',  hosts: ['facebook.com', 'fb.watch', 'fb.com', 'fb.me'], label: 'Facebook',  icon: 'facebook',  color: '#1877F2' },
  { key: 'twitter',   hosts: ['twitter.com', 'x.com'],                        label: 'X',         icon: 'twitter',   color: '#1DA1F2' },
  { key: 'linkedin',  hosts: ['linkedin.com', 'lnkd.in'],                     label: 'LinkedIn',  icon: 'linkedin',  color: '#0A66C2' },
  { key: 'pinterest', hosts: ['pinterest.com', 'pin.it'],                     label: 'Pinterest', icon: 'pinterest', color: '#E60023' },
  { key: 'snapchat',  hosts: ['snapchat.com'],                                label: 'Snapchat',  icon: 'snapchat-ghost', color: '#F7D300' },
  { key: 'twitch',    hosts: ['twitch.tv'],                                   label: 'Twitch',    icon: 'twitch',    color: '#9146FF' },
  { key: 'vimeo',     hosts: ['vimeo.com'],                                   label: 'Vimeo',     icon: 'vimeo-v',   color: '#1AB7EA' },
];

const OTHER: LinkPlatform = { key: 'other', label: null, icon: 'video', color: '#6366F1', brand: false };

/** Lower-cased hostname without `www.`/`m.` prefixes; tolerates a missing scheme. */
function hostOf(url: string): string {
  const m = url.trim().match(/^(?:[a-z][a-z0-9+.-]*:\/\/)?([^/?#:@]+)/i);
  return (m?.[1] ?? '').toLowerCase().replace(/^(?:www|m|mobile|vm|vt|web)\./, '');
}

export function detectLinkPlatform(url: string | null | undefined): LinkPlatform {
  if (!url) return OTHER;
  const host = hostOf(url);
  const p = PLATFORMS.find((x) => x.hosts.some((h) => host === h || host.endsWith(`.${h}`)));
  return p ? { key: p.key, label: p.label, icon: p.icon, color: p.color, brand: true } : OTHER;
}

/** YouTube video id from watch / youtu.be / shorts / embed / live URLs. */
export function youtubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/))([A-Za-z0-9_-]{11})/i);
  return m?.[1] ?? null;
}

/** Real preview frame for YouTube links (public, no API key); null for every other platform. */
export function linkThumbnailUrl(url: string | null | undefined): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
