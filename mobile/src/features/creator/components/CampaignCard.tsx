import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ShortlistButton } from '@/components/ShortlistButton';
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

const CARD_W    = 264;
const CARD_IMG_H = 112;

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
  const expiry    = expiryLabel(campaign.deadline, t);

  function goToDetail() {
    router.push({ pathname: '/campaign-detail', params: { campaignId: campaign.id } });
  }

  return (
    <View style={styles.cardWrap}>
      <Pressable
        style={({ pressed }) => [styles.card, { backgroundColor: C.surface, borderColor: C.border }, pressed && { opacity: 0.92 }]}
        onPress={goToDetail}>

        {/* ── Image ── */}
        <View style={[styles.img, { backgroundColor: catMeta.bg }]}>
          <FontAwesome5 name={catMeta.icon} size={44} color={catMeta.color} style={styles.imgIcon} />
          {cardImage && (
            <Image source={{ uri: cardImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
          )}
          <LinearGradient colors={['rgba(0,0,0,0.32)', 'transparent']} style={styles.imgScrim} pointerEvents="none" />
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>{displayCategory(campaign.category).toUpperCase()}</Text>
          </View>
          {variant === 'featured' ? (
            campaign.isNew && (
              <View style={[styles.newTag, { backgroundColor: C.badgeNew }]}>
                <Text style={styles.badgeText}>{t('campaignCard.new')}</Text>
              </View>
            )
          ) : (
            campaign.distanceKm != null && (
              <View style={styles.distanceTag}>
                <FontAwesome5 name="location-arrow" solid size={10} color="#fff" />
                <Text style={styles.distanceTagText}>{formatDistance(campaign.distanceKm, t)}</Text>
              </View>
            )
          )}
          {campaign.campaignType === 'OPEN_EVENT' ? (
            <View style={[styles.paidFreeTag, { backgroundColor: '#F0FDF4' }]}>
              <Text style={[styles.tagBadgeText, { color: '#059669' }]}>{t('campaignCard.free')}</Text>
            </View>
          ) : (
            <View style={[styles.paidFreeTag, { backgroundColor: '#EEF2FF' }]}>
              <Text style={[styles.tagBadgeText, { color: '#4F46E5' }]}>{t('campaignCard.paid')}</Text>
            </View>
          )}
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>
          <Text style={[styles.title, { color: C.text }]} numberOfLines={1} ellipsizeMode="tail">{campaign.title}</Text>

          <Text style={[styles.budgetTitleText, { color: C.text }]} numberOfLines={1}>{campaign.budget}</Text>

          <View style={styles.metaRow}>
            <Text style={[styles.brandLine, { color: C.textSecondary }]} numberOfLines={1}>
              {campaign.brand} · {timeAgo(campaign.createdAt, t)}
            </Text>
          </View>

          {/* Details — collapsed to one row */}
          <View style={[styles.detailsRow, { borderTopColor: C.border }]}>
            <View style={styles.detailItem}>
              <FontAwesome5 name={campaign.locationType === 'REMOTE' ? 'globe' : 'map-marker-alt'} solid size={11} color={C.textSecondary} />
              <Text style={[styles.detailText, { color: C.textSecondary }]} numberOfLines={1}>
                {campaign.locationType === 'REMOTE' ? t('createEvent.locationRemote') : (campaign.location ?? t('campaignCard.nepalFallback'))}
              </Text>
            </View>
            <View style={[styles.detailItem, styles.detailItemFixed]}>
              <FontAwesome5 name="clock" size={11} color={expiry.color} />
              <Text style={[styles.detailText, { color: expiry.color }]} numberOfLines={1}>{expiry.label}</Text>
            </View>
          </View>

          {/* Save-for-later sits before Apply, so the two ways out of a card
              are side by side. */}
          <View style={styles.ctaRow}>
            <ShortlistButton campaignId={campaign.id} size="sm" />
            <Pressable
              style={({ pressed }) => [styles.applyBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
              onPress={goToDetail}>
              <Text style={styles.applyBtnText}>{t('campaignCard.applyNow')}</Text>
              <FontAwesome5 name="arrow-right" solid size={13} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: { width: CARD_W, ...SHADOW.raised, shadowColor: '#0F172A' },
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

  paidFreeTag: {
    position: 'absolute', bottom: 12, right: 12,
    borderRadius: RADIUS.sm, paddingHorizontal: 7, paddingVertical: 3,
  },
  tagBadgeText: { fontSize: 10, fontFamily: F.bold },

  body: { padding: 12 },
  title: { fontSize: 14, lineHeight: 21, fontFamily: F.bold, marginBottom: 2 },
  budgetTitleText: { fontSize: 13, fontFamily: F.bold, marginBottom: 6 },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  brandLine: { fontSize: 11, fontFamily: F.medium, flexShrink: 1 },

  detailsRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingTop: 8, marginBottom: 10, gap: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 },
  detailItemFixed: { flex: 0 },
  detailText: { fontSize: 11, fontFamily: F.regular, flexShrink: 1 },

  // Shortlist + Apply share the row; Apply takes the leftover width so the
  // bookmark stays a fixed square at the left.
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  applyBtn: {
    flex: 1,
    minHeight: 38, borderRadius: RADIUS.sm,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
    shadowOpacity: 0.32, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5,
  },
  applyBtnText: { color: '#fff', fontSize: 12, fontFamily: F.bold },
});
