import { FontAwesome5 } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { F, FONT_SIZE, RADIUS } from '@/utilities/constants';

export type SegmentedMenuItem = {
  key: string;
  label: string;
  icon?: keyof typeof FontAwesome5.glyphMap;
};

/**
 * Top-level type menu — equal-width pill segments, the selected one filled
 * brand color. Used above a screen's status sub-tabs (TabSlider): business
 * My Work (Paid / Open / Competitions), creator Find Work and Applications.
 * The caller owns outer spacing via `style`.
 */
export function SegmentedMenu({
  items,
  active,
  onChange,
  style,
}: {
  items: SegmentedMenuItem[];
  active: string;
  onChange: (key: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const C = useAppColors();
  return (
    <View style={[styles.menu, { backgroundColor: C.surface, borderColor: C.border }, style]} accessibilityRole="tablist">
      {items.map((it) => {
        const on = it.key === active;
        return (
          <Pressable
            key={it.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={it.label}
            onPress={() => { if (!on) onChange(it.key); }}
            style={[styles.item, on && { backgroundColor: C.brinjal1 }]}>
            {it.icon && <FontAwesome5 name={it.icon} solid size={12} color={on ? '#fff' : C.textSecondary} />}
            <Text
              style={[styles.text, { color: on ? '#fff' : C.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 6,
    borderRadius: RADIUS.full,
  },
  text: { fontFamily: F.semibold, fontSize: FONT_SIZE.sm, flexShrink: 1 },
});
