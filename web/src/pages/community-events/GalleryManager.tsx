import { useState } from 'react';
import { ChevronLeft, ChevronRight, GripVertical, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import type { CommunityEventImage } from '../../lib/api';
import { checkImages, move, uploadImages, useMultiFilePicker } from './formUtils';

const BATCH = 5;

/**
 * Gallery editor: bulk upload (sent in small batches so one big phone dump
 * doesn't become one giant request), drag-to-reorder on desktop plus arrow
 * buttons for keyboard/touch, delete, and "use as cover" — the cover itself
 * stays a separate field, so removing a gallery photo never clears it.
 */
export function GalleryManager({
  images,
  onChange,
  coverUrl,
  onSetCover,
}: {
  images: CommunityEventImage[];
  onChange: (next: CommunityEventImage[]) => void;
  coverUrl: string | null;
  onSetCover: (url: string) => void;
}) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  async function addFiles(files: File[]) {
    const problem = checkImages(files);
    if (problem) return setError(problem);
    setError(null);
    setProgress({ done: 0, total: files.length });
    let current = images;
    try {
      for (let i = 0; i < files.length; i += BATCH) {
        const urls = await uploadImages(files.slice(i, i + BATCH), 'gallery');
        current = [...current, ...urls.map((url) => ({ url, caption: null }))];
        onChange(current);
        setProgress({ done: Math.min(i + BATCH, files.length), total: files.length });
      }
    } catch (ex) {
      setError((ex as Error).message || 'Upload failed.');
    } finally {
      setProgress(null);
    }
  }

  const picker = useMultiFilePicker(addFiles);
  const arrow = 'p-1 rounded-md bg-white/90 text-gray-600 shadow-sm hover:text-gray-900 disabled:opacity-30';

  return (
    <div>
      {picker.input}
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => (
            <li
              key={img.url}
              draggable
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragFrom !== null) onChange(move(images, dragFrom, i));
                setDragFrom(null);
              }}
              onDragEnd={() => setDragFrom(null)}
              className={`group relative overflow-hidden rounded-xl border bg-gray-50 ${dragFrom === i ? 'opacity-40' : ''} ${
                coverUrl === img.url ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-gray-200'
              }`}
            >
              <img src={img.url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
              <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                <GripVertical size={11} className="hidden cursor-grab sm:block" /> {i + 1}
              </span>
              {coverUrl === img.url && (
                <span className="absolute right-1.5 top-1.5 rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">Cover</span>
              )}
              <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between">
                <div className="flex gap-1">
                  <button type="button" className={arrow} disabled={i === 0} onClick={() => onChange(move(images, i, i - 1))} title="Move earlier">
                    <ChevronLeft size={14} />
                  </button>
                  <button type="button" className={arrow} disabled={i === images.length - 1} onClick={() => onChange(move(images, i, i + 1))} title="Move later">
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="flex gap-1">
                  {coverUrl !== img.url && (
                    <button type="button" className={arrow} onClick={() => onSetCover(img.url)} title="Use as cover image">
                      <Star size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="p-1 rounded-md bg-white/90 text-red-500 shadow-sm hover:text-red-700"
                    onClick={() => onChange(images.filter((_, j) => j !== i))}
                    title="Remove from gallery"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={picker.open}
        disabled={!!progress}
        className={`${images.length ? 'mt-3' : ''} flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-6 text-sm font-medium text-gray-500 hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-wait transition-colors`}
      >
        {progress ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Uploading {progress.done}/{progress.total}…
          </>
        ) : (
          <>
            <ImagePlus size={16} /> Add photos <span className="font-normal text-gray-400">— select several at once</span>
          </>
        )}
      </button>
      <p className="mt-1.5 text-xs text-gray-400">JPEG, PNG or WebP, up to 10 MB each. Drag (or use the arrows) to reorder.</p>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
