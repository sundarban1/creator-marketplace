import { Image, StyleSheet, Text, View } from 'react-native';
import { F } from '@/utilities/constants';

/**
 * Profile cover ratio, shared with web (CreatorProfilePage / BusinessProfilePage
 * COVER_ASPECT) and the upload crop (uploadImage.ts) so a cover cropped on
 * either platform shows exactly the same framing on both.
 */
export const COVER_ASPECT = 3;

/**
 * Fills a profile hero box with a cover photo. The exact 3:1 crop sits at the
 * top at full width — the part of the box not tucked behind the profile card —
 * over a blurred copy of itself that fills the rest of the box, so the strips
 * beside the card read as one continuous picture.
 *
 * The exact layer is `contain`: covers uploaded zoomed-out (crop allowFit) are
 * narrower than 3:1 and show whole, with the blur filling the sides; a true
 * 3:1 cover fills the band exactly as before.
 */
export function ProfileCoverImage({ uri, scrim = false }: { uri: string; scrim?: boolean }) {
  return (
    <>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={18} />
      <Image source={{ uri }} style={s.exact} resizeMode="contain" />
      {scrim ? <View style={[StyleSheet.absoluteFill, s.scrim]} /> : null}
    </>
  );
}

/** Up to two initials — "Sundar Ban" → "SB", "Kolab" → "K". */
export function nameInitials(name: string | null | undefined): string {
  return (name ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Fallback for a profile hero with no cover photo: the name's initials, large
 * and translucent, centred in the strip of the cover left visible above the
 * overlapping profile card (`visibleHeight`). Sits on the gradient fallback.
 */
export function CoverInitials({ name, visibleHeight }: { name: string | null | undefined; visibleHeight: number }) {
  const text = nameInitials(name);
  if (!text) return null;
  return (
    <View pointerEvents="none" style={[s.initialsWrap, { height: visibleHeight }]}>
      <Text style={s.initials} numberOfLines={1} accessibilityElementsHidden importantForAccessibility="no">{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  initialsWrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 56, lineHeight: 68, letterSpacing: 6, fontFamily: F.bold, color: 'rgba(255,255,255,0.4)' },
  exact: { position: 'absolute', top: 0, left: 0, right: 0, aspectRatio: COVER_ASPECT },
  scrim: { backgroundColor: 'rgba(0,0,0,0.28)' },
});
