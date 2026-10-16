import { FaPlay, FaVideo } from 'react-icons/fa6';
import { detectLinkPlatform, linkThumbnailUrl } from './portfolioLink';

/**
 * Thumbnail for a link-only portfolio item: YouTube preview frame, else the
 * platform's brand tile, else (unknown host) a neutral video tile. Fills its
 * parent — the caller sizes it.
 */
export function LinkThumb({ url, iconSize = 30 }: { url: string; iconSize?: number }) {
  const p = detectLinkPlatform(url);
  const frame = linkThumbnailUrl(url);
  if (frame) {
    return (
      <span className="relative block h-full w-full">
        <img src={frame} alt="" loading="lazy" className="h-full w-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-ink/10">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow">
            <FaPlay size={13} className="ml-0.5" />
          </span>
        </span>
      </span>
    );
  }
  if (p.label) {
    return (
      <span
        className="flex h-full w-full items-center justify-center text-white dark:ring-1 dark:ring-inset dark:ring-white/15"
        style={{ backgroundColor: p.color }}
      >
        <p.Icon size={iconSize} aria-hidden />
      </span>
    );
  }
  return (
    <span className="flex h-full w-full items-center justify-center bg-violet/10 text-violet-dark">
      <FaVideo size={Math.round(iconSize * 0.8)} aria-hidden />
    </span>
  );
}

/** Small round brand badge for media items that also carry a known platform link. */
export function PlatformBadge({ url }: { url: string }) {
  const p = detectLinkPlatform(url);
  if (!p.label) return null;
  return (
    <span
      className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-white text-white shadow"
      style={{ backgroundColor: p.color }}
      title={p.label}
    >
      <p.Icon size={12} aria-hidden />
    </span>
  );
}
