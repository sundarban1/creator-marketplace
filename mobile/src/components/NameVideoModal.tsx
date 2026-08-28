import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, RADIUS, SHADOW, SPACING } from '@/utilities/constants';

const MAX_LABEL_LENGTH = 60;

// Shown once a deliverable video finishes uploading — lets the creator give
// it a meaningful name instead of the auto-generated "Video 2"/"Video 3"
// default (which is already saved server-side by the time this appears; the
// video is never blocked on this input, only relabeled once confirmed).
// Callers must pass a `key` that changes per video (e.g. the upload's
// localId) — that's what resets `label` back to each new initialLabel,
// rather than syncing it via an effect.
export function NameVideoModal({
  visible, initialLabel, onSave, onSkip,
}: {
  visible: boolean;
  initialLabel: string;
  onSave: (label: string) => void;
  onSkip: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [label, setLabel] = useState(initialLabel);

  function handleSave() {
    const trimmed = label.trim();
    onSave(trimmed || initialLabel);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.card, { backgroundColor: C.surface }]}>
          <Text style={[styles.title, { color: C.text }]}>{t('activityTimeline.nameVideoTitle')}</Text>
          <Text style={[styles.sub, { color: C.textSecondary }]}>{t('activityTimeline.nameVideoSub')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
            value={label}
            onChangeText={(v) => setLabel(v.slice(0, MAX_LABEL_LENGTH))}
            placeholder={initialLabel}
            placeholderTextColor={C.textPlaceholder}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <View style={styles.actions}>
            <Pressable style={styles.skipBtn} onPress={onSkip}>
              <Text style={[styles.skipTxt, { color: C.textSecondary }]}>{t('activityTimeline.nameVideoSkip')}</Text>
            </Pressable>
            <Pressable style={[styles.saveBtn, { backgroundColor: C.brinjal1 }]} onPress={handleSave}>
              <Text style={styles.saveTxt}>{t('activityTimeline.nameVideoSave')}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: RADIUS.lg, padding: SPACING.xl, gap: 10, ...SHADOW.floating },
  title: { fontSize: 16, fontFamily: F.bold },
  sub: { fontSize: 12, fontFamily: F.regular, lineHeight: 18, marginBottom: 4 },
  input: { borderWidth: 1.5, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: F.regular },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 6 },
  skipBtn: { paddingHorizontal: 10, paddingVertical: 10, justifyContent: 'center' },
  skipTxt: { fontSize: 13, fontFamily: F.semibold },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.md },
  saveTxt: { color: '#fff', fontSize: 13, fontFamily: F.bold },
});
