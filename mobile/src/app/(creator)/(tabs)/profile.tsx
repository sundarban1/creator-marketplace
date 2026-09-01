import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Image, Linking, Platform,
  Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useToast } from '@/components/Toast';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { SectionEmptyState } from '@/components/SectionEmptyState';
import { ReviewsList } from '@/components/ReviewsList';
import { SeeMoreText } from '@/components/SeeMoreText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { creatorService, type ApiCreatorProfile } from '@/services/creator';
import { portfolioService, type ApiPortfolioItem } from '@/services/portfolio';
import { campaignService } from '@/services/campaign';
import { useFavoriteBusinesses } from '@/hooks/useFavoriteBusinesses';
import { useAllCategories, getCategoryMeta, sortOtherLast } from '@/hooks/useCategories';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { IconButton } from '@/components/IconButton';
import { pickAndUpload } from '@/utilities/uploadImage';
import { logger } from '@/utilities/logger';
import { getCached, setCached } from '@/utilities/offlineCache';

const PLATFORM_MAP: Record<string, { platform: string; color: string; iconName: string }> = {
  instagram: { platform: 'Instagram', color: '#E1306C', iconName: 'instagram' },
  tiktok:    { platform: 'TikTok',    color: '#010101', iconName: 'tiktok'    },
  youtube:   { platform: 'YouTube',   color: '#FF0000', iconName: 'youtube'   },
  facebook:  { platform: 'Facebook',  color: '#1877F2', iconName: 'facebook'  },
  twitter:   { platform: 'X / Twitter', color: '#1DA1F2', iconName: 'twitter' },
  linkedin:  { platform: 'LinkedIn',  color: '#0A66C2', iconName: 'linkedin'  },
  pinterest: { platform: 'Pinterest', color: '#E60023', iconName: 'pinterest' },
  snapchat:  { platform: 'Snapchat',  color: '#FFFC00', iconName: 'snapchat'  },
  twitch:    { platform: 'Twitch',    color: '#9146FF', iconName: 'twitch'    },
};

function extractHandle(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/^\/|\/$/g, '').replace(/^@/, '');
    return path ? `@${path}` : url;
  } catch { return url; }
}

function fmtFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// Hidden from the mobile UI for now (My Work / past-work portfolio section is not ready to display).
// function detectPlatform(url: string) {
//   const low = url.toLowerCase();
//   if (low.includes('instagram.com')) return PLATFORM_MAP.instagram;
//   if (low.includes('tiktok.com'))    return PLATFORM_MAP.tiktok;
//   if (low.includes('youtube.com') || low.includes('youtu.be')) return PLATFORM_MAP.youtube;
//   if (low.includes('facebook.com')) return PLATFORM_MAP.facebook;
//   if (low.includes('twitter.com') || low.includes('x.com')) return PLATFORM_MAP.twitter;
//   if (low.includes('linkedin.com')) return PLATFORM_MAP.linkedin;
//   if (low.includes('pinterest.com')) return PLATFORM_MAP.pinterest;
//   if (low.includes('twitch.tv'))    return PLATFORM_MAP.twitch;
//   return { iconName: 'link', color: '#6366F1', platform: 'Link' };
// }

// function shortenUrl(url: string): string {
//   try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
// }

export default function CreatorProfileScreen() {
  const { user, updateUser, logout } = useAuth();
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const { favoriteIds, reloadIds: reloadFavoriteIds } = useFavoriteBusinesses();
  const { categories: allCategories } = useAllCategories();
  const [profile, setProfile]           = useState<ApiCreatorProfile | null>(null);
  const [avatarUploading, setUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [eventCounts, setEventCounts]   = useState({ completed: 0 });
  const [portfolioItems, setPortfolioItems] = useState<ApiPortfolioItem[]>([]);

  // A review_received notification deep-links here with ?focus=reviews — scroll
  // the reviews section into view once it (and the profile behind it) lands.
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const reviewsY = useRef(0);
  const didScrollToReviews = useRef(false);
  useEffect(() => {
    if (focus !== 'reviews' || didScrollToReviews.current) return;
    if (!profile?.reviews?.length) return;
    didScrollToReviews.current = true;
    const id = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(reviewsY.current - 12, 0), animated: true });
    }, 350);
    return () => clearTimeout(id);
  }, [focus, profile?.reviews?.length]);

  useFocusEffect(useCallback(() => {
    // Re-sync the "Saved Businesses" count — the creator may have favourited or
    // un-favourited businesses on another screen (or device) since last focus.
    void reloadFavoriteIds();
    // Show the last-known profile immediately (e.g. offline) without
    // clobbering anything already loaded from a previous, fresher focus.
    void getCached<ApiCreatorProfile>('creator_profile').then((cached) => {
      if (cached) setProfile((p) => p ?? cached);
    });
    creatorService.getProfile()
      .then((p) => { setProfile(p); void setCached('creator_profile', p); })
      .catch(() => {});
    // Only ACCEPTED applications carry a meaningful workStatus/paymentStatus —
    // "completed" requires the payment to have actually been released, not just
    // the work marked done, so COMPLETED alone isn't enough.
    campaignService.getMyApplications({ status: 'ACCEPTED', limit: 50 })
      .then(({ proposals }) => {
        setEventCounts({
          completed: proposals.filter((p) => p.workStatus === 'COMPLETED' && p.paymentStatus === 'RELEASED').length,
        });
      })
      .catch(() => {});
    portfolioService.listMine()
      .then(setPortfolioItems)
      .catch(() => {});
  }, []));

  async function handleAvatarPress() {
    setUploading(true);
    try {
      const result = await pickAndUpload('creator-avatar');
      if (result) {
        setProfile((p) => p ? { ...p, avatarUrl: result.url } : p);
        updateUser({ avatar: result.url });
      }
    } catch (err) {
      logger.error('[profile] avatar upload failed', err);
      toast.error(err instanceof Error && err.message ? err.message : t('profile.uploadFailed'));
    } finally {
      setUploading(false);
    }
  }

  async function handleCoverPress() {
    setCoverUploading(true);
    try {
      const result = await pickAndUpload('creator-cover');
      if (result) {
        setProfile((p) => p ? { ...p, coverImageUrl: result.url } : p);
      }
    } catch (err) {
      logger.error('[profile] cover upload failed', err);
      toast.error(err instanceof Error && err.message ? err.message : t('profile.uploadFailed'));
    } finally {
      setCoverUploading(false);
    }
  }

  const displayName   = profile?.fullName ?? user?.name ?? 'Creator';
  const displayAvatar = profile?.avatarUrl ?? user?.avatar;
  const displayBio    = profile?.bio ?? null;

  const richAccounts = profile?.socialAccounts?.length
    ? profile.socialAccounts.map((acc) => ({
        ...(PLATFORM_MAP[acc.platform] ?? { platform: acc.platform, color: '#666666', iconName: 'link' }),
        handle: extractHandle(acc.profileUrl),
        url:    acc.profileUrl,
        followers: acc.followers,
      }))
    : Object.entries(profile?.socialLinks ?? {})
        .filter(([, url]) => !!url)
        .map(([key, url]) => ({
          ...(PLATFORM_MAP[key] ?? { platform: key, color: '#666666', iconName: 'link' }),
          handle: extractHandle(url!), url: url!, followers: 0,
        }));

  // Hidden from the mobile UI for now (My Work / past-work portfolio section is not ready to display).
  // const portfolioLinks = profile?.portfolioLinks ?? [];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── Hero Cover ── */}
        <View style={s.cover}>
          {profile?.coverImageUrl ? (
            <>
              <Image source={{ uri: profile.coverImageUrl }} style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, s.coverScrim]} />
            </>
          ) : (
            <LinearGradient
              colors={['#7C3AED', '#EC4899', '#F97316']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}>
              {/* Decorative bubbles */}
              <View style={[s.bubble, s.bubble1]} />
              <View style={[s.bubble, s.bubble2]} />
              <View style={[s.bubble, s.bubble3]} />
            </LinearGradient>
          )}

          {/* Top bar */}
          <View style={s.topBar}>
            <IconButton
              icon="camera"
              variant="overlay"
              onPress={handleCoverPress}
              loading={coverUploading}
              accessibilityLabel="Change cover photo"
            />
          </View>
        </View>

        {/* ── Avatar card (overlaps cover) ── */}
        <View style={[s.profileCard, { backgroundColor: C.surface }]}>
          {/* Avatar */}
          <View style={s.avatarArea}>
            <Pressable onPress={handleAvatarPress} disabled={avatarUploading} style={s.avatarPressable}>
              {displayAvatar ? (
                <Image source={{ uri: displayAvatar }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, { backgroundColor: C.primaryLight }]}>
                  <Text style={[s.avatarInitial, { color: C.brinjal1 }]}>{displayName[0].toUpperCase()}</Text>
                </View>
              )}
              <View
                style={[
                  s.cameraBadge,
                  {
                    backgroundColor: C.brinjal1, shadowColor: C.brinjal1,
                    shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
                  },
                ]}
              >
                {avatarUploading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <FontAwesome5 name="camera" solid size={13} color="#fff" />}
              </View>
            </Pressable>
          </View>

          {/* Identity */}
          <View style={s.nameRow}>
            <Text style={[s.name, { color: C.text }]}>{displayName}</Text>
            {(profile?.fullyVerified || profile?.isVerified) && <VerifiedBadge size={16} />}
          </View>
          {profile?.username ? (
            <Text style={[s.username, { color: C.textSecondary }]}>@{profile.username}</Text>
          ) : null}
          {profile?.location ? (
            <View style={s.locationRow}>
              <FontAwesome5 name="map-marker-alt" solid size={13} color={C.brinjal1} />
              <Text style={[s.location, { color: C.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{profile.location}</Text>
            </View>
          ) : null}
          {displayBio ? (
            <SeeMoreText style={[s.bio, { color: C.textSecondary }]}>{displayBio}</SeeMoreText>
          ) : null}

          {/* Edit profile / Analytics buttons */}
          <View style={s.actionRow}>
            <Pressable
              style={[s.editBtn, { borderColor: C.brinjal1 }]}
              onPress={() => router.push('/(creator)/edit-profile')}>
              <FontAwesome5 name="edit" size={15} color={C.brinjal1} />
              <Text style={[s.editBtnText, { color: C.brinjal1 }]}>{t('profile.editProfile')}</Text>
            </Pressable>
            <Pressable
              style={[s.editBtn, { borderColor: C.brinjal1 }]}
              onPress={() => router.push('/(creator)/analytics' as never)}>
              <FontAwesome5 name="chart-bar" size={15} color={C.brinjal1} />
              <Text style={[s.editBtnText, { color: C.brinjal1 }]}>{t('analytics.headerTitle')}</Text>
            </Pressable>
          </View>

          {/* Stats strip */}
          <View style={[s.statsStrip, { borderTopColor: C.border }]}>
            <Pressable
              style={s.statItem}
              onPress={() => router.push({ pathname: '/(creator)/proposals', params: { tab: 'accepted' } } as never)}>
              <Text style={[s.statValue, { color: C.text }]}>{eventCounts.completed}</Text>
              <Text style={[s.statLabel, { color: C.textSecondary }]}>{t('profile.completedEvents')}</Text>
            </Pressable>
            <View style={[s.statDivider, { backgroundColor: C.border }]} />
            <Pressable style={s.statItem} onPress={() => router.push('/(creator)/favorite-businesses' as never)}>
              <Text style={[s.statValue, { color: C.text }]}>{favoriteIds.size}</Text>
              <Text style={[s.statLabel, { color: C.textSecondary }]}>{t('profile.savedBrands')}</Text>
            </Pressable>
            <View style={[s.statDivider, { backgroundColor: C.border }]} />
            <Pressable style={s.statItem} onPress={() => router.push('/(creator)/saved-by-businesses' as never)}>
              <Text style={[s.statValue, { color: C.text }]}>{profile?.savedByBusinessCount ?? 0}</Text>
              <Text style={[s.statLabel, { color: C.textSecondary }]}>{t('profile.savedByBusinesses')}</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Categories ── */}
        <SectionCard
          title={t('profile.contentCategories')}
          action={{ label: profile?.categories?.length ? t('common.edit') : t('profile.addBtn'), onPress: () => router.push('/(creator)/edit-categories') }}
          C={C}>
          {profile?.categories?.length ? (
            <View style={s.chipWrap}>
              {sortOtherLast(profile.categories).map((cat) => {
                const meta = getCategoryMeta(allCategories, cat);
                return (
                  <View key={cat} style={[s.chip, { backgroundColor: C.primaryLight }]}>
                    <FontAwesome5 name={meta.icon} size={11} color={meta.color} />
                    <Text style={[s.chipText, { color: C.brinjal1 }]}>{cat}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <SectionEmptyState
              icon="th-large"
              title={t('profile.noCategoriesYet')}
              hint={t('profile.categoriesHint')}
              cta={t('profile.addContentCategories')}
              onPress={() => router.push('/(creator)/edit-categories')} />
          )}
        </SectionCard>

        {/* ── Social Accounts ── */}
        <SectionCard
          title={t('profile.socialAccounts')}
          action={{ label: richAccounts.length > 0 ? t('profile.manage') : t('profile.addBtn'), onPress: () => router.push('/(creator)/settings?section=social' as never) }}
          C={C}>
          {richAccounts.length > 0 ? (
            <View style={s.cardList}>
              {richAccounts.map((acc) => (
                <Pressable
                  key={acc.platform}
                  style={[s.socialRow, { backgroundColor: C.background, borderColor: C.border }]}
                  onPress={() => Linking.openURL(acc.url).catch(() => {})}>
                  <View
                    style={[
                      s.platformBubble,
                      {
                        backgroundColor: acc.color + '18',
                        ...Platform.select({ ios: { shadowColor: acc.color, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } } }),
                      },
                    ]}
                  >
                    <FontAwesome5 name={acc.iconName} size={18} color={acc.color} />
                  </View>
                  <View style={s.socialMeta}>
                    <Text style={[s.socialName, { color: C.text }]}>{acc.platform}</Text>
                    <Text style={[s.socialHandle, { color: C.textSecondary }]}>{acc.handle}</Text>
                  </View>
                  {acc.followers > 0 && (
                    <View style={[s.followerPill, { backgroundColor: acc.color + '14' }]}>
                      <Text style={[s.followerNum, { color: acc.color }]}>{fmtFollowers(acc.followers)}</Text>
                      <Text style={[s.followerLbl, { color: acc.color + 'CC' }]}>{t('profile.followersLabel')}</Text>
                    </View>
                  )}
                  <FontAwesome5 name="chevron-right" solid size={16} color={C.border} />
                </Pressable>
              ))}
            </View>
          ) : (
            <SectionEmptyState
              icon="share-alt"
              title={t('profile.noSocialLinked')}
              hint={t('profile.socialHint')}
              cta={t('profile.addAccount')}
              onPress={() => router.push('/(creator)/settings?section=social' as never)} />
          )}
        </SectionCard>

        {/* ── My Portfolio ── */}
        <SectionCard
          title={t('portfolioScreen.title')}
          action={{
            label: portfolioItems.length > 0 ? t('profile.manage') : t('portfolioScreen.addShort'),
            onPress: () => router.push((portfolioItems.length > 0 ? '/(creator)/portfolio' : '/(creator)/portfolio-form') as never),
          }}
          C={C}>
          {portfolioItems.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.portfolioScroll}>
              {portfolioItems.map((item) => (
                <Pressable
                  key={item.id}
                  style={[s.portfolioTile, { backgroundColor: C.background, borderColor: C.border }]}
                  onPress={() => router.push('/(creator)/portfolio' as never)}>
                  {item.mediaUrl ? (
                    <Image source={{ uri: item.mediaUrl }} style={s.portfolioImage} resizeMode="cover" />
                  ) : (
                    <View style={[s.portfolioImage, s.portfolioFallback, { backgroundColor: C.primaryLight }]}>
                      <FontAwesome5 name="external-link-alt" solid size={18} color={C.brinjal1} />
                    </View>
                  )}
                  {item.mediaType === 'VIDEO' && (
                    <View style={s.portfolioPlayBadge}>
                      <FontAwesome5 name="play" solid size={9} color="#fff" />
                    </View>
                  )}
                </Pressable>
              ))}
              <Pressable
                style={[s.portfolioTile, s.portfolioAddTile, { borderColor: C.brinjal1 + '55' }]}
                onPress={() => router.push('/(creator)/portfolio-form' as never)}>
                <FontAwesome5 name="plus" solid size={18} color={C.brinjal1} />
              </Pressable>
            </ScrollView>
          ) : (
            <SectionEmptyState
              icon="images"
              title={t('portfolioScreen.emptyTitle')}
              hint={t('portfolioScreen.emptySub')}
              cta={t('portfolioScreen.addItem')}
              onPress={() => router.push('/(creator)/portfolio-form' as never)} />
          )}
        </SectionCard>

        {/* Hidden from the mobile UI for now (My Work / past-work portfolio section is not ready to display). */}
        {/* <SectionCard
          title={t('profile.pastWork')}
          action={{ label: t('profile.addBtn'), onPress: () => router.push('/(creator)/settings?section=past-work' as never) }}
          C={C}>
          {portfolioLinks.length > 0 ? (
            <View style={s.cardList}>
              {portfolioLinks.map((item) => {
                const plat = detectPlatform(item.url);
                return (
                  <Pressable
                    key={item.id}
                    style={[s.socialRow, { backgroundColor: C.background, borderColor: C.border }]}
                    onPress={() => Linking.openURL(item.url).catch(() => {})}>
                    <View
                      style={[
                        s.platformBubble,
                        {
                          backgroundColor: plat.color + '18',
                          ...Platform.select({ ios: { shadowColor: plat.color, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } } }),
                        },
                      ]}
                    >
                      <FontAwesome5 name={plat.iconName} size={16} color={plat.color} />
                    </View>
                    <View style={s.socialMeta}>
                      <Text style={[s.socialName, { color: C.text }]} numberOfLines={1}>{item.label}</Text>
                      <Text style={[s.socialHandle, { color: C.textSecondary }]} numberOfLines={1}>{shortenUrl(item.url)}</Text>
                    </View>
                    <FontAwesome5 name="external-link-alt" solid size={16} color={C.textSecondary} />
                  </Pressable>
                );
              })}
              <Pressable
                style={[s.addMoreRow, { borderColor: C.brinjal1 + '55' }]}
                onPress={() => router.push('/(creator)/settings?section=past-work' as never)}>
                <FontAwesome5 name="plus-circle" solid size={16} color={C.brinjal1} />
                <Text style={[s.addMoreText, { color: C.brinjal1 }]}>{t('profile.addAnotherSample')}</Text>
              </Pressable>
            </View>
          ) : (
            <SectionEmptyState
              icon="briefcase"
              title={t('profile.noPastWorkYet')}
              hint={t('profile.pastWorkHint')}
              cta={t('profile.addWorkSample')}
              onPress={() => router.push('/(creator)/settings?section=past-work' as never)} />
          )}
        </SectionCard> */}

        {/* ── Reviews (kept last) — every review this creator has received,
              latest first (backend orders by createdAt desc) ── */}
        {!!profile?.reviews?.length && (
          <View onLayout={(e) => { reviewsY.current = e.nativeEvent.layout.y; }}>
            <SectionCard title={t('reviewsList.title')} C={C}>
              {profile.reviewSummary && profile.reviewSummary.reviewCount > 0 ? (
                <View style={[s.reviewSummaryRow, { borderBottomColor: C.border }]}>
                  <FontAwesome5 name="star" solid size={13} color="#F59E0B" />
                  <Text style={[s.reviewSummaryText, { color: C.textSecondary }]}>
                    {t('reviewsList.summary', {
                      rating: profile.reviewSummary.averageRating.toFixed(1),
                      count: profile.reviewSummary.reviewCount,
                    })}
                  </Text>
                </View>
              ) : null}
              <ReviewsList
                reviews={profile.reviews}
                seeMore
                limit={5}
                onSeeAll={() => router.push({
                  pathname: '/(creator)/reviews',
                  params: {
                    reviews: JSON.stringify(profile.reviews ?? []),
                    rating: String(profile.reviewSummary?.averageRating ?? ''),
                    count: String(profile.reviewSummary?.reviewCount ?? (profile.reviews ?? []).length),
                  },
                } as never)}
              />
            </SectionCard>
          </View>
        )}

      </ScrollView>
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionCard({
  title, action, children, C,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
  C: ReturnType<typeof useAppColors>;
}) {
  return (
    <View style={[s.sectionCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: C.text }]}>{title}</Text>
        {action ? (
          <Pressable onPress={action.onPress} hitSlop={8}>
            <Text style={[s.sectionAction, { color: C.brinjal1 }]}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },

  // Cover
  cover:    { height: 180, overflow: 'hidden' },
  coverScrim: { backgroundColor: 'rgba(0,0,0,0.28)' },
  bubble:   { position: 'absolute', borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.08)' },
  bubble1:  { width: 160, height: 160, top: -50, right: -30 },
  bubble2:  { width: 100, height: 100, bottom: -20, left: 30 },
  bubble3:  { width: 60,  height: 60,  top: 20,   left: -20  },
  topBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md },

  // Profile card (floats over cover)
  profileCard: { marginHorizontal: SCREEN_GUTTER, marginTop: -60, borderRadius: RADIUS.xl, padding: SPACING.lg, alignItems: 'center', gap: 6,
                 ...SHADOW.floating },

  // Avatar
  avatarArea:     { marginTop: -50, marginBottom: 6, alignItems: 'center', alignSelf: 'center' },
  avatarPressable:{ position: 'relative', alignItems: 'center', justifyContent: 'center' },
  avatar:         { width: 96, height: 96, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center',
                    borderWidth: 4, borderColor: '#fff', overflow: 'hidden' },
  avatarInitial:  { fontSize: 38, color: '#fff', fontFamily: F.bold, textAlign: 'center', lineHeight: 96 },
  cameraBadge:    { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: RADIUS.full,
                    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },

  // Identity
  nameRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  name:        { fontSize: 22, fontFamily: F.bold, textAlign: 'center' },
  username:    { fontSize: 14, fontFamily: F.regular, textAlign: 'center', marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  location:    { fontSize: 13, fontFamily: F.regular, flexShrink: 1 },
  bio:         { fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8, fontFamily: F.regular },

  actionRow:   { flexDirection: 'row', gap: 10, marginTop: 6 },
  editBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40,
                 borderWidth: 1.5, borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 8 },
  editBtnText: { fontSize: 13, fontFamily: F.bold },

  // Stats strip
  statsStrip:   { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 16,
                  paddingTop: 16, borderTopWidth: 1 },
  statItem:     { flex: 1, alignItems: 'center', gap: 2 },
  statValue:    { fontSize: 18, fontFamily: F.bold },
  statLabel:    { fontSize: 11, fontFamily: F.medium },
  statDivider:  { width: 1, height: 32 },

  // Section cards
  sectionCard:   { marginHorizontal: SCREEN_GUTTER, marginTop: 12, borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg, ...SHADOW.card },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle:  { fontSize: 15, fontFamily: F.bold },
  sectionAction: { fontSize: 13, fontFamily: F.bold },

  // Reviews
  reviewSummaryRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1 },
  reviewSummaryText: { fontSize: 13, fontFamily: F.semibold },

  // Category chips
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.sm },
  chipText: { fontSize: 13, fontFamily: F.semibold },

  // Social / portfolio rows
  cardList:      { gap: 10 },
  socialRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.md, padding: 12, borderWidth: 1 },
  platformBubble:{ width: 42, height: 42, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  socialMeta:    { flex: 1, gap: 2 },
  socialName:    { fontSize: 14, fontFamily: F.bold },
  socialHandle:  { fontSize: 12, fontFamily: F.regular },
  followerPill:  { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm, marginRight: 4 },
  followerNum:   { fontSize: 13, fontFamily: F.bold },
  followerLbl:   { fontSize: 9, textTransform: 'uppercase', fontFamily: F.semibold },

  // Add more
  addMoreRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40,
                 borderRadius: RADIUS.md, borderWidth: 1.5, borderStyle: 'dashed', paddingVertical: 11 },
  addMoreText: { fontSize: 13, fontFamily: F.bold },

  // Portfolio preview strip
  portfolioScroll:   { gap: 10, paddingRight: 4 },
  portfolioTile:     { width: 76, height: 76, borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden' },
  portfolioImage:    { width: '100%', height: '100%' },
  portfolioFallback: { justifyContent: 'center', alignItems: 'center' },
  portfolioPlayBadge:{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: RADIUS.full,
                       backgroundColor: 'rgba(17,24,39,0.65)', justifyContent: 'center', alignItems: 'center' },
  portfolioAddTile:  { justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed' },
});
