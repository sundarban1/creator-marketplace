import { FontAwesome5 } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, RADIUS } from '@/utilities/constants';
import type { ApiReviewReceived } from '@/services/creator';

// Reviews received on a public profile (§36/§60) — shared between
// (business)/creator-detail.tsx and (creator)/business-detail.tsx since both
// render the exact same list shape for whichever side is being viewed.
export function ReviewsList({ reviews }: { reviews: ApiReviewReceived[] }) {
  const C = useAppColors();
  const { t } = useLanguage();

  if (reviews.length === 0) {
    return (
      <Text style={[rl.empty, { color: C.textSecondary }]}>{t('reviewsList.empty')}</Text>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {reviews.map((r) => {
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
            {r.comment ? <Text style={[rl.comment, { color: C.textSecondary }]}>{r.comment}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

const rl = StyleSheet.create({
  empty: { fontSize: 13, fontFamily: F.regular, textAlign: 'center', paddingVertical: 8 },
  card: { borderWidth: 1, borderRadius: RADIUS.md, padding: 12, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: RADIUS.full },
  avatarFallback: { width: 32, height: 32, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackTxt: { fontSize: 12, fontFamily: F.bold },
  name: { fontSize: 13, fontFamily: F.semibold },
  date: { fontSize: 11, fontFamily: F.regular },
  comment: { fontSize: 13, fontFamily: F.regular, lineHeight: 20 },
});
