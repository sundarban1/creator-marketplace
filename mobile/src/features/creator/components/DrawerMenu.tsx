import { router } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { F, RADIUS, SHADOW } from '@/utilities/constants';
import { getAccountIdentityLine, isValidNepaliPhone } from '@/utilities/phone';

const SCREEN_H = Dimensions.get('window').height;

type NavItem = {
  iconName: keyof typeof Ionicons.glyphMap;
  // Set for items where the FontAwesome5 glyph reads sharper/more recognizable
  // than its Ionicons counterpart — rendered instead of `iconName` when present.
  faName?: string;
  labelKey: string;
  route: string;
  color: string;
};

const ACCOUNT_ITEMS: NavItem[] = [
  { iconName: 'share-social-outline',    labelKey: 'drawer.socialAccounts',    route: '/(creator)/settings?section=social',    color: '#E1306C' },
  { iconName: 'wallet-outline', faName: 'wallet',        labelKey: 'drawer.myWallet',          route: '/(creator)/wallet',                     color: '#16A34A' },
  { iconName: 'gift-outline',   faName: 'gift',          labelKey: 'drawer.referAFriend',      route: '/(creator)/referral',                   color: '#EC4899' },
  { iconName: 'images-outline',          labelKey: 'drawer.pastWork',          route: '/(creator)/settings?section=past-work', color: '#F59E0B' },
  { iconName: 'shield-checkmark-outline', faName: 'shield-alt', labelKey: 'drawer.security',   route: '/(creator)/settings?section=security',  color: '#3B82F6' },
  { iconName: 'help-buoy-outline', faName: 'life-ring',  labelKey: 'drawer.support',            route: '/(creator)/settings?section=support',   color: '#0891B2' },
  { iconName: 'scale-outline', faName: 'balance-scale',  labelKey: 'drawer.legal',              route: '/(creator)/settings?section=legal',     color: '#6366F1' },
  { iconName: 'settings-outline',        labelKey: 'drawer.settings',          route: '/(creator)/settings',                  color: '#6B7280' },
];

type Props = {
  visible: boolean;
  user: { name?: string; email?: string; phone?: string | null; avatar?: string } | null;
  onClose: () => void;
  onLogout: () => void;
};

export function DrawerMenu({ visible, user, onClose, onLogout }: Props) {
  const insets = useSafeAreaInsets();
  const C = useAppColors();
  const { t } = useLanguage();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      slideAnim.setValue(SCREEN_H);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setRendered(false));
    }
  }, [visible]);

  if (!rendered) return null;

  const displayName = user?.name && !isValidNepaliPhone(user.name) ? user.name : 'Creator';
  const initial = displayName[0].toUpperCase();
  const identityLine = user ? getAccountIdentityLine(user) : '';

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity, flex: 1 }]} />
      </Pressable>

      <Animated.View style={[styles.panel, { backgroundColor: C.surface, transform: [{ translateY: slideAnim }] }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: C.brinjal2 }]}>
          <Pressable style={styles.handleRow} onPress={onClose} hitSlop={10}>
            <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.6)" />
          </Pressable>

          <View style={styles.userRow}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarCircle} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{identityLine}</Text>
            </View>
          </View>
        </View>

        {/* Nav */}
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.navGroup, { backgroundColor: C.surface, borderColor: C.border }]}>
            {ACCOUNT_ITEMS.map(({ iconName, faName, labelKey, route, color }, idx) => (
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                key={labelKey}
                hitSlop={4}
                style={[styles.navItem, idx < ACCOUNT_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                onPress={() => { onClose(); router.push(route as Parameters<typeof router.push>[0]); }}>
                <View style={[styles.navIconWrap, { backgroundColor: color + '18' }]}>
                  {faName ? (
                    <FontAwesome5 name={faName} size={15} color={color} solid />
                  ) : (
                    <Ionicons name={iconName} size={18} color={color} />
                  )}
                </View>
                <Text style={[styles.navLabel, { color: C.text }]}>{t(labelKey)}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.border} />
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Logout */}
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
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
    position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '85%',
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, overflow: 'hidden',
    ...SHADOW.floating, shadowOffset: { width: 0, height: -6 }, flexDirection: 'column',
  },
  handleRow: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  avatarCircle: {
    width: 48, height: 48, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarInitial: { fontSize: 19, color: '#fff', fontFamily: F.extrabold },
  userName: { fontSize: 15, color: '#fff', marginBottom: 2, fontFamily: F.bold },
  userEmail: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: F.regular },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingTop: 8, paddingBottom: 18 },
  navGroup: { marginHorizontal: 12, marginVertical: 4, borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden' },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11, minHeight: 44 },
  navIconWrap: { width: 32, height: 32, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  navLabel: { flex: 1, fontSize: 14, fontFamily: F.semibold, letterSpacing: 0.1 },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, minHeight: 44 },
  logoutText: { fontSize: 15, fontFamily: F.bold },
});
