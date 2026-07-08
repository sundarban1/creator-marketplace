import { router } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { CATEGORY_META, DEFAULT_META } from '@/features/creator/data/filterOptions';
import type { Campaign } from '@/types';
import { F } from '@/utilities/constants';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7)   return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5)  return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function expiryLabel(iso: string): { label: string; color: string } {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days < 0)   return { label: 'Expired',           color: '#9CA3AF' };
  if (days === 0) return { label: 'Expires today',     color: '#EF4444' };
  if (days === 1) return { label: 'Expires tomorrow',  color: '#F97316' };
  if (days <= 3)  return { label: `${days}d left`,     color: '#F97316' };
  if (days <= 7)  return { label: `${days}d left`,     color: '#EAB308' };
  if (days <= 14) return { label: `${Math.ceil(days / 7)}w left`, color: '#6B7280' };
  return { label: `${Math.ceil(days / 30)}mo left`,    color: '#6B7280' };
}


export function CampaignListItem({ campaign }: { campaign: Campaign }) {
  const C = useAppColors();
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
          <FontAwesome5 name={catMeta.icon} size={22} color="#00000066" />
        </View>
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
        <Text style={[styles.listBrandName, { color: C.textSecondary }]} numberOfLines={1}>{campaign.brand}</Text>
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
        <View style={styles.listDatesRow}>
          <View style={styles.listMetaRow}>
            <Ionicons name="calendar-outline" size={12} color={C.textSecondary} />
            <Text style={[styles.listMeta, { color: C.textSecondary }]}>{timeAgo(campaign.createdAt)}</Text>
          </View>
          {(() => {
            const expiry = expiryLabel(campaign.deadline);
            return (
              <View style={styles.listMetaRow}>
                <Ionicons name="time-outline" size={12} color={expiry.color} />
                <Text style={[styles.listMeta, { color: expiry.color }]}>{expiry.label}</Text>
              </View>
            );
          })()}
        </View>
      </View>

      {/* Apply button */}
      <Pressable style={[styles.applyBtn, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]} onPress={goToDetail}>
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
  listDatesRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

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
