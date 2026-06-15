import { router, Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { DrawerContext } from '@/context/DrawerContext';
import { BusinessDrawerMenu } from '@/features/business/components/BusinessDrawerMenu';
import { COLORS } from '@/utilities/constants';

function CreateTabButton() {
  return (
    <View style={styles.createWrap}>
      <Pressable
        style={({ pressed }) => [styles.createCircle, pressed && { opacity: 0.85 }]}
        onPress={() => router.push('/create-campaign')}>
        <Text style={styles.createPlus}>+</Text>
      </Pressable>
    </View>
  );
}

export default function BusinessLayout() {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <DrawerContext.Provider value={{ openDrawer: () => setDrawerOpen(true) }}>
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.brinjal1,
        tabBarInactiveTintColor: '#B0B0C0',
        tabBarStyle: styles.tabBar,
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
        name="campaigns"
        options={{
          title: 'Campaigns',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'briefcase.fill', android: 'work', web: 'work' }}
              tintColor={color}
              size={22}
            />
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
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'doc.text.fill', android: 'description', web: 'description' }}
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
              <View style={styles.badge}>
                <Text style={styles.badgeText}>2</Text>
              </View>
            </View>
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
  createWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Platform.OS === 'ios' ? 0 : 4,
  },
  createCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.brinjal1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    shadowColor: COLORS.brinjal1,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  createPlus: {
    color: '#fff',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '300',
  },
});
