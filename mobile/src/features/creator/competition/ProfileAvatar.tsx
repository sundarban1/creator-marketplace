// Competition avatars (creators and organizers): the uploaded photo when there
// is one, otherwise first + last initials in a brand circle. Tapping the avatar
// or the name next to it opens that profile — the right screen for whoever is
// viewing (creator app vs business app). Web counterpart: ui/Avatar +
// competitions/profilePaths.ts.
import { useState, type ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useAppColors } from '@/context/ThemeContext';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { F } from '@/utilities/constants';

/** "Sita Kumari Rai" → "SR", "sita" → "S". */
export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const first = words[0][0] ?? '';
  const last = words.length > 1 ? words[words.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}

export function PersonAvatar({ uri, name, size = 36 }: { uri: string | null | undefined; name: string | null | undefined; size?: number }) {
  const C = useAppColors();
  const [failed, setFailed] = useState(false);
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (uri && !failed) {
    return <Image source={{ uri }} style={round} contentFit="cover" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={[round, { backgroundColor: C.brinjal1, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: '#fff', fontFamily: F.semibold, fontSize: Math.max(9, Math.round(size * 0.38)) }} allowFontScaling={false}>
        {initialsOf(name) || '?'}
      </Text>
    </View>
  );
}

/**
 * Profile openers for the current viewer. Each returns null when there's
 * nothing to open (no id, or the business's own organizer profile), so the
 * caller can render the avatar as plain, non-tappable content.
 */
export function useOpenProfile() {
  const { user } = useAuth();
  const own = useCreatorProfile().data;
  const role = user?.role;
  return {
    creator: (id: string | null | undefined): (() => void) | null => {
      if (!id) return null;
      if (role === 'BUSINESS') return () => router.push({ pathname: '/(business)/creator-detail', params: { id } });
      if (role === 'CREATOR') {
        // The peer-profile route excludes yourself — your own avatar opens your Profile tab.
        if (own?.id === id) return () => router.push('/(creator)/(tabs)/profile');
        return () => router.push({ pathname: '/(creator)/creator-detail', params: { id } });
      }
      return null;
    },
    business: (slugOrId: string | null | undefined): (() => void) | null => {
      if (!slugOrId || role !== 'CREATOR') return null;
      return () => router.push({ pathname: '/(creator)/business-detail', params: { id: slugOrId } });
    },
  };
}

/** Avatar + name row that opens a profile when tapped (plain row when `onPress` is null). */
export function ProfileRow({ onPress, label, children, style }: { onPress: (() => void) | null; label: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const base: StyleProp<ViewStyle> = [{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [base, pressed && { opacity: 0.7 }]}>
      {children}
    </Pressable>
  );
}
