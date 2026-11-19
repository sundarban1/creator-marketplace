// Building blocks shared by the Guest navigation screens ((guest)/*).
import { FontAwesome5 } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Skeleton } from '@/components/Skeleton';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { openGuestLogin, openGuestSignup } from '@/components/GuestAuthPrompt';
import { useAppColors } from '@/context/ThemeContext';
import { GUEST_DARK_ORANGE, useGuestColors } from './colors';
import { useLanguage } from '@/context/LanguageContext';
import { PersonAvatar } from '@/features/creator/competition/ProfileAvatar';
import type { ApiCreatorListItem } from '@/services/creator';
import type { BusinessListItem } from '@/services/business';
import { F, FONT_SIZE, RADIUS, SCREEN_GUTTER, SPACING, lineHeightFor } from '@/utilities/constants';

const LOGO = require('@/assets/images/kolab.svg');

// ─── Header: brand + Log In + Create Account ─────────────────────────────────

export function GuestHeader({ title }: { title?: string }) {
  const C = useAppColors();
  const { t } = useLanguage();
  return (
    <View style={[s.header, { backgroundColor: C.background }]}>
      {title ? (
        <Text style={[s.headerTitle, { color: C.text }]} numberOfLines={1} accessibilityRole="header">{title}</Text>
      ) : (
        <ExpoImage source={LOGO} style={s.logo} contentFit="contain" accessibilityLabel="Kolab" />
      )}
      <View style={s.headerActions}>
        <Pressable
          onPress={openGuestLogin}
          hitSlop={6}
          style={({ pressed }) => [s.headerLink, { borderColor: C.text }, pressed && { opacity: 0.7 }]}
          accessibilityRole="button">
          <Text style={[s.headerLinkText, { color: C.text }]}>{t('guest.logIn')}</Text>
        </Pressable>
        <Pressable
          onPress={() => openGuestSignup()}
          style={({ pressed }) => [s.headerCta, { backgroundColor: GUEST_DARK_ORANGE }, pressed && { opacity: 0.88 }]}
          accessibilityRole="button">
          <Text style={s.headerCtaText}>{t('guest.createAccount')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Section heading with optional "See all" ─────────────────────────────────

export function SectionHeader({ title, subtitle, onSeeAll }: { title: string; subtitle?: string; onSeeAll?: () => void }) {
  const C = useGuestColors();
  const { t } = useLanguage();
  return (
    <View style={s.sectionHead}>
      <View style={{ flex: 1 }}>
        <Text style={[s.sectionTitle, { color: C.text }]} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={[s.sectionSub, { color: C.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={10} style={s.seeAll} accessibilityRole="button">
          <Text style={[s.seeAllText, { color: C.accent }]}>{t('guest.seeAll')}</Text>
          <FontAwesome5 name="arrow-right" size={11} color={C.accent} />
        </Pressable>
      )}
    </View>
  );
}

// ─── Creator card (opted-in public profiles only) ────────────────────────────

export function openCreatorProfile(id: string) {
  router.push({ pathname: '/creator-profile', params: { handle: id } });
}
export function openBusinessProfile(id: string) {
  router.push({ pathname: '/business-profile', params: { id } });
}

/** Full-width row variant for the Discover list. */
export function CreatorRow({ creator }: { creator: ApiCreatorListItem }) {
  const C = useAppColors();
  const name = creator.fullName ?? '';
  return (
    <Pressable
      onPress={() => openCreatorProfile(creator.id)}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [s.row, { backgroundColor: C.surface, borderColor: C.border }, pressed && { opacity: 0.92 }]}>
      <PersonAvatar uri={creator.avatarUrl} name={name} size={52} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={[s.nameRow, { justifyContent: 'flex-start', marginTop: 0 }]}>
          <Text style={[s.rowTitle, { color: C.text }]} numberOfLines={1}>{name}</Text>
          {creator.fullyVerified && <VerifiedBadge size={13} />}
        </View>
        {creator.categories.length > 0 && (
          <Text style={[s.meta, { color: C.textSecondary }]} numberOfLines={1}>{creator.categories.slice(0, 3).join(' · ')}</Text>
        )}
        {creator.location ? (
          <View style={[s.metaRow, { justifyContent: 'flex-start' }]}>
            <FontAwesome5 name="map-marker-alt" solid size={10} color={C.textSecondary} />
            <Text style={[s.meta, { color: C.textSecondary }]} numberOfLines={1}>{creator.location}</Text>
          </View>
        ) : null}
      </View>
      <FontAwesome5 name="chevron-right" size={12} color={C.textPlaceholder} />
    </Pressable>
  );
}

export function BusinessRow({ business }: { business: BusinessListItem }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const name = business.businessName ?? '';
  const place = [business.city, business.district].filter(Boolean).join(', ');
  return (
    <Pressable
      onPress={() => openBusinessProfile(business.id)}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [s.row, { backgroundColor: C.surface, borderColor: C.border }, pressed && { opacity: 0.92 }]}>
      <PersonAvatar uri={business.logoUrl} name={name} size={52} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={[s.nameRow, { justifyContent: 'flex-start', marginTop: 0 }]}>
          <Text style={[s.rowTitle, { color: C.text }]} numberOfLines={1}>{name}</Text>
          {business.fullyVerified && <VerifiedBadge size={13} />}
        </View>
        {business.categories.length > 0 && (
          <Text style={[s.meta, { color: C.textSecondary }]} numberOfLines={1}>{business.categories.slice(0, 3).join(' · ')}</Text>
        )}
        <Text style={[s.meta, { color: C.textSecondary }]} numberOfLines={1}>
          {[place, business._count.campaigns > 0 ? t('guest.activeEvents', { count: business._count.campaigns }) : ''].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <FontAwesome5 name="chevron-right" size={12} color={C.textPlaceholder} />
    </Pressable>
  );
}

// ─── Loading / empty / error for horizontal rails ────────────────────────────

export function RailSkeleton({ width, height }: { width: number; height: number }) {
  return (
    <View style={s.railSkeleton}>
      {[0, 1].map((i) => <Skeleton key={i} width={width} height={height} radius={RADIUS.lg} />)}
    </View>
  );
}

export function RowSkeletons({ count = 5, height = 76 }: { count?: number; height?: number }) {
  return (
    <View style={{ gap: SPACING.sm }}>
      {Array.from({ length: count }, (_, i) => <Skeleton key={i} width="100%" height={height} radius={RADIUS.md} />)}
    </View>
  );
}

/** Friendly empty state for a home section — optional icon, headline, warm message and a next step. */
export function FriendlyEmpty({ icon, title, body, actionLabel, onAction, emphasizeTitle, emphasisColor }: {
  icon?: keyof typeof FontAwesome5.glyphMap; title: string; body: string; actionLabel?: string; onAction?: () => void;
  /** Words wrapped in *…* in the title render one size up (lg) in the orange accent. */
  emphasizeTitle?: boolean;
  /** Colour for the *…* words; defaults to the orange accent. */
  emphasisColor?: string;
}) {
  const C = useGuestColors();
  return (
    <View style={[s.empty, { backgroundColor: C.surface, borderColor: C.border }]}>
      {icon ? (
        <View style={[s.emptyIcon, { backgroundColor: C.accentLight }]}>
          <FontAwesome5 name={icon} size={20} color={C.accent} />
        </View>
      ) : null}
      <Text style={[s.emptyTitle, emphasizeTitle ? s.emptyTitleLg : null, { color: C.text }]}>
        {emphasizeTitle
          ? title.split('*').map((part, i) =>
              i % 2 === 1 ? <Text key={i} style={[s.emptyTitleEm, { color: emphasisColor ?? C.accent }]}>{part}</Text> : part)
          : title}
      </Text>
      <Text style={[s.emptyBody, { color: C.textSecondary }]}>{body}</Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [s.emptyBtn, { borderColor: C.accent }, pressed && { opacity: 0.8 }]}
          accessibilityRole="button">
          <Text style={[s.emptyBtnText, { color: C.accent }]}>{actionLabel}</Text>
          <FontAwesome5 name="arrow-right" size={11} color={C.accent} />
        </Pressable>
      )}
    </View>
  );
}

/** Compact inline message used inside a section (empty or failed). */
export function InlineNotice({ icon, text, actionLabel, onAction }: {
  icon: keyof typeof FontAwesome5.glyphMap; text: string; actionLabel?: string; onAction?: () => void;
}) {
  const C = useGuestColors();
  return (
    <View style={[s.notice, { backgroundColor: C.surface, borderColor: C.border }]}>
      <FontAwesome5 name={icon} size={16} color={C.textSecondary} />
      <Text style={[s.noticeText, { color: C.textSecondary }]}>{text}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text style={[s.noticeAction, { color: C.accent }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  empty:         { marginHorizontal: SCREEN_GUTTER, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderRadius: RADIUS.lg, paddingVertical: SPACING.xl, paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  emptyIcon:     { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs },
  emptyTitle:    { fontSize: FONT_SIZE.md, fontFamily: F.bold, textAlign: 'center', lineHeight: lineHeightFor(FONT_SIZE.md) },
  // Line height sized for the bigger emphasized words so they don't clip.
  emptyTitleLg:  { lineHeight: lineHeightFor(FONT_SIZE.lg) },
  emptyTitleEm:  { fontSize: FONT_SIZE.lg },
  emptyBody:     { fontSize: FONT_SIZE.sm, fontFamily: F.regular, textAlign: 'center', lineHeight: lineHeightFor(FONT_SIZE.sm), maxWidth: 300 },
  emptyBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, borderRadius: RADIUS.full, borderWidth: 1.5, paddingHorizontal: SPACING.lg, marginTop: SPACING.sm },
  emptyBtnText:  { fontSize: FONT_SIZE.sm, fontFamily: F.bold },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.sm, gap: SPACING.md },
  logo:          { width: 92, height: 30 },
  headerTitle:   { fontSize: FONT_SIZE.xl, fontFamily: F.bold, flexShrink: 1, lineHeight: lineHeightFor(FONT_SIZE.xl) },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerLink:    { minHeight: 36, borderRadius: RADIUS.full, borderWidth: 1.5, paddingHorizontal: 14, justifyContent: 'center' },
  headerLinkText: { fontSize: FONT_SIZE.sm, fontFamily: F.semibold },
  headerCta:     { minHeight: 36, borderRadius: RADIUS.full, paddingHorizontal: 14, justifyContent: 'center' },
  headerCtaText: { color: '#fff', fontSize: FONT_SIZE.sm, fontFamily: F.bold },

  sectionHead:   { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SCREEN_GUTTER, marginBottom: SPACING.md, gap: SPACING.md },
  sectionTitle:  { fontSize: FONT_SIZE.lg + 1, fontFamily: F.bold, lineHeight: lineHeightFor(FONT_SIZE.lg + 1) },
  sectionSub:    { fontSize: FONT_SIZE.sm, fontFamily: F.regular, marginTop: 2, lineHeight: lineHeightFor(FONT_SIZE.sm) },
  seeAll:        { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32 },
  seeAllText:    { fontSize: FONT_SIZE.sm, fontFamily: F.semibold },

  nameRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: SPACING.sm, maxWidth: '100%' },
  metaRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 2, maxWidth: '100%' },
  meta:          { fontSize: 12, fontFamily: F.regular, flexShrink: 1, lineHeight: lineHeightFor(12) },

  row:           { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.md },
  rowTitle:      { fontSize: FONT_SIZE.md, fontFamily: F.bold, flexShrink: 1 },

  railSkeleton:  { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SCREEN_GUTTER },
  notice:        { marginHorizontal: SCREEN_GUTTER, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.lg },
  noticeText:    { flex: 1, fontSize: FONT_SIZE.sm, fontFamily: F.regular, lineHeight: lineHeightFor(FONT_SIZE.sm) },
  noticeAction:  { fontSize: FONT_SIZE.sm, fontFamily: F.bold },

});
