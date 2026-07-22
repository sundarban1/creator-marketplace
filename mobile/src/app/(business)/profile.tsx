import { router, useFocusEffect } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { useCallback, useState } from 'react';
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
import { F, RADIUS, SHADOW } from '@/utilities/constants';
import { pickAndUpload } from '@/utilities/uploadImage';
import { formatPhoneDisplay } from '@/utilities/phone';
import { useAllCategories, getCategoryMeta } from '@/hooks/useCategories';

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

  async function handleLogoPress() {
    setLogoUploading(true);
    try {
      const result = await pickAndUpload('business-logo');
      if (result) {
        setProfile((p) => p ? { ...p, logoUrl: result.url } : p);
        updateUser({ avatar: result.url });
      }
    } catch (err) {
      console.error('[logo upload]', err);
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
      console.error('[cover upload]', err);
      toast.error(err instanceof Error && err.message ? err.message : t('profile.uploadFailed'));
    } finally {
      setCoverUploading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      profileService.getBusinessProfile().then(setProfile).catch(() => {});
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

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
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={s.topIconBtn} hitSlop={4}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(business)/' as never))}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <Text style={s.topTitle}>{t('profile.myProfile')}</Text>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={s.topIconBtn} hitSlop={4}
              onPress={handleCoverPress} disabled={coverUploading}>
              {coverUploading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="camera" size={18} color="#fff" />}
            </Pressable>
          </View>
        </LinearGradient>

        {/* ── Logo card (overlaps cover) ── */}
        <View style={[s.profileCard, { backgroundColor: C.surface }]}>
          {/* Logo */}
          <View style={s.avatarArea}>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={handleLogoPress} disabled={logoUploading} style={s.avatarPressable}>
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
                  : <Ionicons name="camera" size={13} color="#fff" />}
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
              <Ionicons name="location-sharp" size={13} color={C.brinjal1} />
              <Text style={[s.location, { color: C.textSecondary }]}>{profile.location}</Text>
            </View>
          ) : null}

          {/* Edit profile / Analytics buttons */}
          <View style={s.actionRow}>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[s.editBtn, { borderColor: C.brinjal1 }]}
              onPress={() => router.push('/(business)/edit-profile' as never)}>
              <Ionicons name="create-outline" size={15} color={C.brinjal1} />
              <Text style={[s.editBtnText, { color: C.brinjal1 }]}>{t('profile.editBusinessBtn')}</Text>
            </Pressable>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[s.editBtn, { borderColor: C.brinjal1 }]}
              onPress={() => router.push('/(business)/analytics' as never)}>
              <Ionicons name="stats-chart-outline" size={15} color={C.brinjal1} />
              <Text style={[s.editBtnText, { color: C.brinjal1 }]}>{t('analytics.headerTitle')}</Text>
            </Pressable>
          </View>

          {/* Stats strip */}
          <View style={[s.statsStrip, { borderTopColor: C.border }]}>
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: C.text }]}>{activeCampaigns}</Text>
              <Text style={[s.statLabel, { color: C.textSecondary }]}>{t('profile.active')}</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: C.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: C.text }]}>{savedCreatorsCount}</Text>
              <Text style={[s.statLabel, { color: C.textSecondary }]}>{t('profile.savedCreators')}</Text>
            </View>
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
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
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
                      <Ionicons name="call" size={16} color={C.brinjal1} />
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
                      <Ionicons name="mail" size={16} color={C.brinjal1} />
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
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
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
                <Ionicons name="globe" size={16} color={C.brinjal1} />
              </View>
              <Text style={[s.contactText, { color: C.brinjal1, flex: 1 }]} numberOfLines={1}>
                {profile.website.replace(/^https?:\/\//, '')}
              </Text>
              <Ionicons name="open-outline" size={16} color={C.textSecondary} />
            </Pressable>
          ) : (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
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
              {profile!.categories.map((cat) => {
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
            <EmptyState
              icon="store"
              title={t('profile.noIndustriesYet')}
              hint={t('profile.industriesHint')}
              cta={t('profile.addIndustries')}
              onPress={() => router.push('/(business)/edit-categories' as never)}
              C={C} />
          )}
        </SectionCard>

      </ScrollView>
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
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={action.onPress} hitSlop={8}>
            <Text style={[s.sectionAction, { color: C.brinjal1 }]}>{action.label}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function EmptyState({
  icon, title, hint, cta, onPress, C,
}: {
  icon: string; title: string; hint: string; cta: string;
  onPress: () => void;
  C: ReturnType<typeof useAppColors>;
}) {
  return (
    <View style={[s.emptyWrap, { borderColor: C.border }]}>
      <FontAwesome5 name={icon} solid size={28} color={C.border} />
      <Text style={[s.emptyTitle, { color: C.text }]}>{title}</Text>
      <Text style={[s.emptyHint, { color: C.textSecondary }]}>{hint}</Text>
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        style={[
          s.emptyCta,
          {
            backgroundColor: C.brinjal1, shadowColor: C.brinjal1,
            shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
          },
        ]}
        onPress={onPress}>
        <Text style={s.emptyCtaText}>{cta}</Text>
      </Pressable>
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
  topBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10 },
  topTitle: { fontSize: 18, color: '#fff', fontFamily: F.bold, lineHeight: 22 },
  topIconBtn: { width: 38, height: 38, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },

  // Profile card (floats over cover)
  profileCard: { marginHorizontal: 16, marginTop: -60, borderRadius: RADIUS.xl, padding: 20, alignItems: 'center', gap: 6,
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
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  location:    { fontSize: 13, fontFamily: F.regular },

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
  sectionCard:   { marginHorizontal: 16, marginTop: 12, borderRadius: RADIUS.lg, padding: 18, ...SHADOW.card },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle:  { fontSize: 15, fontFamily: F.bold },
  sectionAction: { fontSize: 13, fontFamily: F.bold },
  aboutText:     { fontSize: 14, lineHeight: 22, fontFamily: F.regular },

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

  // Empty state (list-style prompt)
  emptyWrap:    { alignItems: 'center', gap: 8, paddingVertical: 20, paddingHorizontal: 12,
                  borderWidth: 1.5, borderRadius: RADIUS.lg, borderStyle: 'dashed' },
  emptyTitle:   { fontSize: 14, fontFamily: F.bold },
  emptyHint:    { fontSize: 12, textAlign: 'center', lineHeight: 18, fontFamily: F.regular },
  emptyCta:     { borderRadius: RADIUS.full, paddingHorizontal: 20, paddingVertical: 9, minHeight: 40, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  emptyCtaText: { fontSize: 13, color: '#fff', fontFamily: F.bold },
});
