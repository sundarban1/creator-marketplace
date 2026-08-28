import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { BackButton } from '@/components/BackButton';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { ReviewsList } from '@/components/ReviewsList';
import { F, SCREEN_GUTTER, SPACING } from '@/utilities/constants';
import type { ApiReviewReceived } from '@/services/creator';

// Full reviews list, reached from a profile's "See all N reviews" row. The
// reviews are already loaded on the profile (they ship embedded in the profile
// payload, not paginated), so they're handed over as a JSON param rather than
// refetched — one screen serves every creator/business profile page.
export function AllReviewsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ reviews?: string; rating?: string; count?: string }>();

  const reviews = useMemo<ApiReviewReceived[]>(() => {
    try {
      const parsed = params.reviews ? JSON.parse(params.reviews) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [params.reviews]);

  // Prefer the summary the profile passed through; otherwise derive it from the
  // reviews themselves so the header still shows an average + count.
  const derivedAvg = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;
  const rating = params.rating ? Number(params.rating) : derivedAvg;
  const count = params.count ? Number(params.count) : reviews.length;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
        <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]} accessibilityRole="header">
          <BackButton />
          <Text style={[s.title, { color: C.text }]}>{t('reviewsList.title')}</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {rating != null && Number.isFinite(rating) && count > 0 ? (
            <View style={[s.summaryRow, { borderBottomColor: C.border }]}>
              <FontAwesome5 name="star" solid size={13} color="#F59E0B" />
              <Text style={[s.summaryTxt, { color: C.textSecondary }]}>
                {t('reviewsList.summary', { rating: rating.toFixed(1), count })}
              </Text>
            </View>
          ) : null}

          <ReviewsList reviews={reviews} seeMore />
        </ScrollView>
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md, paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontFamily: F.bold },
  scroll: { padding: SCREEN_GUTTER, paddingBottom: SPACING.xxxl, gap: 12 },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingBottom: 12, marginBottom: 4, borderBottomWidth: 1,
  },
  summaryTxt: { fontSize: 13, fontFamily: F.semibold },
});
