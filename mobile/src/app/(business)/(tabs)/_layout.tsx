import { router, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  Animated, Dimensions, PanResponder, Platform,
  Pressable, StyleSheet, Text, View,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { DrawerContext } from '@/context/DrawerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { BusinessDrawerMenu } from '@/features/business/components/BusinessDrawerMenu';
import { COLORS, RADIUS, SHADOW } from '@/utilities/constants';
import { useNotificationBadge } from '@/context/NotificationContext';
import { scrollToTopEvents } from '@/lib/scrollToTopEvents';

type IoniconName = keyof typeof Ionicons.glyphMap;

// ── Tab config ────────────────────────────────────────────────────────────────

// `color` is omitted for `index` (Home) — it uses the theme's brinjal accent instead, resolved at render time.
const TAB_CONFIG: Record<string, { icon: IoniconName; iconActive: IoniconName; label: string; color?: string }> = {
  index:         { icon: 'home-outline',          iconActive: 'home',          label: 'Home' },
  campaigns:     { icon: 'briefcase-outline',     iconActive: 'briefcase',     label: 'Events',    color: '#059669' },
  messages:      { icon: 'chatbubble-outline',    iconActive: 'chatbubble',    label: 'Messages',  color: '#2563EB' },
  notifications: { icon: 'notifications-outline', iconActive: 'notifications', label: 'Activity',  color: '#D97706' },
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
  notifBadge,
}: {
  state: any;
  navigation: any;
  chatBadge: number;
  notifBadge: number;
}) {
  const C = useAppColors();
  const { t } = useLanguage();

  if (isChatRoomFocused(state)) return null;

  const labelMap: Record<string, string> = {
    index:         t('business.tab.home'),
    campaigns:     t('business.tab.events'),
    messages:      t('business.tab.messages'),
    notifications: t('business.tab.notifications'),
  };

  const badgeMap: Record<string, number> = {
    messages:      chatBadge,
    notifications: notifBadge,
  };

  const tabs = (state.routes as any[]).filter((r) => TAB_CONFIG[r.name]);

  return (
    <View style={[tabS.bar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
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
              {/* Badge dot */}
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

            {/* Active underline dot */}
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

// ── FAB setup ─────────────────────────────────────────────────────────────────

const FAB_SIZE = 58;
const { width: SW, height: SH } = Dimensions.get('window');
const TAB_H = Platform.OS === 'ios' ? 84 : 64;
const FAB_INIT = {
  x: SW - FAB_SIZE - 20,
  y: (SH - TAB_H) / 2 - FAB_SIZE / 2,
};

// ── Layout ────────────────────────────────────────────────────────────────────

export default function BusinessTabsLayout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const C = useAppColors();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { badgeCount: notifBadge, chatBadgeCount: badgeCount } = useNotificationBadge();

  // Draggable FAB
  const fabPos    = useRef(new Animated.ValueXY(FAB_INIT)).current;
  const fabIsDrag = useRef(false);

  const fabPR = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        fabPos.setOffset({
          x: (fabPos.x as any)._value,
          y: (fabPos.y as any)._value,
        });
        fabPos.setValue({ x: 0, y: 0 });
        fabIsDrag.current = false;
      },
      onPanResponderMove: (_, gs) => {
        if (Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4) fabIsDrag.current = true;
        fabPos.setValue({ x: gs.dx, y: gs.dy });
      },
      onPanResponderRelease: () => {
        fabPos.flattenOffset();
        const cx = (fabPos.x as any)._value as number;
        const cy = (fabPos.y as any)._value as number;
        const clampX = Math.max(8, Math.min(cx, SW - FAB_SIZE - 8));
        const clampY = Math.max(40, Math.min(cy, SH - TAB_H - FAB_SIZE - 8));
        if (clampX !== cx || clampY !== cy) {
          Animated.spring(fabPos, {
            toValue: { x: clampX, y: clampY },
            useNativeDriver: false,
            bounciness: 8,
          }).start();
        }
        if (!fabIsDrag.current) router.push('/create-campaign');
        fabIsDrag.current = false;
      },
    })
  ).current;

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
              notifBadge={notifBadge}
            />
          )}
        >
          <Tabs.Screen name="index"    options={{ title: t('business.tab.home') }} />
          <Tabs.Screen name="campaigns" options={{ title: t('business.tab.events') }} />
          {/* proposals.tsx stays a reachable route (linked from the home
              quick actions and the pending-proposals banner) but is no
              longer a bottom-tab destination — per-campaign proposals now
              open via campaign-proposals.tsx from each event card instead. */}
          <Tabs.Screen name="proposals" options={{ href: null }} />
          <Tabs.Screen
            name="messages"
            listeners={({ navigation }) => ({
              tabPress: (e) => {
                e.preventDefault();
                navigation.navigate('messages', { screen: 'index' });
              },
            })}
            options={{ title: t('business.tab.messages') }}
          />
          <Tabs.Screen name="notifications" options={{ title: t('business.tab.notifications') }} />
          {/* create.tsx is navigated via FAB, not a visible tab */}
          <Tabs.Screen name="create" options={{ href: null }} />
        </Tabs>

        {/* Draggable FAB */}
        <Animated.View
          style={[fabS.wrap, { transform: fabPos.getTranslateTransform() }]}
          {...fabPR.panHandlers}
        >
          <View style={[fabS.circle, { backgroundColor: C.brinjal1 }]}>
            <Ionicons name="add" size={26} color="#fff" />
          </View>
        </Animated.View>

        <BusinessDrawerMenu
          visible={drawerOpen}
          user={user}
          onClose={() => setDrawerOpen(false)}
          onLogout={() => { setDrawerOpen(false); setTimeout(logout, 220); }}
        />
      </View>
    </DrawerContext.Provider>
  );
}

const fabS = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 300,
  },
  circle: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    ...SHADOW.floating,
    shadowColor: '#1e1b4b',
    shadowOpacity: 0.4,
    shadowOffset: { width: 2, height: 5 },
    elevation: 14,
  },
});
