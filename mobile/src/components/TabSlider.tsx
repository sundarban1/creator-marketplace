import { useRef } from 'react';
import { Animated, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { F } from '@/utilities/constants';

type IoniconName = keyof typeof Ionicons.glyphMap;

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

  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];
  const activeColor = activeTab?.color ?? '#4F46E5';

  function handleLayout(idx: number, e: LayoutChangeEvent) {
    const { x, width } = e.nativeEvent.layout;
    tabLayouts.current[idx] = { x, width };
    if (tabs[idx].key === active) {
      indicatorX.setValue(x + 8);
      indicatorW.setValue(width - 16);
    }
  }

  function handlePress(tab: TabDef, idx: number) {
    onChange(tab.key);
    const layout = tabLayouts.current[idx];
    if (layout) {
      Animated.spring(indicatorX, { toValue: layout.x + 8, useNativeDriver: false, speed: 22, bounciness: 4 }).start();
      Animated.spring(indicatorW, { toValue: layout.width - 16, useNativeDriver: false, speed: 22, bounciness: 4 }).start();
      if (!justify) scrollRef.current?.scrollTo({ x: Math.max(0, layout.x - 40), animated: true });
    }
  }

  const tabItems = tabs.map((tab, idx) => {
    const isActive = tab.key === active;
    const tabColor = tab.color ?? '#4F46E5';
    return (
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        key={tab.key}
        onLayout={(e) => handleLayout(idx, e)}
        onPress={() => handlePress(tab, idx)}
        style={[s.tab, justify && s.tabFlex]}
      >
        <View style={[s.tabInner, justify && s.tabInnerCenter, isActive && { backgroundColor: `${tabColor}15` }]}>
          {tab.icon && (
            <Ionicons name={tab.icon} size={14} color={isActive ? tabColor : C.textSecondary} />
          )}
          <Text style={[s.tabLabel, { color: isActive ? tabColor : C.textSecondary }]}>
            {tab.label}
          </Text>
          {tab.count !== undefined && tab.count > 0 && (
            <View style={[s.badge, { backgroundColor: tabColor }]}>
              <Text style={[s.badgeTxt, { color: '#fff' }]}>
                {tab.count > 99 ? '99+' : tab.count}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  });

  return (
    <View style={s.wrapper}>
      {justify ? (
        <View style={s.row}>
          {tabItems}
          <Animated.View
            style={[s.indicator, { backgroundColor: activeColor, left: indicatorX, width: indicatorW }]}
            pointerEvents="none"
          />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          bounces={false}
        >
          {tabItems}
          <Animated.View
            style={[s.indicator, { backgroundColor: activeColor, left: indicatorX, width: indicatorW }]}
            pointerEvents="none"
          />
        </ScrollView>
      )}

      <View style={[s.border, { backgroundColor: C.border }]} />
    </View>
  );
}

const s = StyleSheet.create({
  wrapper:        { backgroundColor: 'transparent' },
  row:            { flexDirection: 'row' },
  scroll:         { paddingHorizontal: 12, paddingBottom: 0 },
  tab:            { paddingHorizontal: 4, paddingVertical: 10 },
  tabFlex:        { flex: 1, alignItems: 'center' },
  tabInner:       { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  tabInnerCenter: { justifyContent: 'center' },
  tabLabel:       { fontSize: 13, fontFamily: F.bold },
  badge:          { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, justifyContent: 'center', alignItems: 'center' },
  badgeTxt:       { fontSize: 10, fontFamily: F.extrabold },
  indicator:      { position: 'absolute', bottom: 0, height: 3, borderRadius: 2 },
  border:         { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
});
