import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { SearchInput } from '@/components/SearchInput';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { useRefetchOnFocusIfStale } from '@/hooks/useRefetchOnFocusIfStale';
import { STALE } from '@/lib/queryClient';
import { promotionService, type ApiPromotion } from '@/services/rewards';
import { F, FONT_SIZE, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function discountLabel(p: ApiPromotion, t: TFn): string {
  return p.discountType === 'PERCENTAGE'
    ? t('deals.percentOff', { n: p.discountValue })
    : t('deals.amountOff', { n: p.discountValue.toLocaleString() });
}

const EMPTY_PROMOTIONS: ApiPromotion[] = [];

export default function DealsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');

  const dealsQuery = useQuery({
    queryKey: ['promotions', 'discover'],
    queryFn: () => promotionService.listDiscoverable(),
    staleTime: STALE.list,
  });
  useRefetchOnFocusIfStale(dealsQuery);

  const promotions = dealsQuery.data ?? EMPTY_PROMOTIONS;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return promotions;
    return promotions.filter((p) =>
      p.title.toLowerCase().includes(q) || (p.businessName ?? '').toLowerCase().includes(q),
    );
  }, [promotions, search]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
        <PageHeader title={t('deals.headerTitle')} backFallback="/(creator)/(tabs)" />

        <View style={styles.subtitleWrap}>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>{t('deals.subtitle')}</Text>
        </View>

        <View style={styles.searchWrap}>
          <SearchInput placeholder={t('deals.searchPlaceholder')} value={search} onChangeText={setSearch} />
        </View>

        {dealsQuery.isPending ? (
          <View style={styles.grid}>
            {[0, 1, 2].map((i) => <Skeleton key={i} width="100%" height={220} radius={RADIUS.lg} />)}
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            faIcon="tags"
            title={t('deals.emptyTitle')}
            subtitle={t('deals.emptyHint')}
            action={{ label: t('deals.exploreEventsButton'), onPress: () => router.push('/(creator)/(tabs)/discover') }}
          />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
            {filtered.map((p) => <DealCard key={p.id} promotion={p} discount={discountLabel(p, t)} />)}
          </ScrollView>
        )}
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

function DealCard({ promotion, discount }: { promotion: ApiPromotion; discount: string }) {
  const C = useAppColors();
  const { t } = useLanguage();

  return (
    <Pressable
      style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.card]}
      onPress={() => router.push({ pathname: '/(creator)/deal-detail', params: { id: promotion.id } })}>
      <View style={[styles.cardImage, { backgroundColor: C.primaryLight }]}>
        {promotion.imageUrl ? (
          <Image source={{ uri: promotion.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <FontAwesome5 name="store" solid size={28} color={C.brinjal1} />
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.businessName, { color: C.text }]} numberOfLines={1}>{promotion.businessName ?? ''}</Text>
        <Text style={[styles.discount, { color: C.brinjal1 }]} numberOfLines={1}>{discount}</Text>
        <Text style={[styles.forCreators, { color: C.textSecondary }]} numberOfLines={1}>{t('deals.forCreators')}</Text>
        <View style={styles.metaRow}>
          {!!promotion.businessLocation && (
            <View style={styles.metaItem}>
              <FontAwesome5 name="map-marker-alt" solid size={10} color={C.textSecondary} />
              <Text style={[styles.metaText, { color: C.textSecondary }]} numberOfLines={1}>{promotion.businessLocation}</Text>
            </View>
          )}
          <Text style={[styles.metaText, { color: C.textSecondary }]} numberOfLines={1}>
            {t('deals.validUntil', { date: formatShortDate(promotion.validUntil) })}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  subtitleWrap: { paddingHorizontal: SCREEN_GUTTER, marginTop: -4 },
  subtitle: { fontSize: FONT_SIZE.sm, fontFamily: F.regular },
  searchWrap: { paddingHorizontal: SCREEN_GUTTER, marginTop: SPACING.md },
  grid: { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md, paddingBottom: SPACING.xxxl, gap: SPACING.md },

  card: { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  cardImage: { width: '100%', height: 120, justifyContent: 'center', alignItems: 'center' },
  cardBody: { padding: SPACING.md, gap: 3 },
  businessName: { fontSize: FONT_SIZE.md, fontFamily: F.bold },
  discount: { fontSize: FONT_SIZE.lg, fontFamily: F.extrabold, marginTop: 2 },
  forCreators: { fontSize: FONT_SIZE.xs, fontFamily: F.medium },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: FONT_SIZE.xs, fontFamily: F.regular },
});
