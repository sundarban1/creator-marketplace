import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { F } from '@/utilities/constants';

type ModalType = 'danger' | 'warning' | 'info' | 'success';

type Props = {
  visible:       boolean;
  type?:         ModalType;
  icon?:         keyof typeof Ionicons.glyphMap;
  title:         string;
  body:          string;
  warning?:      string;
  confirmLabel:  string;
  cancelLabel?:  string;
  loading?:      boolean;
  onConfirm:     () => void;
  onCancel:      () => void;
};

const TYPE_CFG: Record<ModalType, { iconName: keyof typeof Ionicons.glyphMap; iconColor: string; iconBg: string; btnColor: string }> = {
  danger:  { iconName: 'trash-outline',        iconColor: '#DC2626', iconBg: '#FEF2F2', btnColor: '#DC2626' },
  warning: { iconName: 'warning-outline',      iconColor: '#B45309', iconBg: '#FFF7ED', btnColor: '#C2410C' },
  info:    { iconName: 'information-circle',   iconColor: '#4F46E5', iconBg: '#EEF2FF', btnColor: '#4F46E5' },
  success: { iconName: 'checkmark-circle',     iconColor: '#16A34A', iconBg: '#F0FDF4', btnColor: '#16A34A' },
};

export function AppModal({
  visible,
  type = 'warning',
  icon,
  title,
  body,
  warning,
  confirmLabel,
  cancelLabel = 'Cancel',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const C   = useAppColors();
  const cfg = TYPE_CFG[type];
  const iconName = icon ?? cfg.iconName;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={s.backdrop}>
        <View style={[s.sheet, { backgroundColor: C.surface }]}>

          {/* Icon circle */}
          <View style={[s.iconCircle, { backgroundColor: cfg.iconBg }]}>
            <Ionicons name={iconName} size={34} color={cfg.iconColor} />
          </View>

          {/* Title */}
          <Text style={[s.title, { color: C.text }]}>{title}</Text>

          {/* Body */}
          <Text style={[s.body, { color: C.textSecondary }]}>{body}</Text>

          {/* Optional warning box */}
          {!!warning && (
            <View style={[s.warningBox, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
              <Ionicons name="warning-outline" size={15} color="#C2410C" style={{ flexShrink: 0, marginTop: 1 }} />
              <Text style={s.warningText}>{warning}</Text>
            </View>
          )}

          {/* Buttons */}
          <View style={s.actions}>
            <Pressable
              style={[s.cancelBtn, { borderColor: C.border, backgroundColor: C.background }]}
              onPress={onCancel}
              disabled={loading}>
              <Text style={[s.cancelText, { color: C.text }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[s.confirmBtn, { backgroundColor: cfg.btnColor, opacity: loading ? 0.7 : 1 }]}
              onPress={onConfirm}
              disabled={loading}>
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.confirmText}>{confirmLabel}</Text>}
            </Pressable>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  sheet:       { width: '100%', borderRadius: 24, padding: 24, alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  iconCircle:  { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  title:       { fontSize: 18, fontWeight: '800', fontFamily: F.extrabold, textAlign: 'center' },
  body:        { fontSize: 13, fontFamily: F.regular, textAlign: 'center', lineHeight: 20 },
  warningBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, width: '100%' },
  warningText: { flex: 1, fontSize: 12, fontFamily: F.medium, lineHeight: 18, color: '#C2410C' },
  actions:     { flexDirection: 'row', gap: 10, width: '100%', marginTop: 6 },
  cancelBtn:   { flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  cancelText:  { fontSize: 14, fontWeight: '600', fontFamily: F.semibold },
  confirmBtn:  { flex: 1, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: F.bold },
});
