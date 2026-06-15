import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { DrawerContext } from '@/context/DrawerContext';
import { useAppColors } from '@/context/ThemeContext';
import { DrawerMenu } from '@/features/creator/components/DrawerMenu';

export default function CreatorLayout() {
  const { user, logout } = useAuth();
  const C = useAppColors();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
                <SymbolView
                  name={{ ios: 'message.fill', android: 'chat', web: 'chat' }}
                  tintColor={color}
                  size={22}
                />
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
});
