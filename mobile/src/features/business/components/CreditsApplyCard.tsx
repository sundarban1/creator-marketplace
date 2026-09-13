import { FontAwesome5 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { STALE } from '@/lib/queryClient';
import { creditsService } from '@/services/rewards';
import { sc } from './CampaignFormControls';
import { F, FONT_SIZE, RADIUS, SPACING } from '@/utilities/constants';

const STEP = 50;

// Kolab Rewards — §20 of the spec: earmark Business Credits toward this
// campaign's budget at creation time. Purely a bookkeeping figure (see
// Campaign.creditsApplied's schema comment) — it does not reduce what's
// actually charged per accepted creator later, since payment happens per
// Application via Khalti/eSewa/manual, not as one campaign-wide charge.
// Hidden entirely when the business has no credits, so campaigns without
// this feature look exactly as they always have.
export function CreditsApplyCard({
  totalBudget, value, onChange,
}: {
  totalBudget: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();

  const balanceQuery = useQuery({
    queryKey: ['credits', 'balance'],
    queryFn: () => creditsService.getBalance(),
    staleTime: STALE.realtime,
    refetchOnMount: 'always',
  });
  const balance = balanceQuery.data?.balance ?? 0;
  const maxApplicable = Math.max(0, Math.min(balance, totalBudget));

  if (maxApplicable <= 0) return null;

  const remaining = Math.max(0, totalBudget - value);

  return (
    <View style={[sc.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={sc.titleRow}>
        <View style={[sc.iconChip, { backgroundColor: '#EC489918', shadowColor: '#EC4899' }]}>
          <FontAwesome5 name="gift" size={14} color="#EC4899" />
        </View>
        <Text style={[sc.title, { color: C.text }]}>{t('campaignCredits.title')}</Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: C.textSecondary }]}>{t('campaignCredits.campaignBudgetLabel')}</Text>
        <Text style={[styles.rowValue, { color: C.text }]}>Rs. {totalBudget.toLocaleString()}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: C.textSecondary }]}>{t('campaignCredits.availableCreditsLabel')}</Text>
        <Text style={[styles.rowValue, { color: C.text }]}>Rs. {balance.toLocaleString()}</Text>
      </View>

      <View style={[styles.stepperWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Pressable
          style={[styles.stepperBtn, { backgroundColor: value <= 0 ? C.background : C.primaryLight }]}
          onPress={() => onChange(Math.max(0, value - STEP))}
          disabled={value <= 0}>
          <Text style={[styles.stepperBtnText, { color: value <= 0 ? C.border : C.brinjal1 }]}>−</Text>
        </Pressable>
        <View style={styles.stepperCenter}>
          <Text style={[styles.stepperValue, { color: C.brinjal1 }]}>Rs. {value.toLocaleString()}</Text>
        </View>
        <Pressable
          style={[styles.stepperBtn, { backgroundColor: value >= maxApplicable ? C.background : C.primaryLight }]}
          onPress={() => onChange(Math.min(maxApplicable, value + STEP))}
          disabled={value >= maxApplicable}>
          <Text style={[styles.stepperBtnText, { color: value >= maxApplicable ? C.border : C.brinjal1 }]}>+</Text>
        </Pressable>
      </View>

      <View style={[styles.row, { marginTop: 2 }]}>
        <Text style={[styles.rowLabel, { color: C.textSecondary, fontFamily: F.bold }]}>{t('campaignCredits.remainingPaymentLabel')}</Text>
        <Text style={[styles.rowValue, { color: C.text, fontSize: FONT_SIZE.md, fontFamily: F.extrabold }]}>Rs. {remaining.toLocaleString()}</Text>
      </View>

      {value > 0 && (
        <Text style={[styles.note, { color: C.textSecondary }]}>
          {t('campaignCredits.note', { applied: value.toLocaleString(), remaining: remaining.toLocaleString() })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: FONT_SIZE.sm, fontFamily: F.regular },
  rowValue: { fontSize: FONT_SIZE.sm, fontFamily: F.bold },

  stepperWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1.5, overflow: 'hidden', marginTop: 4 },
  stepperBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  stepperBtnText: { fontSize: 22, lineHeight: 34, fontFamily: F.regular },
  stepperCenter: { flex: 1, alignItems: 'center' },
  stepperValue: { fontSize: 18, fontFamily: F.bold },

  note: { fontSize: FONT_SIZE.xs, fontFamily: F.regular, lineHeight: 17, fontStyle: 'italic', marginTop: SPACING.xs },
});
