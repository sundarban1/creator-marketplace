import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { useCloseOnScrollDown } from '@/hooks/useCloseOnScrollDown';
import { creatorService, type ProviderType } from '@/services/creator';
import { F, RADIUS, SHADOW } from '@/utilities/constants';
import { getAccountIdentityLine, isValidNepaliPhone } from '@/utilities/phone';

const SCREEN_H = Dimensions.get('window').height;

// Provider type decides whether team-only entries show. Cached at module level
// so reopening the drawer doesn't refetch the profile on every open.
let cachedProviderType: ProviderType | null = null;

type NavItem = {
  iconName: keyof typeof FontAwesome5.glyphMap;
  // Set for items where the FontAwesome5 glyph reads sharper/more recognizable
  // than its FontAwesome5 counterpart — rendered instead of `iconName` when present.
  faName?: string;
  labelKey: string;
  route: string;
  color: string;
};

const ACCOUNT_ITEMS: NavItem[] = [
  // Hidden from the drawer for now (Social Accounts — connect Instagram/TikTok/etc.;
  // opens the settings screen's "social" section, renderSocialAccounts()).
  // { iconName: 'share-alt',    labelKey: 'drawer.socialAccounts',    route: '/(creator)/settings?section=social',    color: '#E1306C' },
  { iconName: 'wallet', faName: 'wallet',        labelKey: 'drawer.myWallet',          route: '/(creator)/wallet',                     color: '#16A34A' },
  // Hidden from the drawer for now (My Work / past-work portfolio section — not ready to display in the mobile UI).
  // { iconName: 'images',          labelKey: 'drawer.pastWork',          route: '/(creator)/settings?section=past-work', color: '#F59E0B' },
  { iconName: 'gift',   faName: 'gift',          labelKey: 'drawer.referAFriend',      route: '/(creator)/referral',                   color: '#EC4899' },
  { iconName: 'envelope-open-text', faName: 'envelope-open-text', labelKey: 'drawer.invitations', route: '/(creator)/invitations', color: '#0EA5E9' },
  // Hidden from the drawer for now (My Services — service catalogue, not ready to display in the mobile UI).
  // { iconName: 'briefcase',   faName: 'briefcase',   labelKey: 'drawer.myServices',        route: '/(creator)/services',                   color: '#7C3AED' },
  { iconName: 'users',       faName: 'users',       labelKey: 'drawer.myTeam',            route: '/(creator)/team',                       color: '#0D9488' },
  { iconName: 'th-large',    faName: 'th-large',    labelKey: 'drawer.myPortfolio',       route: '/(creator)/portfolio',                  color: '#F59E0B' },
  // Hidden from the drawer for now (Weekly working-hours/blocked-dates editor — its own standalone route, not a settings section).
  // { iconName: 'calendar-alt', faName: 'calendar-alt', labelKey: 'drawer.availability',    route: '/(creator)/availability',               color: '#0D9488' },
  // Hidden from the drawer for now (Public-profile/social-links/contact-details/location visibility
  // toggles — lives in the shared settings screen's "privacy" section, see renderPrivacy() in settings.tsx).
  // { iconName: 'eye-slash', faName: 'eye-slash', labelKey: 'drawer.privacy',    route: '/(creator)/settings?section=privacy',   color: '#0D9488' },
  { iconName: 'shield-alt', faName: 'shield-alt', labelKey: 'drawer.security',   route: '/(creator)/settings?section=security',  color: '#3B82F6' },
  { iconName: 'bell',    faName: 'bell',       labelKey: 'drawer.notifications', route: '/(creator)/settings?section=notifications', color: '#D97706' },
  { iconName: 'life-ring', faName: 'life-ring',  labelKey: 'drawer.support',            route: '/(creator)/settings?section=support',   color: '#0891B2' },
  { iconName: 'balance-scale', faName: 'balance-scale',  labelKey: 'drawer.legal',              route: '/(creator)/settings?section=legal',     color: '#6366F1' },
  { iconName: 'cog',        labelKey: 'drawer.settings',          route: '/(creator)/settings',                  color: '#6B7280' },
  { iconName: 'info-circle', faName: 'info-circle', labelKey: 'drawer.aboutUs',           route: '/about-us',                             color: '#8B5CF6' },
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
  const { dragY, panHandlers, onScroll } = useCloseOnScrollDown(onClose);
  const [providerType, setProviderType] = useState<ProviderType | null>(cachedProviderType);

  // Fetched on the first open rather than on mount, so it doesn't race the
  // home screen's own profile request at app start.
  useEffect(() => {
    if (!visible || cachedProviderType) return;
    let cancelled = false;
    creatorService.getProfile()
      .then((p) => {
        cachedProviderType = p.providerType;
        if (!cancelled) setProviderType(p.providerType);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [visible]);

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
  // An INDIVIDUAL provider has no roster of their own, so "My Team" is noise.
  const navItems = ACCOUNT_ITEMS.filter(
    (item) => item.labelKey !== 'drawer.myTeam' || providerType === 'TEAM',
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity, flex: 1 }]} />
      </Pressable>

      <Animated.View style={[styles.panel, { backgroundColor: C.surface, transform: [{ translateY: Animated.add(slideAnim, dragY) }] }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: C.brinjal2 }]}>
          <Pressable style={styles.handleRow} onPress={onClose} hitSlop={10}>
            <FontAwesome5 name="chevron-down" solid size={20} color="rgba(255,255,255,0.6)" />
          </Pressable>

          <Pressable
            style={styles.userRow}
            hitSlop={4}
            onPress={() => { onClose(); router.push('/(creator)/(tabs)/profile' as never); }}>
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
          </Pressable>
        </View>

        {/* Nav */}
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
          {...panHandlers}
        >
          <View style={styles.navGroup}>
            {navItems.map(({ iconName, faName, labelKey, route, color }) => (
              <Pressable
                key={labelKey}
                hitSlop={4}
                style={[styles.navItem, { backgroundColor: C.surface }]}
                onPress={() => { onClose(); router.push(route as Parameters<typeof router.push>[0]); }}>
                <View style={[styles.navIconWrap, { backgroundColor: color + '18', shadowColor: color, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 }]}>
                  {faName ? (
                    <FontAwesome5 name={faName} size={15} color={color} solid />
                  ) : (
                    <FontAwesome5 name={iconName} size={18} color={color} />
                  )}
                </View>
                <Text style={[styles.navLabel, { color: C.text }]}>{t(labelKey)}</Text>
                <FontAwesome5 name="chevron-right" solid size={16} color={C.border} />
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Logout */}
        <Pressable
          style={[styles.logout, { borderTopColor: C.border, paddingBottom: insets.bottom + 12 }]}
          onPress={onLogout}>
          <FontAwesome5 name="sign-out-alt" solid size={20} color={C.error} />
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
  navGroup: { marginHorizontal: 12, marginVertical: 4 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 12, minHeight: 44, ...SHADOW.card },
  navIconWrap: { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  navLabel: { flex: 1, fontSize: 14, fontFamily: F.semibold, letterSpacing: 0.1 },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, minHeight: 44 },
  logoutText: { fontSize: 15, fontFamily: F.bold },
});
