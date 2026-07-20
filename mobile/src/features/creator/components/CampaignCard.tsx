import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { displayCategory } from '@/features/creator/data/filterOptions';
import { useAllCategories, getCategoryMeta } from '@/hooks/useCategories';
import { getTemplateImage } from '@/features/creator/data/templateImages';
import type { Campaign } from '@/types';
import { F, RADIUS, SHADOW } from '@/utilities/constants';

// Featured and Nearby used to be two byte-for-byte-identical card components,
// differing only in their top-right tag (a "NEW" badge vs. a distance pill).
// One component, one `variant`, instead of two files to keep in sync.

const CARD_W    = 244;
const CARD_IMG_H = 188;

function timeAgo(iso: string, t: TFn): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return t('campaignCard.justNow');
  if (mins < 60)  return t('campaignCard.minsAgo', { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('campaignCard.hoursAgo', { n: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t('campaignCard.yesterday');
  if (days < 7)   return t('campaignCard.daysAgo', { n: days });
  const weeks = Math.floor(days / 7);
  if (weeks < 5)  return t('campaignCard.weeksAgo', { n: weeks });
  const months = Math.floor(days / 30);
  if (months < 12) return t('campaignCard.monthsAgo', { n: months });
  return t('campaignCard.yearsAgo', { n: Math.floor(months / 12) });
}

function expiryLabel(iso: string, t: TFn): { label: string; color: string } {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days < 0)   return { label: t('campaignCard.expired'),          color: '#9CA3AF' };
  if (days === 0) return { label: t('campaignCard.expiresToday'),     color: '#EF4444' };
  if (days === 1) return { label: t('campaignCard.expiresTomorrow'),  color: '#F97316' };
  if (days <= 3)  return { label: t('campaignCard.daysLeft', { n: days }), color: '#F97316' };
  if (days <= 7)  return { label: t('campaignCard.daysLeft', { n: days }), color: '#EAB308' };
  if (days <= 14) return { label: t('campaignCard.weeksLeft', { n: Math.ceil(days / 7) }), color: '#6B7280' };
  return { label: t('campaignCard.monthsLeft', { n: Math.ceil(days / 30) }), color: '#6B7280' };
}

function formatDistance(km: number, t: TFn): string {
  if (km < 1) return t('campaignCard.metersAway', { n: Math.round(km * 1000) });
  return t('campaignCard.kmAway', { n: km.toFixed(1) });
}

export function CampaignCard({ campaign, variant }: { campaign: Campaign; variant: 'featured' | 'nearby' }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories } = useAllCategories();
  const catMeta   = getCategoryMeta(categories, campaign.categoryKey ?? campaign.category);
  const cardImage = campaign.featureImageUrl ?? getTemplateImage(campaign.template, campaign.categoryKey ?? campaign.category);

  function goToDetail() {
    router.push({ pathname: '/campaign-detail', params: { campaignId: campaign.id } });
  }

  return (
    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      style={({ pressed }) => [styles.cardWrap, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
      onPress={goToDetail}>
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>

        {/* ── Image — full-bleed, minimal chrome ── */}
        <View style={[styles.img, { backgroundColor: catMeta.bg }]}>
          {/* Category icon always shown as background */}
          <FontAwesome5 name={catMeta.icon} size={48} color={catMeta.color} style={styles.imgIcon} />

          {/* Overlay template image when available */}
          {cardImage && (
            <Image source={{ uri: cardImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
          )}

          {/* Top scrim — keeps the badges legible over bright photos */}
          <LinearGradient
            colors={['rgba(0,0,0,0.32)', 'transparent']}
            style={styles.imgScrim}
            pointerEvents="none"
          />

          {/* Category badge — top left, translucent pill */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{displayCategory(campaign.category).toUpperCase()}</Text>
          </View>

          {/* Top-right tag — the one thing that differs between variants */}
          {variant === 'featured' ? (
            campaign.isNew && (
              <View style={[styles.newTag, { backgroundColor: C.badgeNew }]}>
                <Text style={styles.badgeText}>{t('campaignCard.new')}</Text>
              </View>
            )
          ) : (
            campaign.distanceKm != null && (
              <View style={styles.distanceTag}>
                <Ionicons name="navigate" size={10} color="#fff" />
                <Text style={styles.distanceTagText}>{formatDistance(campaign.distanceKm, t)}</Text>
              </View>
            )
          )}
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>
          {/* Brand row */}
          <View style={styles.brandRow}>
            <View style={[styles.brandAvatar, { backgroundColor: C.brinjal1, borderColor: C.surface }]}>
              <Text style={styles.brandAvatarText}>{campaign.brand[0]}</Text>
            </View>
            <Text style={[styles.brandName, { color: C.textSecondary }]} numberOfLines={1}>{campaign.brand}</Text>
          </View>

          {/* Title — the card's editorial focal point */}
          <Text style={[styles.title, { color: C.text }]} numberOfLines={2}>
            {campaign.title}
          </Text>

          {/* Location — paired tightly under the title */}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={C.textSecondary} />
            <Text style={[styles.locationText, { color: C.textSecondary }]} numberOfLines={1}>
              {campaign.location ?? t('campaignCard.nepalFallback')}
            </Text>
          </View>

          {/* Budget + type */}
          <View style={styles.metaRow}>
            <View style={[styles.budgetChip, { backgroundColor: C.primaryLight }]}>
              <Text style={[styles.budgetText, { color: C.brinjal1 }]} numberOfLines={1}>{campaign.budget}</Text>
            </View>
            {campaign.campaignType === 'OPEN_EVENT' ? (
              <View style={[styles.typePill, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Text style={[styles.typePillText, { color: '#059669' }]}>{t('campaignCard.free')}</Text>
              </View>
            ) : (
              <View style={[styles.typePill, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
                <Text style={[styles.typePillText, { color: '#4F46E5' }]}>{t('campaignCard.paid')}</Text>
              </View>
            )}
          </View>

          {/* Posted + expiry */}
          {(() => {
            const expiry = expiryLabel(campaign.deadline, t);
            return (
              <View style={styles.metaRow}>
                <View style={styles.metaItemRow}>
                  <Ionicons name="calendar-outline" size={11} color={C.textSecondary} />
                  <Text style={[styles.deadlineText, { color: C.textSecondary }]}>
                    {timeAgo(campaign.createdAt, t)}
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

          <View style={[styles.applyBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }]}>
            <Text style={styles.applyBtnText}>{t('campaignCard.applyNow')}</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </View>
        </View>
      </View>

    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    width: CARD_W,
    ...SHADOW.raised,
    shadowColor: '#0F172A',
  },
  card: { width: CARD_W, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1 },
  img:  { width: CARD_W, height: CARD_IMG_H, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  imgIcon: { opacity: 0.35 },
  imgScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 56 },

  badge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: 'rgba(17,24,39,0.55)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.full,
  },
  badgeText: { fontSize: 9, color: '#fff', letterSpacing: 0.4, fontFamily: F.semibold },
  newTag:    { position: 'absolute', top: 12, right: 12, paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.full },

  distanceTag: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(17,24,39,0.55)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.full,
  },
  distanceTagText: { fontSize: 9, color: '#fff', fontFamily: F.semibold },

  body:  { padding: 14, gap: 6 },

  brandRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  brandAvatar:     { width: 20, height: 20, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  brandAvatarText: { fontSize: 10, color: '#fff', fontFamily: F.extrabold },
  brandName:       { fontSize: 11, fontFamily: F.medium, flexShrink: 1 },

  title: { fontSize: 16, lineHeight: 22, fontFamily: F.bold },

  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  locationText: { fontSize: 12, fontFamily: F.medium, flexShrink: 1 },

  metaRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  metaItemRow:  { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 },
  deadlineText: { fontSize: 11, fontFamily: F.medium },

  budgetChip: { borderRadius: RADIUS.sm, paddingHorizontal: 9, paddingVertical: 4 },
  budgetText: { fontSize: 13, fontFamily: F.extrabold },

  typePill:     { borderRadius: RADIUS.sm, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, flexShrink: 0 },
  typePillText: { fontSize: 10, fontFamily: F.bold },

  applyBtn: {
    height: 40, borderRadius: RADIUS.full, marginTop: 4,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
    shadowOpacity: 0.32, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5,
  },
  applyBtnText: { color: '#fff', fontSize: 13, fontFamily: F.bold },
});
