import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { F, FONT_SIZE, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';

type IoniconName = keyof typeof FontAwesome5.glyphMap;

// Left-accented promo card — currently used by the creator/business home
// screens' "refer a friend" banners, previously two near-identical copies of
// the same JSX/styles with only the accent color and copy differing.
// Deliberately a single fixed accent (pink) rather than a `color` prop: this
// is the one screen-wide "reward/growth" moment on either home screen, kept
// visually distinct from both the purple/green brand and the amber
// AttentionBanner so it never gets mistaken for either.
const ACCENT = '#EC4899';
const ACCENT_BG = '#FCE7F3';

type Props = {
  icon: IoniconName;
  title: string;
  // Split around the highlighted amount so the reward figure can render in
  // its own bold/emphasized style, e.g. "Get " / "Rs. 500" / " per referral".
  subtitlePrefix: string;
  subtitleAmount: string;
  subtitleSuffix: string;
  onPress: () => void;
  onDismiss: () => void;
  // Horizontal/vertical inset — defaults to the app's shared screen gutter
  // and spacing so this lines up with everything else on the page without
  // the caller having to remember the value. Pass { marginHorizontal: 0,
  // marginTop: 0 } when the parent already supplies both (e.g. a padded
  // ScrollView + a `gap`-based group), same as AttentionBanner's `style` prop.
  style?: { marginHorizontal?: number; marginTop?: number };
};

export function PromoBanner({ icon, title, subtitlePrefix, subtitleAmount, subtitleSuffix, onPress, onDismiss, style }: Props) {
  const C = useAppColors();
  return (
    <Pressable
      style={[
        s.banner,
        { backgroundColor: C.surface, marginHorizontal: style?.marginHorizontal ?? SCREEN_GUTTER, marginTop: style?.marginTop ?? SPACING.lg },
        SHADOW.card,
      ]}
      onPress={onPress}>
      <View style={s.iconWrap}>
        <FontAwesome5 name={icon} solid size={20} color={ACCENT} />
      </View>
      <View style={s.text}>
        <Text style={[s.title, { color: C.text }]}>{title}</Text>
        <Text style={[s.sub, { color: C.textSecondary }]} numberOfLines={1}>
          {subtitlePrefix}
          <Text style={s.amount}>{subtitleAmount}</Text>
          {subtitleSuffix}
        </Text>
      </View>
      <Pressable style={s.close} onPress={onDismiss} hitSlop={10}>
        <FontAwesome5 name="times" solid size={16} color={C.textSecondary} />
      </Pressable>
    </Pressable>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg,
    padding: SPACING.md, gap: SPACING.sm, borderLeftWidth: 4, borderLeftColor: ACCENT,
  },
  iconWrap: { width: 38, height: 38, borderRadius: RADIUS.md, backgroundColor: ACCENT_BG, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  text:  { flex: 1, gap: 2 },
  title: { fontSize: FONT_SIZE.sm, fontFamily: F.semibold },
  sub:   { fontSize: FONT_SIZE.sm, fontFamily: F.regular, lineHeight: 20, opacity: 0.75 },
  amount: { fontSize: FONT_SIZE.md, fontFamily: F.extrabold, color: '#059669' },
  close: { position: 'absolute', top: 8, right: 8, padding: 4 },
});
