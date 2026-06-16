import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { DrawerContext } from '@/context/DrawerContext';
import { useAppColors } from '@/context/ThemeContext';
import { DrawerMenu } from '@/features/creator/components/DrawerMenu';
import { chatService } from '@/services/chat';
import { messagingEvents } from '@/lib/messagingEvents';

export default function CreatorLayout() {
  const { user, logout } = useAuth();
  const C = useAppColors();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  return (
    <DrawerContext.Provider value={{ openDrawer: () => setDrawerOpen(true) }}>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: C.brinjal1,
            tabBarInactiveTintColor: '#B0B0C0',
            tabBarStyle: [styles.tabBar, { backgroundColor: C.surface, borderTopColor: C.border }],
            tabBarLabelStyle: styles.tabLabel,
          }}>
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color }) => (
                <SymbolView
                  name={{ ios: 'house.fill', android: 'home', web: 'home' }}
                  tintColor={color}
                  size={22}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="proposals"
            options={{
              title: 'Proposals',
              tabBarIcon: ({ color }) => (
                <SymbolView
                  name={{ ios: 'doc.text', android: 'description', web: 'description' }}
                  tintColor={color}
                  size={22}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="messages"
            options={{
              title: 'Messages',
              tabBarIcon: ({ color }) => (
                <View>
                  <SymbolView
                    name={{ ios: 'message.fill', android: 'chat', web: 'chat' }}
                    tintColor={color}
                    size={22}
                  />
                  {badgeCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
                    </View>
                  )}
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="notifications"
            options={{
              title: 'Activity',
              tabBarIcon: ({ color }) => (
                <SymbolView
                  name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
                  tintColor={color}
                  size={22}
                />
              ),
            }}
          />
          <Tabs.Screen name="profile" options={{ href: null, title: 'Profile' }} />
          <Tabs.Screen name="settings" options={{ href: null, title: 'Settings' }} />
          <Tabs.Screen name="edit-profile" options={{ href: null, title: 'Edit Profile' }} />
          <Tabs.Screen name="featured-campaigns" options={{ href: null }} />
          <Tabs.Screen name="edit-categories" options={{ href: null }} />
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
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: Platform.OS === 'ios' ? 0 : 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
});
