import { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppColors } from '@/context/ThemeContext';
import { F, SHADOW } from '@/utilities/constants';

type IoniconName = keyof typeof FontAwesome5.glyphMap;

export type TabDef = {
  key: string;
  label: string;
  icon?: IoniconName;
  count?: number;
  color?: string;
};

type Props = {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
  justify?: boolean;
};

export function TabSlider({ tabs, active, onChange, justify = false }: Props) {
  const C = useAppColors();
  const scrollRef    = useRef<ScrollView>(null);
  const indicatorX   = useRef(new Animated.Value(0)).current;
  const indicatorW   = useRef(new Animated.Value(0)).current;
  const tabLayouts   = useRef<{ x: number; width: number }[]>([]);
  const [showLeftFade, setShowLeftFade]   = useState(false);
  const [showRightFade, setShowRightFade] = useState(!justify && tabs.length > 3);

  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];
  const activeColor = activeTab?.color ?? '#4F46E5';

  // Keeps the indicator pill in sync when `active` changes from outside
  // (e.g. a quick-action deep-link setting the tab via a URL param) rather
  // than from a press here — handlePress already animates for the press case.
  useEffect(() => {
    const idx = tabs.findIndex((t) => t.key === active);
    const layout = idx >= 0 ? tabLayouts.current[idx] : undefined;
    if (layout) {
      Animated.spring(indicatorX, { toValue: layout.x + 2, useNativeDriver: false, speed: 22, bounciness: 4 }).start();
      Animated.spring(indicatorW, { toValue: layout.width - 4, useNativeDriver: false, speed: 22, bounciness: 4 }).start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function handleLayout(idx: number, e: LayoutChangeEvent) {
    const { x, width } = e.nativeEvent.layout;
    tabLayouts.current[idx] = { x, width };
    if (tabs[idx].key === active) {
      indicatorX.setValue(x + 2);
      indicatorW.setValue(width - 4);
    }
  }

  function handlePress(tab: TabDef, idx: number) {
    onChange(tab.key);
    const layout = tabLayouts.current[idx];
    if (layout) {
      Animated.spring(indicatorX, { toValue: layout.x + 2, useNativeDriver: false, speed: 22, bounciness: 4 }).start();
      Animated.spring(indicatorW, { toValue: layout.width - 4, useNativeDriver: false, speed: 22, bounciness: 4 }).start();
      if (!justify) scrollRef.current?.scrollTo({ x: Math.max(0, layout.x - 40), animated: true });
    }
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setShowLeftFade(contentOffset.x > 4);
    setShowRightFade(contentOffset.x + layoutMeasurement.width < contentSize.width - 4);
  }

  const tabItems = tabs.map((tab, idx) => {
    const isActive = tab.key === active;
    const tabColor = tab.color ?? '#4F46E5';
    return (
      <Pressable
        key={tab.key}
        onLayout={(e) => handleLayout(idx, e)}
        onPress={() => handlePress(tab, idx)}
        style={[s.tab, justify && s.tabFlex]}
      >
        <View style={[s.tabInner, justify && s.tabInnerCenter, justify && s.tabInnerJustify]}>
          {tab.icon && (
            <FontAwesome5 name={tab.icon} size={14} color={isActive ? '#fff' : C.textSecondary} />
          )}
          <Text
            style={[s.tabLabel, { color: isActive ? '#fff' : C.textSecondary }]}
            numberOfLines={1}
            adjustsFontSizeToFit={justify}
            minimumFontScale={0.8}
          >
            {tab.label}
          </Text>
          {tab.count !== undefined && tab.count > 0 && (
            <View style={[s.badge, { backgroundColor: isActive ? '#fff' : C.border }]}>
              <Text style={[s.badgeTxt, { color: isActive ? tabColor : C.textSecondary }]}>
                {tab.count > 99 ? '99+' : tab.count}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  });

  return (
    <View style={[s.wrapper, { backgroundColor: C.background, borderRadius: 14 }]}>
      {justify ? (
        <View style={s.row}>
          <Animated.View
            style={[s.indicator, SHADOW.raised, { backgroundColor: activeColor, left: indicatorX, width: indicatorW }]}
            pointerEvents="none"
          />
          {tabItems}
        </View>
      ) : (
        <View>
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.scroll}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            bounces={false}
          >
            <Animated.View
              style={[s.indicator, SHADOW.raised, { backgroundColor: activeColor, left: indicatorX, width: indicatorW }]}
              pointerEvents="none"
            />
            {tabItems}
          </ScrollView>
          {showLeftFade && (
            <LinearGradient
              colors={[C.background, `${C.background}00`]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[s.fade, s.fadeLeft]}
              pointerEvents="none"
            />
          )}
          {showRightFade && (
            <LinearGradient
              colors={[`${C.background}00`, C.background]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[s.fade, s.fadeRight]}
              pointerEvents="none"
            />
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper:        { padding: 3 },
  row:            { flexDirection: 'row' },
  scroll:         { paddingHorizontal: 3, paddingBottom: 0 },
  tab:            { paddingHorizontal: 3, paddingVertical: 3 },
  tabFlex:        { flex: 1, alignItems: 'center' },
  tabInner:       { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  tabInnerCenter: { justifyContent: 'center' },
  // Justified mode packs every tab into one fixed-width row (no horizontal
  // scroll to fall back on), so labels need every spare pixel — tighter
  // padding/gap than the scrollable variant, which has room to breathe.
  tabInnerJustify: { paddingHorizontal: 4, gap: 3 },
  tabLabel:       { fontSize: 13, fontFamily: F.bold },
  badge:          { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, justifyContent: 'center', alignItems: 'center' },
  badgeTxt:       { fontSize: 10, fontFamily: F.extrabold },
  indicator:      { position: 'absolute', top: 3, bottom: 3, borderRadius: 10 },
  fade:           { position: 'absolute', top: 0, bottom: 0, width: 24 },
  fadeLeft:       { left: 0 },
  fadeRight:      { right: 0 },
});
