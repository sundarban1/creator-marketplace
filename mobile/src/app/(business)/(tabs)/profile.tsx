import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { SectionEmptyState } from '@/components/SectionEmptyState';
import { ReviewsList } from '@/components/ReviewsList';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useToast } from '@/components/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { profileService, type BusinessProfile } from '@/services/profile';
import { campaignService } from '@/services/campaign';
import { creatorService } from '@/services/creator';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { pickAndUpload } from '@/utilities/uploadImage';
import { formatPhoneDisplay } from '@/utilities/phone';
import { useAllCategories, getCategoryMeta, sortOtherLast } from '@/hooks/useCategories';
import { logger } from '@/utilities/logger';
import { getCached, setCached } from '@/utilities/offlineCache';

export default function BusinessProfileScreen() {
  const { user, updateUser } = useAuth();
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories: allCategories } = useAllCategories();
  const toast = useToast();
  const [profile, setProfile]                 = useState<BusinessProfile | null>(null);
  const [activeCampaigns, setActiveCampaigns] = useState(0);
  const [savedCreatorsCount, setSavedCreatorsCount] = useState(0);
  const [logoUploading, setLogoUploading]     = useState(false);
  const [coverUploading, setCoverUploading]   = useState(false);

  // A review_received notification deep-links here with ?focus=reviews — scroll
  // the reviews section into view once it (and the profile data behind it) lands.
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const reviewsY = useRef(0);
  const didScrollToReviews = useRef(false);
  useEffect(() => {
    if (focus !== 'reviews' || didScrollToReviews.current) return;
    if (!profile?.reviews?.length) return;
    didScrollToReviews.current = true;
    // Defer past layout so reviewsY is populated.
    const id = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(reviewsY.current - 12, 0), animated: true });
    }, 350);
    return () => clearTimeout(id);
  }, [focus, profile?.reviews?.length]);

  async function handleLogoPress() {
    setLogoUploading(true);
    try {
      const result = await pickAndUpload('business-logo');
      if (result) {
        setProfile((p) => p ? { ...p, logoUrl: result.url } : p);
        updateUser({ avatar: result.url });
      }
    } catch (err) {
      logger.error('[profile] logo upload failed', err);
      toast.error(err instanceof Error && err.message ? err.message : t('profile.uploadFailed'));
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleCoverPress() {
    setCoverUploading(true);
    try {
      const result = await pickAndUpload('business-cover');
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

  useFocusEffect(
    useCallback(() => {
      // Show the last-known profile immediately (e.g. offline) without
      // clobbering anything already loaded from a previous, fresher focus.
      void getCached<BusinessProfile>('business_profile').then((cached) => {
        if (cached) setProfile((p) => p ?? cached);
      });
      profileService.getBusinessProfile()
        .then((p) => { setProfile(p); void setCached('business_profile', p); })
        .catch(() => {});
      campaignService.listMy()
        .then(({ campaigns }) => setActiveCampaigns(campaigns.filter((c) => c.status === 'active').length))
        .catch(() => {});
      creatorService.getSavedCreators()
        .then((creators) => setSavedCreatorsCount(creators.length))
        .catch(() => {});
    }, []),
  );

  const displayName = profile?.businessName ?? user?.name ?? 'Business';

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── Hero Cover ── */}
        <LinearGradient
          colors={['#7C3AED', '#EC4899', '#F97316']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.cover}>
          {profile?.coverImageUrl ? (
            <Image source={{ uri: profile.coverImageUrl }} style={StyleSheet.absoluteFill} />
          ) : (
            <>
              {/* Decorative bubbles */}
              <View style={[s.bubble, s.bubble1]} />
              <View style={[s.bubble, s.bubble2]} />
              <View style={[s.bubble, s.bubble3]} />
            </>
          )}

          {/* Top bar */}
          <View style={s.topBar}>
            <Pressable style={s.topIconBtn} hitSlop={4}
              onPress={handleCoverPress} disabled={coverUploading}>
              {coverUploading
                ? <ActivityIndicator size="small" color="#fff" />
                : <FontAwesome5 name="camera" solid size={18} color="#fff" />}
            </Pressable>
          </View>
        </LinearGradient>

        {/* ── Logo card (overlaps cover) ── */}
        <View style={[s.profileCard, { backgroundColor: C.surface }]}>
          {/* Logo */}
          <View style={s.avatarArea}>
            <Pressable onPress={handleLogoPress} disabled={logoUploading} style={s.avatarPressable}>
              {profile?.logoUrl ? (
                <Image source={{ uri: profile.logoUrl }} style={s.avatar} />
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
                {logoUploading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <FontAwesome5 name="camera" solid size={13} color="#fff" />}
              </View>
            </Pressable>
          </View>

          {/* Identity */}
          <View style={s.nameRow}>
            <Text style={[s.name, { color: C.text }]} numberOfLines={2}>{displayName}</Text>
            {(profile?.fullyVerified || profile?.isVerified) && <VerifiedBadge size={16} />}
          </View>
          {profile?.location ? (
            <View style={s.locationRow}>
              <FontAwesome5 name="map-marker-alt" solid size={13} color={C.brinjal1} />
              <Text style={[s.location, { color: C.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{profile.location}</Text>
            </View>
          ) : null}

          {/* Edit profile / Analytics buttons */}
          <View style={s.actionRow}>
            <Pressable
              style={[s.editBtn, { borderColor: C.brinjal1 }]}
              onPress={() => router.push('/(business)/edit-profile' as never)}>
              <FontAwesome5 name="edit" size={15} color={C.brinjal1} />
              <Text style={[s.editBtnText, { color: C.brinjal1 }]}>{t('profile.editBusinessBtn')}</Text>
            </Pressable>
            <Pressable
              style={[s.editBtn, { borderColor: C.brinjal1 }]}
              onPress={() => router.push('/(business)/analytics' as never)}>
              <FontAwesome5 name="chart-bar" size={15} color={C.brinjal1} />
              <Text style={[s.editBtnText, { color: C.brinjal1 }]}>{t('analytics.headerTitle')}</Text>
            </Pressable>
          </View>

          {/* Stats strip */}
          <View style={[s.statsStrip, { borderTopColor: C.border }]}>
            <Pressable style={s.statItem} onPress={() => router.push('/(business)/campaigns' as never)}>
              <Text style={[s.statValue, { color: C.text }]}>{activeCampaigns}</Text>
              <Text style={[s.statLabel, { color: C.textSecondary }]}>{t('profile.active')}</Text>
            </Pressable>
            <View style={[s.statDivider, { backgroundColor: C.border }]} />
            <Pressable style={s.statItem} onPress={() => router.push('/(business)/saved-creators' as never)}>
              <Text style={[s.statValue, { color: C.text }]}>{savedCreatorsCount}</Text>
              <Text style={[s.statLabel, { color: C.textSecondary }]}>{t('profile.savedCreators')}</Text>
            </Pressable>
            <View style={[s.statDivider, { backgroundColor: C.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: C.text }]}>{profile?.favoritedByCount ?? 0}</Text>
              <Text style={[s.statLabel, { color: C.textSecondary }]}>{t('profile.favoritedByCreators')}</Text>
            </View>
          </View>
        </View>

        {/* ── About ── */}
        <SectionCard title={t('profile.about')} action={{ label: t('common.edit'), onPress: () => router.push('/(business)/edit-profile' as never) }} C={C}>
          {profile?.description ? (
            <Text style={[s.aboutText, { color: C.text }]}>{profile.description}</Text>
          ) : (
            <Pressable
              style={[s.emptyField, { borderColor: C.border }]}
              onPress={() => router.push('/(business)/edit-profile' as never)}>
              <Text style={[s.emptyFieldText, { color: C.textSecondary }]}>{t('profile.addDescription')}</Text>
            </Pressable>
          )}
        </SectionCard>

        {/* ── Contact ── */}
        <SectionCard title={t('profile.contact')} C={C}>
          {(() => {
            const hasPhone = !!profile?.user?.phone;
            const hasVerifiedEmail = !!profile?.user?.isEmailVerified;
            return (
              <View style={s.cardList}>
                {hasPhone && (
                  <View style={[s.contactRow, { backgroundColor: C.background, borderColor: C.border }]}>
                    <View
                      style={[
                        s.platformBubble,
                        {
                          backgroundColor: C.brinjal1 + '18', shadowColor: C.brinjal1,
                          shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
                        },
                      ]}
                    >
                      <FontAwesome5 name="phone" solid size={16} color={C.brinjal1} />
                    </View>
                    <Text style={[s.contactText, { color: C.text }]}>{formatPhoneDisplay(profile!.user!.phone!)}</Text>
                  </View>
                )}
                {(hasVerifiedEmail || !hasPhone) && (
                  <View style={[s.contactRow, { backgroundColor: C.background, borderColor: C.border }]}>
                    <View
                      style={[
                        s.platformBubble,
                        {
                          backgroundColor: C.brinjal1 + '18', shadowColor: C.brinjal1,
                          shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
                        },
                      ]}
                    >
                      <FontAwesome5 name="envelope" solid size={16} color={C.brinjal1} />
                    </View>
                    <Text style={[s.contactText, { color: C.text }]}>{profile?.user?.email ?? user?.email ?? '—'}</Text>
                  </View>
                )}
              </View>
            );
          })()}
        </SectionCard>

        {/* ── Website ── */}
        <SectionCard title={t('profile.website')} action={{ label: profile?.website ? t('common.edit') : t('profile.addBtn'), onPress: () => router.push('/(business)/edit-profile' as never) }} C={C}>
          {profile?.website ? (
            <Pressable
              style={[s.contactRow, { backgroundColor: C.background, borderColor: C.border }]}
              onPress={() => Linking.openURL(profile.website!)}>
              <View
                style={[
                  s.platformBubble,
                  {
                    backgroundColor: C.brinjal1 + '18', shadowColor: C.brinjal1,
                    shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
                  },
                ]}
              >
                <FontAwesome5 name="globe" solid size={16} color={C.brinjal1} />
              </View>
              <Text style={[s.contactText, { color: C.brinjal1, flex: 1 }]} numberOfLines={1}>
                {profile.website.replace(/^https?:\/\//, '')}
              </Text>
              <FontAwesome5 name="external-link-alt" solid size={16} color={C.textSecondary} />
            </Pressable>
          ) : (
            <Pressable
              style={[s.emptyField, { borderColor: C.border }]}
              onPress={() => router.push('/(business)/edit-profile' as never)}>
              <Text style={[s.emptyFieldText, { color: C.textSecondary }]}>{t('profile.addWebsite')}</Text>
            </Pressable>
          )}
        </SectionCard>

        {/* ── Industries ── */}
        <SectionCard
          title={t('profile.industries')}
          action={{ label: profile?.categories?.length ? t('common.edit') : t('profile.addBtn'), onPress: () => router.push('/(business)/edit-categories' as never) }}
          C={C}>
          {(profile?.categories.length ?? 0) > 0 ? (
            <View style={s.chipWrap}>
              {sortOtherLast(profile!.categories).map((cat) => {
                const meta = getCategoryMeta(allCategories, cat);
                return (
                  <View key={cat} style={[s.chip, { backgroundColor: meta.bg }]}>
                    <FontAwesome5 name={meta.icon} size={11} color={meta.color} />
                    <Text style={[s.chipText, { color: meta.color }]}>{cat}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <SectionEmptyState
              icon="store"
              title={t('profile.noIndustriesYet')}
              hint={t('profile.industriesHint')}
              cta={t('profile.addIndustries')}
              onPress={() => router.push('/(business)/edit-categories' as never)} />
          )}
        </SectionCard>

        {/* ── Reviews & Ratings — sits right below Industries. Creators this
              business has worked with can rate and review it; those show up
              here (latest first). Always rendered — an empty state explains
              where reviews come from when there are none yet. ── */}
        <View onLayout={(e) => { reviewsY.current = e.nativeEvent.layout.y; }}>
          <SectionCard title={t('reviewsList.title')} C={C}>
            {profile?.reviews?.length ? (
              <>
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
                    pathname: '/(business)/reviews',
                    params: {
                      reviews: JSON.stringify(profile.reviews ?? []),
                      rating: String(profile.reviewSummary?.averageRating ?? ''),
                      count: String(profile.reviewSummary?.reviewCount ?? (profile.reviews ?? []).length),
                    },
                  } as never)}
                />
              </>
            ) : (
              <SectionEmptyState
                icon="star"
                title={t('profile.noReviewsYet')}
                hint={t('profile.businessReviewsHint')} />
            )}
          </SectionCard>
        </View>

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
    <View style={[s.sectionCard, { backgroundColor: C.surface }]}>
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: C.text }]}>{title}</Text>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={8}>
            <Text style={[s.sectionAction, { color: C.brinjal1 }]}>{action.label}</Text>
          </Pressable>
        )}
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
  bubble:   { position: 'absolute', borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.08)' },
  bubble1:  { width: 160, height: 160, top: -50, right: -30 },
  bubble2:  { width: 100, height: 100, bottom: -20, left: 30 },
  bubble3:  { width: 60,  height: 60,  top: 20,   left: -20  },
  topBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md },
  topIconBtn: { width: 38, height: 38, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },

  // Profile card (floats over cover)
  profileCard: { marginHorizontal: SCREEN_GUTTER, marginTop: -60, borderRadius: RADIUS.xl, padding: SPACING.lg, alignItems: 'center', gap: 6,
                 ...SHADOW.floating },

  // Logo
  avatarArea:     { marginTop: -50, marginBottom: 6, alignItems: 'center', alignSelf: 'center' },
  avatarPressable:{ position: 'relative', alignItems: 'center', justifyContent: 'center' },
  avatar:         { width: 96, height: 96, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center',
                    borderWidth: 4, borderColor: '#fff', overflow: 'hidden' },
  avatarInitial:  { fontSize: 38, color: '#fff', fontFamily: F.bold, textAlign: 'center', lineHeight: 96 },
  cameraBadge:    { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: RADIUS.full,
                    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },

  // Identity
  nameRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  name:        { fontSize: 22, fontFamily: F.bold, textAlign: 'center' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, maxWidth: '100%' },
  location:    { fontSize: 13, fontFamily: F.regular, flexShrink: 1 },

  actionRow:   { flexDirection: 'row', gap: 10, marginTop: 12 },
  editBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40,
                 borderWidth: 1.5, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8 },
  editBtnText: { fontSize: 13, fontFamily: F.bold },

  // Stats strip
  statsStrip:   { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 16,
                  paddingTop: 16, borderTopWidth: 1 },
  statItem:     { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
  statValue:    { fontSize: 18, fontFamily: F.bold, textAlign: 'center' },
  statLabel:    { fontSize: 11, fontFamily: F.medium, textAlign: 'center' },
  statDivider:  { width: 1, height: 32, flexShrink: 0 },

  // Section cards
  sectionCard:   { marginHorizontal: SCREEN_GUTTER, marginTop: 12, borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOW.card },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle:  { fontSize: 15, fontFamily: F.bold },
  sectionAction: { fontSize: 13, fontFamily: F.bold },
  aboutText:     { fontSize: 14, lineHeight: 22, fontFamily: F.regular },

  // Reviews
  reviewSummaryRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1 },
  reviewSummaryText: { fontSize: 13, fontFamily: F.semibold },

  // Category chips
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.sm },
  chipText: { fontSize: 13, fontFamily: F.semibold },

  // Contact / website rows
  cardList:      { gap: 10 },
  contactRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.md, padding: 12, borderWidth: 1 },
  platformBubble:{ width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  contactText:   { fontSize: 14, fontFamily: F.medium },

  // Empty field (single-value prompt)
  emptyField:     { borderRadius: RADIUS.md, borderWidth: 1.5, borderStyle: 'dashed', padding: 16, alignItems: 'center' },
  emptyFieldText: { fontSize: 13, fontFamily: F.medium },
});
