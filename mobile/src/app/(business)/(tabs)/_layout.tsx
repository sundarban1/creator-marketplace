import { router, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, ColorValue, Dimensions, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { DrawerContext } from '@/context/DrawerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { BusinessDrawerMenu } from '@/features/business/components/BusinessDrawerMenu';
import { COLORS } from '@/utilities/constants';
import { useNotificationBadge } from '@/context/NotificationContext';

type IoniconName = keyof typeof Ionicons.glyphMap;

function TabIcon({
  name,
  nameActive,
  size,
  color,
  focused,
  badge,
}: {
  name: IoniconName;
  nameActive: IoniconName;
  size: number;
  color: ColorValue;
  focused: boolean;
  badge?: number;
}) {
  return (
    <View style={tabIcon.wrap}>
      {focused && <View style={[tabIcon.pill, { backgroundColor: COLORS.brinjal1 }]} />}
      <Ionicons name={focused ? nameActive : name} size={size} color={color as string} />
      {!!badge && badge > 0 && (
        <View style={tabIcon.badge}>
          <Text style={tabIcon.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

const tabIcon = StyleSheet.create({
  wrap:      { alignItems: 'center', justifyContent: 'center', paddingTop: 2 },
  pill:      { position: 'absolute', top: -10, width: 20, height: 3, borderRadius: 2 },
  badge:     { position: 'absolute', top: -3, right: -9, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
});


const FAB_SIZE = 62;
const { width: SW, height: SH } = Dimensions.get('window');
const TAB_H = Platform.OS === 'ios' ? 88 : 66;
const FAB_INIT = {
  x: SW - FAB_SIZE - 20,
  y: (SH - TAB_H) / 2 - FAB_SIZE / 2,
};

export default function BusinessTabsLayout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { badgeCount: notifBadge, chatBadgeCount: badgeCount } = useNotificationBadge();

  // ── Draggable FAB ────────────────────────────────────────────────────────────
  const fabPos   = useRef(new Animated.ValueXY(FAB_INIT)).current;
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
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.brinjal1,
        tabBarInactiveTintColor: '#ABABBB',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('business.tab.home'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" nameActive="home" size={23} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          title: t('business.tab.events'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="briefcase-outline" nameActive="briefcase" size={23} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="proposals"
        options={{
          title: t('business.tab.proposals'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="document-text-outline" nameActive="document-text" size={23} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('messages', { screen: 'index' });
          },
        })}
        options={{
          title: t('business.tab.messages'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="chatbubble-outline" nameActive="chatbubble" size={23} color={color} focused={focused} badge={badgeCount} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('business.tab.notifications'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="notifications-outline" nameActive="notifications" size={23} color={color} focused={focused} badge={notifBadge} />
          ),
        }}
      />
      {/* Hide create.tsx from tab bar — navigated via FAB */}
      <Tabs.Screen name="create" options={{ href: null }} />
    </Tabs>

    {/* Draggable FAB */}
    <Animated.View
      style={[styles.fabWrap, { transform: fabPos.getTranslateTransform() }]}
      {...fabPR.panHandlers}
    >
      <View style={styles.fabCircle}>
        <Ionicons name="add" size={28} color="#fff" />
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

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 66,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  tabItem: {
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0,
    marginBottom: Platform.OS === 'ios' ? 2 : 4,
    marginTop: 2,
  },
  fabWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 300,
  },
  fabCircle: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: COLORS.brinjal1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#1e1b4b',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 3, height: 5 },
    elevation: 14,
  },
});
