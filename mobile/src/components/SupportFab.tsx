import { useEffect, useState } from 'react';
import { Alert, Keyboard, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { router, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSupportContacts } from '@/services/siteInfo';
import { F, RADIUS, SHADOW, SPACING } from '@/utilities/constants';
import { buildWhatsAppUrl, supportWhatsAppMessage } from '@/utilities/supportContact';

const WHATSAPP_GREEN = '#25D366';
const FAB_SIZE = 52;

/** Must match TAB_BAR_CONTENT_HEIGHT in the (creator)/(business) tab layouts. */
const TAB_BAR_CONTENT_HEIGHT = 56;

// Pre-login / setup routes and full-screen media — never show the FAB there.
const HIDDEN_ROOTS = new Set(['(auth)', 'onboarding', 'business-onboarding', 'add-email',
  'oauthredirect', 'esewa-callback', 'connectips-callback', 'khalti-callback', 'video-player']);

/**
 * Floating WhatsApp button on every signed-in creator/business screen
 * (mounted once in the root layout). Tap opens a small menu: "Chat on
 * WhatsApp" (prefilled wa.me link from the admin's support number) and
 * "More help" → Settings → Support (phone, email, help center, FAQs).
 * Hidden inside chat threads (it would cover the send button), while the
 * keyboard is up, and until a valid WhatsApp/support number is configured.
 */
export function SupportFab() {
  const C = useAppColors();
  const { t } = useLanguage();
  const { user } = useAuth();
  const segments = useSegments() as readonly string[];
  const insets = useSafeAreaInsets();
  // Remembers which route the menu was opened on, so navigating away closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const [keyboardUp, setKeyboardUp] = useState(false);

  const role = user?.role === 'CREATOR' ? 'creator' : user?.role === 'BUSINESS' ? 'business' : null;
  const signedIn = !!role && user?.isFirstLogin !== true && !user?.emailIsPlaceholder;
  const inChatThread = segments.includes('chat') || (segments.includes('messages') && segments.includes('[id]'));
  const routeOk = segments.length > 0 && !HIDDEN_ROOTS.has(segments[0]) && !inChatThread;
  const { data } = useSupportContacts(signedIn);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardUp(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardUp(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const routeKey = segments.join('/');
  const open = openOn === routeKey;
  const setOpen = (next: boolean) => setOpenOn(next ? routeKey : null);

  const whatsappUrl = role ? buildWhatsAppUrl(data?.whatsapp || data?.supportPhone, supportWhatsAppMessage(role)) : null;
  if (!signedIn || !routeOk || keyboardUp || !whatsappUrl) return null;

  // Tab screens: clear the custom tab bar (same height math as its layout).
  const onTabs = segments.includes('(tabs)');
  const bottomOffset = onTabs ? TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 8) : insets.bottom;

  const openWhatsApp = () => {
    setOpen(false);
    Linking.openURL(whatsappUrl).catch(() =>
      Alert.alert(t('supportContact.openFailedTitle'), t('supportContact.openFailedGeneric')));
  };

  const openMoreHelp = () => {
    setOpen(false);
    router.push(`/(${role})/settings?section=support` as never);
  };

  return (
    <>
      {open && <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel={t('common.close')} />}

      <View style={[s.wrap, { bottom: bottomOffset + SPACING.lg }]} pointerEvents="box-none">
        {open && (
          <View style={[s.menu, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Pressable
              onPress={openWhatsApp}
              accessibilityRole="button"
              style={({ pressed }) => [s.row, pressed && { backgroundColor: WHATSAPP_GREEN + '1A' }]}>
              <View style={[s.rowIcon, { backgroundColor: WHATSAPP_GREEN }]}>
                <FontAwesome5 name="whatsapp" size={16} color="#fff" />
              </View>
              <View style={s.rowText}>
                <Text style={[s.rowTitle, { color: C.text }]}>{t('supportContact.whatsappTitle')}</Text>
                <Text style={[s.rowSub, { color: C.textSecondary }]}>{t('supportContact.whatsappStatus')}</Text>
              </View>
            </Pressable>
            <View style={[s.divider, { backgroundColor: C.border }]} />
            <Pressable
              onPress={openMoreHelp}
              accessibilityRole="link"
              style={({ pressed }) => [s.row, pressed && { backgroundColor: C.primaryLight }]}>
              <View style={[s.rowIcon, { backgroundColor: C.primaryLight }]}>
                <FontAwesome5 name="life-ring" size={15} color={C.brinjal1} />
              </View>
              <View style={s.rowText}>
                <Text style={[s.rowTitle, { color: C.text }]}>{t('supportContact.moreHelp')}</Text>
                <Text style={[s.rowSub, { color: C.textSecondary }]}>{t('supportContact.moreHelpSub')}</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={12} color={C.textPlaceholder} />
            </Pressable>
          </View>
        )}

        <Pressable
          onPress={() => setOpen(!open)}
          accessibilityRole="button"
          accessibilityLabel={t('supportContact.fabLabel')}
          accessibilityState={{ expanded: open }}
          hitSlop={6}
          style={({ pressed }) => [s.fab, { opacity: pressed ? 0.85 : 1 }]}>
          <FontAwesome5 name={open ? 'times' : 'whatsapp'} size={open ? 20 : 26} color="#fff" />
        </Pressable>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', right: SPACING.lg, alignItems: 'flex-end', gap: SPACING.sm },
  fab: {
    width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2,
    backgroundColor: WHATSAPP_GREEN, alignItems: 'center', justifyContent: 'center',
    ...SHADOW.floating,
  },
  menu: { width: 260, borderWidth: 1, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.floating },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.md, minHeight: 60 },
  rowIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: F.semibold, fontSize: 14, lineHeight: 21 },
  rowSub: { fontFamily: F.regular, fontSize: 12, lineHeight: 18 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: SPACING.md },
});
