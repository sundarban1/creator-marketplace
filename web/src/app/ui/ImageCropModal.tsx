import { useState, useCallback } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { useT } from '../i18n';
import { Modal } from './Modal';
import { Button } from './Button';
import { getCroppedImageBlob } from './cropImage';

/**
 * Crop step interposed between picking a file and uploading it, shared by
 * every avatar/logo/cover picker. `imageSrc` is an object URL owned by the
 * caller — this component never revokes it, since the caller may still need
 * it (e.g. to retry after an upload error).
 */
export function ImageCropModal({
  open,
  imageSrc,
  aspect,
  cropShape = 'rect',
  title,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  imageSrc: string | null;
  aspect: number;
  cropShape?: 'rect' | 'round';
  title: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
}) {
  const t = useT();
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [working, setWorking] = useState(false);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const reset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setWorking(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      await onConfirm(blob);
      reset();
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
          <div className="relative h-72 w-full overflow-hidden rounded-xl bg-ink sm:h-80">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={cropShape}
              restrictPosition
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-ink-soft">{t('profile.cropZoom')}</span>
            <input
              type="range"
              min={1}
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
