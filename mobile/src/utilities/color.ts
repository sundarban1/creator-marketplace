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

function relativeLuminance(hex: string): number | null {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.substring(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(full.substring(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Brand colors (admin-defined platform/category colors) drawn directly on a theme
// surface: TikTok / X are pure black and vanish on the dark palette, Snapchat yellow
// vanishes on white. Swap those for the theme's text color; everything else keeps
// its brand hue.
export function readableOnSurface(hex: string, isDark: boolean, fallback: string): string {
  const lum = relativeLuminance(hex);
  if (lum === null) return hex;
  if (isDark && lum < 0.05) return fallback;
  if (!isDark && lum > 0.75) return fallback;
  return hex;
}
