import type { Area } from 'react-easy-crop';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Rasterizes the cropped region of `imageSrc` (an object URL) into a JPEG blob at its native crop resolution.
 *  The region may extend past the image (ImageCropModal's `allowFit` zoom-out) — any uncovered area is filled
 *  with a darkened, blurred cover-fill of the same image so the frame never has bare edges. */
export async function getCroppedImageBlob(imageSrc: string, cropPixels: Area): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const { x, y, width, height } = cropPixels;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const iw = image.naturalWidth;
  const ih = image.naturalHeight;
  const overflows = x < 0 || y < 0 || x + width > iw || y + height > ih;
  if (overflows) {
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, width, height);
    // Canvas `filter` is missing on older Safari — there the solid fill above
    // is the backdrop rather than an unblurred (distracting) duplicate.
    if (typeof ctx.filter === 'string') {
      const scale = Math.max(width / iw, height / ih);
      const bw = iw * scale;
      const bh = ih * scale;
      ctx.save();
      ctx.filter = `blur(${Math.round(Math.max(width, height) / 40)}px) brightness(0.75)`;
      ctx.drawImage(image, (width - bw) / 2, (height - bh) / 2, bw, bh);
      ctx.restore();
    }
  }

  // Draw the whole image offset by the crop origin and let the canvas clip it
  // — unlike a source-rect drawImage this stays correct when the crop region
  // runs past the image edges.
  ctx.drawImage(image, -x, -y);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to crop image'))),
      'image/jpeg',
      0.92,
    );
  });
}
