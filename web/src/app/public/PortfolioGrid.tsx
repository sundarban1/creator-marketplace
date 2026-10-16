import { useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { MediaLightbox, type LightboxItem } from '../ui/MediaLightbox';
import { detectLinkPlatform, portfolioItemTitle, videoPosterSrc } from '../ui/portfolioLink';
import { LinkThumb, PlatformBadge } from '../ui/PortfolioLinkThumb';
import { useT } from '../i18n';

export interface PortfolioGridItem extends LightboxItem {
  id: string;
  description?: string | null;
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
  const t = useT();
  const [active, setActive] = useState<PortfolioGridItem | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((p) => {
          const title = portfolioItemTitle(p, t);
          const platformLabel = p.externalUrl ? detectLinkPlatform(p.externalUrl).label : null;
          return p.mediaUrl ? (
            <button
              key={p.id}
              type="button"
              onClick={() => setActive({ ...p, title })}
              aria-label={title ?? undefined}
              className="group relative overflow-hidden rounded-xl border border-line bg-surface text-left transition-colors hover:border-violet/30"
            >
              {p.mediaType === 'VIDEO' ? (
                <video
                  src={videoPosterSrc(p.mediaUrl)}
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
              {p.externalUrl && <PlatformBadge url={p.externalUrl} />}
              {title && <p className="truncate p-2 text-[12px] font-medium text-ink">{title}</p>}
            </button>
          ) : p.externalUrl ? (
            <a
              key={p.id}
              href={p.externalUrl}
              target="_blank"
              rel="noreferrer nofollow"
              aria-label={title ?? undefined}
              className="group overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-violet/30"
            >
              <span className="block aspect-square w-full overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]">
                <LinkThumb url={p.externalUrl} />
              </span>
              <span className="block p-2">
                {title && <span className="block truncate text-[12px] font-medium text-ink">{title}</span>}
                <span className="flex items-center gap-1 text-[11px] text-ink-soft">
                  <ExternalLink size={10} className="flex-shrink-0" />
                  <span className="truncate">
                    {platformLabel ? t('public.portfolioOpensIn', { platform: platformLabel }) : t('public.portfolioOpensLink')}
                  </span>
                </span>
              </span>
            </a>
          ) : null;
        })}
        {links.map((l) => {
          const lp = detectLinkPlatform(l.url);
          return (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noreferrer nofollow"
            className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3 text-[13px] font-medium text-ink transition-colors hover:border-violet/30"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${lp.label ? 'text-white' : 'bg-violet/10 text-violet-dark'}`}
                style={lp.label ? { backgroundColor: lp.color } : undefined}
              >
                <lp.Icon size={13} aria-hidden />
              </span>
              <span className="truncate">{l.label}</span>
            </span>
            <ExternalLink size={13} className="flex-shrink-0 text-ink-soft" />
          </a>
          );
        })}
      </div>

      <MediaLightbox item={active} onClose={() => setActive(null)} />
    </>
  );
}
