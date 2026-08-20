import { Tabs } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useState, useSyncExternalStore } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { DrawerContext } from '@/context/DrawerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { DrawerMenu } from '@/features/creator/components/DrawerMenu';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { useNotificationBadge } from '@/context/NotificationContext';
import { scrollToTopEvents } from '@/lib/scrollToTopEvents';
import { chatScreenOpenEvents } from '@/lib/chatScreenOpenEvents';
import { RADIUS, SHADOW } from '@/utilities/constants';

type IoniconName = keyof typeof FontAwesome5.glyphMap;

// ── Tab config ────────────────────────────────────────────────────────────────

// `color` is omitted for `index` (Home) and `discover` — they use the theme's
// brinjal accent instead, resolved at render time. The header's bell button
// (see index.tsx) is `notifications`' real entry point now that it's off the
// bar. `discover` holds all the search/filter/browse/nearby functionality
// that used to live on Home directly (see discover.tsx) — Home itself is now
// a lightweight "next best action" dashboard.
// "proposals" (Applications) and "notifications" (Activity) are intentionally
// absent here — both are still real, routable screens (see the <Tabs.Screen>
// entries below), reached from Home's quick actions / header bell rather than
// a bottom tab bar icon.
const TAB_CONFIG: Record<string, { icon: IoniconName; iconActive: IoniconName; label: string; color?: string }> = {
  index:         { icon: 'home',          iconActive: 'home',          label: 'Home' },
  discover:      { icon: 'search',        iconActive: 'search',        label: 'Discover' },
  messages:      { icon: 'comment',    iconActive: 'comment',    label: 'Messages',   color: '#2563EB' },
  profile:       { icon: 'user', iconActive: 'user', label: 'Profile' },
};

// ── Custom tab bar ────────────────────────────────────────────────────────────

function CustomTabBar({
  state,
  navigation,
  chatBadge,
}: {
  state: any;
  navigation: any;
  chatBadge: number;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  // Real home-indicator/gesture-nav inset varies a lot by device (0 on an
  // iPhone SE or 3-button-nav Android, ~34pt on notched iPhones) — a fixed
  // guess either wastes space or lets the bar sit under the system nav bar.
  // The floor keeps a little breathing room under the label on devices that
  // report 0 (physical home button / classic Android nav).
  const bottomInset = Math.max(insets.bottom, 8);

  // Hides the tab bar while a chat conversation ([id]) is open. Each chat
  // screen reports itself via chatScreenOpenEvents from a useLayoutEffect,
  // so this updates synchronously before the frame paints — see that
  // module's comment for why a usePathname()-based check (the previous
  // approach) caused a visible one-frame jump.
  const chatOpen = useSyncExternalStore(chatScreenOpenEvents.subscribe, chatScreenOpenEvents.isOpen, chatScreenOpenEvents.isOpen);
  if (chatOpen) return null;

  const labelMap: Record<string, string> = {
    index:         t('creator.tab.home'),
    discover:      t('creator.tab.discover'),
    proposals:     t('creator.tab.proposals'),
    messages:      t('creator.tab.messages'),
    notifications: t('creator.tab.activity'),
    profile:       t('creator.tab.profile'),
  };

  const badgeMap: Record<string, number> = {
    messages:      chatBadge,
  };

  const tabs = (state.routes as any[]).filter((r) => TAB_CONFIG[r.name]);

  return (
    <View
      style={[
        tabS.bar,
        { backgroundColor: C.surface, borderTopColor: C.border, height: TAB_BAR_CONTENT_HEIGHT + bottomInset, paddingBottom: bottomInset },
      ]}
    >
      {tabs.map((route) => {
        const focused = state.routes[state.index]?.name === route.name;
        const cfg     = TAB_CONFIG[route.name]!;
        const label   = labelMap[route.name] ?? cfg.label;
        const badge   = badgeMap[route.name] ?? 0;
        const color   = cfg.color ?? C.brinjal1;

        function onPress() {
          // Always fires, whether this tab is already focused or not — the
          // destination screen's own useScrollToTopOnTabPress listener scrolls its
          // list back up, since Tabs keeps every screen mounted (and scrolled where
          // you left it) when switching away and back.
          scrollToTopEvents.emit(route.name);
          if (route.name === 'messages') {
            navigation.navigate('messages', { screen: 'index' });
          } else {
            navigation.navigate(route.name);
          }
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={tabS.item}
          >
            {/* Icon bubble */}
            <View
              style={[
                tabS.bubble,
                focused && { backgroundColor: `${color}18` },
              ]}
            >
              <FontAwesome5
                name={focused ? cfg.iconActive : cfg.icon}
                size={21}
                color={focused ? color : '#ABABBB'}
              />
              {badge > 0 && (
                <View style={tabS.badge}>
                  <Text style={tabS.badgeTxt}>{badge > 99 ? '99+' : badge}</Text>
                </View>
              )}
            </View>

            {/* Label */}
            <Text
              style={[
                tabS.label,
                { color: focused ? color : '#ABABBB', fontWeight: focused ? '700' : '500' },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>

            {/* Active dot */}
            {focused && <View style={[tabS.dot, { backgroundColor: color }]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

// Height of the tab bar's actual content (icons + labels), before the
// safe-area inset is added on top — height/paddingBottom below are computed
// per-device from useSafeAreaInsets() instead of hardcoded here.
const TAB_BAR_CONTENT_HEIGHT = 56;

const tabS = StyleSheet.create({
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
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bubble: {
    width: 46,
    height: 32,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  label: {
    fontSize: 10.5,
    letterSpacing: 0.1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: RADIUS.full,
    marginTop: 1,
  },
  badge: {
    position: 'absolute',
    top: 1,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: RADIUS.full,
    minWidth: 15,
    height: 15,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeTxt: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
  },
});

// ── Layout ────────────────────────────────────────────────────────────────────

export default function CreatorTabsLayout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const C = useAppColors();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { chatBadgeCount } = useNotificationBadge();

  return (
    <DrawerContext.Provider value={{ openDrawer: () => setDrawerOpen(true) }}>
      <View style={{ flex: 1 }}>
        <MaxWidthContainer>
          <Tabs
            screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.background } }}
            tabBar={(props) => (
              <CustomTabBar
                state={props.state}
                navigation={props.navigation}
                chatBadge={chatBadgeCount}
              />
            )}
          >
            <Tabs.Screen name="index"    options={{ title: t('creator.tab.home') }} />
            <Tabs.Screen name="discover" options={{ title: t('creator.tab.discover') }} />
            <Tabs.Screen name="proposals" options={{ title: t('creator.tab.proposals') }} />
            <Tabs.Screen
              name="messages"
              listeners={({ navigation }) => ({
                tabPress: (e) => {
                  e.preventDefault();
                  navigation.navigate('messages', { screen: 'index' });
                },
              })}
              options={{ title: t('creator.tab.messages') }}
            />
            <Tabs.Screen name="notifications" options={{ title: t('creator.tab.activity') }} />
            <Tabs.Screen name="profile" options={{ title: t('creator.tab.profile') }} />
          </Tabs>
        </MaxWidthContainer>

        <DrawerMenu
          visible={drawerOpen}
          user={user}
          onClose={() => setDrawerOpen(false)}
          onLogout={() => { setDrawerOpen(false); setTimeout(logout, 220); }}
        />
      </View>
    </DrawerContext.Provider>
  );
}
