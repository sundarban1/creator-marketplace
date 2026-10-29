import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useAnimatedValue, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
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
 *
 * The filled pill is one shared layer that slides between segments (native
 * driver, same spring as TabSlider) instead of each segment swapping its own
 * background. The selected label is a size up; the rest share a smaller size.
 */
const PAD = 4;
const GAP = 4;
const BORDER = 1;

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
  const activeIdx = Math.max(0, items.findIndex((it) => it.key === active));
  // Segments are sized by their label (not equal thirds/quarters) so a long
  // one like "Competitions" has room to show the bigger selected size instead
  // of being auto-shrunk back down. The pill tracks each segment's measured
  // box; left/width can't use the native driver, but it's a tiny view.
  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const left = useAnimatedValue(0);
  const pillW = useAnimatedValue(0);
  const placed = useRef(false);
  const target = layouts[items[activeIdx]?.key ?? ''];

  useEffect(() => {
    if (!target) return;
    // First measure snaps into place; later changes slide.
    if (!placed.current) {
      left.setValue(target.x);
      pillW.setValue(target.width);
      placed.current = true;
      return;
    }
    const cfg = { useNativeDriver: false, speed: 20, bounciness: 4 } as const;
    Animated.parallel([
      Animated.spring(left, { toValue: target.x, ...cfg }),
      Animated.spring(pillW, { toValue: target.width, ...cfg }),
    ]).start();
  }, [target?.x, target?.width, left, pillW]); // eslint-disable-line react-hooks/exhaustive-deps

  function onItemLayout(key: string, e: LayoutChangeEvent) {
    // Measured x includes the 1px border; the pill is placed inside it.
    const { width } = e.nativeEvent.layout;
    const x = e.nativeEvent.layout.x - BORDER;
    setLayouts((prev) => (prev[key]?.x === x && prev[key]?.width === width ? prev : { ...prev, [key]: { x, width } }));
  }

  return (
    <View
      style={[styles.menu, { backgroundColor: C.surface, borderColor: C.border }, style]}
      accessibilityRole="tablist">
      {target && (
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { left, width: pillW, backgroundColor: C.brinjal1 }]}
        />
      )}
      {items.map((it) => {
        const on = it.key === active;
        return (
          <Pressable
            key={it.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={it.label}
            onPress={() => { if (!on) onChange(it.key); }}
            onLayout={(e) => onItemLayout(it.key, e)}
            style={styles.item}>
            {it.icon && <FontAwesome5 name={it.icon} solid size={on ? 13 : 11} color={on ? '#fff' : C.textSecondary} />}
            <Text
              style={[on ? styles.textOn : styles.textOff, { color: on ? '#fff' : C.text }]}
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
    padding: PAD,
    gap: GAP,
    borderRadius: RADIUS.full,
    borderWidth: BORDER,
  },
  item: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 8,
    borderRadius: RADIUS.full,
  },
  pill: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    borderRadius: RADIUS.full,
  },
  textOn:  { fontFamily: F.bold, fontSize: FONT_SIZE.md, flexShrink: 1 },
  textOff: { fontFamily: F.semibold, fontSize: 12, flexShrink: 1 },
});
