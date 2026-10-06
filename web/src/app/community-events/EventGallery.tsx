import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useT } from '../i18n';
import type { CommunityEventImage } from '../../lib/api';
import { cldImage } from './format';

const INITIAL_VISIBLE = 12;

/**
 * Masonry gallery (CSS columns: 2 on mobile, 3 on desktop) of width-limited
 * Cloudinary thumbnails, lazy-loaded; full-size images load only in the
 * lightbox. Long galleries show the first dozen behind a "show all" button.
 */
export function EventGallery({ images, title }: { images: CommunityEventImage[]; title: string }) {
  const t = useT();
  const [showAll, setShowAll] = useState(images.length <= INITIAL_VISIBLE);
  const [open, setOpen] = useState<number | null>(null);
  const visible = showAll ? images : images.slice(0, INITIAL_VISIBLE);

  return (
    <>
      <div className="columns-2 gap-3 md:columns-3">
        {visible.map((img, i) => (
          <button
            key={img.id ?? img.url}
            type="button"
            onClick={() => setOpen(i)}
            className="group mb-3 block w-full overflow-hidden rounded-xl bg-surface-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/50 [break-inside:avoid]"
            aria-label={t('communityEvents.photoOf', { n: i + 1, total: images.length })}
          >
            <img
              src={cldImage(img.url, 640)}
              alt={img.caption ?? `${title} — ${i + 1}`}
              loading="lazy"
              decoding="async"
              className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          </button>
        ))}
      </div>
      {!showAll && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="rounded-full border border-line bg-surface px-5 py-2 text-[13px] font-semibold text-ink transition-colors hover:border-violet/40 hover:text-violet"
          >
            {t('communityEvents.photoCount', { count: images.length })}
          </button>
        </div>
      )}
      {open !== null && (
        <GalleryLightbox images={images} index={open} onIndex={setOpen} onClose={() => setOpen(null)} title={title} />
      )}
    </>
  );
}

function GalleryLightbox({
  images,
  index,
  onIndex,
  onClose,
  title,
}: {
  images: CommunityEventImage[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  title: string;
}) {
  const t = useT();
  const total = images.length;
  const prev = useCallback(() => onIndex((index - 1 + total) % total), [index, total, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % total), [index, total, onIndex]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, prev, next]);

  useEffect(() => closeRef.current?.focus(), []);

  const img = images[index];
  const navBtn =
    'absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) (dx > 0 ? prev : next)();
        touchX.current = null;
      }}
    >
      <button
        ref={closeRef}
        onClick={onClose}
        aria-label={t('communityEvents.close')}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X size={20} />
      </button>
      {total > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); prev(); }} aria-label={t('communityEvents.previous')} className={`${navBtn} left-3 sm:left-6`}>
            <ChevronLeft size={22} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); next(); }} aria-label={t('communityEvents.next')} className={`${navBtn} right-3 sm:right-6`}>
            <ChevronRight size={22} />
          </button>
        </>
      )}
      <figure onClick={(e) => e.stopPropagation()} className="flex max-h-full flex-col items-center">
        <img
          key={img.url}
          src={cldImage(img.url, 1800)}
          alt={img.caption ?? `${title} — ${index + 1}`}
          className="max-h-[82vh] max-w-[92vw] rounded-lg object-contain"
        />
        <figcaption className="mt-3 text-center text-[13px] text-white/75">
          {img.caption && <span className="mr-2 text-white/90">{img.caption}</span>}
          {t('communityEvents.photoOf', { n: index + 1, total })}
        </figcaption>
      </figure>
    </div>
  );
}
