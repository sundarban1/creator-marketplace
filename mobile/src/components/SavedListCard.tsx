import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { F, RADIUS, SHADOW } from '@/utilities/constants';

// Shared card for the "saved/favorited list" screens — covers
// (business)/saved-creators.tsx and (creator)/favorite-businesses.tsx, which
// used to be two near-identical hand-rolled copies (avatar + name/verified +
// chevron, a divider, then a "remove" footer row). The middle info block
// differs enough between the two (location/followers/categories vs.
// categories/description/campaign-count) that it's passed as `children`
// rather than forced into a one-size-fits-all set of props.

export function SavedListCard({
  avatarInitials, accentColor, name, verified, onPress,
  removeLabel, removeIcon, onRemove, children,
}: {
  avatarInitials: string;
  accentColor:    string;
  name:           string;
  verified:       boolean;
  onPress:        () => void;
  removeLabel:    string;
  removeIcon:     ReactNode;
  onRemove:       () => void;
  children?:      ReactNode;
}) {
  const C = useAppColors();

  return (
    <View style={[styles.card, { backgroundColor: C.surface, ...SHADOW.raised }]}>
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.cardMain} onPress={onPress}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: accentColor, shadowColor: accentColor,
              shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
            },
          ]}
        >
          <Text style={styles.avatarText}>{avatarInitials}</Text>
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>{name}</Text>
            {verified && (
              <View style={[styles.verifiedBadge, { backgroundColor: '#E6F4EA' }]}>
                <Ionicons name="checkmark" size={11} color="#16A34A" />
              </View>
            )}
          </View>
          {children}
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.border} />
      </Pressable>

      <View style={[styles.divider, { backgroundColor: C.border }]} />

      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.removeRow} onPress={onRemove}>
        {removeIcon}
        <Text style={styles.removeText}>{removeLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card:     { borderRadius: RADIUS.lg, overflow: 'hidden' },
  cardMain: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  avatar:   { width: 52, height: 52, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, color: '#fff', fontFamily: F.bold },
  info:     { flex: 1, gap: 3 },
  nameRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name:     { fontSize: 16, letterSpacing: -0.3, fontFamily: F.bold, flex: 1 },
  verifiedBadge: { borderRadius: RADIUS.full, paddingHorizontal: 5, paddingVertical: 1 },

  divider:    { height: 1, marginHorizontal: 16 },
  removeRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  removeText: { fontSize: 13, color: '#EF4444', fontFamily: F.semibold },
});
