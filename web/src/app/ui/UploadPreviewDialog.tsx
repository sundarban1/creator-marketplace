import { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { useOptionalT } from '../i18n';
import { Modal } from './Modal';
import { Button } from './Button';
import { isImage, registerUploadPreview, type PreviewRequest } from './uploadPreview';

/** Root-mounted host for `confirmImageUpload()` (see ./uploadPreview.ts). */
export function UploadPreviewHost() {
  const [req, setReq] = useState<PreviewRequest | null>(null);

  useEffect(() => {
    registerUploadPreview(setReq);
    return () => registerUploadPreview(null);
  }, []);

  const finish = (ok: boolean) => {
    req?.resolve(ok);
    setReq(null);
  };

  return req ? <PreviewDialog req={req} onDone={finish} /> : null;
}

function PreviewDialog({ req, onDone }: { req: PreviewRequest; onDone: (ok: boolean) => void }) {
  const t = useOptionalT();
  const images = req.files.filter(isImage);
  const others = req.files.filter((f) => !isImage(f));
  const urls = useMemo(() => images.map((f) => URL.createObjectURL(f)), [req]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  const label =
    req.confirmLabel ??
    (req.files.length > 1 ? t('uploadPreview.uploadCount', { count: req.files.length }) : t('uploadPreview.upload'));

  return (
    <Modal
      open
      onClose={() => onDone(false)}
      title={t('uploadPreview.title')}
      size={images.length > 1 ? 'lg' : 'md'}
      footer={
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={() => onDone(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => onDone(true)}>{label}</Button>
        </div>
      }
    >
      <p className="mb-3 text-[13px] text-ink-soft">{t('uploadPreview.hint')}</p>
      {images.length === 1 ? (
        <img src={urls[0]} alt="" className="max-h-[60vh] w-full rounded-xl bg-surface-dim object-contain" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {urls.map((u, i) => (
            <img key={u} src={u} alt={`${i + 1}`} className="aspect-square w-full rounded-xl bg-surface-dim object-cover" />
          ))}
        </div>
      )}
      {others.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {others.map((f, i) => (
            <li key={i} className="flex items-center gap-2.5 rounded-lg bg-surface-dim px-3 py-2.5">
              <FileText size={16} className="flex-shrink-0 text-ink-soft" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                {f instanceof File ? f.name : 'file'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
