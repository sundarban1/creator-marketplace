import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { CATEGORY_META, DEFAULT_META, cardBg, displayCategory } from '@/features/creator/data/filterOptions';
import { getTemplateImage } from '@/features/creator/data/templateImages';
import type { Campaign } from '@/types';
import { F } from '@/utilities/constants';

const PLATFORM_META: Record<string, { color: string; icon: string }> = {
  Instagram:     { color: '#E1306C', icon: 'instagram' },
  TikTok:        { color: '#010101', icon: 'tiktok' },
  YouTube:       { color: '#FF0000', icon: 'youtube' },
  'Twitter / X': { color: '#1DA1F2', icon: 'twitter' },
  LinkedIn:      { color: '#0A66C2', icon: 'linkedin' },
  Facebook:      { color: '#1877F2', icon: 'facebook' },
};

const CARD_W    = 216;
const CARD_IMG_H = 148;

function formatDeadline(deadline: string): string {
  try {
    return new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return deadline;
  }
}

export function FeaturedCard({ campaign }: { campaign: Campaign }) {
  const C = useAppColors();
  const catMeta   = CATEGORY_META[campaign.category] ?? DEFAULT_META;
  const cardImage = getTemplateImage(campaign.template, campaign.category);
  const platMeta  = PLATFORM_META[campaign.platform];

  function goToDetail() {
    router.push({ pathname: '/campaign-detail', params: { campaignId: campaign.id } });
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.featCardWrap, pressed && { opacity: 0.88 }]}
      onPress={goToDetail}>
      <View style={[styles.featCard, { backgroundColor: C.surface }]}>

        {/* ── Image ── */}
        <View style={[styles.featImg, { backgroundColor: catMeta.bg ?? cardBg(campaign.category) }]}>
          {/* Category emoji always shown as background */}
          <Text style={styles.featImgIcon}>{catMeta.emoji}</Text>

          {/* Overlay template image when available */}
          {cardImage && (
            <Image source={{ uri: cardImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )}
          {cardImage && <View style={styles.imgOverlay} />}

          {/* Category badge — top left */}
          <View style={[styles.badge, { backgroundColor: C.badgeFeatured }]}>
            <Text style={styles.badgeText}>{displayCategory(campaign.category).toUpperCase()}</Text>
          </View>

          {/* NEW tag — top right */}
          {campaign.isNew && (
            <View style={[styles.newTag, { backgroundColor: C.badgeNew }]}>
              <Text style={styles.badgeText}>NEW</Text>
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
        <View style={styles.featBody}>
          <Text style={[styles.featTitle, { color: C.text }]} numberOfLines={2}>
            {campaign.title}
          </Text>

          {/* Budget chip */}
          <View style={[styles.budgetChip, { backgroundColor: C.primaryLight, alignSelf: 'flex-start' }]}>
            <Text style={[styles.budgetText, { color: C.brinjal1 }]} numberOfLines={1}>{campaign.budget}</Text>
          </View>

          {/* Location + deadline */}
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: C.textSecondary }]} numberOfLines={1}>
              📍 {campaign.location ?? 'Nepal'}
            </Text>
            <View style={styles.deadlineRow}>
              <Ionicons name="time-outline" size={11} color={C.textSecondary} />
              <Text style={[styles.deadlineText, { color: C.textSecondary }]} numberOfLines={1}>
                {formatDeadline(campaign.deadline)}
              </Text>
            </View>
          </View>

          {/* Type badge */}
          {campaign.campaignType === 'OPEN_EVENT' ? (
            <View style={[styles.typeBadge, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <Text style={[styles.typeBadgeText, { color: '#059669' }]}>✓ Free Event</Text>
            </View>
          ) : (
            <View style={[styles.typeBadge, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
              <Text style={[styles.typeBadgeText, { color: '#4F46E5' }]}>$ Paid Event</Text>
            </View>
          )}

          {/* View & Apply — static, whole card is the tap target */}
          <View style={[styles.applyBtn, { backgroundColor: C.brinjal1 }]}>
            <Text style={styles.applyBtnText}>View & Apply →</Text>
          </View>
        </View>
      </View>

      {/* Platform badge straddling image/body boundary */}
      {platMeta && (
        <View style={[styles.platformBadge, { backgroundColor: platMeta.color }]}>
          <FontAwesome5 name={platMeta.icon} size={13} color="#fff" brand />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  featCardWrap: {
    width: CARD_W,
    shadowColor: '#000', shadowOpacity: 0.09, shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  featCard:    { width: CARD_W, borderRadius: 20, overflow: 'hidden' },
  featImg:     { width: CARD_W, height: CARD_IMG_H, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  featImgIcon: { fontSize: 52, opacity: 0.75 },
  imgOverlay:  { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.18)' },

  badge:     { position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.6, fontFamily: F.extrabold },
  newTag:    { position: 'absolute', top: 10, right: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },

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

  platformBadge: {
    position: 'absolute', top: CARD_IMG_H - 17, right: 14,
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 8, zIndex: 10,
  },

  featBody:  { padding: 14, gap: 9 },
  featTitle: { fontSize: 14, fontWeight: '700', lineHeight: 20, fontFamily: F.bold },

  budgetChip:  { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  budgetText:  { fontSize: 13, fontWeight: '800', fontFamily: F.extrabold },

  metaRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  metaText:    { fontSize: 11, fontFamily: F.regular, flexShrink: 1 },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 },
  deadlineText:{ fontSize: 11, fontFamily: F.medium },

  typeBadge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', borderWidth: 1 },
  typeBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: F.bold },

  applyBtn:     { height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13, fontFamily: F.bold },
});
