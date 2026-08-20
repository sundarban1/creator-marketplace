import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { BottomSheet } from '@/components/BottomSheet';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { reportService, type ReportReason, type ReportTargetType } from '@/services/report';
import { F, RADIUS } from '@/utilities/constants';

const REASONS: ReportReason[] = ['SPAM', 'SCAM', 'FRAUD', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'FAKE_PROFILE', 'PAYMENT_ISSUE', 'OTHER'];

// §75 — shared report-filing sheet, usable against any target type (profile,
// service, message, review, ...). Caller owns the open/close state and just
// renders this alongside a trigger (flag icon, long-press menu, ...).
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

  function handleClose() {
    onClose();
    // Reset after the close animation rather than immediately, so the sheet
    // doesn't visibly flash back to the form while it's still sliding away.
    setTimeout(() => { setReason(null); setDescription(''); setSubmitted(false); setError(''); }, 300);
  }

  async function handleSubmit() {
    if (!reason || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await reportService.create(targetType, targetId, reason, description.trim());
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('reportModal.failed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <BottomSheet visible={visible} onClose={handleClose} title={t('reportModal.title')}>
        <View style={rm.successWrap}>
          <View style={[rm.successIconWrap, { backgroundColor: '#F0FDF4' }]}>
            <FontAwesome5 name="check-circle" solid size={28} color="#16A34A" />
          </View>
          <Text style={[rm.successTitle, { color: C.text }]}>{t('reportModal.successTitle')}</Text>
          <Text style={[rm.successSub, { color: C.textSecondary }]}>{t('reportModal.successSub')}</Text>
          <Pressable style={[rm.doneBtn, { backgroundColor: C.brinjal1 }]} onPress={handleClose}>
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
        <Pressable
          style={[rm.submitBtn, { backgroundColor: (!reason || submitting) ? C.border : '#DC2626' }]}
          onPress={handleSubmit}
          disabled={!reason || submitting}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={rm.submitBtnTxt}>{t('reportModal.submitBtn')}</Text>}
        </Pressable>
      }>
      <View style={rm.reasonGrid}>
        {REASONS.map((r) => {
          const selected = reason === r;
          return (
            <Pressable
              key={r}
              style={[rm.reasonChip, { borderColor: selected ? '#DC2626' : C.border, backgroundColor: selected ? '#FEF2F2' : C.background }]}
              onPress={() => setReason(r)}>
              <Text style={[rm.reasonChipTxt, { color: selected ? '#DC2626' : C.text }]}>{t(`reportModal.reason${r}`)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[rm.label, { color: C.textSecondary }]}>{t('reportModal.descriptionLabel')}</Text>
      <TextInput
        style={[rm.input, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
        value={description}
        onChangeText={(v) => setDescription(v.slice(0, 1000))}
        placeholder={t('reportModal.descriptionPlaceholder')}
        placeholderTextColor={C.textSecondary}
        multiline
        numberOfLines={3}
      />
      {!!error && <Text style={rm.errorTxt}>{error}</Text>}
    </BottomSheet>
  );
}

const rm = StyleSheet.create({
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  reasonChip: { borderWidth: 1.5, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8 },
  reasonChipTxt: { fontSize: 13, fontFamily: F.semibold },
  label: { fontSize: 12, fontFamily: F.medium, marginBottom: 8 },
  input: { borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', fontFamily: F.regular },
  errorTxt: { fontSize: 12, color: '#EF4444', fontFamily: F.regular, marginTop: 8 },
  submitBtn: { borderRadius: RADIUS.full, height: 52, justifyContent: 'center', alignItems: 'center' },
  submitBtnTxt: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  successWrap: { alignItems: 'center', paddingVertical: 12, gap: 8 },
  successIconWrap: { width: 64, height: 64, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  successTitle: { fontSize: 17, fontFamily: F.bold },
  successSub: { fontSize: 13, fontFamily: F.regular, textAlign: 'center', paddingHorizontal: 20, lineHeight: 19 },
  doneBtn: { borderRadius: RADIUS.full, paddingHorizontal: 32, paddingVertical: 12, marginTop: 12 },
  doneBtnTxt: { color: '#fff', fontSize: 14, fontFamily: F.bold },
});
