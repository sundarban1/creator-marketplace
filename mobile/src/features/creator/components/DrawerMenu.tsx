import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { F } from '@/utilities/constants';

const DRAWER_W = 280;

type NavItem = {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
};

const ACCOUNT_ITEMS: NavItem[] = [
  { iconName: 'phone-portrait',  label: 'Social Accounts',      route: '/(creator)/settings?section=social' },
  { iconName: 'bookmark',        label: 'Campaign Preferences', route: '/(creator)/settings?section=campaigns' },
  { iconName: 'cash',            label: 'Earnings & Payments',  route: '/(creator)/settings?section=earnings' },
  { iconName: 'color-palette',   label: 'Past Work',            route: '/(creator)/settings?section=past-work' },
  { iconName: 'lock-closed',     label: 'Security',             route: '/(creator)/settings?section=security' },
  { iconName: 'help-circle',     label: 'Support',              route: '/(creator)/settings?section=support' },
  { iconName: 'document',        label: 'Legal',                route: '/(creator)/settings?section=legal' },
  { iconName: 'settings',        label: 'Settings',             route: '/(creator)/settings' },
];

type Props = {
  visible: boolean;
  user: { name?: string; email?: string } | null;
  onClose: () => void;
  onLogout: () => void;
};

export function DrawerMenu({ visible, user, onClose, onLogout }: Props) {
  const insets = useSafeAreaInsets();
  const C = useAppColors();
  const slideAnim = useRef(new Animated.Value(-DRAWER_W)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      slideAnim.setValue(-DRAWER_W);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -DRAWER_W, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setRendered(false));
    }
  }, [visible]);

  if (!rendered) return null;

  const initial = (user?.name ?? 'C')[0].toUpperCase();

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity, flex: 1 }]} />
      </Pressable>

      <Animated.View style={[styles.panel, { backgroundColor: C.surface, transform: [{ translateX: slideAnim }] }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.userRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>{user?.name ?? 'Creator'}</Text>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>Creator</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Nav */}
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.groupSeparator}>
            <Text style={[styles.groupLabel, { color: C.textSecondary }]}>MY ACCOUNT</Text>
          </View>
          <View style={[styles.navGroup, { backgroundColor: C.surface, borderColor: C.border }]}>
            {ACCOUNT_ITEMS.map(({ iconName, label, route }, idx) => (
              <Pressable
                key={label}
                style={[styles.navItem, idx < ACCOUNT_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                onPress={() => { onClose(); router.push(route as Parameters<typeof router.push>[0]); }}>
                <View style={[styles.navIconWrap, { backgroundColor: C.background }]}>
                  <Ionicons name={iconName} size={18} color={C.brinjal1} />
                </View>
                <Text style={[styles.navLabel, { color: C.text }]}>{label}</Text>
                <Ionicons name="chevron-forward" size={18} color={C.textSecondary} />
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Logout */}
        <Pressable
          style={[styles.logout, { borderTopColor: C.border, paddingBottom: insets.bottom + 12 }]}
          onPress={onLogout}>
          <Ionicons name="log-out" size={20} color={C.error} />
          <Text style={[styles.logoutText, { color: C.error }]}>Logout</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  panel: {
    position: 'absolute', top: 0, bottom: 0, left: 0, width: DRAWER_W,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20,
    shadowOffset: { width: 6, height: 0 }, elevation: 20, flexDirection: 'column',
  },
  header: { backgroundColor: '#4F46E5', paddingHorizontal: 20, paddingBottom: 24 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarInitial: { fontSize: 18, fontWeight: '800', color: '#fff', fontFamily: F.extrabold },
  userName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4, fontFamily: F.bold },
  rolePill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  rolePillText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.9)', fontFamily: F.semibold },
  scroll: { flex: 1 },
  navGroup: { marginHorizontal: 12, marginVertical: 4, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  navIconWrap: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  navLabel: { flex: 1, fontSize: 14, fontWeight: '600', fontFamily: F.semibold },
  groupSeparator: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  groupLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, fontFamily: F.extrabold },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  logoutText: { fontSize: 15, fontWeight: '700', fontFamily: F.bold },
});
