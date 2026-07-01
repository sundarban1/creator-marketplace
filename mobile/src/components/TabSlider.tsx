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
};

export function TabSlider({ tabs, active, onChange }: Props) {
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
      scrollRef.current?.scrollTo({ x: Math.max(0, layout.x - 40), animated: true });
    }
  }

  return (
    <View style={s.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        bounces={false}
      >
        {tabs.map((tab, idx) => {
          const isActive  = tab.key === active;
          const tabColor  = tab.color ?? '#4F46E5';
          return (
            <Pressable
              key={tab.key}
              onLayout={(e) => handleLayout(idx, e)}
              onPress={() => handlePress(tab, idx)}
              style={s.tab}
            >
              <View style={[s.tabInner, isActive && { backgroundColor: `${tabColor}15` }]}>
                {tab.icon && (
                  <Ionicons name={tab.icon} size={14} color={isActive ? tabColor : C.textSecondary} />
                )}
                <Text style={[s.tabLabel, { color: isActive ? tabColor : C.textSecondary }]}>
                  {tab.label}
                </Text>
                {tab.count !== undefined && tab.count > 0 && (
                  <View style={[s.badge, { backgroundColor: isActive ? tabColor : C.border }]}>
                    <Text style={[s.badgeTxt, { color: isActive ? '#fff' : C.textSecondary }]}>
                      {tab.count > 99 ? '99+' : tab.count}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}

        <Animated.View
          style={[s.indicator, { backgroundColor: activeColor, left: indicatorX, width: indicatorW }]}
          pointerEvents="none"
        />
      </ScrollView>

      <View style={[s.border, { backgroundColor: C.border }]} />
    </View>
  );
}

const s = StyleSheet.create({
  wrapper:   { backgroundColor: 'transparent' },
  scroll:    { paddingHorizontal: 12, paddingBottom: 0 },
  tab:       { paddingHorizontal: 4, paddingVertical: 10 },
  tabInner:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  tabLabel:  { fontSize: 13, fontFamily: F.bold },
  badge:     { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, justifyContent: 'center', alignItems: 'center' },
  badgeTxt:  { fontSize: 10, fontFamily: F.extrabold },
  indicator: { position: 'absolute', bottom: 0, height: 3, borderRadius: 2 },
  border:    { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
});
