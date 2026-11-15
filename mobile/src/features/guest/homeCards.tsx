// Compact cards for the Guest Home feed — horizontal "row" cards for
// opportunities / competitions (thumbnail · details · highlight panel) and a
// photo-top creator card. Built on the app's tokens (useAppColors, F, RADIUS,
// SHADOW, lineHeightFor) so light/dark and Nepali text behave like every
// other screen.
import { FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { useAppColors, useIsDark } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { displayCategory } from '@/features/creator/data/filterOptions';
import { getTemplateImage } from '@/features/creator/data/templateImages';
import { npr } from '@/features/creator/competition/format';
import { getCategoryMeta, useAllCategories } from '@/hooks/useCategories';
import { prefetchCampaign } from '@/lib/prefetch';
import type { ApiCreatorListItem } from '@/services/creator';
import type { CompetitionCard } from '@/services/competition';
import type { Campaign } from '@/types';
import { withAlpha } from '@/utilities/color';
import { F, FONT_SIZE, RADIUS, SHADOW, SPACING, lineHeightFor } from '@/utilities/constants';
import { openCreatorProfile } from './components';

const PURPLE = '#7C3AED';
// #7C3AED text on dark surfaces is below readable contrast — lighter on dark.
const PURPLE_ON_DARK = '#A78BFA';
const GREEN = '#059669';

function shortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[s.pill, { backgroundColor: withAlpha(color, 0.12) }]}>
      <Text style={[s.pillText, { color }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function MetaLine({ icon, text }: { icon: keyof typeof FontAwesome5.glyphMap; text: string }) {
  const C = useAppColors();
  if (!text) return null;
  return (
    <View style={s.metaLine}>
      <FontAwesome5 name={icon} size={10} color={C.accent} solid />
      <Text style={[s.meta, { color: C.textSecondary }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

/** Thumbnail · type pill, title, category, location · date + compensation panel. */
export function OpportunityRow({ campaign }: { campaign: Campaign }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { categories } = useAllCategories();
  const catMeta = getCategoryMeta(categories, campaign.categoryKey ?? campaign.category);
  const image = campaign.featureImageUrl ?? getTemplateImage(campaign.template, campaign.categoryKey ?? campaign.category);
  const isOpen = campaign.campaignType === 'OPEN_EVENT';
  const location = campaign.locationType === 'REMOTE' ? t('createEvent.locationRemote') : (campaign.location ?? '');

  return (
    <Pressable
      onPressIn={() => prefetchCampaign(queryClient, campaign.id)}
      onPress={() => router.push({ pathname: '/campaign-detail', params: { campaignId: campaign.id } })}
      accessibilityRole="button"
      accessibilityLabel={campaign.title}
      style={({ pressed }) => [s.row, SHADOW.card, { backgroundColor: C.surface, borderColor: C.border }, pressed && { opacity: 0.92 }]}>
      <View style={[s.thumb, { backgroundColor: catMeta.bg }]}>
        <FontAwesome5 name={catMeta.icon} size={26} color={catMeta.color} style={{ opacity: 0.4 }} />
        {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={image} /> : null}
      </View>

      <View style={s.body}>
        <Pill label={isOpen ? t('guest.card.openEvent') : t('guest.card.paidEvent')} color={isOpen ? GREEN : C.accent} />
        <Text style={[s.title, { color: C.text }]} numberOfLines={2}>{campaign.title}</Text>
        <MetaLine icon="tag" text={displayCategory(campaign.category)} />
        <MetaLine icon="map-marker-alt" text={location} />
      </View>

      <View style={[s.panel, { backgroundColor: C.accentLight }]}>
        <Text style={[s.panelValue, { color: isOpen ? GREEN : C.accent }]} numberOfLines={2}>
          {isOpen ? t('campaignCard.free') : campaign.budget}
        </Text>
        {campaign.deadline ? (
          <View style={s.panelLine}>
            <FontAwesome5 name="calendar-alt" size={10} color={C.textSecondary} />
            <Text style={[s.panelMeta, { color: C.textSecondary }]} numberOfLines={1}>{shortDate(campaign.deadline)}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Thumbnail · "Competition" pill, title, short description · prize + deadline panel. */
export function CompetitionRow({ c }: { c: CompetitionCard }) {
  const C = useAppColors();
  const isDark = useIsDark();
  const { t } = useLanguage();
  const prize = c.prizePool ? npr(c.prizePool.amount) : (c.prizeHighlights[0]?.title ?? '');

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/competition-detail', params: { id: c.id } })}
      accessibilityRole="button"
      accessibilityLabel={c.title}
      style={({ pressed }) => [s.row, SHADOW.card, { backgroundColor: C.surface, borderColor: C.border }, pressed && { opacity: 0.92 }]}>
      <View style={[s.thumb, { backgroundColor: withAlpha(C.accent, 0.1) }]}>
        <FontAwesome5 name="trophy" size={26} color={withAlpha(C.accent, 0.55)} />
        {c.coverImageUrl ? <Image source={{ uri: c.coverImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={c.coverImageUrl} /> : null}
      </View>

      <View style={s.body}>
        <Pill label={t('guest.card.competition')} color={isDark ? PURPLE_ON_DARK : PURPLE} />
        <Text style={[s.title, { color: C.text }]} numberOfLines={2}>{c.title}</Text>
        {c.summary ? <Text style={[s.meta, { color: C.textSecondary }]} numberOfLines={2}>{c.summary}</Text> : null}
      </View>

      <View style={[s.panel, { backgroundColor: C.accentLight }]}>
        {prize ? (
          <View style={s.panelLine}>
            <Text style={[s.panelStrong, { color: C.text }]} numberOfLines={2}>{prize}</Text>
          </View>
        ) : null}
        <View style={s.panelLine}>
          <FontAwesome5 name="calendar-alt" size={10} color={C.textSecondary} />
          <Text style={[s.panelMeta, { color: C.textSecondary }]} numberOfLines={1}>{shortDate(c.registrationDeadline)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export const CREATOR_PHOTO_CARD_W = 150;

/** Photo-top creator card: profile image, name, location. */
export function CreatorPhotoCard({ creator }: { creator: ApiCreatorListItem }) {
  const C = useAppColors();
  const [failed, setFailed] = useState(false);
  const name = creator.fullName ?? '';
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const showPhoto = !!creator.avatarUrl && !failed;

  return (
    <Pressable
      onPress={() => openCreatorProfile(creator.id)}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [s.creator, SHADOW.card, { backgroundColor: C.surface, borderColor: C.border }, pressed && { opacity: 0.92 }]}>
      <View style={[s.creatorPhoto, { backgroundColor: C.accentLight }]}>
        {showPhoto ? (
          <Image source={{ uri: creator.avatarUrl! }} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setFailed(true)} />
        ) : (
          <Text style={[s.initials, { color: C.accent }]}>{initials || '?'}</Text>
        )}
      </View>
      <View style={s.creatorBody}>
        <View style={s.nameRow}>
          <Text style={[s.creatorName, { color: C.text }]} numberOfLines={1}>{name}</Text>
          {creator.fullyVerified && <VerifiedBadge size={12} />}
        </View>
        <MetaLine icon="map-marker-alt" text={creator.location ?? (creator.categories[0] ?? '')} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'stretch', gap: SPACING.md, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.sm },
  thumb:      { width: 88, borderRadius: RADIUS.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', minHeight: 96 },
  body:       { flex: 1, minWidth: 0, gap: 4, paddingVertical: 2, justifyContent: 'center' },
  pill:       { alignSelf: 'flex-start', borderRadius: RADIUS.full, paddingHorizontal: 9, paddingVertical: 3 },
  pillText:   { fontSize: FONT_SIZE.xs, fontFamily: F.semibold },
  title:      { fontSize: FONT_SIZE.md, fontFamily: F.bold, lineHeight: lineHeightFor(FONT_SIZE.md) },
  metaLine:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta:       { fontSize: 12, fontFamily: F.regular, flexShrink: 1, lineHeight: lineHeightFor(12) },

  panel:      { width: 92, borderRadius: RADIUS.md, padding: SPACING.sm, gap: 6, justifyContent: 'center' },
  panelLine:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  panelMeta:  { fontSize: FONT_SIZE.xs, fontFamily: F.medium, flexShrink: 1 },
  panelValue: { fontSize: FONT_SIZE.sm, fontFamily: F.bold, lineHeight: lineHeightFor(FONT_SIZE.sm) },
  panelStrong: { fontSize: 12, fontFamily: F.bold, flexShrink: 1, lineHeight: lineHeightFor(12) },

  creator:      { width: CREATOR_PHOTO_CARD_W, borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  creatorPhoto: { width: '100%', aspectRatio: 1.15, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials:     { fontSize: 30, fontFamily: F.bold },
  creatorBody:  { padding: SPACING.sm, paddingHorizontal: SPACING.md, gap: 3 },
  nameRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  creatorName:  { fontSize: 13.5, fontFamily: F.bold, flexShrink: 1 },
});
