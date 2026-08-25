import type { ReactNode } from 'react';
import { FontAwesome5 } from '@expo/vector-icons';
import type { StyleProp, ViewStyle } from 'react-native';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCloseOnScrollDown } from '@/hooks/useCloseOnScrollDown';
import { useKeyboardOffset } from '@/hooks/useKeyboardOffset';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  // Centers the title/subtitle within the header instead of the default
  // left-aligned layout — opt-in so existing sheets (which pair the title
  // with a left-aligned block plus a right-aligned headerRight) are unaffected.
  centerTitle?: boolean;
  headerRight?: ReactNode;
  footer?: ReactNode;
  scrollable?: boolean;
  maxHeightPct?: number;
  // Caps and centers the sheet at this width on wide screens (tablet/large
  // Android), matching MaxWidthContainer's page-content convention — most
  // sheets stay full-width edge-to-edge (undefined), only opt in when the
  // screen they came from already caps its own content this way.
  maxWidth?: number;
  dismissOnBackdropPress?: boolean;
  // Opt-in: dragging down from the handle/header, or from the scrollable
  // body once it's already at the top, closes the sheet, like a native
  // pull-to-dismiss. Off by default so this doesn't change behavior for
  // every existing consumer of this shell — enable it deliberately per
  // sheet (filter sheets and the nearby-location sheet do).
  closeOnScrollDown?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  // Plain ReactNode for most sheets. When a non-scrollable sheet has
  // interactive content that must keep its own drag gestures (a draggable
  // map, a slider), pass a render function instead — it receives the same
  // `panHandlers` the handle/header use, to spread only onto the safe
  // (non-interactive) regions of the body so a downward swipe closes the
  // sheet from those spots without fighting the interactive ones.
  children: ReactNode | ((bag: { panHandlers: ReturnType<typeof useCloseOnScrollDown>['panHandlers'] }) => ReactNode);
};

// Shared shell for every bottom-sheet-style modal in the app — backdrop,
// keyboard-safe translateY (see useKeyboardOffset — more reliable than
// KeyboardAvoidingView inside a transparent Modal, especially on a physical
// device), and a single tappable chevron-down that closes the sheet. The
// chevron lives inside the same Animated.View the keyboard offset animates,
// so it rises with the sheet and stays reachable above the keyboard rather
// than ever being covered by it.
export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  centerTitle = false,
  headerRight,
  footer,
  scrollable = true,
  maxHeightPct = 0.9,
  maxWidth,
  dismissOnBackdropPress = true,
  closeOnScrollDown = false,
  contentContainerStyle,
  children,
}: Props) {
  const C = useAppColors();
  const { t } = useLanguage();
  const keyboardOffset = useKeyboardOffset();
  const { dragY, panHandlers, onScroll } = useCloseOnScrollDown(onClose);
  const resolvedChildren = typeof children === 'function' ? children({ panHandlers }) : children;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={dismissOnBackdropPress ? onClose : undefined} />
      <Animated.View
        style={[
          s.sheet,
          {
            backgroundColor: C.surface,
            maxHeight: `${maxHeightPct * 100}%`,
            transform: [{ translateY: Animated.add(keyboardOffset, dragY) }],
            ...(maxWidth != null ? { width: '100%' as const, maxWidth, alignSelf: 'center' as const } : null),
          },
        ]}
      >
        <Pressable
          style={s.handleWrap}
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          {...(closeOnScrollDown ? panHandlers : null)}>
          <View style={[s.handlePill, { backgroundColor: C.border }]}>
            <FontAwesome5 name="chevron-down" solid size={16} color={C.textSecondary} />
          </View>
        </Pressable>

        {(title || headerRight) && (
          <View style={[s.header, { borderBottomColor: C.border }]} {...(closeOnScrollDown ? panHandlers : null)}>
            <View style={[{ flex: 1 }, centerTitle && s.headerCenter]}>
              {title && <Text style={[s.title, { color: C.text }, centerTitle && s.textCenter]} numberOfLines={2}>{title}</Text>}
              {subtitle && <Text style={[s.subtitle, { color: C.textSecondary }, centerTitle && s.textCenter]}>{subtitle}</Text>}
            </View>
            {headerRight}
          </View>
        )}

        {scrollable ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={closeOnScrollDown ? onScroll : undefined}
            scrollEventThrottle={closeOnScrollDown ? 16 : undefined}
            contentContainerStyle={[s.body, contentContainerStyle]}
            {...(closeOnScrollDown ? panHandlers : null)}
          >
            {resolvedChildren}
          </ScrollView>
        ) : (
          <View style={[s.bodyFlex, contentContainerStyle]}>{resolvedChildren}</View>
        )}

        {footer && (
          <View style={[s.footer, { borderTopColor: C.border, backgroundColor: C.surface }]}>{footer}</View>
        )}
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, ...SHADOW.floating, shadowOffset: { width: 0, height: -6 } },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handlePill: { width: 40, height: 24, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md, borderBottomWidth: 1 },
  headerCenter: { alignItems: 'center' },
  textCenter: { textAlign: 'center' },
  title:      { fontSize: 17, fontFamily: F.extrabold },
  subtitle:   { fontSize: 12.5, fontFamily: F.regular, marginTop: 2 },
  body:       { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.xl, paddingBottom: 36 },
  bodyFlex:   { flex: 1 },
  footer:     { padding: SCREEN_GUTTER, borderTopWidth: 1 },
});
