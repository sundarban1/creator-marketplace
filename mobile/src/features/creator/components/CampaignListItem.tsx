import { router } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { cardBg } from '@/features/creator/data/filterOptions';
import { getTemplateImage } from '@/features/creator/data/templateImages';
import type { Campaign } from '@/types';
import { F } from '@/utilities/constants';

const PLATFORM_ICON: Record<string, { name: string; color: string }> = {
  Instagram:    { name: 'instagram', color: '#E1306C' },
  TikTok:       { name: 'tiktok',    color: '#010101' },
  YouTube:      { name: 'youtube',   color: '#FF0000' },
  'Twitter / X': { name: 'twitter',  color: '#1DA1F2' },
  LinkedIn:     { name: 'linkedin',  color: '#0A66C2' },
  Facebook:     { name: 'facebook',  color: '#1877F2' },
};

export function CampaignListItem({ campaign }: { campaign: Campaign }) {
  const { t } = useLanguage();
  const C = useAppColors();
  const platformIcon = PLATFORM_ICON[campaign.platform];
  const thumbImage = getTemplateImage(campaign.template, campaign.category);

  function goToDetail() {
    router.push({ pathname: '/campaign-detail', params: { campaignId: campaign.id } });
  }

  return (
    <View style={[styles.listCard, { backgroundColor: C.surface }]}>
      <View style={[
        styles.listThumb,
        {
          backgroundColor: thumbImage ? 'transparent' : (platformIcon ? platformIcon.color + '18' : cardBg(campaign.category)),
          overflow: 'hidden',
        },
      ]}>
        {thumbImage ? (
          <Image source={{ uri: thumbImage }} style={styles.thumbImg} resizeMode="cover" />
        ) : platformIcon ? (
          <FontAwesome5 name={platformIcon.name as never} size={30} color={platformIcon.color} />
        ) : (
          <Text style={styles.listThumbIcon}>{campaign.platformIcon}</Text>
        )}
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
          <Ionicons name="location" size={11} color={C.textSecondary} />
          <Text style={[styles.listMeta, { color: C.textSecondary }]}>{campaign.location ?? 'Remote'}</Text>
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
  listThumb:     { width: 68, height: 68, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  thumbImg:      { width: 68, height: 68 },
  listThumbIcon: { fontSize: 28 },
  listInfo:      { flex: 1, gap: 4 },
  listBrandRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listBrandName: { fontSize: 12, fontWeight: '600', fontFamily: F.semibold },
  verifiedBadge: { width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  verifiedIcon:  { fontSize: 8, color: '#fff', fontWeight: '700', fontFamily: F.bold },
  listTitle:     { fontSize: 14, fontWeight: '700', lineHeight: 19, fontFamily: F.bold },
  listBudget:    { fontSize: 13, fontWeight: '700', fontFamily: F.bold },
  listMetaRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listMeta:      { fontSize: 11, fontFamily: F.regular },
  applyWrap:     { flexShrink: 0, justifyContent: 'center' },
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
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 12, textAlign: 'center', fontFamily: F.bold },
});
