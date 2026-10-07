import { useRef } from 'react';
import { api, type CommunityEventUploadKind } from '../../lib/api';
import { confirmImageUpload } from '../../app/ui/uploadPreview';

/** Non-component helpers for the Community Events admin form. */

export const EVENT_TYPE_LABELS: Record<string, string> = {
  MEETUP: 'Meetup',
  WORKSHOP: 'Workshop',
  TRAINING: 'Training',
  NETWORKING: 'Networking',
  COMMUNITY_EVENT: 'Community Event',
  OTHER: 'Other',
};

export const inputCls = (error?: string) =>
  `w-full px-3 py-2.5 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
    error ? 'border-red-300 bg-red-50' : 'border-gray-200'
  }`;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Client-side mirror of the server's image rules, so a bad file fails before upload. */
export function checkImages(files: File[]): string | null {
  if (files.some((f) => !ALLOWED_IMAGE_TYPES.includes(f.type))) return 'Only JPEG, PNG and WebP images are allowed.';
  if (files.some((f) => f.size > MAX_IMAGE_BYTES)) return 'Each image must be 10 MB or smaller.';
  return null;
}

export async function uploadImages(files: File[], kind: CommunityEventUploadKind): Promise<string[]> {
  const res = await api.admin.uploadCommunityEventImages(files, kind);
  return res.data.urls;
}

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Hidden multi-file input + trigger, for the gallery. */
export function useMultiFilePicker(onFiles: (files: File[]) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={ref}
      type="file"
      multiple
      accept="image/jpeg,image/png,image/webp"
      className="hidden"
      onChange={async (e) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = '';
        if (files.length && (await confirmImageUpload(files))) onFiles(files);
      }}
    />
  );
  return { input, open: () => ref.current?.click() };
}
