import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ColorValue, Platform, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { DrawerContext } from '@/context/DrawerContext';
import { useAppColors } from '@/context/ThemeContext';
import { DrawerMenu } from '@/features/creator/components/DrawerMenu';
import { chatService } from '@/services/chat';
import { messagingEvents } from '@/lib/messagingEvents';
import { notificationService } from '@/services/notifications';

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
  const C = useAppColors();
  return (
    <View style={tabIcon.wrap}>
      {focused && <View style={[tabIcon.pill, { backgroundColor: C.brinjal1 }]} />}
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

export default function CreatorLayout() {
  const { user, logout } = useAuth();
  const C = useAppColors();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [badgeCount, setBadgeCount]   = useState(0);
  const [notifBadge, setNotifBadge]   = useState(0);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function fetchBadge() {
      chatService.getBadgeCount().then((r) => setBadgeCount(r.count)).catch(() => null);
    }
    fetchBadge();
    pollRef.current = setInterval(fetchBadge, 30000);
    const unsub = messagingEvents.subscribe(fetchBadge);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      unsub();
    };
  }, []);

  useEffect(() => {
    function fetchNotifBadge() {
      notificationService.getBadge().then((r) => setNotifBadge(r.count)).catch(() => null);
    }
    fetchNotifBadge();
    notifPollRef.current = setInterval(fetchNotifBadge, 30000);
    return () => { if (notifPollRef.current) clearInterval(notifPollRef.current); };
  }, []);

  return (
    <DrawerContext.Provider value={{ openDrawer: () => setDrawerOpen(true) }}>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: C.brinjal1,
            tabBarInactiveTintColor: '#ABABBB',
            tabBarStyle: [styles.tabBar, { backgroundColor: C.surface, borderTopColor: C.border }],
            tabBarLabelStyle: styles.tabLabel,
            tabBarItemStyle: styles.tabItem,
          }}>
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color, focused }) => (
                <TabIcon name="home-outline" nameActive="home" size={23} color={color} focused={focused} />
              ),
            }}
          />
          <Tabs.Screen name="explore-businesses" options={{ href: null }} />
          <Tabs.Screen
            name="proposals"
            options={{
              title: 'Proposals',
              tabBarIcon: ({ color, focused }) => (
                <TabIcon name="document-text-outline" nameActive="document-text" size={23} color={color} focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="messages"
            options={{
              title: 'Messages',
              tabBarIcon: ({ color, focused }) => (
                <TabIcon name="chatbubble-outline" nameActive="chatbubble" size={23} color={color} focused={focused} badge={badgeCount} />
              ),
            }}
          />
          <Tabs.Screen
            name="notifications"
            options={{
              title: 'Activity',
              tabBarIcon: ({ color, focused }) => (
                <TabIcon name="notifications-outline" nameActive="notifications" size={23} color={color} focused={focused} badge={notifBadge} />
              ),
            }}
          />
          <Tabs.Screen name="profile" options={{ href: null, title: 'Profile' }} />
          <Tabs.Screen name="settings" options={{ href: null, title: 'Settings' }} />
          <Tabs.Screen name="edit-profile" options={{ href: null, title: 'Edit Profile' }} />
          <Tabs.Screen name="featured-campaigns" options={{ href: null }} />
          <Tabs.Screen name="edit-categories" options={{ href: null }} />
          <Tabs.Screen name="business-detail" options={{ href: null }} />
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

const styles = StyleSheet.create({
  tabBar: {
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
});
