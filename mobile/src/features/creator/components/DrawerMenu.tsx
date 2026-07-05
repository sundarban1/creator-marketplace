import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { F } from '@/utilities/constants';

const DRAWER_W = 280;

type NavItem = {
  iconName: keyof typeof Ionicons.glyphMap;
  labelKey: string;
  route: string;
  color: string;
};

const ACCOUNT_ITEMS: NavItem[] = [
  { iconName: 'share-social-outline',    labelKey: 'drawer.socialAccounts',    route: '/(creator)/settings?section=social',    color: '#E1306C' },
  { iconName: 'options-outline',         labelKey: 'drawer.eventPreferences',  route: '/(creator)/settings?section=campaigns', color: '#7C3AED' },
  { iconName: 'wallet-outline',          labelKey: 'drawer.myWallet',          route: '/(creator)/wallet',                     color: '#16A34A' },
  { iconName: 'gift-outline',            labelKey: 'drawer.referAFriend',      route: '/(creator)/referral',                   color: '#EC4899' },
  { iconName: 'images-outline',          labelKey: 'drawer.pastWork',          route: '/(creator)/settings?section=past-work', color: '#F59E0B' },
  { iconName: 'shield-checkmark-outline', labelKey: 'drawer.security',         route: '/(creator)/settings?section=security',  color: '#3B82F6' },
  { iconName: 'help-buoy-outline',       labelKey: 'drawer.support',           route: '/(creator)/settings?section=support',   color: '#0891B2' },
  { iconName: 'scale-outline',           labelKey: 'drawer.legal',             route: '/(creator)/settings?section=legal',     color: '#6366F1' },
  { iconName: 'settings-outline',        labelKey: 'drawer.settings',          route: '/(creator)/settings',                  color: '#6B7280' },
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
  const { t } = useLanguage();
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
        <View style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: C.brinjal2 }]}>
          <View style={styles.userRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>{user?.name ?? 'Creator'}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{user?.email ?? ''}</Text>
            </View>
          </View>
        </View>

        {/* Nav */}
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.groupSeparator}>
            <Text style={[styles.groupLabel, { color: C.textSecondary }]}>{t('drawer.myAccount')}</Text>
          </View>
          <View style={[styles.navGroup, { backgroundColor: C.surface, borderColor: C.border }]}>
            {ACCOUNT_ITEMS.map(({ iconName, labelKey, route, color }, idx) => (
              <Pressable
                key={labelKey}
                style={[styles.navItem, idx < ACCOUNT_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                onPress={() => { onClose(); router.push(route as Parameters<typeof router.push>[0]); }}>
                <View style={[styles.navIconWrap, { backgroundColor: color + '18' }]}>
                  <Ionicons name={iconName} size={18} color={color} />
                </View>
                <Text style={[styles.navLabel, { color: C.text }]}>{t(labelKey)}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.border} />
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Logout */}
        <Pressable
          style={[styles.logout, { borderTopColor: C.border, paddingBottom: insets.bottom + 12 }]}
          onPress={onLogout}>
          <Ionicons name="log-out" size={20} color={C.error} />
          <Text style={[styles.logoutText, { color: C.error }]}>{t('drawer.logout')}</Text>
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
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarInitial: { fontSize: 18, fontWeight: '800', color: '#fff', fontFamily: F.extrabold },
  userName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2, fontFamily: F.bold },
  userEmail: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: F.regular },
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
