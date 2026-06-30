import { router, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ColorValue, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { DrawerContext } from '@/context/DrawerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { BusinessDrawerMenu } from '@/features/business/components/BusinessDrawerMenu';
import { COLORS, F } from '@/utilities/constants';
import { chatService } from '@/services/chat';
import { messagingEvents } from '@/lib/messagingEvents';
import { useNotificationBadge } from '@/context/NotificationContext';
import { getSocket } from '@/lib/socket';

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


export default function BusinessTabsLayout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const { badgeCount: notifBadge } = useNotificationBadge();

  useEffect(() => {
    function fetchBadge() {
      chatService.getBadgeCount().then((r) => setBadgeCount(r.count)).catch(() => null);
    }
    fetchBadge();
    const unsub = messagingEvents.subscribe(fetchBadge);
    const socket = getSocket();
    socket?.on('message:new', fetchBadge);
    socket?.on('conversation:update', fetchBadge);
    return () => {
      unsub();
      socket?.off('message:new', fetchBadge);
      socket?.off('conversation:update', fetchBadge);
    };
  }, []);

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

    {/* FAB: floating Create Event button — right side, vertically centered */}
    <View style={styles.fabContainer} pointerEvents="box-none">
      <Pressable
        style={({ pressed }) => [pressed && { opacity: 0.82 }]}
        onPress={() => router.push('/create-campaign')}>
        <View style={styles.fabCircle}>
          <Ionicons name="add" size={26} color="#fff" />
        </View>
        <Text style={styles.fabLabel}>{t('business.home.createEventBtn')}</Text>
      </Pressable>
    </View>

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
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: Platform.OS === 'ios' ? 2 : 4,
    marginTop: 2,
  },
  fabContainer: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: Platform.OS === 'ios' ? 88 : 66,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  fabCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.brinjal1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.brinjal1,
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  fabLabel: {
    color: COLORS.brinjal1,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 6,
    fontFamily: F.extrabold,
    lineHeight: 13,
  },
});
