import { readFileSync } from 'fs';
import type { Font } from 'satori';
import { logger } from '../../../config/logger';

// Fonts for the invitation renderer. The .ttf files ship inside the
// @expo-google-fonts/* packages (already in node_modules, copied verbatim by
// the Dockerfile), so there is nothing extra to bundle or COPY.
//
// Playfair Display  -> display serif for "YOU'RE INVITED" + the event title
// Poppins           -> body / detail rows / host line (matches the app's UI font)
// Noto Sans Devanagari -> glyph fallback so Nepali business names / titles render
//
// satori uses every font in the list as a fallback chain: if a glyph is
// missing from the family named in `fontFamily`, it falls through to the
// others — which is exactly how the Devanagari fallback works here.

function load(pkgPath: string): Buffer {
  return readFileSync(require.resolve(pkgPath));
}

let cached: Font[] | null = null;

export function invitationFonts(): Font[] {
  if (cached) return cached;

  try {
    cached = [
      { name: 'Playfair Display', data: load('@expo-google-fonts/playfair-display/400Regular/PlayfairDisplay_400Regular.ttf'), weight: 400, style: 'normal' },
      { name: 'Playfair Display', data: load('@expo-google-fonts/playfair-display/600SemiBold/PlayfairDisplay_600SemiBold.ttf'), weight: 600, style: 'normal' },
      { name: 'Playfair Display', data: load('@expo-google-fonts/playfair-display/700Bold/PlayfairDisplay_700Bold.ttf'), weight: 700, style: 'normal' },
      { name: 'Playfair Display', data: load('@expo-google-fonts/playfair-display/400Regular_Italic/PlayfairDisplay_400Regular_Italic.ttf'), weight: 400, style: 'italic' },

      { name: 'Poppins', data: load('@expo-google-fonts/poppins/400Regular/Poppins_400Regular.ttf'), weight: 400, style: 'normal' },
      { name: 'Poppins', data: load('@expo-google-fonts/poppins/500Medium/Poppins_500Medium.ttf'), weight: 500, style: 'normal' },
      { name: 'Poppins', data: load('@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf'), weight: 600, style: 'normal' },

      { name: 'Noto Sans Devanagari', data: load('@expo-google-fonts/noto-sans-devanagari/400Regular/NotoSansDevanagari_400Regular.ttf'), weight: 400, style: 'normal' },
      { name: 'Noto Sans Devanagari', data: load('@expo-google-fonts/noto-sans-devanagari/600SemiBold/NotoSansDevanagari_600SemiBold.ttf'), weight: 600, style: 'normal' },
    ];
  } catch (err) {
    logger.error({ err }, 'invitation: failed to load bundled fonts');
    throw err;
  }

  return cached;
}
