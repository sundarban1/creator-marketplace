import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { BottomSheet } from '@/components/BottomSheet';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { DELIVERABLE_REPORT_REASONS, reportService } from '@/services/report';
import { F, RADIUS } from '@/utilities/constants';

type Category = 'PAYMENT' | (typeof DELIVERABLE_REPORT_REASONS)[number];

// Business-side "Raise an issue" on a creator's engagement. One sheet, two
// outcomes:
//  - PAYMENT → the existing escrow dispute (caller's onRaiseDispute; holds
//    the payment until an admin resolves it);
//  - a content category → a DELIVERABLE moderation report straight to Kolab
//    admins. It never touches approval, revision or payment, and the creator
//    is not penalised unless a moderator confirms a violation.
export function RaiseIssueSheet({ visible, onClose, applicationId, disputeAllowed, contentAllowed, onRaiseDispute }: {
  visible: boolean;
  onClose: () => void;
  applicationId: string;
  disputeAllowed: boolean;
  contentAllowed: boolean;
  /** Opens the payment dispute; resolves on success, throws with a user-facing message on failure. */
  onRaiseDispute: (note: string) => Promise<void>;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const isDispute = category === 'PAYMENT';
  const canSubmit = !!category && !submitting;

  function reset() { setCategory(null); setDescription(''); setSubmitted(false); setError(''); }

  function handleClose() {
    if (submitting) return;
    onClose();
    // Reset after the close animation so the sheet doesn't flash back to the form.
    setTimeout(reset, 300);
  }

  async function handleSubmit() {
    if (!category || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      if (isDispute) {
        // The dispute API needs a reason — fall back to the category name.
        await onRaiseDispute(description.trim() || t('raiseIssue.catPAYMENT'));
        onClose();
        setTimeout(reset, 300);
      } else {
        await reportService.create('DELIVERABLE', applicationId, category, description.trim());
        setSubmitted(true);
      }
    } catch (e) {
      // Server messages are user-facing (duplicate report, content gone, ...).
      setError(e instanceof Error && e.message ? e.message : t('reportModal.failed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <BottomSheet visible={visible} onClose={handleClose} title={t('raiseIssue.title')} scrollable={false}>
        <View style={s.successWrap} accessibilityLiveRegion="polite">
          <View style={[s.successIconWrap, { backgroundColor: 'rgba(22,163,74,0.1)' }]}>
            <FontAwesome5 name="check-circle" solid size={28} color="#16A34A" />
          </View>
          <Text style={[s.successTitle, { color: C.text }]}>{t('raiseIssue.successTitle')}</Text>
          <Text style={[s.successSub, { color: C.textSecondary }]}>{t('raiseIssue.successSub')}</Text>
          <Pressable
            style={({ pressed }) => [s.doneBtn, { backgroundColor: C.brinjal1, opacity: pressed ? 0.85 : 1 }]}
            onPress={handleClose}
            accessibilityRole="button">
            <Text style={s.doneBtnTxt}>{t('raiseIssue.done')}</Text>
          </Pressable>
        </View>
      </BottomSheet>
    );
  }

  const row = (c: Category) => {
    const selected = category === c;
    return (
      <Pressable
        key={c}
        style={({ pressed }) => [
          s.reasonRow,
          { borderColor: selected ? '#DC2626' : C.border, backgroundColor: selected ? 'rgba(220,38,38,0.06)' : pressed ? C.border + '40' : 'transparent' },
        ]}
        onPress={() => { setCategory(c); setError(''); }}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}>
        <View style={{ flex: 1 }}>
          <Text style={[s.reasonTxt, { color: C.text }]}>{t(`raiseIssue.cat${c}`)}</Text>
          {c === 'PAYMENT' && <Text style={[s.reasonHint, { color: C.textPlaceholder }]}>{t('raiseIssue.catPAYMENTHint')}</Text>}
        </View>
        <View style={[s.radio, { borderColor: selected ? '#DC2626' : C.border }]}>
          {selected && <View style={s.radioDot} />}
        </View>
      </Pressable>
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={t('raiseIssue.title')}
      subtitle={t('raiseIssue.subtitle')}
      footer={
        <View style={s.footerRow}>
          <Pressable
            style={({ pressed }) => [s.cancelBtn, { borderColor: C.border, opacity: pressed ? 0.7 : 1 }]}
            onPress={handleClose}
            disabled={submitting}
            accessibilityRole="button">
            <Text style={[s.cancelBtnTxt, { color: C.text }]}>{t('reportModal.cancel')}</Text>
          </Pressable>
          <Pressable
            style={[s.submitBtn, { backgroundColor: canSubmit ? '#DC2626' : C.border }]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit, busy: submitting }}>
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.submitBtnTxt}>{t('raiseIssue.submit')}</Text>}
          </Pressable>
        </View>
      }>
      <View accessibilityRole="radiogroup">
        {disputeAllowed && (
          <>
            <Text style={[s.group, { color: C.textSecondary }]}>{t('raiseIssue.groupWork')}</Text>
            <View style={s.list}>{row('PAYMENT')}</View>
          </>
        )}
        {contentAllowed && (
          <>
            <Text style={[s.group, { color: C.textSecondary }]}>{t('raiseIssue.groupContent')}</Text>
            <View style={s.list}>{DELIVERABLE_REPORT_REASONS.map(row)}</View>
          </>
        )}
      </View>

      {!!category && (
        <Text style={[s.hint, { color: C.textSecondary }]}>
          {isDispute ? t('activityTimeline.disputeSheetSub') : t('raiseIssue.contentHint')}
        </Text>
      )}

      <Text style={[s.label, { color: C.textSecondary }]}>
        {t('raiseIssue.descriptionLabel')}
      </Text>
      <TextInput
        style={[s.input, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
        value={description}
        onChangeText={(v) => { setDescription(v.slice(0, 1000)); if (error) setError(''); }}
        placeholder={t('raiseIssue.descriptionPlaceholder')}
        placeholderTextColor={C.textPlaceholder}
        multiline
        numberOfLines={4}
        accessibilityLabel={t('raiseIssue.descriptionLabel')}
      />
      {!!error && <Text style={s.errorTxt} accessibilityLiveRegion="polite">{error}</Text>}
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  group: { fontSize: 12, fontFamily: F.semibold, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  list: { gap: 8, marginBottom: 16 },
  reasonRow: { minHeight: 48, borderWidth: 1.5, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  reasonTxt: { fontSize: 14, fontFamily: F.medium, lineHeight: 21 },
  reasonHint: { fontSize: 12, fontFamily: F.regular, lineHeight: 18, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#DC2626' },
  hint: { fontSize: 13, fontFamily: F.regular, lineHeight: 20, marginBottom: 12 },
  label: { fontSize: 12, fontFamily: F.medium, marginBottom: 8 },
  input: { borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 96, textAlignVertical: 'top', fontFamily: F.regular },
  errorTxt: { fontSize: 12, color: '#EF4444', fontFamily: F.regular, marginTop: 8 },
  footerRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderRadius: RADIUS.full, height: 52, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  cancelBtnTxt: { fontSize: 15, fontFamily: F.semibold },
  submitBtn: { flex: 2, borderRadius: RADIUS.full, height: 52, justifyContent: 'center', alignItems: 'center' },
  submitBtnTxt: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  successWrap: { alignItems: 'center', paddingVertical: 12, gap: 8 },
  successIconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  successTitle: { fontSize: 17, fontFamily: F.bold, textAlign: 'center' },
  successSub: { fontSize: 14, fontFamily: F.regular, textAlign: 'center', lineHeight: 21, paddingHorizontal: 8 },
  doneBtn: { marginTop: 12, alignSelf: 'stretch', borderRadius: RADIUS.full, height: 52, justifyContent: 'center', alignItems: 'center' },
  doneBtnTxt: { color: '#fff', fontSize: 16, fontFamily: F.bold },
});
