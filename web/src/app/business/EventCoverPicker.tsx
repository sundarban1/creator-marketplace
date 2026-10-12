import { useState } from 'react';
import { Camera, X } from 'lucide-react';
import { useT } from '../i18n';
import { uploadCampaignFeatureImage } from '../api/business';
import { Card } from '../ui/Card';
import { cn } from '../ui/cn';
import { ImageCropModal } from '../ui/ImageCropModal';

// Event cover image — add / change / remove, empty state included. Picking
// opens the 16:9 crop step; the upload runs on confirm, so the image always
// matches the 16:9 frame event cards render it in.
export function EventCoverPicker({ value, onChange, onError, credit }: {
  value: string;
  onChange: (url: string) => void;
  onError: (message: string) => void;
  credit?: { name: string; profileUrl: string } | null;
}) {
  const t = useT();
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function closeCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }
  async function onCropped(blob: Blob) {
    setUploading(true);
    try {
      const { imageUrl } = await uploadCampaignFeatureImage(new File([blob], 'feature.jpg', { type: 'image/jpeg' }));
      onChange(imageUrl);
    } catch (err) {
      onError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setUploading(false);
      closeCrop();
    }
  }

  return (
    <>
      <Card padded={false}>
        <div className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-2xl bg-surface-dim">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-violet via-violet-dark to-dash-pink-dark">
              <span aria-hidden className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-brand-orange/25 blur-3xl" />
              <span aria-hidden className="pointer-events-none absolute -bottom-10 left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            </div>
          )}

          {value && (
            <button
              type="button"
              aria-label={t('biz.removeCoverImage')}
              onClick={() => onChange('')}
              disabled={uploading}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/50"
            >
              <X size={15} />
            </button>
          )}

          <label
            className={cn(
              'absolute flex cursor-pointer items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-[13px] font-medium text-white backdrop-blur transition-colors hover:bg-black/50',
              value ? 'bottom-4 right-4' : 'inset-x-0 bottom-4 mx-auto w-fit',
              uploading ? 'pointer-events-none opacity-70' : '',
            )}
          >
            {uploading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
            ) : (
              <Camera size={14} />
            )}
            {value ? t('biz.changeCoverImage') : t('biz.addCoverImage')}
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setCropSrc(URL.createObjectURL(f));
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {value && credit && (
          <p className="px-4 py-2 text-[11px] text-ink-soft">
            Photo by{' '}
            <a href={credit.profileUrl} target="_blank" rel="noreferrer" className="underline">
              {credit.name}
            </a>
          </p>
        )}
      </Card>

      <ImageCropModal
        open={!!cropSrc}
        imageSrc={cropSrc}
        aspect={16 / 9}
        allowFit
        title={t('biz.cropEventImageTitle')}
        onCancel={closeCrop}
        onConfirm={onCropped}
      />
    </>
  );
}
