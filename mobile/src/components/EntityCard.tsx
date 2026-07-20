import type { ReactNode } from 'react';
import { Image } from 'expo-image';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { F, RADIUS, SHADOW } from '@/utilities/constants';

// Shared "browse" card for both creators and businesses in the explore
// screens — covers (creator)/explore-businesses, (business)/explore-creators,
// and (creator)/explore-creators (peer), which used to be three near-identical
// hand-rolled copies of the same ring-avatar / stat-tray / CTA-pill layout.

type EntityCardAction = {
  active:       boolean;
  onToggle:     () => void;
  activeIcon:   keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  activeColor:  string;
  activeBg:     string;
  /** Creator's save button keeps a visible border in both states; business's heart button doesn't. */
  bordered?: boolean;
};

type EntityCardStat = {
  icon:  string;
  text:  string;
  color: string;
  /** The two source cards use different icon sets for this slot (Ionicons for
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
  stat?:    EntityCardStat;
  ctaLabel: string;
  onPress:  () => void;
  action?:  EntityCardAction;
};

export function EntityCard({
  avatarUrl, avatarBg, initials, circularAvatar, ringColor, name, verified,
  locationText, description, descriptionItalic, bio,
  categoryLabel, categoryIcon, categoryColor, categoryBg, extraCount = 0,
  stat, ctaLabel, onPress, action,
}: EntityCardProps) {
  const C = useAppColors();
  const ring = { borderWidth: 2, borderColor: ringColor };
  const avatarShape = circularAvatar ? { borderRadius: RADIUS.full } : null;

  let subtitle: ReactNode = null;
  if (locationText) {
    subtitle = (
      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={12} color={C.textSecondary} />
        <Text style={[styles.location, { color: C.textSecondary }]} numberOfLines={1}>{locationText}</Text>
      </View>
    );
  } else if (description) {
    subtitle = (
      <Text style={[styles.description, { color: C.textSecondary }, descriptionItalic && { fontStyle: 'italic' }]} numberOfLines={2}>
        {description}
      </Text>
    );
  }

  return (
    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      style={({ pressed }) => [styles.cardWrap, pressed && { opacity: 0.92 }]}
      onPress={onPress}>
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={styles.header}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={[styles.avatar, ring, avatarShape]} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: avatarBg }, ring, avatarShape]}>
            {initials ? (
              <Text style={{ fontSize: 20, color: C.brinjal1, fontFamily: F.bold }}>{initials}</Text>
            ) : (
              <Ionicons name="person" size={30} color="rgba(91,33,182,0.55)" />
            )}
          </View>
        )}

        <View style={styles.meta}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>{name}</Text>
            {verified && <VerifiedBadge size={14} />}
          </View>
          {subtitle}
        </View>

        {action && (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[
              styles.actionBtn,
              {
                backgroundColor: action.active ? action.activeBg : C.background,
                borderColor: action.active ? action.activeColor : C.border,
                borderWidth: action.bordered ? 1.5 : 0,
              },
              action.active && { shadowColor: action.activeColor, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
            ]}
            onPress={(e) => { e.stopPropagation(); action.onToggle(); }}
            hitSlop={8}>
            <Ionicons name={action.active ? action.activeIcon : action.inactiveIcon} size={18} color={action.active ? action.activeColor : C.textSecondary} />
          </Pressable>
        )}
      </View>

      {bio ? <Text style={[styles.bio, { color: C.textSecondary }]} numberOfLines={2}>{bio}</Text> : null}

      {(categoryLabel || stat) && (
        <View style={[styles.statRow, { backgroundColor: C.background }]}>
          {categoryLabel && (
            <View style={[styles.catPill, { backgroundColor: categoryBg }]}>
              <FontAwesome5 name={categoryIcon as never} size={10} color={categoryColor} />
              <Text style={[styles.catLabel, { color: categoryColor }]} numberOfLines={1}>{categoryLabel}</Text>
              {extraCount > 0 && <Text style={[styles.catLabel, { color: categoryColor }]}>+{extraCount}</Text>}
            </View>
          )}
          {stat && (
            <View style={styles.statItem}>
              {stat.iconSet === 'ionicons' ? (
                <Ionicons name={stat.icon as never} size={13} color={stat.color} />
              ) : (
                <FontAwesome5 name={stat.icon as never} size={12} color={stat.color} />
              )}
              <Text style={[styles.statText, { color: stat.color }]}>{stat.text}</Text>
            </View>
          )}
        </View>
      )}

      <View style={[styles.viewBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }]}>
        <Text style={styles.viewBtnText}>{ctaLabel}</Text>
        <Ionicons name="arrow-forward" size={14} color="#fff" />
      </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrap: { borderRadius: RADIUS.lg, ...SHADOW.raised },
  card:   { borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 60, height: 60, borderRadius: RADIUS.md, flexShrink: 0 },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  meta: { flex: 1, gap: 4, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 16, letterSpacing: -0.3, flexShrink: 1, fontFamily: F.bold },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  location: { fontSize: 12, fontFamily: F.regular },
  description: { fontSize: 13, lineHeight: 19, fontFamily: F.regular },
  actionBtn: { width: 36, height: 36, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  bio: { fontSize: 13, lineHeight: 19, fontFamily: F.regular },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 8 },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, flexShrink: 1 },
  catLabel: { fontSize: 11, fontFamily: F.bold, flexShrink: 1 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 12, fontFamily: F.bold },
  viewBtn: {
    height: 38, borderRadius: RADIUS.full,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
    shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5,
  },
  viewBtnText: { color: '#fff', fontSize: 13, fontFamily: F.bold },
});
