import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { F, FONT_SIZE, RADIUS, SCREEN_GUTTER, SPACING } from '@/utilities/constants';

type IoniconName = keyof typeof FontAwesome5.glyphMap;

// One shared amber "something needs you" treatment — both the creator and
// business home screens had their own copy of this (pending-work/proposals
// banner, profile-completion banner), each with its own hardcoded amber hex
// values. Centralized here so every "needs your attention" moment in the app
// reads as the same visual language, not four near-identical one-offs.
const ATTENTION = {
  bg: '#FFFBEB', border: '#FDE68A', iconBg: '#FEF3C7',
  icon: '#D97706', title: '#92400E', sub: '#B45309',
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
  // Horizontal inset — defaults to the app's shared screen gutter so this
  // lines up with everything else on the page without the caller having to
  // remember the value. Pass `marginHorizontal: 0` via a wrapping View instead
  // if a screen needs it flush (rare).
  style?: { marginHorizontal?: number; marginTop?: number };
};

export function AttentionBanner({ icon, title, subtitle, onPress, numberOfLines = 1, onDismiss, style }: Props) {
  return (
    <Pressable
      style={[s.banner, { marginHorizontal: style?.marginHorizontal ?? SCREEN_GUTTER, marginTop: style?.marginTop ?? SPACING.lg }]}
      onPress={onPress}>
      <View style={s.iconWrap}>
        <FontAwesome5 name={icon} solid size={18} color={ATTENTION.icon} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.sub} numberOfLines={numberOfLines}>{subtitle}</Text>
      </View>
      {onDismiss ? (
        <Pressable hitSlop={10} onPress={(e) => { e.stopPropagation(); onDismiss(); }}>
          <FontAwesome5 name="times" solid size={16} color={ATTENTION.sub} />
        </Pressable>
      ) : (
        <FontAwesome5 name="chevron-right" solid size={16} color={ATTENTION.icon} />
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md,
    marginBottom: 0, padding: SPACING.md, gap: SPACING.sm,
    backgroundColor: ATTENTION.bg, borderWidth: 1, borderColor: ATTENTION.border,
  },
  iconWrap: { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: ATTENTION.iconBg, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FONT_SIZE.sm, color: ATTENTION.title, fontFamily: F.bold },
  sub:   { fontSize: FONT_SIZE.xs, color: ATTENTION.sub, fontFamily: F.regular, marginTop: 1 },
});
