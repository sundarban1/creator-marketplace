import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { CATEGORY_META, DEFAULT_META, cardBg } from '@/features/creator/data/filterOptions';
import type { Campaign } from '@/types';
import { F } from '@/utilities/constants';

const CARD_W = 200;
const CARD_IMG_H = 136;

export function FeaturedCard({ campaign }: { campaign: Campaign }) {
  const { t } = useLanguage();
  const C = useAppColors();

  function goToDetail() {
    router.push({ pathname: '/campaign-detail', params: { campaignId: campaign.id } });
  }

  return (
    <View style={[styles.featCard, { backgroundColor: C.surface }]}>
      <View style={[styles.featImg, { backgroundColor: cardBg(campaign.category) }]}>
        <Text style={styles.featImgIcon}>
          {(CATEGORY_META[campaign.category] ?? DEFAULT_META).emoji}
        </Text>
        <View style={[styles.badge, { backgroundColor: C.badgeFeatured }]}>
          <Text style={styles.badgeText}>{campaign.category.toUpperCase()}</Text>
        </View>
        {campaign.isNew && (
          <View style={[styles.newTag, { backgroundColor: C.badgeNew }]}>
            <Text style={styles.badgeText}>NEW</Text>
          </View>
        )}
        <View style={styles.brandPill}>
          <View style={[styles.brandAvatar, { backgroundColor: C.brinjal1 }]}>
            <Text style={styles.brandAvatarText}>{campaign.brand[0]}</Text>
          </View>
          <Text style={[styles.brandPillName, { color: C.text }]} numberOfLines={1}>{campaign.brand}</Text>
        </View>
      </View>
      <View style={styles.featBody}>
        <Text style={[styles.featTitle, { color: C.text }]} numberOfLines={2}>{campaign.title}</Text>
        <View style={styles.featPriceRow}>
          <Text style={[styles.featBudget, { color: C.brinjal1 }]}>{campaign.budget}</Text>
          <View style={[styles.platformTag, { backgroundColor: C.primaryLight }]}>
            <Text style={[styles.platformTagText, { color: C.brinjal1 }]}>{campaign.platform}</Text>
          </View>
        </View>
        <View style={styles.featMetaRow}>
          <Text style={[styles.featMeta, { color: C.textSecondary }]}>📍 {campaign.location ?? 'Remote'}</Text>
        </View>
        <View style={styles.featActions}>
          <Pressable style={[styles.viewBtn, { backgroundColor: C.brinjal1 }]} onPress={goToDetail}>
            <Text style={styles.viewBtnText}>{t('creator.browse.applyNow')}</Text>
          </Pressable>
          <Pressable style={[styles.bookmarkBtn, { backgroundColor: C.background }]}>
            <Text style={styles.bookmarkIcon}>🔖</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  featCard: {
    width: CARD_W, borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  featImg: { width: CARD_W, height: CARD_IMG_H, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  featImgIcon: { fontSize: 42, opacity: 0.7 },
  badge: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5, fontFamily: F.extrabold },
  newTag: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  brandPill: {
    position: 'absolute', bottom: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
    maxWidth: CARD_W - 20,
  },
  brandAvatar: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  brandAvatarText: { fontSize: 9, fontWeight: '800', color: '#fff', fontFamily: F.extrabold },
  brandPillName: { fontSize: 11, fontWeight: '600', flexShrink: 1, fontFamily: F.semibold },
  featBody: { padding: 12, gap: 8 },
  featTitle: { fontSize: 14, fontWeight: '700', lineHeight: 19, fontFamily: F.bold },
  featPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  featBudget: { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  platformTag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  platformTagText: { fontSize: 10, fontWeight: '600', fontFamily: F.semibold },
  featMetaRow: { gap: 4 },
  featMeta: { fontSize: 11, fontFamily: F.regular },
  featActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  viewBtn: { flex: 1, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  viewBtnText: { color: '#fff', fontWeight: '700', fontSize: 12, fontFamily: F.bold },
  bookmarkBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  bookmarkIcon: { fontSize: 14 },
});
