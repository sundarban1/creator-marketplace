import type { CommunityEventStatus, CommunityEventType } from '../../lib/api';

/** Route prefix — `/events` already belongs to the campaign browser. */
export const COMMUNITY_EVENTS_PATH = '/community/events';
export const communityEventPath = (slug: string) => `${COMMUNITY_EVENTS_PATH}/${slug}`;

export const EVENT_TYPES: CommunityEventType[] = ['MEETUP', 'WORKSHOP', 'TRAINING', 'NETWORKING', 'COMMUNITY_EVENT', 'OTHER'];

const intlLocale = (lang: string) => (lang === 'ne' ? 'ne-NP' : 'en-US');

/** "October 4, 2026" (long) / "Oct 4, 2026" (short), in the event's own timezone. */
export function formatEventDate(iso: string, tz: string, lang: string, style: 'long' | 'short' = 'long'): string {
  return new Intl.DateTimeFormat(intlLocale(lang), {
    timeZone: tz,
    year: 'numeric',
    month: style,
    day: 'numeric',
  }).format(new Date(iso));
}

export function formatEventTime(iso: string, tz: string, lang: string): string {
  return new Intl.DateTimeFormat(intlLocale(lang), { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

/** Multi-day events: "Oct 4 – 5, 2026"-style range; single day: just the date. */
export function formatEventDateRange(start: string, end: string | null, tz: string, lang: string, style: 'long' | 'short' = 'long') {
  const s = formatEventDate(start, tz, lang, style);
  if (!end) return s;
  const e = formatEventDate(end, tz, lang, style);
  return s === e ? s : `${s} – ${e}`;
}

/** "Itahari, Nepal" — whichever parts exist. */
export function placeLine(...parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => !!p && p.trim() !== '').join(', ');
}

export function statusKey(status: CommunityEventStatus): string {
  return {
    UPCOMING: 'communityEvents.statusUpcoming',
    ONGOING: 'communityEvents.statusOngoing',
    COMPLETED: 'communityEvents.statusCompleted',
    CANCELLED: 'communityEvents.statusCancelled',
  }[status];
}

/**
 * Cloudinary delivery transform — e.g. a 640px-wide thumbnail of a 2400px
 * gallery photo. Inserted after `/upload/` (replacing the f_auto,q_auto
 * segment the backend already adds); a no-op for non-Cloudinary URLs.
 */
export function cldImage(url: string | null | undefined, width: number, height?: number): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  const t = ['f_auto', 'q_auto', `w_${width}`, ...(height ? [`h_${height}`, 'c_fill', 'g_auto'] : ['c_limit'])].join(',');
  return url.replace(/\/upload\/(?:f_auto,q_auto\/)?/, `/upload/${t}/`);
}

export type VideoEmbed = { kind: 'iframe' | 'file' | 'link'; src: string };

/** YouTube / Vimeo / Facebook → embeddable iframe URL; direct media → <video>; anything else → plain link. */
export function videoEmbed(url: string): VideoEmbed {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}` };
    if (host === 'youtube.com') {
      const id = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
      if (id) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` };
    }
    if (host === 'vimeo.com') {
      const id = u.pathname.match(/^\/(\d+)/)?.[1];
      if (id) return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` };
    }
    if (host === 'facebook.com' || host === 'fb.watch') {
      return { kind: 'iframe', src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false` };
    }
    if (/\.(mp4|webm|mov)$/i.test(u.pathname) || (host === 'res.cloudinary.com' && u.pathname.includes('/video/'))) {
      return { kind: 'file', src: url };
    }
  } catch {
    /* fall through */
  }
  return { kind: 'link', src: url };
}
