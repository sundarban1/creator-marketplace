import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppColors } from '@/context/ThemeContext';
import { creatorService, type ApiCreatorProfile } from '@/services/creator';

const PLATFORM_MAP: Record<string, { platform: string; color: string; icon: string }> = {
  instagram: { platform: 'Instagram', color: '#E1306C', icon: '📸' },
  tiktok:    { platform: 'TikTok',    color: '#010101', icon: '🎵' },
  youtube:   { platform: 'YouTube',   color: '#FF0000', icon: '▶️' },
  facebook:  { platform: 'Facebook',  color: '#1877F2', icon: '💬' },
};

function extractHandle(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/^\/|\/$/g, '');
    return path ? `@${path}` : url;
  } catch {
    return url;
  }
}

export default function CreatorProfileScreen() {
  const { user, logout } = useAuth();
  const C = useAppColors();
  const [profile, setProfile] = useState<ApiCreatorProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      creatorService.getProfile().then(setProfile).catch(() => {});
    }, [])
  );

  const PROPOSAL_STATS = [
    { label: 'Accepted', value: 14, color: C.active },
    { label: 'Pending', value: 4, color: C.draft },
    { label: 'Rejected', value: 5, color: C.error },
    { label: 'Total', value: 23, color: C.brinjal1 },
  ];

  const socialAccounts = profile?.socialLinks
    ? Object.entries(profile.socialLinks)
        .filter(([, url]) => !!url)
        .map(([key, url]) => ({
          ...(PLATFORM_MAP[key] ?? { platform: key, color: '#666666', icon: '🔗' }),
          handle: extractHandle(url!),
          url: url!,
        }))
    : [];

  const displayName = profile?.fullName ?? user?.name ?? 'Creator';
  const displayAvatar = profile?.avatarUrl ?? user?.avatar;
  const displayBio = profile?.bio ?? null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <View style={[styles.topBar, { backgroundColor: C.background }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={[styles.backArrow, { color: C.text }]}>‹</Text>
        </Pressable>
        <Text style={[styles.topTitle, { color: C.text }]}>My Profile</Text>
        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Text style={[styles.logoutText, { color: C.error }]}>Logout</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <View style={styles.cover}>
          <View style={[styles.coverGradient, { backgroundColor: C.brinjal1 }]} />
        </View>

        <View style={styles.avatarWrap}>
          {displayAvatar ? (
            <Image
              source={{ uri: displayAvatar }}
              style={[styles.avatar, { borderColor: C.surface }]}
            />
          ) : (
            <View
              style={[styles.avatar, styles.avatarFallback, { borderColor: C.surface, backgroundColor: C.brinjal1 }]}>
              <Text style={styles.avatarFallbackText}>{displayName[0].toUpperCase()}</Text>
            </View>
          )}
          <Pressable
            style={[styles.editAvatarBtn, { backgroundColor: C.brinjal1, borderColor: C.surface }]}
            onPress={() => router.push('/(creator)/edit-profile')}>
            <Text style={styles.editAvatarIcon}>✎</Text>
          </Pressable>
        </View>

        <View style={styles.infoSection}>
          <Text style={[styles.name, { color: C.text }]}>{displayName}</Text>
          <Text style={[styles.handle, { color: C.textSecondary }]}>
            @{displayName.toLowerCase().replace(/\s+/g, '')}{'  ·  '}Creator
          </Text>
          {displayBio ? (
            <Text style={[styles.bio, { color: C.text }]}>{displayBio}</Text>
          ) : null}
          {profile?.location ? (
            <Text style={[styles.location, { color: C.textSecondary }]}>📍 {profile.location}</Text>
          ) : null}
          <Pressable
            style={[styles.editProfileBtn, { borderColor: C.border }]}
            onPress={() => router.push('/(creator)/edit-profile')}>
            <Text style={[styles.editProfileText, { color: C.text }]}>Edit Profile</Text>
          </Pressable>
        </View>

        <View style={[styles.statsCard, { backgroundColor: C.surface }]}>
          <Text style={[styles.statsTitle, { color: C.text }]}>Proposals</Text>
          <View style={styles.statsRow}>
            {PROPOSAL_STATS.map((s) => (
              <View key={s.label} style={styles.statItem}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: C.textSecondary }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Social Accounts</Text>
          {socialAccounts.length > 0 ? (
            <View style={styles.socialsGap}>
              {socialAccounts.map((s) => (
                <Pressable
                  key={s.platform}
                  style={[styles.socialCard, { backgroundColor: C.surface }]}
                  onPress={() => router.push('/(creator)/settings?section=social' as never)}>
                  <View style={[styles.socialIcon, { backgroundColor: s.color + '18' }]}>
                    <Text style={styles.socialEmoji}>{s.icon}</Text>
                  </View>
                  <View style={styles.socialInfo}>
                    <Text style={[styles.socialPlatform, { color: C.text }]}>{s.platform}</Text>
                    <Text style={[styles.socialHandle, { color: C.textSecondary }]}>{s.handle}</Text>
                  </View>
                  <Text style={[styles.chevron, { color: C.textSecondary }]}>›</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Pressable
              style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => router.push('/(creator)/settings?section=social' as never)}>
              <Text style={[styles.emptyText, { color: C.textSecondary }]}>
                No social accounts linked yet. Tap to add.
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Content Categories</Text>
            <Pressable onPress={() => router.push('/(creator)/edit-categories')}>
              <Text style={[styles.editLink, { color: C.brinjal1 }]}>Edit</Text>
            </Pressable>
          </View>
          {profile?.categories && profile.categories.length > 0 ? (
            <View style={styles.catWrap}>
              {profile.categories.map((cat) => (
                <View key={cat} style={[styles.catChip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
                  <Text style={[styles.catChipTxt, { color: C.brinjal1 }]}>{cat}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Pressable
              style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => router.push('/(creator)/edit-categories')}>
              <Text style={[styles.emptyText, { color: C.textSecondary }]}>
                No categories selected. Tap to add.
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Proposal History</Text>
          <View style={[styles.proposalBars, { backgroundColor: C.surface }]}>
            {PROPOSAL_STATS.slice(0, 3).map((s) => (
              <View key={s.label} style={styles.barRow}>
                <Text style={[styles.barLabel, { color: C.textSecondary }]}>{s.label}</Text>
                <View style={[styles.barTrack, { backgroundColor: C.border }]}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.round((s.value / 23) * 100)}%`, backgroundColor: s.color },
                    ]}
                  />
                </View>
                <Text style={[styles.barCount, { color: s.color }]}>{s.value}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { padding: 4, width: 36 },
  backArrow: { fontSize: 28, lineHeight: 30, marginTop: -2 },
  topTitle: { fontSize: 16, fontWeight: '700' },
  logoutBtn: { padding: 4 },
  logoutText: { fontSize: 13, fontWeight: '600' },
  cover: { height: 120, overflow: 'hidden' },
  coverGradient: { flex: 1, opacity: 0.88 },
  avatarWrap: { alignSelf: 'center', marginTop: -46, marginBottom: 12 },
  avatar: { width: 92, height: 92, borderRadius: 46, borderWidth: 3 },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarFallbackText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  editAvatarIcon: { color: '#fff', fontSize: 13, fontWeight: '700' },
  infoSection: { alignItems: 'center', paddingHorizontal: 24, gap: 6, marginBottom: 20 },
  name: { fontSize: 20, fontWeight: '800' },
  handle: { fontSize: 13, fontWeight: '500' },
  bio: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginTop: 4 },
  location: { fontSize: 13, marginTop: 2 },
  editProfileBtn: { marginTop: 8, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 28, paddingVertical: 8 },
  editProfileText: { fontSize: 13, fontWeight: '700' },
  statsCard: { borderRadius: 16, marginHorizontal: 20, marginBottom: 20, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  statsTitle: { fontSize: 14, fontWeight: '700', marginBottom: 14 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600' },
  section: { marginHorizontal: 20, marginBottom: 20 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  editLink: { fontSize: 13, fontWeight: '700' },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  catChipTxt: { fontSize: 13, fontWeight: '600' },
  socialsGap: { gap: 10 },
  socialCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  socialIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  socialEmoji: { fontSize: 20 },
  socialInfo: { flex: 1, gap: 2 },
  socialPlatform: { fontSize: 14, fontWeight: '700' },
  socialHandle: { fontSize: 12 },
  chevron: { fontSize: 18, marginLeft: 4 },
  emptyCard: { borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', padding: 16, alignItems: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  proposalBars: { borderRadius: 14, padding: 16, gap: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 58, fontSize: 12, fontWeight: '600' },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barCount: { width: 24, fontSize: 13, fontWeight: '700', textAlign: 'right' },
});
