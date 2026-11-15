import { useRef, useState, type ReactElement } from 'react';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';

const GAP = SPACING.md;
// How much of the next card shows at the right edge — tells the user the row swipes.
const PEEK = 28;
const ARROW = 36;

/**
 * Horizontal card slider with ‹ › arrows on both sides. Swipe or tap an
 * arrow; cards snap into place. The left arrow is hidden at the start and the
 * right arrow at the end, so each side's arrow disappears once there's
 * nothing more in that direction.
 *
 * Default: one card per view (with a peek of the next). Pass `itemWidth` for
 * a rail of narrower cards — the arrows then page by a screenful.
 */
export function CardSlider<T>({
  data,
  keyExtractor,
  renderItem,
  itemWidth,
}: {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactElement;
  itemWidth?: number;
}) {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<T>>(null);
  const [offset, setOffset] = useState(0);

  const n = data.length;
  // One-up mode: a lone card takes the full width; otherwise leave room for the peek.
  const cardW = itemWidth ?? width - SCREEN_GUTTER * 2 - (n <= 1 ? 0 : PEEK);
  const step = cardW + GAP;
  const contentW = SCREEN_GUTTER * 2 + n * cardW + Math.max(0, n - 1) * GAP;
  const maxOffset = Math.max(0, contentW - width);
  // Arrow taps move one card (one-up) or one screenful of cards (rail).
  const perPage = itemWidth ? Math.max(1, Math.floor((width - SCREEN_GUTTER * 2 + GAP) / step)) : 1;
  const atStart = offset <= 2;
  const atEnd = offset >= maxOffset - 2;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    // Only re-render when an arrow's visibility could change.
    if ((x <= 2) !== atStart || (x >= maxOffset - 2) !== atEnd) setOffset(x);
    else if (Math.abs(x - offset) > step) setOffset(x);
  }

  function go(dir: -1 | 1) {
    const current = Math.round(offset / step);
    const target = Math.max(0, Math.min(maxOffset, (current + dir * perPage) * step));
    listRef.current?.scrollToOffset({ offset: target, animated: true });
    setOffset(target);
  }

  return (
    <View>
      <FlatList
        ref={listRef}
        horizontal
        data={data}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => <View style={{ width: cardW }}>{renderItem(item)}</View>}
        ItemSeparatorComponent={Gap}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.content}
        snapToInterval={step}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        onScroll={onScroll}
        scrollEventThrottle={32}
        getItemLayout={(_, i) => ({ length: step, offset: step * i, index: i })}
      />
      {maxOffset > 0 && !atStart && <Arrow side="left" label={t('common.previous')} onPress={() => go(-1)} />}
      {maxOffset > 0 && !atEnd && <Arrow side="right" label={t('common.next')} onPress={() => go(1)} />}
    </View>
  );
}

function Arrow({ side, label, onPress }: { side: 'left' | 'right'; label: string; onPress: () => void }) {
  const C = useAppColors();
  const left = side === 'left';
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        s.arrow,
        left ? { left: SCREEN_GUTTER - ARROW / 2 + 4 } : { right: SCREEN_GUTTER - ARROW / 2 + 4 },
        { backgroundColor: C.surface, borderColor: C.border, opacity: pressed ? 0.8 : 1 },
        SHADOW.raised,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <FontAwesome5 name={left ? 'chevron-left' : 'chevron-right'} size={13} color={C.text} />
    </Pressable>
  );
}

function Gap() {
  return <View style={{ width: GAP }} />;
}

const s = StyleSheet.create({
  content: { paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.xs },
  arrow: {
    position: 'absolute', top: '50%', marginTop: -ARROW / 2,
    width: ARROW, height: ARROW, borderRadius: ARROW / 2, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
});
