import { router, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ColorValue, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { DrawerContext } from '@/context/DrawerContext';
import { useAppColors } from '@/context/ThemeContext';
import { BusinessDrawerMenu } from '@/features/business/components/BusinessDrawerMenu';
import { COLORS } from '@/utilities/constants';
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

function CreateTabButton() {
  return (
    <View style={styles.createWrap}>
      <Pressable
        style={({ pressed }) => [styles.createCircle, pressed && { opacity: 0.85 }]}
        onPress={() => router.push('/create-campaign')}>
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>
    </View>
  );
}

export default function BusinessLayout() {
  const { user, logout } = useAuth();
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
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" nameActive="home" size={23} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="briefcase-outline" nameActive="briefcase" size={23} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarButton: () => <CreateTabButton />,
        }}
      />
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
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('messages', { screen: 'index' });
          },
        })}
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="chatbubble-outline" nameActive="chatbubble" size={23} color={color} focused={focused} badge={badgeCount} />
          ),
        }}
      />
      {/* Hidden tabs */}
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="presence-goal" options={{ href: null }} />
      <Tabs.Screen name="explore-creators" options={{ href: null }} />
      <Tabs.Screen name="creator-detail" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="saved-creators" options={{ href: null }} />
      <Tabs.Screen name="campaign-proposals" options={{ href: null }} />
    </Tabs>

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
  createWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Platform.OS === 'ios' ? 0 : 4,
  },
  createCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.brinjal1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    shadowColor: COLORS.brinjal1,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
});
