import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { BottomSheet } from '@/components/BottomSheet';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { REPORT_REASONS, reportService, type ReportReason, type ReportTargetType } from '@/services/report';
import { F, RADIUS } from '@/utilities/constants';

// Shared report sheet for any user-generated content (profile, event,
// competition, competition entry, portfolio item, chat message, ...). Caller
// owns open/close and renders this next to its trigger (⋯ menu, long-press).
//
// The report is persisted server-side before anything else happens and goes
// straight to Kolab's moderation queue; the reporter is never revealed.
export function ReportModal({ visible, onClose, targetType, targetId }: {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const otherMissing = reason === 'OTHER' && description.trim().length < 5;
  const canSubmit = !!reason && !otherMissing && !submitting;

  function handleClose() {
    if (submitting) return;
    onClose();
    // Reset after the close animation so the sheet doesn't flash back to the form.
    setTimeout(() => { setReason(null); setDescription(''); setSubmitted(false); setError(''); }, 300);
  }

  async function handleSubmit() {
    if (!reason || submitting) return;
    if (otherMissing) { setError(t('reportModal.otherRequired')); return; }
    setSubmitting(true);
    setError('');
    try {
      await reportService.create(targetType, targetId, reason, description.trim());
      setSubmitted(true);
    } catch (e) {
      // Server messages are user-facing (duplicate report, content gone, ...).
      setError(e instanceof Error && e.message ? e.message : t('reportModal.failed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <BottomSheet visible={visible} onClose={handleClose} title={t('reportModal.title')} scrollable={false}>
        <View style={rm.successWrap} accessibilityLiveRegion="polite">
          <View style={[rm.successIconWrap, { backgroundColor: 'rgba(22,163,74,0.1)' }]}>
            <FontAwesome5 name="check-circle" solid size={28} color="#16A34A" />
          </View>
          <Text style={[rm.successTitle, { color: C.text }]}>{t('reportModal.successTitle')}</Text>
          <Text style={[rm.successSub, { color: C.textSecondary }]}>{t('reportModal.successSub')}</Text>
          <Pressable
            style={({ pressed }) => [rm.doneBtn, { backgroundColor: C.brinjal1, opacity: pressed ? 0.85 : 1 }]}
            onPress={handleClose}
            accessibilityRole="button">
            <Text style={rm.doneBtnTxt}>{t('reportModal.done')}</Text>
          </Pressable>
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={t('reportModal.title')}
      subtitle={t('reportModal.subtitle')}
      footer={
        <View style={rm.footerRow}>
          <Pressable
            style={({ pressed }) => [rm.cancelBtn, { borderColor: C.border, opacity: pressed ? 0.7 : 1 }]}
            onPress={handleClose}
            disabled={submitting}
            accessibilityRole="button">
            <Text style={[rm.cancelBtnTxt, { color: C.text }]}>{t('reportModal.cancel')}</Text>
          </Pressable>
          <Pressable
            style={[rm.submitBtn, { backgroundColor: canSubmit ? '#DC2626' : C.border }]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit, busy: submitting }}>
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={rm.submitBtnTxt}>{t('reportModal.submitBtn')}</Text>}
          </Pressable>
        </View>
      }>
      <View accessibilityRole="radiogroup" style={rm.list}>
        {REPORT_REASONS.map((r) => {
          const selected = reason === r;
          return (
            <Pressable
              key={r}
              style={({ pressed }) => [
                rm.reasonRow,
                { borderColor: selected ? '#DC2626' : C.border, backgroundColor: selected ? 'rgba(220,38,38,0.06)' : pressed ? C.border + '40' : 'transparent' },
              ]}
              onPress={() => { setReason(r); setError(''); }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}>
              <Text style={[rm.reasonTxt, { color: C.text }]}>{t(`reportModal.reason${r}`)}</Text>
              <View style={[rm.radio, { borderColor: selected ? '#DC2626' : C.border }]}>
                {selected && <View style={rm.radioDot} />}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text style={[rm.label, { color: C.textSecondary }]}>
        {reason === 'OTHER' ? t('reportModal.descriptionLabelRequired') : t('reportModal.descriptionLabel')}
      </Text>
      <TextInput
        style={[rm.input, { backgroundColor: C.background, borderColor: otherMissing && error ? '#DC2626' : C.border, color: C.text }]}
        value={description}
        onChangeText={(v) => setDescription(v.slice(0, 1000))}
        placeholder={t('reportModal.descriptionPlaceholder')}
        placeholderTextColor={C.textPlaceholder}
        multiline
        numberOfLines={3}
        accessibilityLabel={t('reportModal.descriptionLabel')}
      />
      {!!error && <Text style={rm.errorTxt} accessibilityLiveRegion="polite">{error}</Text>}
      <View style={rm.privacyRow}>
        <FontAwesome5 name="lock" size={11} color={C.textPlaceholder} />
        <Text style={[rm.privacyTxt, { color: C.textPlaceholder }]}>{t('reportModal.confidential')}</Text>
      </View>
    </BottomSheet>
  );
}

const rm = StyleSheet.create({
  list: { gap: 8, marginBottom: 16 },
  reasonRow: { minHeight: 48, borderWidth: 1.5, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  reasonTxt: { flex: 1, fontSize: 14, fontFamily: F.medium, lineHeight: 21 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#DC2626' },
  label: { fontSize: 12, fontFamily: F.medium, marginBottom: 8 },
  input: { borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 84, textAlignVertical: 'top', fontFamily: F.regular },
  errorTxt: { fontSize: 12, color: '#EF4444', fontFamily: F.regular, marginTop: 8 },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  privacyTxt: { fontSize: 12, fontFamily: F.regular, flex: 1, lineHeight: 18 },
  footerRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderRadius: RADIUS.full, height: 52, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  cancelBtnTxt: { fontSize: 15, fontFamily: F.semibold },
  submitBtn: { flex: 2, borderRadius: RADIUS.full, height: 52, justifyContent: 'center', alignItems: 'center' },
  submitBtnTxt: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  successWrap: { alignItems: 'center', paddingVertical: 12, gap: 8 },
  successIconWrap: { width: 64, height: 64, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  successTitle: { fontSize: 17, fontFamily: F.bold },
  successSub: { fontSize: 14, fontFamily: F.regular, textAlign: 'center', paddingHorizontal: 20, lineHeight: 21 },
  doneBtn: { borderRadius: RADIUS.full, paddingHorizontal: 32, minHeight: 48, justifyContent: 'center', marginTop: 12 },
  doneBtnTxt: { color: '#fff', fontSize: 15, fontFamily: F.bold },
});
