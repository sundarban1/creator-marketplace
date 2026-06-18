import { router, useFocusEffect } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BackButton } from '@/components/BackButton';
import { useCallback, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppColors } from '@/context/ThemeContext';
import { creatorService, type ApiCreatorProfile } from '@/services/creator';
import { F } from '@/utilities/constants';

const PLATFORM_MAP: Record<string, { platform: string; color: string; iconName: string }> = {
  instagram: { platform: 'Instagram', color: '#E1306C', iconName: 'instagram' },
  tiktok:    { platform: 'TikTok',    color: '#010101', iconName: 'tiktok' },
  youtube:   { platform: 'YouTube',   color: '#FF0000', iconName: 'youtube' },
  facebook:  { platform: 'Facebook',  color: '#1877F2', iconName: 'facebook' },
  twitter:   { platform: 'X / Twitter', color: '#1DA1F2', iconName: 'twitter' },
  linkedin:  { platform: 'LinkedIn',  color: '#0A66C2', iconName: 'linkedin' },
  pinterest: { platform: 'Pinterest', color: '#E60023', iconName: 'pinterest' },
  snapchat:  { platform: 'Snapchat',  color: '#FFFC00', iconName: 'snapchat' },
  twitch:    { platform: 'Twitch',    color: '#9146FF', iconName: 'twitch' },
};

function extractHandle(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/^\/|\/$/g, '');
    return path ? `@${path}` : url;
  } catch {
    return url;
  }
}

function fmtFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function detectPlatform(url: string): { iconName: string; color: string; platform: string } {
  const low = url.toLowerCase();
  if (low.includes('instagram.com')) return PLATFORM_MAP.instagram;
  if (low.includes('tiktok.com'))    return PLATFORM_MAP.tiktok;
  if (low.includes('youtube.com') || low.includes('youtu.be')) return PLATFORM_MAP.youtube;
  if (low.includes('facebook.com')) return PLATFORM_MAP.facebook;
  if (low.includes('twitter.com') || low.includes('x.com')) return PLATFORM_MAP.twitter;
  if (low.includes('linkedin.com')) return PLATFORM_MAP.linkedin;
  if (low.includes('pinterest.com')) return PLATFORM_MAP.pinterest;
  if (low.includes('twitch.tv')) return PLATFORM_MAP.twitch;
  return { iconName: 'link', color: '#6366F1', platform: 'Link' };
}

function shortenUrl(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
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

  const displayName   = profile?.fullName ?? user?.name ?? 'Creator';
  const displayAvatar = profile?.avatarUrl ?? user?.avatar;
  const displayBio    = profile?.bio ?? null;

  // Prefer richly typed socialAccounts (with followers); fall back to socialLinks map
  const richAccounts = profile?.socialAccounts?.length
    ? profile.socialAccounts.map((acc) => ({
        ...(PLATFORM_MAP[acc.platform] ?? { platform: acc.platform, color: '#666666', iconName: 'link' }),
        handle:    extractHandle(acc.profileUrl),
        url:       acc.profileUrl,
        followers: acc.followers,
      }))
    : Object.entries(profile?.socialLinks ?? {})
        .filter(([, url]) => !!url)
        .map(([key, url]) => ({
          ...(PLATFORM_MAP[key] ?? { platform: key, color: '#666666', iconName: 'link' }),
          handle:    extractHandle(url!),
          url:       url!,
          followers: 0,
        }));

  const portfolioLinks = profile?.portfolioLinks ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient colors={['#F97316', '#EF4444', '#EC4899']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.coverGradient}>
        <View style={styles.topBar}>
          <BackButton fallback="/(creator)/" />
          <Text style={[styles.topTitle, { color: '#fff' }]}>My Profile</Text>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <Text style={[styles.logoutText, { color: 'rgba(255,255,255,0.9)' }]}>Logout</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Avatar outside ScrollView — straddles gradient bottom without clipping or topBar overlap */}
      <View style={styles.avatarWrap}>
        {displayAvatar ? (
          <Image source={{ uri: displayAvatar }} style={[styles.avatar, { borderColor: C.surface }]} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { borderColor: C.surface, backgroundColor: C.brinjal1 }]}>
            <Text style={styles.avatarFallbackText}>{displayName[0].toUpperCase()}</Text>
          </View>
        )}
        <Pressable
          style={[styles.editAvatarBtn, { backgroundColor: C.brinjal1, borderColor: C.surface }]}
          onPress={() => router.push('/(creator)/edit-profile')}>
          <Ionicons name="create" size={13} color="#fff" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Name / Bio ── */}
        <View style={styles.infoSection}>
          <Text style={[styles.name, { color: C.text }]}>{displayName}</Text>
          <Text style={[styles.handle, { color: C.textSecondary }]}>
            @{displayName.toLowerCase().replace(/\s+/g, '')}{'  ·  '}Creator
          </Text>
          {displayBio ? <Text style={[styles.bio, { color: C.text }]}>{displayBio}</Text> : null}
          {profile?.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={13} color={C.textSecondary} />
              <Text style={[styles.location, { color: C.textSecondary }]}>{profile.location}</Text>
            </View>
          ) : null}
          <Pressable
            style={[styles.editProfileBtn, { borderColor: C.border }]}
            onPress={() => router.push('/(creator)/edit-profile')}>
            <Ionicons name="create-outline" size={14} color={C.text} />
            <Text style={[styles.editProfileText, { color: C.text }]}>Edit Profile</Text>
          </Pressable>
        </View>

        {/* ── Social Accounts ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Social Accounts</Text>
            <Pressable onPress={() => router.push('/(creator)/settings?section=social' as never)}>
              <Text style={[styles.actionLink, { color: C.brinjal1 }]}>
                {richAccounts.length > 0 ? 'Manage' : '+ Add'}
              </Text>
            </Pressable>
          </View>

          {richAccounts.length > 0 ? (
            <View style={styles.cardsGap}>
              {richAccounts.map((acc) => (
                <Pressable
                  key={acc.platform}
                  style={[styles.socialCard, { backgroundColor: C.surface }]}
                  onPress={() => Linking.openURL(acc.url).catch(() => {})}>
                  <View style={[styles.platformIconWrap, { backgroundColor: acc.color + '18' }]}>
                    <FontAwesome5 name={acc.iconName} size={20} color={acc.color} />
                  </View>
                  <View style={styles.socialInfo}>
                    <Text style={[styles.socialPlatform, { color: C.text }]}>{acc.platform}</Text>
                    <Text style={[styles.socialHandle, { color: C.textSecondary }]}>{acc.handle}</Text>
                  </View>
                  {acc.followers > 0 && (
                    <View style={[styles.followerBadge, { backgroundColor: acc.color + '15' }]}>
                      <Text style={[styles.followerCount, { color: acc.color }]}>{fmtFollowers(acc.followers)}</Text>
                      <Text style={[styles.followerLabel, { color: acc.color }]}>followers</Text>
                    </View>
                  )}
                  <Ionicons name="open-outline" size={15} color={C.textSecondary} />
                </Pressable>
              ))}
            </View>
          ) : (
            <Pressable
              style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => router.push('/(creator)/settings?section=social' as never)}>
              <Ionicons name="share-social-outline" size={28} color={C.textSecondary} />
              <Text style={[styles.emptyTitle, { color: C.text }]}>No social accounts yet</Text>
              <Text style={[styles.emptyHint, { color: C.textSecondary }]}>Link your Instagram, TikTok, YouTube and more</Text>
              <View style={[styles.emptyAddBtn, { backgroundColor: C.brinjal1 }]}>
                <Text style={styles.emptyAddBtnText}>+ Add Social Account</Text>
              </View>
            </Pressable>
          )}
        </View>

        {/* ── Content Categories ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Content Categories</Text>
            <Pressable onPress={() => router.push('/(creator)/edit-categories')}>
              <Text style={[styles.actionLink, { color: C.brinjal1 }]}>Edit</Text>
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
              <Text style={[styles.emptyHint, { color: C.textSecondary }]}>No categories selected. Tap to add.</Text>
            </Pressable>
          )}
        </View>

        {/* ── Past Work ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Past Work</Text>
            <Pressable onPress={() => router.push('/(creator)/settings?section=past-work' as never)}>
              <Text style={[styles.actionLink, { color: C.brinjal1 }]}>+ Add</Text>
            </Pressable>
          </View>

          {portfolioLinks.length > 0 ? (
            <View style={styles.cardsGap}>
              {portfolioLinks.map((item) => {
                const plat = detectPlatform(item.url);
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.portfolioCard, { backgroundColor: C.surface }]}
                    onPress={() => Linking.openURL(item.url).catch(() => {})}>
                    <View style={[styles.platformIconWrap, { backgroundColor: plat.color + '18' }]}>
                      <FontAwesome5 name={plat.iconName} size={18} color={plat.color} />
                    </View>
                    <View style={styles.portfolioInfo}>
                      <Text style={[styles.portfolioLabel, { color: C.text }]} numberOfLines={1}>{item.label}</Text>
                      <Text style={[styles.portfolioUrl, { color: C.textSecondary }]} numberOfLines={1}>{shortenUrl(item.url)}</Text>
                    </View>
                    <Ionicons name="open-outline" size={18} color={C.textSecondary} />
                  </Pressable>
                );
              })}

              {/* Add more button below existing items */}
              <Pressable
                style={[styles.addMoreBtn, { borderColor: C.brinjal1 + '66', backgroundColor: C.primaryLight }]}
                onPress={() => router.push('/(creator)/settings?section=past-work' as never)}>
                <Ionicons name="add-circle-outline" size={18} color={C.brinjal1} />
                <Text style={[styles.addMoreText, { color: C.brinjal1 }]}>Add another work sample</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => router.push('/(creator)/settings?section=past-work' as never)}>
              <Ionicons name="briefcase-outline" size={28} color={C.textSecondary} />
              <Text style={[styles.emptyTitle, { color: C.text }]}>No past work yet</Text>
              <Text style={[styles.emptyHint, { color: C.textSecondary }]}>
                Share links to campaigns, posts, videos, or any content you've created for brands
              </Text>
              <View style={[styles.emptyAddBtn, { backgroundColor: C.brinjal1 }]}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.emptyAddBtnText}>Add Past Work</Text>
              </View>
            </Pressable>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  scrollContent:      { paddingBottom: 56 },
  coverGradient:      { paddingBottom: 56, overflow: 'hidden' },
  topBar:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  topTitle:           { fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  logoutBtn:          { padding: 4 },
  logoutText:         { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },

  avatarWrap:         { alignSelf: 'center', marginTop: -46, marginBottom: 10, zIndex: 1 },
  avatar:             { width: 92, height: 92, borderRadius: 46, borderWidth: 3 },
  avatarFallback:     { justifyContent: 'center', alignItems: 'center' },
  avatarFallbackText: { color: '#fff', fontSize: 36, fontWeight: '800', fontFamily: F.extrabold },
  editAvatarBtn:      { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },

  infoSection:        { alignItems: 'center', paddingHorizontal: 24, gap: 6, marginBottom: 24 },
  name:               { fontSize: 20, fontWeight: '800', fontFamily: F.extrabold },
  handle:             { fontSize: 13, fontWeight: '500', fontFamily: F.medium },
  bio:                { fontSize: 14, textAlign: 'center', lineHeight: 21, marginTop: 4, fontFamily: F.regular },
  locationRow:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location:           { fontSize: 13, fontFamily: F.regular },
  editProfileBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 8 },
  editProfileText:    { fontSize: 13, fontWeight: '700', fontFamily: F.bold },

  section:            { marginHorizontal: 20, marginBottom: 24 },
  sectionRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle:       { fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  actionLink:         { fontSize: 13, fontWeight: '700', fontFamily: F.bold },

  cardsGap:           { gap: 10 },

  // Social cards
  socialCard:         { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  platformIconWrap:   { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  socialInfo:         { flex: 1, gap: 2 },
  socialPlatform:     { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  socialHandle:       { fontSize: 12, fontFamily: F.regular },
  followerBadge:      { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  followerCount:      { fontSize: 13, fontWeight: '800', fontFamily: F.extrabold },
  followerLabel:      { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', fontFamily: F.semibold },

  // Categories
  catWrap:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip:            { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  catChipTxt:         { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },

  // Portfolio / past work
  portfolioCard:      { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  portfolioInfo:      { flex: 1, gap: 3 },
  portfolioLabel:     { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  portfolioUrl:       { fontSize: 12, fontFamily: F.regular },

  addMoreBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', paddingVertical: 12 },
  addMoreText:        { fontSize: 13, fontWeight: '700', fontFamily: F.bold },

  // Empty states
  emptyCard:          { borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', padding: 24, alignItems: 'center', gap: 8 },
  emptyTitle:         { fontSize: 15, fontWeight: '700', fontFamily: F.bold },
  emptyHint:          { fontSize: 13, textAlign: 'center', lineHeight: 19, fontFamily: F.regular },
  emptyAddBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  emptyAddBtnText:    { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: F.bold },
});
