import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useContext, useState } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { DrawerContext } from '@/context/DrawerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { DrawerMenu } from '@/features/creator/components/DrawerMenu';
import { useNotificationBadge } from '@/context/NotificationContext';
import { scrollToTopEvents } from '@/lib/scrollToTopEvents';
import { RADIUS, SHADOW } from '@/utilities/constants';

type IoniconName = keyof typeof Ionicons.glyphMap;

// ── Tab config ────────────────────────────────────────────────────────────────

// `color` is omitted for `index` (Home) — it uses the theme's brinjal accent instead, resolved at render time.
// The `notifications` route stays a real tab-navigator screen (reachable from the
// header's activity button — see index.tsx), but its bottom-bar slot is repurposed
// below to open the drawer instead, swapping places with the old header hamburger.
const TAB_CONFIG: Record<string, { icon: IoniconName; iconActive: IoniconName; label: string; color?: string }> = {
  index:         { icon: 'home-outline',          iconActive: 'home',          label: 'Home' },
  proposals:     { icon: 'document-text-outline', iconActive: 'document-text', label: 'Proposals',  color: '#7C3AED' },
  messages:      { icon: 'chatbubble-outline',    iconActive: 'chatbubble',    label: 'Messages',   color: '#2563EB' },
  notifications: { icon: 'menu-outline',          iconActive: 'menu',          label: 'Menu' },
};

// ── Custom tab bar ────────────────────────────────────────────────────────────

// Hides the tab bar while a chat conversation ([id]) is open inside the
// messages stack, so the chat input isn't followed by a strip of dead tab-bar space.
function isChatRoomFocused(state: any): boolean {
  const focused = state.routes[state.index];
  if (focused?.name !== 'messages' || !focused.state) return false;
  return focused.state.routes[focused.state.index]?.name === '[id]';
}

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
  const { openDrawer } = useContext(DrawerContext);

  if (isChatRoomFocused(state)) return null;

  const labelMap: Record<string, string> = {
    index:         t('creator.tab.home'),
    proposals:     t('creator.tab.proposals'),
    messages:      t('creator.tab.messages'),
    notifications: t('creator.tab.menu'),
  };

  const badgeMap: Record<string, number> = {
    messages: chatBadge,
  };

  const tabs = (state.routes as any[]).filter((r) => TAB_CONFIG[r.name]);

  return (
    <View style={[tabS.bar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
      {tabs.map((route) => {
        // The `notifications` slot now opens the drawer (swapped with the header
        // hamburger) rather than navigating to a screen, so it never shows as "active".
        const isMenu  = route.name === 'notifications';
        const focused = !isMenu && state.routes[state.index]?.name === route.name;
        const cfg     = TAB_CONFIG[route.name]!;
        const label   = labelMap[route.name] ?? cfg.label;
        const badge   = badgeMap[route.name] ?? 0;
        const color   = cfg.color ?? C.brinjal1;

        function onPress() {
          if (isMenu) { openDrawer(); return; }
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
            android_ripple={{ color: 'transparent' }}
          >
            {/* Icon bubble */}
            <View
              style={[
                tabS.bubble,
                focused && { backgroundColor: `${color}18` },
              ]}
            >
              <Ionicons
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

const tabS = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 6,
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
  const { chatBadgeCount: badgeCount } = useNotificationBadge();

  return (
    <DrawerContext.Provider value={{ openDrawer: () => setDrawerOpen(true) }}>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{ headerShown: false }}
          tabBar={(props) => (
            <CustomTabBar
              state={props.state}
              navigation={props.navigation}
              chatBadge={badgeCount}
            />
          )}
        >
          <Tabs.Screen name="index"    options={{ title: t('creator.tab.home') }} />
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
        </Tabs>

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
