import { useState, useCallback } from 'react';
import Cropper, { type Area, type MediaSize, type Point } from 'react-easy-crop';
import { useT } from '../i18n';
import { Modal } from './Modal';
import { Button } from './Button';
import { getCroppedImageBlob } from './cropImage';

/**
 * Crop step interposed between picking a file and uploading it, shared by
 * every avatar/logo/cover picker. `imageSrc` is an object URL owned by the
 * caller — this component never revokes it, since the caller may still need
 * it (e.g. to retry after an upload error).
 *
 * `allowFit` (covers): lets the user zoom OUT past the crop frame so a photo
 * whose shape doesn't match `aspect` can be placed whole instead of being cut
 * down to a strip — a 4:3 photo in a 3:1 cover frame otherwise loses ~55% of
 * its height and looks zoomed in. It opens at that fitted zoom; the empty
 * band left around the photo is filled with a blurred copy of it on export.
 */
export function ImageCropModal({
  open,
  imageSrc,
  aspect,
  cropShape = 'rect',
  allowFit = false,
  title,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  imageSrc: string | null;
  aspect: number;
  cropShape?: 'rect' | 'round';
  allowFit?: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
}) {
  const t = useT();
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  // Zoom at which the whole image fits inside the crop frame. At zoom 1
  // react-easy-crop sizes the frame to fill the image along one axis, so the
  // fit zoom is just the ratio between the two shapes (always <= 1).
  const [minZoom, setMinZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [working, setWorking] = useState(false);
  const [cropError, setCropError] = useState(false);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const onMediaLoaded = useCallback((media: MediaSize) => {
    if (!allowFit) return;
    const r = media.naturalWidth / media.naturalHeight;
    const fit = Math.min(r / aspect, aspect / r);
    setMinZoom(fit);
    setZoom(fit);
    setCrop({ x: 0, y: 0 });
  }, [allowFit, aspect]);

  const reset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setMinZoom(1);
    setCroppedAreaPixels(null);
    setCropError(false);
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setWorking(true);
    setCropError(false);
    try {
      let blob: Blob;
      try {
        blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      } catch {
        // Browser couldn't decode/rasterize the photo (e.g. HEIC in Chrome,
        // corrupt file). Tell the user instead of failing silently.
        setCropError(true);
        return;
      }
      await onConfirm(blob);
      reset();
    } catch {
      // onConfirm (the upload) reports its own errors; just keep this from
      // becoming an unhandled rejection.
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal
      open={open && !!imageSrc}
      onClose={handleCancel}
      title={title}
      footer={
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={handleCancel} disabled={working}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm} loading={working} disabled={!croppedAreaPixels}>
            {t('profile.cropSave')}
          </Button>
        </div>
      }
    >
      {imageSrc && (
        <div className="flex flex-col gap-4">
          <div className="relative h-72 w-full overflow-hidden rounded-xl bg-lp-black sm:h-80">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={cropShape}
              minZoom={minZoom}
              // Zoomed out past the frame the image is smaller than the crop
              // area, which restrictPosition would fight — free positioning
              // instead; the uncovered band is filled on export.
              restrictPosition={!allowFit}
              onMediaLoaded={onMediaLoaded}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          {cropError && (
            <p role="alert" className="text-[13px] font-medium text-red-600">{t('profile.cropError')}</p>
          )}
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-ink-soft">{t('profile.cropZoom')}</span>
            <input
              type="range"
              min={minZoom}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-line accent-brand"
              aria-label={t('profile.cropZoom')}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
