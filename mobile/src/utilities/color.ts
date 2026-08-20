// Blends a theme color with alpha for soft tints/glows that adapt automatically between
// the light and dark palettes — avoids hand-picking a separate literal per theme for
// every one-off tint (banner backgrounds, aurora blobs, glassy card fill, ...).
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
