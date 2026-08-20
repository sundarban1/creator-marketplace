import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { displayCategory } from '@/features/creator/data/filterOptions';
import { useAllCategories, getCategoryMeta } from '@/hooks/useCategories';
import { getTemplateImage } from '@/features/creator/data/templateImages';
import type { Campaign } from '@/types';
import { F, RADIUS, SHADOW } from '@/utilities/constants';

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

// Booking-site style row: a fixed-width photo on the left, everything else
// stacked on the right — title + price/days-left up top, a flat icon/detail
// line, and a chevron on the far right (vertically centered on the whole
// card) hinting the whole row is tappable.
export function CampaignListItem({ campaign }: { campaign: Campaign }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories } = useAllCategories();
  const catMeta = getCategoryMeta(categories, campaign.categoryKey ?? campaign.category);
  const cardImage = campaign.featureImageUrl ?? getTemplateImage(campaign.template, campaign.categoryKey ?? campaign.category);
  const expiry = expiryLabel(campaign.deadline, t);

  function goToDetail() {
    router.push({ pathname: '/campaign-detail', params: { campaignId: campaign.id } });
  }

  return (
    <View style={[styles.cardWrap, { backgroundColor: C.surface }]}>
      <Pressable
        style={({ pressed }) => [styles.card, { backgroundColor: C.surface, borderColor: C.border }, pressed && { opacity: 0.92 }]}
        onPress={goToDetail}>

        {/* ── Photo (left) ── */}
        <View style={[styles.thumb, { backgroundColor: catMeta.bg }]}>
          <FontAwesome5 name={catMeta.icon} size={28} color={catMeta.color} style={styles.thumbIcon} />
          {cardImage && (
            <Image source={{ uri: cardImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
          )}
          {campaign.isNew && (
            <View style={[styles.ribbon, { backgroundColor: C.badgeNew }]}>
              <Text style={styles.ribbonText}>{t('campaignCard.new')}</Text>
            </View>
          )}
        </View>

        {/* ── Body (right) ── */}
        <View style={styles.body}>
          <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>{campaign.title}</Text>

          <View style={styles.amountRow}>
            <Text style={[styles.budgetText, { color: C.text }]} numberOfLines={1}>{campaign.budget}</Text>
            <View style={styles.amountDaysLeft}>
              <FontAwesome5 name="clock" size={10} color={expiry.color} />
              <Text style={[styles.detailText, { color: expiry.color }]} numberOfLines={1}>{expiry.label}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={[styles.metaLine, { color: C.textSecondary }]} numberOfLines={1}>
              {campaign.brand} · {displayCategory(campaign.category)}
            </Text>
            {campaign.campaignType === 'OPEN_EVENT' ? (
              <View style={[styles.tagBadge, { backgroundColor: '#F0FDF4' }]}>
                <Text style={[styles.tagBadgeText, { color: '#059669' }]}>{t('campaignCard.free')}</Text>
              </View>
            ) : (
              <View style={[styles.tagBadge, { backgroundColor: '#EEF2FF' }]}>
                <Text style={[styles.tagBadgeText, { color: '#4F46E5' }]}>{t('campaignCard.paid')}</Text>
              </View>
            )}
          </View>

          <View style={[styles.detailsRow, { borderTopColor: C.border }]}>
            <View style={styles.detailItem}>
              <FontAwesome5 name={campaign.locationType === 'REMOTE' ? 'globe' : 'map-marker-alt'} solid size={10} color={C.textSecondary} />
              <Text style={[styles.detailText, { color: C.textSecondary }]} numberOfLines={1}>
                {campaign.locationType === 'REMOTE' ? t('createEvent.locationRemote') : (campaign.location ?? t('campaignCard.nepalFallback'))}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Chevron (vertically centered against the full card height) ── */}
        <View style={styles.chevronWrap}>
          <FontAwesome5 name="chevron-right" solid size={14} color={C.textSecondary} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: { borderRadius: RADIUS.lg, ...SHADOW.raised },
  card:   { flexDirection: 'row', borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1 },

  thumb:  { width: 96, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, position: 'relative' },
  thumbIcon: { opacity: 0.35 },
  ribbon: { position: 'absolute', top: 8, left: 8, borderRadius: RADIUS.sm, paddingHorizontal: 7, paddingVertical: 3 },
  ribbonText: { fontSize: 9, color: '#fff', letterSpacing: 0.3, fontFamily: F.semibold },

  body: { flex: 1, padding: 12, gap: 6, minWidth: 0 },

  title:      { fontSize: 14.5, lineHeight: 19, letterSpacing: -0.2, fontFamily: F.bold },
  // flexShrink so a long budget range truncates (ellipsis, via numberOfLines={1})
  // instead of pushing the days-left label in amountDaysLeft off the row.
  budgetText: { fontSize: 14, fontFamily: F.bold, flexShrink: 1, minWidth: 0 },

  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  // flexShrink: 0 — days-left always renders in full; budgetText above gives
  // up space first so this stays a single line instead of wrapping the row.
  amountDaysLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },

  metaRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  metaLine: { fontSize: 11.5, fontFamily: F.regular, flexShrink: 1 },

  detailsRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, paddingTop: 6, marginTop: 2 },
  detailItem:  { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, minWidth: 0 },
  detailText:  { fontSize: 11, fontFamily: F.regular, flexShrink: 1 },

  chevronWrap: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  tagBadge:     { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4 },
  tagBadgeText: { fontSize: 11, fontFamily: F.bold },
});
