import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { StyleProp, ViewStyle } from 'react-native';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useKeyboardOffset } from '@/hooks/useKeyboardOffset';
import { F, RADIUS, SHADOW } from '@/utilities/constants';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
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
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
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
  headerRight,
  footer,
  scrollable = true,
  maxHeightPct = 0.9,
  maxWidth,
  dismissOnBackdropPress = true,
  contentContainerStyle,
  children,
}: Props) {
  const C = useAppColors();
  const keyboardOffset = useKeyboardOffset();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={dismissOnBackdropPress ? onClose : undefined} />
      <Animated.View
        style={[
          s.sheet,
          {
            backgroundColor: C.surface,
            maxHeight: `${maxHeightPct * 100}%`,
            transform: [{ translateY: keyboardOffset }],
            ...(maxWidth != null ? { width: '100%' as const, maxWidth, alignSelf: 'center' as const } : null),
          },
        ]}
      >
        <Pressable style={s.handleWrap} onPress={onClose} hitSlop={12}>
          <View style={[s.handlePill, { backgroundColor: C.border }]}>
            <Ionicons name="chevron-down" size={16} color={C.textSecondary} />
          </View>
        </Pressable>

        {(title || headerRight) && (
          <View style={[s.header, { borderBottomColor: C.border }]}>
            <View style={{ flex: 1 }}>
              {title && <Text style={[s.title, { color: C.text }]} numberOfLines={2}>{title}</Text>}
              {subtitle && <Text style={[s.subtitle, { color: C.textSecondary }]}>{subtitle}</Text>}
            </View>
            {headerRight}
          </View>
        )}

        {scrollable ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[s.body, contentContainerStyle]}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[s.bodyFlex, contentContainerStyle]}>{children}</View>
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
  header:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  title:      { fontSize: 17, fontFamily: F.extrabold },
  subtitle:   { fontSize: 12.5, fontFamily: F.regular, marginTop: 2 },
  body:       { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36 },
  bodyFlex:   { flex: 1 },
  footer:     { padding: 20, borderTopWidth: 1 },
});
