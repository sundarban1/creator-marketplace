// Building blocks shared by the Guest navigation screens ((guest)/*).
import type { ReactNode } from 'react';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Skeleton } from '@/components/Skeleton';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { openGuestLogin, openGuestSignup } from '@/components/GuestAuthPrompt';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { PersonAvatar } from '@/features/creator/competition/ProfileAvatar';
import type { ApiCreatorListItem } from '@/services/creator';
import type { BusinessListItem } from '@/services/business';
import { F, FONT_SIZE, MIN_TOUCH_TARGET, RADIUS, SCREEN_GUTTER, SHADOW, SPACING, lineHeightFor } from '@/utilities/constants';

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
        <Pressable onPress={openGuestLogin} hitSlop={8} style={s.headerLink} accessibilityRole="button">
          <Text style={[s.headerLinkText, { color: C.text }]}>{t('guest.logIn')}</Text>
        </Pressable>
        <Pressable
          onPress={() => openGuestSignup()}
          style={({ pressed }) => [s.headerCta, { backgroundColor: C.accent }, pressed && { opacity: 0.88 }]}
          accessibilityRole="button">
          <Text style={s.headerCtaText}>{t('guest.createAccount')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Section heading with optional "See all" ─────────────────────────────────

export function SectionHeader({ title, subtitle, onSeeAll }: { title: string; subtitle?: string; onSeeAll?: () => void }) {
  const C = useAppColors();
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

export const CREATOR_CARD_W = 168;

export function openCreatorProfile(id: string) {
  router.push({ pathname: '/creator-profile', params: { handle: id } });
}
export function openBusinessProfile(id: string) {
  router.push({ pathname: '/business-profile', params: { id } });
}

export function CreatorCard({ creator, style }: { creator: ApiCreatorListItem; style?: StyleProp<ViewStyle> }) {
  const C = useAppColors();
  const name = creator.fullName ?? '';
  const cats = creator.categories.slice(0, 2);
  return (
    <Pressable
      onPress={() => openCreatorProfile(creator.id)}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [s.creatorCard, SHADOW.card, { backgroundColor: C.surface, borderColor: C.border }, pressed && { opacity: 0.92 }, style]}>
      <PersonAvatar uri={creator.avatarUrl} name={name} size={64} />
      <View style={s.nameRow}>
        <Text style={[s.creatorName, { color: C.text }]} numberOfLines={1}>{name}</Text>
        {creator.fullyVerified && <VerifiedBadge size={13} />}
      </View>
      {creator.location ? (
        <View style={s.metaRow}>
          <FontAwesome5 name="map-marker-alt" solid size={10} color={C.textSecondary} />
          <Text style={[s.meta, { color: C.textSecondary }]} numberOfLines={1}>{creator.location}</Text>
        </View>
      ) : null}
      {cats.length > 0 && (
        <View style={s.chips}>
          {cats.map((c) => (
            <View key={c} style={[s.chip, { backgroundColor: C.primaryLight }]}>
              <Text style={[s.chipText, { color: C.brinjal1 }]} numberOfLines={1}>{c}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
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

/** Compact inline message used inside a section (empty or failed). */
export function InlineNotice({ icon, text, actionLabel, onAction }: {
  icon: keyof typeof FontAwesome5.glyphMap; text: string; actionLabel?: string; onAction?: () => void;
}) {
  const C = useAppColors();
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

export function Bullet({ children }: { children: ReactNode }) {
  const C = useAppColors();
  return (
    <View style={s.bullet}>
      <View style={[s.bulletIcon, { backgroundColor: C.accentLight }]}>
        <FontAwesome5 name="check" size={10} color={C.accent} />
      </View>
      <Text style={[s.bulletText, { color: C.text }]}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.sm, gap: SPACING.md },
  logo:          { width: 92, height: 30 },
  headerTitle:   { fontSize: FONT_SIZE.xl, fontFamily: F.bold, flexShrink: 1, lineHeight: lineHeightFor(FONT_SIZE.xl) },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerLink:    { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: SPACING.xs },
  headerLinkText: { fontSize: FONT_SIZE.sm, fontFamily: F.semibold },
  headerCta:     { minHeight: 36, borderRadius: RADIUS.full, paddingHorizontal: 14, justifyContent: 'center' },
  headerCtaText: { color: '#fff', fontSize: FONT_SIZE.sm, fontFamily: F.bold },

  sectionHead:   { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SCREEN_GUTTER, marginBottom: SPACING.md, gap: SPACING.md },
  sectionTitle:  { fontSize: FONT_SIZE.lg + 1, fontFamily: F.bold, lineHeight: lineHeightFor(FONT_SIZE.lg + 1) },
  sectionSub:    { fontSize: FONT_SIZE.sm, fontFamily: F.regular, marginTop: 2, lineHeight: lineHeightFor(FONT_SIZE.sm) },
  seeAll:        { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32 },
  seeAllText:    { fontSize: FONT_SIZE.sm, fontFamily: F.semibold },

  creatorCard:   { width: CREATOR_CARD_W, borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.md, alignItems: 'center' },
  nameRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: SPACING.sm, maxWidth: '100%' },
  creatorName:   { fontSize: FONT_SIZE.md, fontFamily: F.bold, flexShrink: 1 },
  metaRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 2, maxWidth: '100%' },
  meta:          { fontSize: 12, fontFamily: F.regular, flexShrink: 1, lineHeight: lineHeightFor(12) },
  chips:         { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4, marginTop: SPACING.sm },
  chip:          { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, maxWidth: CREATOR_CARD_W - 24 },
  chipText:      { fontSize: FONT_SIZE.xs, fontFamily: F.semibold },

  row:           { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.md },
  rowTitle:      { fontSize: FONT_SIZE.md, fontFamily: F.bold, flexShrink: 1 },

  railSkeleton:  { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SCREEN_GUTTER },
  notice:        { marginHorizontal: SCREEN_GUTTER, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.lg },
  noticeText:    { flex: 1, fontSize: FONT_SIZE.sm, fontFamily: F.regular, lineHeight: lineHeightFor(FONT_SIZE.sm) },
  noticeAction:  { fontSize: FONT_SIZE.sm, fontFamily: F.bold },

  bullet:        { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  bulletIcon:    { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  bulletText:    { flex: 1, fontSize: FONT_SIZE.md, fontFamily: F.medium, lineHeight: lineHeightFor(FONT_SIZE.md) },
});
