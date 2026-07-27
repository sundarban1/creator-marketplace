import { router } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { displayCategory } from '@/features/creator/data/filterOptions';
import { useAllCategories, getCategoryMeta } from '@/hooks/useCategories';
import { usePlatforms, getPlatformMeta } from '@/hooks/usePlatforms';
import { getTemplateImage } from '@/features/creator/data/templateImages';
import type { Campaign } from '@/types';
import { F, RADIUS, SHADOW } from '@/utilities/constants';

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

export function CampaignListItem({ campaign }: { campaign: Campaign }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories } = useAllCategories();
  const { platforms: allPlatforms } = usePlatforms();
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

        {/* Header — thumbnail on the left, title + tags on the right */}
        <View style={styles.cardHeader}>
          <View style={styles.thumbWrap}>
            <View style={[styles.thumb, { backgroundColor: catMeta.bg }]}>
              <FontAwesome5 name={catMeta.icon} size={22} color={catMeta.color} />
              {cardImage && (
                <Image source={{ uri: cardImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
              )}
            </View>
            {/* Platform icons — half over the image, half dipping below it */}
            {campaign.platforms.length > 0 && (
              <View style={styles.platformStackBottom}>
                {campaign.platforms.slice(0, 3).map((p) => {
                  const meta = getPlatformMeta(allPlatforms, p);
                  return (
                    <View key={p} style={[styles.platformIcon, { backgroundColor: C.surface }]}>
                      <FontAwesome5 name={meta.icon} size={9} color={meta.color} />
                    </View>
                  );
                })}
              </View>
            )}
          </View>
          <View style={styles.titleSection}>
            <Text style={[styles.eventTitle, { color: C.text }]} numberOfLines={2}>{campaign.title}</Text>
            <View style={styles.tagContainer}>
              <View style={[styles.tagBadge, { backgroundColor: catMeta.bg }]}>
                <FontAwesome5 name={catMeta.icon} size={9} color={catMeta.color} />
                <Text style={[styles.tagBadgeText, { color: catMeta.color }]} numberOfLines={1}>{displayCategory(campaign.category)}</Text>
              </View>
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
            <Text style={[styles.postedDay, { color: C.textSecondary }]} numberOfLines={1}>
              {campaign.brand} · {timeAgo(campaign.createdAt, t)}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={[styles.detailsSection, { borderTopColor: C.border, borderBottomColor: C.border }]}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color={C.textSecondary} />
            <Text style={[styles.detailText, { color: C.textSecondary }]} numberOfLines={1}>
              {campaign.location ?? t('campaignCard.remoteFallback')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={14} color={expiry.color} />
            <Text style={[styles.detailText, { color: expiry.color }]}>{expiry.label}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={14} color={C.textSecondary} />
            <Text style={[styles.detailText, styles.budgetText, { color: C.text }]}>{campaign.budget}</Text>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [styles.applyBtn, { backgroundColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
            onPress={goToDetail}>
            <Text style={styles.applyBtnText}>{t('campaignCard.applyNow')}</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: { borderRadius: RADIUS.lg, ...SHADOW.raised },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden', padding: 18 },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  // Plain relative-position wrapper scoped to just the thumb, so the platform
  // stack's absolute offset is relative to the image itself (and isn't
  // clipped by thumb's own overflow:hidden, needed for the image corners).
  thumbWrap: { flexShrink: 0 },
  thumb: { width: 64, height: 64, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  // Straddles the thumb's bottom edge — half the icon sits over the photo,
  // half dips below it.
  platformStackBottom: {
    position: 'absolute', bottom: -11, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 4,
  },
  platformIcon: {
    width: 22, height: 22, borderRadius: RADIUS.full,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#0F172A', shadowOpacity: 0.22, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  titleSection: { flex: 1, gap: 6 },
  eventTitle: { fontSize: 16, fontFamily: F.bold, lineHeight: 21 },
  tagContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', rowGap: 6, gap: 6 },
  tagBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4 },
  tagBadgeText: { fontSize: 11, fontFamily: F.bold },
  postedDay: { fontSize: 12, fontFamily: F.regular },

  detailsSection: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 12, marginBottom: 14, gap: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, fontFamily: F.regular },
  budgetText: { fontFamily: F.bold },

  buttonContainer: { flexDirection: 'row' },
  applyBtn: { flex: 1, flexDirection: 'row', minHeight: 44, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center', gap: 6 },
  applyBtnText: { color: '#fff', fontSize: 14, fontFamily: F.bold },
});
