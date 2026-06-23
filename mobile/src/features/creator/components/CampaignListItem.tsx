import { router } from 'expo-router';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { CATEGORY_META, DEFAULT_META } from '@/features/creator/data/filterOptions';
import type { Campaign } from '@/types';
import { F } from '@/utilities/constants';

const PLATFORM_ICON: Record<string, { name: string; color: string }> = {
  Instagram:     { name: 'instagram', color: '#E1306C' },
  TikTok:        { name: 'tiktok',    color: '#010101' },
  YouTube:       { name: 'youtube',   color: '#FF0000' },
  'Twitter / X': { name: 'twitter',   color: '#1DA1F2' },
  LinkedIn:      { name: 'linkedin',  color: '#0A66C2' },
  Facebook:      { name: 'facebook',  color: '#1877F2' },
};

export function CampaignListItem({ campaign }: { campaign: Campaign }) {
  const C = useAppColors();
  const platIcon = PLATFORM_ICON[campaign.platform];
  const catMeta  = CATEGORY_META[campaign.category] ?? DEFAULT_META;

  function goToDetail() {
    router.push({ pathname: '/campaign-detail', params: { campaignId: campaign.id } });
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.listCard, { backgroundColor: C.surface }, pressed && { opacity: 0.88 }]}
      onPress={goToDetail}>

      {/* Thumb — category emoji with platform badge top-left */}
      <View style={styles.thumbWrap}>
        <View style={[styles.listThumb, { backgroundColor: catMeta.bg }]}>
          <Text style={styles.listThumbIcon}>{catMeta.emoji}</Text>
        </View>
        {platIcon && (
          <View style={[styles.platBadge, { backgroundColor: platIcon.color }]}>
            <FontAwesome5 name={platIcon.name as never} size={9} color="#fff" brand />
          </View>
        )}
      </View>

      {/* Info */}
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
          <Text style={[styles.listMeta, { color: C.textSecondary }]} numberOfLines={1}>
            {campaign.location ?? 'Remote'}
          </Text>
        </View>
      </View>

      {/* Apply button — right column, vertically centered */}
      <View style={styles.applyWrap}>
        <View style={[styles.applyBtn, { backgroundColor: C.brinjal1 }]}>
          <Text style={styles.applyBtnText}>Apply</Text>
          <Ionicons name="arrow-forward" size={11} color="#fff" />
        </View>
      </View>
    </Pressable>
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
  thumbWrap: { flexShrink: 0, position: 'relative' },
  listThumb: {
    width: 68, height: 68, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  listThumbIcon: { fontSize: 30 },
  platBadge: {
    position: 'absolute', top: -5, left: -5,
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
  listInfo:     { flex: 1, gap: 3 },
  listBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listBrandName:{ fontSize: 12, fontFamily: F.semibold },
  verifiedBadge:{ width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  verifiedIcon: { fontSize: 8, color: '#fff', fontFamily: F.bold },
  listTitle:    { fontSize: 14, lineHeight: 19, fontFamily: F.bold },
  listBudget:   { fontSize: 13, fontFamily: F.bold },
  listMetaRow:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  listMeta:     { fontSize: 11, fontFamily: F.regular },

  applyWrap: { flexShrink: 0, alignSelf: 'center' },
  applyBtn: {
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  applyBtnText: { color: '#fff', fontSize: 11, fontFamily: F.bold },
});
