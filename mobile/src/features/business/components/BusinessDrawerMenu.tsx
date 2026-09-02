import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { useCloseOnScrollDown } from '@/hooks/useCloseOnScrollDown';
import { profileService } from '@/services/profile';
import { F, RADIUS, SHADOW } from '@/utilities/constants';
import { formatPhoneDisplay, isValidNepaliPhone } from '@/utilities/phone';

const SCREEN_H = Dimensions.get('window').height;

type NavItem = {
  iconName: keyof typeof FontAwesome5.glyphMap;
  // Set for items where the FontAwesome5 glyph reads sharper/more recognizable
  // than its FontAwesome5 counterpart — rendered instead of `iconName` when present.
  faName?: string;
  labelKey: string;
  route: string;
  color: string;
};

// Colors for items that also exist in the creator drawer (DrawerMenu.tsx) are
// kept identical to that file's values — Refer/Notifications/Support/Privacy/
// Settings/Social are the same *feature* regardless of role, so a business
// user and a creator user should see the same color for it, not an
// independently-drifted one (this used to include a stray '#4F46E5' on
// Privacy — the creator-role brand purple, hardcoded onto a business screen).
const NAV_GROUPS: { labelKey: string; items: NavItem[] }[] = [
  {
    labelKey: 'drawer.accountGroup',
    items: [
      // Social Accounts — connect Instagram/TikTok/etc.; opens the settings
      // screen's "social" section, renderSocialAccounts().
      { iconName: 'share-alt',     labelKey: 'drawer.socialAccounts',    route: '/(business)/settings?section=social',        color: '#E1306C' },
      // Service Requests hidden for now — do not display in the business drawer.
      // { iconName: 'paper-plane', faName: 'paper-plane', labelKey: 'drawer.serviceRequests',  route: '/(business)/service-requests',              color: '#7C3AED' },
      { iconName: 'check-circle', labelKey: 'drawer.verification',      route: '/(business)/settings?section=verification', color: '#16A34A' },
      { iconName: 'wallet', faName: 'wallet',      labelKey: 'drawer.payment',        route: '/(business)/settings?section=payment',       color: '#3B82F6' },
      { iconName: 'gift', faName: 'gift',          labelKey: 'drawer.referBusiness',   route: '/(business)/refer',                          color: '#EC4899' },
      { iconName: 'lock',      labelKey: 'drawer.security',          route: '/(business)/settings?section=account',       color: '#0369A1' },
      { iconName: 'bell', faName: 'bell', labelKey: 'drawer.notifications', route: '/(business)/settings?section=notifications', color: '#D97706' },
      { iconName: 'life-ring', faName: 'life-ring', labelKey: 'drawer.support',        route: '/(business)/settings?section=support',       color: '#0891B2' },
      { iconName: 'shield-alt', faName: 'shield-alt',  labelKey: 'drawer.privacy',        route: '/(business)/settings?section=privacy',       color: '#0D9488' },
      { iconName: 'cog',         labelKey: 'drawer.settings',          route: '/(business)/settings?section=app',           color: '#6B7280' },
      // Shared route with the creator drawer — same colour as DrawerMenu.tsx's About Us.
      { iconName: 'info-circle', faName: 'info-circle', labelKey: 'drawer.aboutUs',        route: '/about-us',                                  color: '#8B5CF6' },
    ],
  },
];

type Props = {
  visible: boolean;
  user: { name?: string; email?: string; phone?: string | null; avatar?: string } | null;
  onClose: () => void;
  onLogout: () => void;
};

export function BusinessDrawerMenu({ visible, user, onClose, onLogout }: Props) {
  const insets = useSafeAreaInsets();
  const C = useAppColors();
  const { t } = useLanguage();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const { dragY, panHandlers, onScroll } = useCloseOnScrollDown(onClose);

  useEffect(() => {
    // Re-fetches every time the drawer opens, not just once on mount — this
    // component stays mounted for the whole app session (shown/hidden via
    // `visible` + animation rather than navigation), so a mount-only fetch
    // would keep showing whatever name was set at signup even after the
    // business edits its profile.
    if (!visible) return;
    profileService.getBusinessProfile()
      .then((profile) => {
        setBusinessName(profile.businessName);
        setLogoUrl(profile.logoUrl);
      })
      .catch(() => {});
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

  const displayName = businessName || (user?.name && !isValidNepaliPhone(user.name) ? user.name : 'Business');
  const displayAvatar = logoUrl || user?.avatar;
  const initial = displayName[0].toUpperCase();
  const identityLine = user?.phone ? formatPhoneDisplay(user.phone) : (user?.email ?? '');

  function navigate(route: string) {
    onClose();
    router.push(route as Parameters<typeof router.push>[0]);
  }

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

          <Pressable style={styles.userRow} hitSlop={4} onPress={() => navigate('/(business)/(tabs)/profile')}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatarCircle} />
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
          {NAV_GROUPS.map((group) => (
            <View key={group.labelKey} style={styles.navGroup}>
              {group.items.map(({ iconName, faName, labelKey, route, color }) => (
                <Pressable
                  key={labelKey}
                  hitSlop={4}
                  style={[styles.navItem, { backgroundColor: C.surface }]}
                  onPress={() => navigate(route)}>
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
          ))}
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
