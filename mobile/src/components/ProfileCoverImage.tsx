import { Image, StyleSheet, View } from 'react-native';

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
 */
export function ProfileCoverImage({ uri, scrim = false }: { uri: string; scrim?: boolean }) {
  return (
    <>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={18} />
      <Image source={{ uri }} style={s.exact} resizeMode="cover" />
      {scrim ? <View style={[StyleSheet.absoluteFill, s.scrim]} /> : null}
    </>
  );
}

const s = StyleSheet.create({
  exact: { position: 'absolute', top: 0, left: 0, right: 0, aspectRatio: COVER_ASPECT },
  scrim: { backgroundColor: 'rgba(0,0,0,0.28)' },
});
