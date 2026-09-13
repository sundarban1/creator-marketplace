import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, FONT_SIZE, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';

export default function RedeemSuccessScreen() {
  const { businessName, discountAmount, pointsCost, creditsEarned } = useLocalSearchParams<{
    businessName: string; discountAmount: string; pointsCost: string; creditsEarned: string;
  }>();
  const C = useAppColors();
  const { t } = useLanguage();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <MaxWidthContainer>
        <View style={styles.body}>
          <View style={[styles.iconCircle, { backgroundColor: '#059669' }]}>
            <FontAwesome5 name="check" solid size={36} color="#fff" />
          </View>

          <Text style={[styles.title, { color: C.text }]}>{t('redeem.successTitle')}</Text>

          <LinearGradient colors={['#F59E0B', '#EC4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
            <Text style={styles.cardLabel}>{t('redeem.successSaved')}</Text>
            <Text style={styles.cardValue}>Rs. {Number(discountAmount ?? 0).toLocaleString()}</Text>
            <View style={styles.cardDivider} />
            <Text style={styles.cardLabel}>{t('redeem.successPointsUsed')}</Text>
            <Text style={styles.cardValueSmall}>{Number(pointsCost ?? 0).toLocaleString()}</Text>
          </LinearGradient>

          {!!businessName && (
            <View style={[styles.creditsRow, { backgroundColor: C.surface, borderColor: C.border }]}>
              <FontAwesome5 name="gift" solid size={14} color={C.brinjal1} />
              <Text style={[styles.creditsText, { color: C.text }]}>
                {t('redeem.successCreditsLine', { business: businessName, n: Number(creditsEarned ?? 0).toLocaleString() })}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Button label={t('redeem.doneButton')} onPress={() => router.dismissTo('/(creator)/(tabs)')} />
        </View>
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SCREEN_GUTTER, gap: SPACING.lg },

  iconCircle: { width: 84, height: 84, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', ...SHADOW.raised },
  title: { fontSize: FONT_SIZE.xl, fontFamily: F.extrabold, textAlign: 'center' },

  card: { width: '100%', borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', gap: 2, ...SHADOW.raised },
  cardLabel: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.85)', fontFamily: F.medium },
  cardValue: { fontSize: 34, color: '#fff', fontFamily: F.extrabold },
  cardValueSmall: { fontSize: 20, color: '#fff', fontFamily: F.bold },
  cardDivider: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 10 },

  creditsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: 12, width: '100%' },
  creditsText: { flex: 1, fontSize: FONT_SIZE.sm, fontFamily: F.medium },

  footer: { paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.lg },
});
