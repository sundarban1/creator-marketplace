import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { displayCategory } from '@/features/creator/data/filterOptions';
import { useAllCategories, getCategoryMeta } from '@/hooks/useCategories';
import { getTemplateImage } from '@/features/creator/data/templateImages';
import type { Campaign } from '@/types';
import { F } from '@/utilities/constants';

const CARD_W    = 216;
const CARD_IMG_H = 148;

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

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export function NearbyCard({ campaign }: { campaign: Campaign }) {
  const C = useAppColors();
  const { categories } = useAllCategories();
  const catMeta   = getCategoryMeta(categories, campaign.category);
  const cardImage = campaign.featureImageUrl ?? getTemplateImage(campaign.template, campaign.category);

  function goToDetail() {
    router.push({ pathname: '/campaign-detail', params: { campaignId: campaign.id } });
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.cardWrap, pressed && { opacity: 0.88 }]}
      onPress={goToDetail}>
      <View style={[styles.card, { backgroundColor: C.surface }]}>

        {/* ── Image ── */}
        <View style={[styles.img, { backgroundColor: catMeta.bg }]}>
          <FontAwesome5 name={catMeta.icon} size={44} color={catMeta.color} style={styles.imgIcon} />

          {cardImage && (
            <Image source={{ uri: cardImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )}
          {cardImage && <View style={styles.imgOverlay} />}

          {/* Category badge — top left */}
          <View style={[styles.badge, { backgroundColor: C.badgeFeatured }]}>
            <Text style={styles.badgeText}>{displayCategory(campaign.category).toUpperCase()}</Text>
          </View>

          {/* Distance badge — top right. This is the one piece of info that
              makes this row different from Featured, so it's the most prominent tag. */}
          {campaign.distanceKm != null && (
            <View style={styles.distanceTag}>
              <Ionicons name="navigate" size={10} color="#fff" />
              <Text style={styles.distanceTagText}>{formatDistance(campaign.distanceKm)}</Text>
            </View>
          )}

          {/* Brand pill — bottom left */}
          <View style={styles.brandPill}>
            <View style={[styles.brandAvatar, { backgroundColor: C.brinjal1 }]}>
              <Text style={styles.brandAvatarText}>{campaign.brand[0]}</Text>
            </View>
            <Text style={styles.brandPillName} numberOfLines={1}>{campaign.brand}</Text>
          </View>

        </View>

        {/* ── Body ── */}
        <View style={styles.body}>
          <Text style={[styles.title, { color: C.text }]} numberOfLines={2}>
            {campaign.title}
          </Text>

          <View style={[styles.budgetChip, { backgroundColor: C.primaryLight, alignSelf: 'flex-start' }]}>
            <Text style={[styles.budgetText, { color: C.brinjal1 }]} numberOfLines={1}>{campaign.budget}</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItemRow}>
              <Ionicons name="location-outline" size={11} color={C.textSecondary} />
              <Text style={[styles.metaText, { color: C.textSecondary }]} numberOfLines={1}>
                {campaign.location ?? 'Nepal'}
              </Text>
            </View>
            {campaign.campaignType === 'OPEN_EVENT' ? (
              <View style={[styles.typePill, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Text style={[styles.typePillText, { color: '#059669' }]}>Free</Text>
              </View>
            ) : (
              <View style={[styles.typePill, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
                <Text style={[styles.typePillText, { color: '#4F46E5' }]}>Rs Paid</Text>
              </View>
            )}
          </View>

          {(() => {
            const expiry = expiryLabel(campaign.deadline);
            return (
              <View style={styles.metaRow}>
                <View style={styles.metaItemRow}>
                  <Ionicons name="calendar-outline" size={11} color={C.textSecondary} />
                  <Text style={[styles.deadlineText, { color: C.textSecondary }]}>
                    {timeAgo(campaign.createdAt)}
                  </Text>
                </View>
                <View style={styles.metaItemRow}>
                  <Ionicons name="time-outline" size={11} color={expiry.color} />
                  <Text style={[styles.deadlineText, { color: expiry.color }]} numberOfLines={1}>
                    {expiry.label}
                  </Text>
                </View>
              </View>
            );
          })()}

          <View style={[styles.applyBtn, { backgroundColor: C.brinjal1 }]}>
            <Text style={styles.applyBtnText}>Apply Now</Text>
          </View>
        </View>
      </View>

    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    width: CARD_W,
    shadowColor: '#000', shadowOpacity: 0.09, shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  card: { width: CARD_W, borderRadius: 20, overflow: 'hidden' },
  img:  { width: CARD_W, height: CARD_IMG_H, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  imgIcon: { opacity: 0.35 },
  imgOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.18)' },

  badge:     { position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.6, fontFamily: F.extrabold },

  distanceTag: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(17,24,39,0.75)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  distanceTagText: { fontSize: 9, fontWeight: '800', color: '#fff', fontFamily: F.extrabold },

  brandPill: {
    position: 'absolute', bottom: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
    maxWidth: CARD_W - 60,
  },
  brandAvatar:     { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  brandAvatarText: { fontSize: 9, fontWeight: '800', color: '#fff', fontFamily: F.extrabold },
  brandPillName:   { fontSize: 11, fontWeight: '600', flexShrink: 1, color: '#111', fontFamily: F.semibold },

  body:  { padding: 14, gap: 9 },
  title: { fontSize: 14, fontWeight: '700', lineHeight: 20, fontFamily: F.bold },

  budgetChip: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  budgetText: { fontSize: 13, fontWeight: '800', fontFamily: F.extrabold },

  metaRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  metaItemRow:  { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 },
  metaText:     { fontSize: 11, fontFamily: F.regular, flexShrink: 1 },
  deadlineText: { fontSize: 11, fontFamily: F.medium },

  typePill:     { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, flexShrink: 0 },
  typePillText: { fontSize: 10, fontWeight: '700', fontFamily: F.bold },

  applyBtn:     { height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13, fontFamily: F.bold },
});
