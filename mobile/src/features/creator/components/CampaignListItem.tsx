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

      {/* Thumb + type badge below */}
      <View style={styles.thumbWrap}>
        <View style={[styles.listThumb, { backgroundColor: catMeta.bg }]}>
          <Text style={styles.listThumbIcon}>{catMeta.emoji}</Text>
        </View>
        {platIcon && (
          <View style={[styles.platBadge, { backgroundColor: platIcon.color }]}>
            <FontAwesome5 name={platIcon.name as never} size={9} color="#fff" brand />
          </View>
        )}
        {campaign.campaignType === 'OPEN_EVENT' ? (
          <View style={[styles.typeBadge, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <Text style={[styles.typeBadgeText, { color: '#059669' }]}>Free</Text>
          </View>
        ) : (
          <View style={[styles.typeBadge, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
            <Text style={[styles.typeBadgeText, { color: '#4F46E5' }]}>$ Paid</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.listInfo}>
        <View style={styles.listBrandRow}>
          <Text style={[styles.listBrandName, { color: C.textSecondary }]} numberOfLines={1}>{campaign.brand}</Text>
          <View style={[styles.verifiedBadge, { backgroundColor: C.brinjal1 }]}>
            <Text style={styles.verifiedIcon}>✓</Text>
          </View>
        </View>
        <Text style={[styles.listTitle, { color: C.text }]} numberOfLines={2}>{campaign.title}</Text>
        <View style={styles.budgetRow}>
          <Ionicons name="cash-outline" size={13} color={C.brinjal1} />
          <Text style={[styles.listBudget, { color: C.brinjal1 }]}>{campaign.budget}</Text>
        </View>
        <View style={styles.listMetaRow}>
          <Ionicons name="location-outline" size={12} color={C.textSecondary} />
          <Text style={[styles.listMeta, { color: C.textSecondary }]} numberOfLines={1}>
            {campaign.location ?? 'Remote'}
          </Text>
        </View>
      </View>

      {/* Apply button */}
      <Pressable style={[styles.applyBtn, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]} onPress={goToDetail}>
        <Ionicons name="send-outline" size={13} color={C.brinjal1} />
        <Text style={[styles.applyBtnText, { color: C.brinjal1 }]}>Apply</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listCard: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 14,
    gap: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  thumbWrap: { flexShrink: 0, alignItems: 'center', gap: 6 },
  listThumb: {
    width: 72, height: 72, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  listThumbIcon: { fontSize: 32 },
  platBadge: {
    position: 'absolute', top: -5, left: -5,
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
  listInfo:     { flex: 1, gap: 4 },
  listBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listBrandName:{ fontSize: 12, fontFamily: F.semibold, flex: 1 },
  verifiedBadge:{ width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  verifiedIcon: { fontSize: 8, color: '#fff', fontFamily: F.bold },
  listTitle:    { fontSize: 14, lineHeight: 20, fontFamily: F.bold },
  budgetRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  listBudget:   { fontSize: 13, fontFamily: F.bold },
  listMetaRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listMeta:     { fontSize: 11, fontFamily: F.regular },

  typeBadge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  typeBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: F.bold },
  applyBtn: {
    flexShrink: 0, alignSelf: 'center',
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 1.5,
  },
  applyBtnText: { fontSize: 11, fontFamily: F.bold },
});
