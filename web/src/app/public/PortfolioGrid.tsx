import { useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { MediaLightbox, type LightboxItem } from '../ui/MediaLightbox';

export interface PortfolioGridItem extends LightboxItem {
  id: string;
  externalUrl?: string | null;
}

export interface PortfolioGridLink {
  id: string;
  label: string;
  url: string;
}

/**
 * Shared by the public creator profile and the business-side creator detail
 * page. Image/video items open in a lightbox instead of leaving the page;
 * items that are just an external link (no uploaded media) still open in a
 * new tab, same as the plain portfolioLinks list.
 */
export function PortfolioGrid({ items, links }: { items: PortfolioGridItem[]; links: PortfolioGridLink[] }) {
  const [active, setActive] = useState<PortfolioGridItem | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((p) =>
          p.mediaUrl ? (
            <button
              key={p.id}
              type="button"
              onClick={() => setActive(p)}
              className="group relative overflow-hidden rounded-xl border border-line bg-surface text-left transition-colors hover:border-violet/30"
            >
              {p.mediaType === 'VIDEO' ? (
                <video
                  src={p.mediaUrl}
                  muted
                  playsInline
                  preload="metadata"
                  className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
              ) : (
                <img
                  src={p.mediaUrl}
                  alt={p.title ?? ''}
                  loading="lazy"
                  className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
              )}
              {p.mediaType === 'VIDEO' && (
                <span className="absolute inset-0 flex items-center justify-center bg-ink/10">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow">
                    <Play size={15} className="fill-current" />
                  </span>
                </span>
              )}
              {p.title && <p className="truncate p-2 text-[12px] font-medium text-ink">{p.title}</p>}
            </button>
          ) : p.externalUrl ? (
            <a
              key={p.id}
              href={p.externalUrl}
              target="_blank"
              rel="noreferrer nofollow"
              className="group overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-violet/30"
            >
              <span className="flex aspect-square w-full items-center justify-center bg-black/[0.03] text-ink-soft">
                <ExternalLink size={20} />
              </span>
              {p.title && <p className="truncate p-2 text-[12px] font-medium text-ink">{p.title}</p>}
            </a>
          ) : null,
        )}
        {links.map((l) => (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noreferrer nofollow"
            className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3 text-[13px] font-medium text-ink transition-colors hover:border-violet/30"
          >
            <span className="truncate">{l.label}</span>
            <ExternalLink size={13} className="flex-shrink-0 text-ink-soft" />
          </a>
        ))}
      </div>

      <MediaLightbox item={active} onClose={() => setActive(null)} />
    </>
  );
}
