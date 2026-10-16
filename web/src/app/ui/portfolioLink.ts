import type { IconType } from 'react-icons';
import {
  FaInstagram, FaTiktok, FaYoutube, FaFacebook, FaXTwitter, FaLinkedin,
  FaPinterest, FaSnapchat, FaTwitch, FaVimeoV, FaVideo,
} from 'react-icons/fa6';
import type { TFn } from '../i18n';

// Detects which platform a portfolio item's external link points at, so a
// link-only item shows the platform's brand tile and a readable label
// ("Instagram video") instead of a generic link glyph. Unknown hosts fall
// back to a plain video icon. Keep in sync with mobile/src/utilities/portfolioLink.ts.

export interface LinkPlatform {
  key: string;
  /** Brand name, or null for an unknown host. */
  label: string | null;
  Icon: IconType;
  color: string;
}

const PLATFORMS: (LinkPlatform & { hosts: string[] })[] = [
  { key: 'instagram', hosts: ['instagram.com', 'instagr.am'],                     label: 'Instagram', Icon: FaInstagram, color: '#E1306C' },
  { key: 'tiktok',    hosts: ['tiktok.com'],                                      label: 'TikTok',    Icon: FaTiktok,    color: '#010101' },
  { key: 'youtube',   hosts: ['youtube.com', 'youtu.be', 'youtube-nocookie.com'], label: 'YouTube',   Icon: FaYoutube,   color: '#FF0000' },
  { key: 'facebook',  hosts: ['facebook.com', 'fb.watch', 'fb.com', 'fb.me'],     label: 'Facebook',  Icon: FaFacebook,  color: '#1877F2' },
  { key: 'twitter',   hosts: ['twitter.com', 'x.com'],                            label: 'X',         Icon: FaXTwitter,  color: '#000000' },
  { key: 'linkedin',  hosts: ['linkedin.com', 'lnkd.in'],                         label: 'LinkedIn',  Icon: FaLinkedin,  color: '#0A66C2' },
  { key: 'pinterest', hosts: ['pinterest.com', 'pin.it'],                         label: 'Pinterest', Icon: FaPinterest, color: '#E60023' },
  { key: 'snapchat',  hosts: ['snapchat.com'],                                    label: 'Snapchat',  Icon: FaSnapchat,  color: '#F7D300' },
  { key: 'twitch',    hosts: ['twitch.tv'],                                       label: 'Twitch',    Icon: FaTwitch,    color: '#9146FF' },
  { key: 'vimeo',     hosts: ['vimeo.com'],                                       label: 'Vimeo',     Icon: FaVimeoV,    color: '#1AB7EA' },
];

const OTHER: LinkPlatform = { key: 'other', label: null, Icon: FaVideo, color: '' };

function hostOf(url: string): string {
  const m = url.trim().match(/^(?:[a-z][a-z0-9+.-]*:\/\/)?([^/?#:@]+)/i);
  return (m?.[1] ?? '').toLowerCase().replace(/^(?:www|m|mobile|vm|vt|web)\./, '');
}

export function detectLinkPlatform(url: string | null | undefined): LinkPlatform {
  if (!url) return OTHER;
  const host = hostOf(url);
  return PLATFORMS.find((p) => p.hosts.some((h) => host === h || host.endsWith(`.${h}`))) ?? OTHER;
}

/** Real preview frame for YouTube links (public, no API key); null for every other platform. */
export function linkThumbnailUrl(url: string | null | undefined): string | null {
  const m = url?.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/))([A-Za-z0-9_-]{11})/i);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

/**
 * Video src for a still tile: the `#t=` media fragment makes the browser seek
 * and paint a real frame (iOS Safari otherwise leaves `preload="metadata"`
 * videos black).
 */
export function videoPosterSrc(url: string): string {
  return url.includes('#') ? url : `${url}#t=0.5`;
}

type TitleItem = { title?: string | null; description?: string | null; mediaUrl?: string | null; externalUrl?: string | null };

/** Creator's own text first, then "Instagram video" / "Video link" for a link-only item. */
export function portfolioItemTitle(item: TitleItem, t: TFn): string | null {
  const own = item.description?.trim() || item.title?.trim();
  if (own) return own;
  if (item.externalUrl && !item.mediaUrl) {
    const p = detectLinkPlatform(item.externalUrl);
    return p.label ? t('public.portfolioPlatformVideo', { platform: p.label }) : t('public.portfolioVideoLink');
  }
  return null;
}
