import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { F, FONT_SIZE, RADIUS, SCREEN_GUTTER, SPACING } from '@/utilities/constants';
import { useIsDark } from '@/context/ThemeContext';

type IoniconName = keyof typeof FontAwesome5.glyphMap;

// One shared "something needs you" treatment — both the creator and business
// home screens had their own copy of this (pending-work/proposals banner,
// profile-completion banner), each with its own hardcoded amber hex values.
// Centralized here so every "needs your attention" moment in the app reads as
// the same visual language, not four near-identical one-offs.
//
// Light theme is a white card with an amber border + amber icon/text; dark
// theme shifts to a burnt-orange tint on a dark surface (a light card would
// glare against the dark UI), keeping the same "warm alert" meaning in both.
const ATTENTION_LIGHT = {
  bg: '#FFFFFF', border: '#FDE68A', iconBg: '#FEF3C7',
  icon: '#F3742E', title: '#F3742E', sub: '#F3742E',
};
const ATTENTION_DARK = {
  bg: '#2A1608', border: '#7A3208', iconBg: '#3D1C05',
  icon: '#F76307', title: '#F87171', sub: '#F87171',
};

type Props = {
  icon: IoniconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  numberOfLines?: number;
  // Present → renders a dismiss (×) button instead of a chevron, and tapping
  // it dismisses without triggering onPress (e.g. profile-completion nudges,
  // which the user can permanently clear). Omit for banners that should
  // always be tappable through to their destination (e.g. pending work).
  onDismiss?: () => void;
  // Overrides the theme's amber title color for this one banner (e.g. the
  // creator home "Action Required" banner, which reads brown). Icon/subtitle
  // keep the shared warm-alert treatment.
  titleColor?: string;
  // Overrides the theme's amber subtitle color for this one banner.
  subtitleColor?: string;
  // Overrides the theme's amber icon (and chevron) color for this one banner.
  iconColor?: string;
  // Horizontal inset — defaults to the app's shared screen gutter so this
  // lines up with everything else on the page without the caller having to
  // remember the value. Pass `marginHorizontal: 0` via a wrapping View instead
  // if a screen needs it flush (rare).
  style?: { marginHorizontal?: number; marginTop?: number };
};

export function AttentionBanner({ icon, title, subtitle, onPress, numberOfLines = 1, onDismiss, titleColor, subtitleColor, iconColor, style }: Props) {
  const { isDark } = useIsDark();
  const ATTENTION = isDark ? ATTENTION_DARK : ATTENTION_LIGHT;
  return (
    <Pressable
      style={[
        s.banner,
        { backgroundColor: ATTENTION.bg, borderColor: ATTENTION.border },
        { marginHorizontal: style?.marginHorizontal ?? SCREEN_GUTTER, marginTop: style?.marginTop ?? SPACING.lg },
      ]}
      onPress={onPress}>
      <View style={[s.iconWrap, { backgroundColor: ATTENTION.iconBg }]}>
        <FontAwesome5 name={icon} solid size={18} color={iconColor ?? ATTENTION.icon} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.title, { color: titleColor ?? ATTENTION.title }]}>{title}</Text>
        <Text style={[s.sub, { color: subtitleColor ?? ATTENTION.sub }]} numberOfLines={numberOfLines}>{subtitle}</Text>
      </View>
      {onDismiss ? (
        <Pressable hitSlop={10} onPress={(e) => { e.stopPropagation(); onDismiss(); }}>
          <FontAwesome5 name="times" solid size={16} color={ATTENTION.sub} />
        </Pressable>
      ) : (
        <FontAwesome5 name="chevron-right" solid size={16} color={iconColor ?? ATTENTION.icon} />
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md,
    marginBottom: 0, padding: SPACING.md, gap: SPACING.sm,
    borderWidth: 1,
  },
  iconWrap: { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FONT_SIZE.sm, fontFamily: F.bold },
  sub:   { fontSize: FONT_SIZE.xs, fontFamily: F.regular, marginTop: 1 },
});
