import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { cardBg } from '@/features/creator/data/filterOptions';
import type { Campaign } from '@/types';

export function CampaignListItem({ campaign }: { campaign: Campaign }) {
  const { t } = useLanguage();
  const C = useAppColors();

  function goToDetail() {
    router.push({ pathname: '/campaign-detail', params: { campaignId: campaign.id } });
  }

  return (
    <View style={[styles.listCard, { backgroundColor: C.surface }]}>
      <View style={[styles.listThumb, { backgroundColor: cardBg(campaign.category) }]}>
        <Text style={styles.listThumbIcon}>{campaign.platformIcon}</Text>
      </View>
      <View style={styles.listInfo}>
        <View style={styles.listBrandRow}>
          <Text style={[styles.listBrandName, { color: C.textSecondary }]}>{campaign.brand}</Text>
          <View style={[styles.verifiedBadge, { backgroundColor: C.brinjal1 }]}>
            <Text style={styles.verifiedIcon}>✓</Text>
          </View>
        </View>
        <Text style={[styles.listTitle, { color: C.text }]} numberOfLines={2}>{campaign.title}</Text>
        <Text style={[styles.listBudget, { color: C.brinjal1 }]}>{campaign.budget}</Text>
        <View style={styles.listMetaRow}>
          <Text style={[styles.listMeta, { color: C.textSecondary }]}>👥 {campaign.minFollowers}</Text>
          <Text style={[styles.listMetaDot, { color: C.border }]}>·</Text>
          <Text style={[styles.listMeta, { color: C.textSecondary }]}>📍 {campaign.location}</Text>
        </View>
      </View>
      <View style={styles.applyWrap}>
        <Pressable
          style={({ pressed }) => [styles.applyBtn, { backgroundColor: C.brinjal1 }, pressed && { opacity: 0.85 }]}
          onPress={goToDetail}>
          <Text style={styles.applyBtnText}>{t('creator.browse.applyNow')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  listCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  listThumb: { width: 68, height: 68, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  listThumbIcon: { fontSize: 28 },
  listInfo: { flex: 1, gap: 4 },
  listBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listBrandName: { fontSize: 12, fontWeight: '600' },
  verifiedBadge: { width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  verifiedIcon: { fontSize: 8, color: '#fff', fontWeight: '700' },
  listTitle: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  listBudget: { fontSize: 13, fontWeight: '700' },
  listMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listMeta: { fontSize: 11 },
  listMetaDot: { fontSize: 11 },
  applyWrap: { flexShrink: 0, justifyContent: 'center' },
  applyBtn: {
    width: 76,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 12, textAlign: 'center' },
});
