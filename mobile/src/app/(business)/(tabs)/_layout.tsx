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
import { COLORS } from '@/utilities/constants';
import { useNotificationBadge } from '@/context/NotificationContext';

type IoniconName = keyof typeof Ionicons.glyphMap;

// ── Tab config ────────────────────────────────────────────────────────────────

const TAB_CONFIG: Record<string, { icon: IoniconName; iconActive: IoniconName; label: string }> = {
  index:         { icon: 'home-outline',          iconActive: 'home',          label: 'Home' },
  campaigns:     { icon: 'briefcase-outline',     iconActive: 'briefcase',     label: 'Events' },
  proposals:     { icon: 'document-text-outline', iconActive: 'document-text', label: 'Proposals' },
  messages:      { icon: 'chatbubble-outline',    iconActive: 'chatbubble',    label: 'Messages' },
  notifications: { icon: 'notifications-outline', iconActive: 'notifications', label: 'Activity' },
};

// ── Custom tab bar ────────────────────────────────────────────────────────────

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

  const labelMap: Record<string, string> = {
    index:         t('business.tab.home'),
    campaigns:     t('business.tab.events'),
    proposals:     t('business.tab.proposals'),
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

        function onPress() {
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
                focused && { backgroundColor: `${C.brinjal1}18` },
              ]}
            >
              <Ionicons
                name={focused ? cfg.iconActive : cfg.icon}
                size={21}
                color={focused ? C.brinjal1 : '#ABABBB'}
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
                { color: focused ? C.brinjal1 : '#ABABBB', fontWeight: focused ? '700' : '500' },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>

            {/* Active underline dot */}
            {focused && <View style={[tabS.dot, { backgroundColor: C.brinjal1 }]} />}
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
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 6,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  bubble: {
    width: 44,
    height: 32,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  label: {
    fontSize: 10,
    letterSpacing: 0,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  badge: {
    position: 'absolute',
    top: 1,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeTxt: {
    fontSize: 8,
    fontWeight: '800',
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
          <Tabs.Screen name="proposals" options={{ title: t('business.tab.proposals') }} />
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
    borderRadius: FAB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#1e1b4b',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 2, height: 5 },
    elevation: 14,
  },
});
