import type { ReactNode } from 'react';
import { Image } from 'expo-image';
import { FontAwesome5 } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ProviderTypeBadge } from '@/components/ProviderTypeBadge';
import type { ProviderType } from '@/services/creator';
import { F, RADIUS, SHADOW } from '@/utilities/constants';

// Shared "browse" card for both creators and businesses in the explore
// screens — covers (creator)/explore-businesses, (business)/explore-creators,
// and (creator)/explore-creators (peer), which used to be three near-identical
// hand-rolled copies of the same ring-avatar / stat-tray / CTA-pill layout.
//
// Same anatomy as CampaignListItem (the "all events" card): a fixed-width
// thumb on the left, name on one line with a secondary line (rating) right
// under it, a flat meta row (location left / category badge right), then a
// footer row with a stat on the left and a compact CTA pill on the right.

type EntityCardAction = {
  active:       boolean;
  onToggle:     () => void;
  activeIcon:   keyof typeof FontAwesome5.glyphMap;
  inactiveIcon: keyof typeof FontAwesome5.glyphMap;
  activeColor:  string;
  activeBg:     string;
  /** Creator's save button keeps a visible border in both states; business's heart button doesn't. */
  bordered?: boolean;
};

type EntityCardStat = {
  icon:  string;
  text:  string;
  color: string;
  /** The two source cards use different icon sets for this slot (FontAwesome5 for
      campaign count, FontAwesome5 for platform reach) — pick per call site
      rather than force a mismatched icon. Defaults to FontAwesome5. */
  iconSet?: 'ionicons' | 'fa5';
};

type EntityCardProps = {
  avatarUrl:  string | null;
  avatarBg:   string;
  /** Shown as a fallback when there's no avatar. Omit to fall back to a generic person icon instead. */
  initials?:  string;
  /** Renders the avatar as a full circle instead of the default rounded square. */
  circularAvatar?: boolean;
  ringColor:  string;
  name:       string;
  verified:   boolean;
  /** §9 provider-type badge (Individual / Team / Agency) shown inline after the
   *  name. Omit for entities that have no provider type (businesses, services). */
  providerType?: ProviderType | null;
  /** Renders as "Team · 4" inside the provider-type badge. TEAM only. */
  teamSize?: number | null;
  /** Renders as an icon+text row under the name. Mutually exclusive with `description`. */
  locationText?: string;
  /** Renders as a plain (optionally italic) line under the name. Mutually exclusive with `locationText`. */
  description?:  string;
  descriptionItalic?: boolean;
  /** A separate 2-line paragraph below the header row (e.g. creator bio). */
  bio?: string;
  categoryLabel?: string;
  categoryIcon?:  string;
  categoryColor?: string;
  categoryBg?:    string;
  extraCount?:    number;
  /** Multiple small tags (e.g. a creator's specialisations) instead of the
   *  single categoryLabel+extraCount pill — takes over that row entirely
   *  (stat is not shown alongside it) when provided and non-empty. */
  categoryPills?: { label: string; icon: string; color: string; bg: string }[];
  /** Renders `locationText` above the category pill/pills instead of the default (category first, then location). */
  locationBeforeCategory?: boolean;
  stat?:    EntityCardStat;
  /** Renders `stat` inline on the name row (right-aligned, one line) instead of in the footer. */
  statInHeader?: boolean;
  /** Star rating badge under the name (e.g. a creator's average rating). Omit when there's no rating yet. */
  rating?:  number;
  ctaLabel: string;
  /** 'button' (default) renders the labeled CTA pill in the footer row.
   *  'chevron' swaps that pill for a plain trailing chevron in the same
   *  footer-row slot — used on the Discover tabs, where a full-width
   *  labeled button per card reads as too heavy. */
  ctaStyle?: 'button' | 'chevron';
  onPress:  () => void;
  action?:  EntityCardAction;
};

export function EntityCard({
  avatarUrl, avatarBg, initials, circularAvatar, ringColor, name, verified, providerType, teamSize,
  locationText, description, descriptionItalic, bio,
  categoryLabel, categoryIcon, categoryColor, categoryBg, extraCount = 0, categoryPills, locationBeforeCategory,
  stat, statInHeader, rating, ctaLabel, ctaStyle = 'button', onPress, action,
}: EntityCardProps) {
  const C = useAppColors();
  const ring = { borderWidth: 2, borderColor: ringColor };
  const avatarShape = circularAvatar ? { borderRadius: RADIUS.full } : { borderRadius: RADIUS.md };

  let metaText: ReactNode = null;
  if (locationText) {
    metaText = (
      <View style={styles.locationRow}>
        <FontAwesome5 name="map-marker-alt" solid size={11} color={C.textSecondary} />
        <Text style={[styles.location, { color: C.textSecondary }]} numberOfLines={1}>{locationText}</Text>
      </View>
    );
  }

  const categoryBlock = categoryLabel ? (
    <View style={[styles.catPill, styles.catPillRow, { backgroundColor: categoryBg }]}>
      <FontAwesome5 name={categoryIcon as never} size={9} color={categoryColor} />
      <Text style={[styles.catLabel, { color: categoryColor }]} numberOfLines={1}>{categoryLabel}</Text>
      {extraCount > 0 && <Text style={[styles.catLabel, { color: categoryColor }]}>+{extraCount}</Text>}
    </View>
  ) : null;

  return (
    <View style={[styles.cardWrap, { backgroundColor: C.surface }]}>
      <Pressable
        style={({ pressed }) => [styles.card, { backgroundColor: C.surface, borderColor: C.border }, pressed && { opacity: 0.92 }]}
        onPress={onPress}>

        {/* ── Avatar (left) ── */}
        <View style={[styles.thumb, { backgroundColor: avatarBg }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={[styles.avatar, ring, avatarShape]} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: avatarBg }, ring, avatarShape]}>
              {initials ? (
                <Text style={{ fontSize: 18, color: C.brinjal1, fontFamily: F.bold }}>{initials}</Text>
              ) : (
                <FontAwesome5 name="user" solid size={24} color="rgba(91,33,182,0.55)" />
              )}
            </View>
          )}

          {action && (
            <Pressable
              style={[
                styles.actionBtn,
                {
                  backgroundColor: action.active ? action.activeBg : C.surface,
                  borderColor: action.active ? action.activeColor : C.border,
                  borderWidth: action.bordered ? 1.5 : 1,
                },
                action.active && { shadowColor: action.activeColor, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
              ]}
              onPress={(e) => { e.stopPropagation(); action.onToggle(); }}
              hitSlop={8}>
              <FontAwesome5 name={action.active ? action.activeIcon : action.inactiveIcon} size={14} color={action.active ? action.activeColor : C.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* ── Body (right) ── */}
        <View style={[styles.body, ctaStyle === 'chevron' && styles.bodyWithChevron]}>
          <View style={styles.nameRow}>
            <View style={styles.nameGroup}>
              <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>{name}</Text>
              {verified && <VerifiedBadge size={14} />}
              <ProviderTypeBadge type={providerType} teamSize={teamSize} size="sm" />
            </View>
            {statInHeader && stat && (
              <View style={styles.headerStat}>
                <FontAwesome5 name={stat.icon as never} size={10} color={stat.color} />
                <Text style={[styles.headerStatText, { color: stat.color }]} numberOfLines={1}>{stat.text}</Text>
              </View>
            )}
          </View>

          {typeof rating === 'number' && rating > 0 && (
            <View style={[styles.ratingBadge, { backgroundColor: '#FFFBEB' }]}>
              <FontAwesome5 name="star" solid size={10} color="#F59E0B" />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
          )}

          {locationBeforeCategory ? (
            <>
              {metaText}
              {categoryBlock}
            </>
          ) : (
            <>
              {categoryBlock}
              {metaText}
            </>
          )}

          {categoryPills && categoryPills.length > 0 && (
            <View style={styles.pillsRow}>
              {categoryPills.map((p, i) => (
                <View key={i} style={[styles.catPill, { backgroundColor: p.bg }]}>
                  <FontAwesome5 name={p.icon as never} size={9} color={p.color} />
                  <Text style={[styles.catLabel, { color: p.color }]} numberOfLines={1}>{p.label}</Text>
                  {i === categoryPills.length - 1 && extraCount > 0 && (
                    <Text style={[styles.catLabel, { color: p.color }]}>+{extraCount}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.footerRow}>
            {stat && !statInHeader ? (
              <View style={styles.statItem}>
                <FontAwesome5 name={stat.icon as never} size={11} color={stat.color} />
                <Text style={[styles.statText, { color: stat.color }]} numberOfLines={1}>{stat.text}</Text>
              </View>
            ) : <View />}

            {ctaStyle === 'button' && (
              <Pressable
                style={({ pressed }) => [styles.ctaBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
                onPress={onPress}>
                <Text style={styles.ctaBtnText}>{ctaLabel}</Text>
                <FontAwesome5 name="arrow-right" solid size={11} color="#fff" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Vertically centered on the card's right edge, independent of how
            tall the body content stacks up to — rendered outside `body` so
            it isn't pushed down by the rows above it. */}
        {ctaStyle === 'chevron' && (
          <View style={styles.chevronWrap} pointerEvents="none">
            <FontAwesome5 name="chevron-right" solid size={14} color={C.textSecondary} />
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: { borderRadius: RADIUS.lg, ...SHADOW.raised },
  card:   { flexDirection: 'row', borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1 },

  thumb: { width: 92, alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' },
  avatar: { width: 60, height: 60 },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  actionBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 30, height: 30, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center',
  },

  body: { flex: 1, padding: 12, gap: 6, minWidth: 0 },
  // Extra right padding keeps name/stat text from running under the
  // absolutely-positioned chevron, which sits outside normal flow.
  bodyWithChevron: { paddingRight: 26 },
  chevronWrap: { position: 'absolute', top: '50%', right: 12, marginTop: -8 },

  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nameGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0 },
  name: { fontSize: 14.5, letterSpacing: -0.2, flexShrink: 1, fontFamily: F.bold },
  headerStat: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  headerStatText: { fontSize: 11, fontFamily: F.bold },

  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  ratingText: { fontSize: 11, fontFamily: F.bold, color: '#B45309' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1, minWidth: 0 },
  location: { fontSize: 11.5, fontFamily: F.regular, flexShrink: 1 },


  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm, flexShrink: 1 },
  catPillRow: { alignSelf: 'flex-start' },
  catLabel: { fontSize: 11, fontFamily: F.bold, flexShrink: 1 },

  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, minWidth: 0 },
  statText: { fontSize: 11, fontFamily: F.bold, flexShrink: 1 },

  ctaBtn: {
    height: 32, borderRadius: RADIUS.full, paddingHorizontal: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5,
    shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  ctaBtnText: { color: '#fff', fontSize: 12, fontFamily: F.bold },
});
