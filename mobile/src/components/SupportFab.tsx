import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Animated, Keyboard, Linking, PanResponder, Pressable, StyleSheet, Text, View,
  useWindowDimensions,
} from 'react-native';
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
const MENU_WIDTH = 260;
/** Finger travel (px) before a touch counts as a drag instead of a tap. */
const DRAG_THRESHOLD = 5;

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
 * The button can be dragged anywhere on screen; on release it snaps to the
 * nearest side edge, and the position is kept while the app is open.
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
  const { width, height } = useWindowDimensions();

  // Drag offset from the default bottom-right spot (x ≤ 0 moves left, y ≤ 0 moves up).
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const posRef = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState({ x: 0, y: 0 });

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

  // Tab screens: clear the custom tab bar (same height math as its layout).
  const onTabs = segments.includes('(tabs)');
  const bottomOffset = onTabs ? TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 8) : insets.bottom;
  const anchorBottom = bottomOffset + SPACING.lg;

  // How far the button may travel from its default spot and stay fully on screen.
  const bounds = useMemo(() => ({
    minX: -(width - SPACING.lg * 2 - FAB_SIZE),
    minY: Math.min(0, insets.top + SPACING.sm - (height - anchorBottom - FAB_SIZE)),
  }), [width, height, insets.top, anchorBottom]);
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  const commit = (next: { x: number; y: number }, animate: boolean) => {
    posRef.current = next;
    setPos(next);
    if (animate) {
      Animated.spring(pan, { toValue: next, useNativeDriver: false, friction: 7, tension: 60 }).start();
    } else {
      pan.setValue(next);
    }
  };

  // Keep the button on screen when the anchor or screen size changes
  // (tab bar appears/disappears, rotation).
  useEffect(() => {
    const { x, y } = posRef.current;
    const nx = Math.max(bounds.minX, Math.min(0, x));
    const ny = Math.max(bounds.minY, Math.min(0, y));
    if (nx !== x || ny !== y) commit({ x: nx, y: ny }, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds]);

  const panResponder = useMemo(() => PanResponder.create({
    // Capture so a drag steals the touch from the button (no tap fires).
    onMoveShouldSetPanResponderCapture: (_, g) =>
      Math.abs(g.dx) > DRAG_THRESHOLD || Math.abs(g.dy) > DRAG_THRESHOLD,
    onPanResponderGrant: () => {
      setOpenOn(null);
      pan.setOffset(posRef.current);
      pan.setValue({ x: 0, y: 0 });
    },
    onPanResponderMove: (_, g) => {
      const { minX, minY } = boundsRef.current;
      const { x, y } = posRef.current;
      pan.setValue({
        x: Math.max(minX, Math.min(0, x + g.dx)) - x,
        y: Math.max(minY, Math.min(0, y + g.dy)) - y,
      });
    },
    onPanResponderRelease: (_, g) => {
      pan.flattenOffset();
      const { minX, minY } = boundsRef.current;
      const { x, y } = posRef.current;
      const rawX = Math.max(minX, Math.min(0, x + g.dx));
      const ny = Math.max(minY, Math.min(0, y + g.dy));
      // Snap to whichever side edge is closer.
      commit({ x: rawX < minX / 2 ? minX : 0, y: ny }, true);
    },
    onPanResponderTerminate: () => {
      pan.flattenOffset();
      commit(posRef.current, true);
    },
    onPanResponderTerminationRequest: () => false,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [pan]);

  const whatsappUrl = role ? buildWhatsAppUrl(data?.whatsapp || data?.supportPhone, supportWhatsAppMessage(role)) : null;
  if (!signedIn || !routeOk || keyboardUp || !whatsappUrl) return null;

  // Place the menu next to the button: toward the screen centre on both axes.
  const fabLeft = width - SPACING.lg - FAB_SIZE + pos.x;
  const fabTop = height - anchorBottom - FAB_SIZE + pos.y;
  const onLeftSide = fabLeft + FAB_SIZE / 2 < width / 2;
  const inTopHalf = fabTop + FAB_SIZE / 2 < height / 2;
  const menuPosition = {
    ...(onLeftSide ? { left: fabLeft } : { right: width - fabLeft - FAB_SIZE }),
    ...(inTopHalf ? { top: fabTop + FAB_SIZE + SPACING.sm } : { bottom: height - fabTop + SPACING.sm }),
  };

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

      {open && (
        <View style={[s.menu, menuPosition, { backgroundColor: C.surface, borderColor: C.border }]}>
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

      <Animated.View
        {...panResponder.panHandlers}
        style={[s.wrap, { bottom: anchorBottom, transform: pan.getTranslateTransform() }]}>
        <Pressable
          onPress={() => setOpen(!open)}
          accessibilityRole="button"
          accessibilityLabel={t('supportContact.fabLabel')}
          accessibilityHint={t('supportContact.fabDragHint')}
          accessibilityState={{ expanded: open }}
          hitSlop={6}
          style={({ pressed }) => [s.fab, { opacity: pressed ? 0.85 : 1 }]}>
          <FontAwesome5 name={open ? 'times' : 'whatsapp'} size={open ? 20 : 26} color="#fff" />
        </Pressable>
      </Animated.View>
    </>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', right: SPACING.lg, width: FAB_SIZE, height: FAB_SIZE },
  fab: {
    width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2,
    backgroundColor: WHATSAPP_GREEN, alignItems: 'center', justifyContent: 'center',
    ...SHADOW.floating,
  },
  menu: { position: 'absolute', width: MENU_WIDTH, borderWidth: 1, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.floating },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.md, minHeight: 60 },
  rowIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: F.semibold, fontSize: 14, lineHeight: 21 },
  rowSub: { fontFamily: F.regular, fontSize: 12, lineHeight: 18 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: SPACING.md },
});
