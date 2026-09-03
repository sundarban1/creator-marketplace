import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F } from '@/utilities/constants';

// Compact rating summary shown directly under a profile name — five stars, the
// numeric average, and a tappable "N reviews" that opens <ReviewsModal>. When
// there are no reviews yet it renders a muted, non-interactive line instead.
export function ProfileRatingRow({
  averageRating,
  reviewCount,
  onPress,
}: {
  averageRating?: number | null;
  reviewCount?: number | null;
  onPress: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();

  const count = reviewCount ?? 0;
  if (count <= 0) {
    return (
      <Text style={[s.none, { color: C.textPlaceholder }]}>{t('profile.noReviewsYet')}</Text>
    );
  }

  const rounded = Math.round(averageRating ?? 0);

  return (
    <Pressable
      style={s.row}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t('reviewsList.summary', {
        rating: (averageRating ?? 0).toFixed(1),
        count,
      })}>
      <View style={s.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <FontAwesome5 key={n} name="star" solid size={13} color={n <= rounded ? '#F59E0B' : C.border} />
        ))}
      </View>
      <Text style={[s.count, { color: C.brinjal1 }]}>{t('reviewsList.reviewsCount', { count })}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  stars: { flexDirection: 'row', gap: 2 },
  count: { fontSize: 13, fontFamily: F.semibold, textDecorationLine: 'underline' },
  none: { fontSize: 13, fontFamily: F.regular, textAlign: 'center', marginTop: 4 },
});
