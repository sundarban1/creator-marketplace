import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { promotionService } from '@/services/rewards';
import { F, FONT_SIZE, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const C = useAppColors();
  const { t } = useLanguage();

  const promotionQuery = useQuery({
    queryKey: ['promotions', id],
    queryFn: () => promotionService.getById(id!),
    enabled: !!id,
    staleTime: 30_000,
  });

  const promotion = promotionQuery.data;
  const discount = promotion
    ? promotion.discountType === 'PERCENTAGE'
      ? t('deals.percentOff', { n: promotion.discountValue })
      : t('deals.amountOff', { n: promotion.discountValue.toLocaleString() })
    : '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <MaxWidthContainer>
        <PageHeader title={promotion?.businessName ?? t('deals.headerTitle')} backFallback="/(creator)/deals" />

        {promotionQuery.isPending ? (
          <View style={styles.content}>
            <Skeleton width="100%" height={180} radius={RADIUS.lg} />
            <Skeleton width="60%" height={28} style={{ marginTop: 12 }} />
            <Skeleton width="100%" height={80} radius={RADIUS.md} style={{ marginTop: 12 }} />
          </View>
        ) : !promotion ? (
          <EmptyState faIcon="tag" title={t('deals.notFound')} />
        ) : (
          <>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              <View style={[styles.heroImage, { backgroundColor: C.primaryLight }]}>
                {promotion.imageUrl ? (
                  <Image source={{ uri: promotion.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <FontAwesome5 name="store" solid size={40} color={C.brinjal1} />
                )}
              </View>

              <Text style={[styles.discount, { color: C.brinjal1 }]}>{discount}</Text>
              <Text style={[styles.forCreators, { color: C.textSecondary }]}>{t('deals.forCreators')}</Text>

              {!!promotion.businessLocation && (
                <View style={styles.metaRow}>
                  <FontAwesome5 name="map-marker-alt" solid size={12} color={C.textSecondary} />
                  <Text style={[styles.metaText, { color: C.textSecondary }]}>{promotion.businessLocation}</Text>
                </View>
              )}
              <View style={styles.metaRow}>
                <FontAwesome5 name="calendar" solid size={12} color={C.textSecondary} />
                <Text style={[styles.metaText, { color: C.textSecondary }]}>
                  {t('deals.validRange', { from: formatDate(promotion.validFrom), to: formatDate(promotion.validUntil) })}
                </Text>
              </View>

              <View style={[styles.factsCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={styles.factRow}>
                  <Text style={[styles.factLabel, { color: C.textSecondary }]}>{t('deals.minSpend', { amount: promotion.minSpend.toLocaleString() })}</Text>
                </View>
                {promotion.maxDiscountCap != null && (
                  <View style={[styles.factRow, styles.factRowBorder, { borderTopColor: C.border }]}>
                    <Text style={[styles.factLabel, { color: C.textSecondary }]}>{t('deals.maxDiscount', { amount: promotion.maxDiscountCap.toLocaleString() })}</Text>
                  </View>
                )}
              </View>

              {!!promotion.description && (
                <Text style={[styles.description, { color: C.text }]}>{promotion.description}</Text>
              )}

              <Text style={[styles.termsTitle, { color: C.text }]}>{t('deals.termsTitle')}</Text>
              <View style={styles.termsList}>
                {[
                  t('deals.termOnePerCreator'),
                  t('deals.termValidPeriod'),
                  t('deals.termMinSpend', { amount: promotion.minSpend.toLocaleString() }),
                  ...(promotion.maxDiscountCap != null ? [t('deals.termMaxDiscount', { amount: promotion.maxDiscountCap.toLocaleString() })] : []),
                ].map((term, i) => (
                  <View key={i} style={styles.termRow}>
                    <Text style={{ color: C.textSecondary }}>•</Text>
                    <Text style={[styles.termText, { color: C.textSecondary }]}>{term}</Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.verifiedNote, { color: C.textSecondary }]}>{t('deals.verifiedNote')}</Text>
            </ScrollView>

            <View style={[styles.ctaBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
              <Button
                label={t('deals.redeemCta')}
                onPress={() => router.push({ pathname: '/(creator)/redeem', params: { promotionId: promotion.id } })}
              />
            </View>
          </>
        )}
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md, paddingBottom: SPACING.xxxl, gap: 6 },

  heroImage: { width: '100%', height: 180, borderRadius: RADIUS.lg, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 8 },
  discount: { fontSize: 28, fontFamily: F.extrabold },
  forCreators: { fontSize: FONT_SIZE.md, fontFamily: F.semibold, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaText: { fontSize: FONT_SIZE.sm, fontFamily: F.regular },

  factsCard: { borderRadius: RADIUS.lg, borderWidth: 1, marginTop: SPACING.md, ...SHADOW.card },
  factRow: { paddingVertical: 12, paddingHorizontal: SPACING.md },
  factRowBorder: { borderTopWidth: 1 },
  factLabel: { fontSize: FONT_SIZE.sm, fontFamily: F.medium },

  description: { fontSize: FONT_SIZE.sm, fontFamily: F.regular, lineHeight: 20, marginTop: SPACING.md },

  termsTitle: { fontSize: FONT_SIZE.md, fontFamily: F.bold, marginTop: SPACING.lg },
  termsList: { gap: 6, marginTop: 8 },
  termRow: { flexDirection: 'row', gap: 8 },
  termText: { flex: 1, fontSize: FONT_SIZE.sm, fontFamily: F.regular, lineHeight: 19 },

  verifiedNote: { fontSize: FONT_SIZE.xs, fontFamily: F.regular, fontStyle: 'italic', lineHeight: 17, marginTop: SPACING.lg },

  ctaBar: { paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md, borderTopWidth: 1 },
});
