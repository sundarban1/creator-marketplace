import { StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { F } from '@/utilities/constants';
import { BackButton } from '@/components/BackButton';

type Props = {
  step: number;
  total: number;
  /** Already-translated "Step X of Y" (or equivalent) — kept as a plain string
   *  rather than this component owning an i18n key, since callers each have
   *  their own translation namespace (onboarding.stepIndicator vs
   *  businessOnboarding.stepIndicator, ...). */
  stepLabel: string;
  title: string;
  subtitle: string;
  onBack: () => void;
};

// Shared progress-bar + step-header block for multi-step wizards (provider
// onboarding, business onboarding, ...) — previously hand-rolled identically
// in each wizard screen (same markup, same styles, copy-pasted per file).
export function StepIndicator({ step, total, stepLabel, title, subtitle, onBack }: Props) {
  const C = useAppColors();
  return (
    <>
      <View style={s.topBar}>
        {step > 1 ? (
          <BackButton onPress={onBack} />
        ) : (
          <View style={s.backBtnSpacer} />
        )}
        <View style={s.progressRow}>
          {Array.from({ length: total }).map((_, i) => (
            <View key={i} style={[s.progressSegment, { backgroundColor: i + 1 <= step ? C.brinjal1 : C.border }]} />
          ))}
        </View>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.stepHeader}>
        <Text style={[s.stepNum, { color: C.brinjal1 }]}>{stepLabel}</Text>
        <Text style={[s.stepTitle, { color: C.text }]}>{title}</Text>
        <Text style={[s.stepSubtitle, { color: C.textSecondary }]}>{subtitle}</Text>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, gap: 12 },
  backBtnSpacer: { width: 40, height: 40 },
  progressRow: { flex: 1, flexDirection: 'row', gap: 6 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  stepHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 4 },
  stepNum: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontFamily: F.bold },
  stepTitle: { fontSize: 24, fontFamily: F.bold },
  stepSubtitle: { fontSize: 14, lineHeight: 21, marginTop: 4, fontFamily: F.regular },
});
