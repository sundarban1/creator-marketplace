import { FontAwesome5 } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, RADIUS, SPACING } from '@/utilities/constants';
import { SeeMoreText } from '@/components/SeeMoreText';
import type { ApiReviewReceived } from '@/services/creator';

// Reviews received on a public profile (§36/§60) — shared between
// (business)/creator-detail.tsx and (creator)/business-detail.tsx since both
// render the exact same list shape for whichever side is being viewed.
//
// `limit` caps how many cards render inline; when there are more than that and
// `onSeeAll` is provided, a "See all N reviews" row is appended — used on the
// profile pages to push the full list to a dedicated screen.
export function ReviewsList({
  reviews, seeMore, limit, onSeeAll,
}: {
  reviews: ApiReviewReceived[];
  seeMore?: boolean;
  limit?: number;
  onSeeAll?: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();

  if (reviews.length === 0) {
    return (
      <Text style={[rl.empty, { color: C.textSecondary }]}>{t('reviewsList.empty')}</Text>
    );
  }

  const shown = limit != null ? reviews.slice(0, limit) : reviews;
  const hasMore = limit != null && reviews.length > limit && !!onSeeAll;

  return (
    <View style={{ gap: 12 }}>
      {shown.map((r) => {
        const name = r.from.name ?? t('reviewsList.anonymous');
        const initials = name.slice(0, 2).toUpperCase();
        return (
          <View key={r.id} style={[rl.card, { borderColor: C.border }]}>
            <View style={rl.header}>
              {r.from.avatarUrl ? (
                <Image source={{ uri: r.from.avatarUrl }} style={rl.avatar} />
              ) : (
                <View style={[rl.avatarFallback, { backgroundColor: C.primaryLight }]}>
                  <Text style={[rl.avatarFallbackTxt, { color: C.brinjal1 }]}>{initials}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[rl.name, { color: C.text }]} numberOfLines={1}>{name}</Text>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <FontAwesome5 key={n} name="star" solid size={11} color={n <= r.rating ? '#F59E0B' : C.border} />
                  ))}
                </View>
              </View>
              <Text style={[rl.date, { color: C.textSecondary }]}>
                {new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </Text>
            </View>
            {r.comment ? (
              seeMore
                ? <SeeMoreText style={[rl.comment, { color: C.textSecondary }]}>{r.comment}</SeeMoreText>
                : <Text style={[rl.comment, { color: C.textSecondary }]}>{r.comment}</Text>
            ) : null}
          </View>
        );
      })}

      {hasMore && (
        <Pressable
          style={[rl.seeAllBtn, { borderColor: C.border }]}
          onPress={onSeeAll}
          accessibilityRole="button">
          <Text style={[rl.seeAllTxt, { color: C.brinjal1 }]}>
            {t('reviewsList.seeAll', { count: reviews.length })}
          </Text>
          <FontAwesome5 name="chevron-right" solid size={12} color={C.brinjal1} />
        </Pressable>
      )}
    </View>
  );
}

const rl = StyleSheet.create({
  empty: { fontSize: 13, fontFamily: F.regular, textAlign: 'center', paddingVertical: 8 },
  card: { borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.md, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: RADIUS.full },
  avatarFallback: { width: 32, height: 32, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackTxt: { fontSize: 12, fontFamily: F.bold },
  name: { fontSize: 13, fontFamily: F.semibold },
  date: { fontSize: 11, fontFamily: F.regular },
  comment: { fontSize: 13, fontFamily: F.regular, lineHeight: 20 },
  seeAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: RADIUS.md, borderWidth: 1, marginTop: 2,
  },
  seeAllTxt: { fontSize: 13, fontFamily: F.semibold },
});
