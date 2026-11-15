// Guest Navigation — the signed-out experience. RootNavigator
// (src/app/_layout.tsx) sends every visitor without a session here; the
// (creator) / (business) navigations are untouched and only reachable once
// signed in. Bottom bar: Home | Discover | Events | Competitions | Log In,
// styled like the creator tab bar (same bar shape / bubble / dot) but on the
// orange accent so the signed-out app reads as its own space.
import { Tabs, router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { openGuestLogin } from '@/components/GuestAuthPrompt';
import { scrollToTopEvents } from '@/lib/scrollToTopEvents';
import { MIN_TOUCH_TARGET, RADIUS, SHADOW } from '@/utilities/constants';

type IconName = keyof typeof FontAwesome5.glyphMap;

const TABS: { name: string; icon: IconName; labelKey: string }[] = [
  { name: 'index',        icon: 'home',        labelKey: 'guest.tab.home' },
  { name: 'discover',     icon: 'compass',     labelKey: 'guest.tab.discover' },
  { name: 'events',       icon: 'briefcase',   labelKey: 'guest.tab.events' },
  { name: 'competitions', icon: 'trophy',      labelKey: 'guest.tab.competitions' },
  { name: 'sign-in',      icon: 'user-circle', labelKey: 'guest.tab.logIn' },
];

const TAB_BAR_CONTENT_HEIGHT = 56;

function GuestTabBar({ state, navigation }: { state: any; navigation: any }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const focusedName = state.routes[state.index]?.name;

  return (
    <View
      style={[
        s.bar,
        { backgroundColor: C.surface, borderTopColor: C.border, height: TAB_BAR_CONTENT_HEIGHT + bottomInset, paddingBottom: bottomInset },
      ]}>
      {TABS.map((tab) => {
        const route = (state.routes as any[]).find((r) => r.name === tab.name);
        if (!route) return null;
        const focused = focusedName === tab.name;
        const color = focused ? C.accent : C.textPlaceholder;
        const label = t(tab.labelKey);

        function onPress() {
          // "Log In" is an action, not a destination — it opens the existing
          // auth flow on top of the guest tabs (Back returns here).
          if (tab.name === 'sign-in') { openGuestLogin(); return; }
          scrollToTopEvents.emit(`guest-${tab.name}`);
          navigation.navigate(tab.name);
        }

        return (
          <Pressable
            key={tab.name}
            onPress={onPress}
            style={s.item}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: focused }}>
            <View style={[s.bubble, focused && { backgroundColor: `${C.accent}1A` }]}>
              <FontAwesome5 name={tab.icon} solid={focused} size={19} color={color} />
            </View>
            <Text style={[s.label, { color, fontWeight: focused ? '700' : '500' }]} numberOfLines={1}>{label}</Text>
            {focused && <View style={[s.dot, { backgroundColor: C.accent }]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function GuestTabsLayout() {
  const C = useAppColors();
  return (
    <MaxWidthContainer>
      <Tabs
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.background } }}
        tabBar={(props) => <GuestTabBar state={props.state} navigation={props.navigation} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="discover" />
        <Tabs.Screen name="events" />
        <Tabs.Screen name="competitions" />
        {/* Placeholder route so the bar can show "Log In" — tapping it opens /login. */}
        <Tabs.Screen
          name="sign-in"
          listeners={{ tabPress: (e) => { e.preventDefault(); router.push('/login'); } }}
        />
      </Tabs>
    </MaxWidthContainer>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    ...SHADOW.floating,
    shadowOffset: { width: 0, height: -6 },
  },
  item:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: MIN_TOUCH_TARGET },
  bubble: { width: 46, height: 32, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  label:  { fontSize: 10.5, letterSpacing: 0.1 },
  dot:    { width: 4, height: 4, borderRadius: RADIUS.full, marginTop: 1 },
});
