import { useEffect } from 'react';
import { X } from 'lucide-react';

export interface LightboxItem {
  title?: string | null;
  mediaUrl?: string | null;
  mediaType?: 'IMAGE' | 'VIDEO' | null;
}

/** Full-screen overlay for viewing a single portfolio image or video, in place of navigating away. */
export function MediaLightbox({ item, onClose }: { item: LightboxItem | null; onClose: () => void }) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [item, onClose]);

  if (!item?.mediaUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-lp-black/85 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.title ?? 'Portfolio media'}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X size={20} />
      </button>
      <div onClick={(e) => e.stopPropagation()}>
        {item.mediaType === 'VIDEO' ? (
          <video
            src={item.mediaUrl}
            controls
            autoPlay
            playsInline
            className="max-h-[85vh] max-w-[90vw] rounded-lg"
          />
        ) : (
          <img
            src={item.mediaUrl}
            alt={item.title ?? ''}
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
          />
        )}
      </div>
    </div>
  );
}
