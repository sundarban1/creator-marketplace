import { router, useFocusEffect } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BackButton } from '@/components/BackButton';
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
import { GRADIENTS, F, RADIUS, SHADOW } from '@/utilities/constants';
import { pickAndUpload } from '@/utilities/uploadImage';
import { formatPhoneDisplay } from '@/utilities/phone';
import { useAllCategories, getCategoryMeta } from '@/hooks/useCategories';

function BusinessAvatar({ name, logoUrl, size = 88, uploading, onPress }: {
  name: string; logoUrl: string | null; size?: number;
  uploading?: boolean; onPress?: () => void;
}) {
  const C = useAppColors();
  const letter = (name?.[0] ?? '?').toUpperCase();
  const radius = size / 2;
  return (
    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={onPress} disabled={uploading} style={{ position: 'relative' }}>
      <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', overflow: 'hidden' }}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={{ width: size, height: size, borderRadius: radius }} />
        ) : (
          <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: '#fff' }}>{letter}</Text>
        )}
      </View>
      {/* Camera badge — matches creator profile */}
      <View style={[styles.cameraBadge, { backgroundColor: C.brinjal1 }]}>
        {uploading
          ? <ActivityIndicator size="small" color="#fff" />
          : <Ionicons name="camera" size={13} color="#fff" />}
      </View>
    </Pressable>
  );
}

export default function BusinessProfileScreen() {
  const { user, updateUser } = useAuth();
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories: allCategories } = useAllCategories();
  const toast = useToast();
  const [profile, setProfile]               = useState<BusinessProfile | null>(null);
  const [activeCampaigns, setActiveCampaigns] = useState(0);
  const [loading, setLoading]               = useState(true);
  const [logoUploading, setLogoUploading]   = useState(false);

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

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([
        profileService.getBusinessProfile(),
        campaignService.listMy().catch(() => ({ campaigns: [] })),
      ])
        .then(([prof, { campaigns }]) => {
          setProfile(prof);
          setActiveCampaigns(campaigns.filter((c) => c.status === 'active').length);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, []),
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <View style={[styles.navBar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <BackButton fallback="/(business)/" />
          <Text style={[styles.navTitle, { color: C.text }]}>{t('profileExtra.navTitle')}</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.center}><ActivityIndicator size="large" color={C.brinjal1} /></View>
      </SafeAreaView>
    );
  }

  const name = profile?.businessName ?? user?.name ?? 'Business';
  const joinedYear = profile?.createdAt ? new Date(profile.createdAt).getFullYear() : '—';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      {/* Nav bar */}
      <View style={[styles.navBar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <BackButton fallback="/(business)/" />
        <Text style={[styles.navTitle, { color: C.text }]} numberOfLines={1}>{name}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── Hero ── */}
        <LinearGradient colors={GRADIENTS.hero} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.hero}>
          <View style={styles.heroBubble1} />
          <View style={styles.heroBubble2} />
          <View style={styles.heroInner}>
            <BusinessAvatar
              name={name}
              logoUrl={profile?.logoUrl ?? null}
              size={88}
              uploading={logoUploading}
              onPress={handleLogoPress}
            />
            <View style={styles.heroMeta}>
              <View style={styles.heroNameRow}>
                <Text style={styles.heroName} numberOfLines={2}>{name}</Text>
                {(profile?.fullyVerified || profile?.isVerified) && <VerifiedBadge size={16} />}
              </View>
              {!!profile?.location && (
                <View style={styles.heroLocationRow}>
                  <Ionicons name="location-sharp" size={12} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.heroLocation} numberOfLines={1}>{profile.location}</Text>
                </View>
              )}
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{activeCampaigns}</Text>
                  <Text style={styles.heroStatLabel}>{t('profile.active')}</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{joinedYear}</Text>
                  <Text style={styles.heroStatLabel}>{t('profile.joined')}</Text>
                </View>
                {(profile?.categories.length ?? 0) > 0 && (
                  <>
                    <View style={styles.heroStatDivider} />
                    <View style={styles.heroStat}>
                      <Text style={styles.heroStatValue}>{profile!.categories.length}</Text>
                      <Text style={styles.heroStatLabel}>{t('profile.sectors')}</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* Edit Profile CTA */}
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[styles.editCta, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 + '33' }]}
            onPress={() => router.push('/(business)/edit-profile' as never)}>
            <Ionicons name="create" size={22} color={C.brinjal1} />
            <View style={styles.editCtaText}>
              <Text style={[styles.editCtaTitle, { color: C.text }]}>{t('profile.editBusinessBtn')}</Text>
              <Text style={[styles.editCtaSub, { color: C.textSecondary }]}>{t('profile.editBusinessSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={C.brinjal1} />
          </Pressable>

          {/* Analytics CTA */}
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[styles.editCta, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => router.push('/(business)/analytics' as never)}>
            <Ionicons name="stats-chart" size={22} color={C.brinjal1} />
            <View style={styles.editCtaText}>
              <Text style={[styles.editCtaTitle, { color: C.text }]}>{t('analytics.headerTitle')}</Text>
              <Text style={[styles.editCtaSub, { color: C.textSecondary }]}>{t('analytics.viewInsights')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={C.brinjal1} />
          </Pressable>

          {/* About */}
          {profile?.description ? (
            <View style={[styles.infoCard, { backgroundColor: C.surface }]}>
              <View style={styles.infoHeader}>
                <Ionicons name="document-text" size={16} color={C.brinjal1} />
                <Text style={[styles.infoTitle, { color: C.text }]}>{t('profile.about')}</Text>
              </View>
              <Text style={[styles.aboutText, { color: C.text }]}>{profile.description}</Text>
            </View>
          ) : (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[styles.emptyField, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => router.push('/(business)/edit-profile' as never)}>
              <Text style={[styles.emptyFieldText, { color: C.textSecondary }]}>{t('profile.addDescription')}</Text>
            </Pressable>
          )}

          {/* Contact */}
          <View style={[styles.infoCard, { backgroundColor: C.surface }]}>
            <View style={styles.infoHeader}>
              <Ionicons name="mail" size={16} color={C.brinjal1} />
              <Text style={[styles.infoTitle, { color: C.text }]}>{t('profile.contact')}</Text>
            </View>
            {(() => {
              const hasPhone = !!profile?.user?.phone;
              const hasVerifiedEmail = !!profile?.user?.isEmailVerified;
              if (hasPhone && hasVerifiedEmail) {
                return (
                  <>
                    <View style={styles.contactRow}>
                      <Ionicons name="call-outline" size={14} color={C.textSecondary} />
                      <Text style={[styles.contactText, { color: C.text }]}>{formatPhoneDisplay(profile!.user!.phone!)}</Text>
                    </View>
                    <View style={[styles.contactRow, { marginTop: 4 }]}>
                      <Ionicons name="mail-outline" size={14} color={C.textSecondary} />
                      <Text style={[styles.contactText, { color: C.text }]}>{profile!.user!.email}</Text>
                    </View>
                  </>
                );
              }
              if (hasPhone) {
                return (
                  <View style={styles.contactRow}>
                    <Ionicons name="call-outline" size={14} color={C.textSecondary} />
                    <Text style={[styles.contactText, { color: C.text }]}>{formatPhoneDisplay(profile!.user!.phone!)}</Text>
                  </View>
                );
              }
              return (
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={14} color={C.textSecondary} />
                  <Text style={[styles.contactText, { color: C.text }]}>{profile?.user?.email ?? user?.email ?? '—'}</Text>
                </View>
              );
            })()}
          </View>

          {/* Website */}
          {profile?.website ? (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[styles.websiteCard, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => Linking.openURL(profile.website!)}>
              <View style={[styles.websiteIconBox, { backgroundColor: C.primaryLight }]}>
                <Ionicons name="globe" size={20} color={C.brinjal1} />
              </View>
              <View style={styles.websiteTextWrap}>
                <Text style={[styles.websiteLabel, { color: C.textSecondary }]}>{t('profile.website')}</Text>
                <Text style={[styles.websiteUrl, { color: C.brinjal1 }]} numberOfLines={1}>
                  {profile.website.replace(/^https?:\/\//, '')}
                </Text>
              </View>
              <Ionicons name="open-outline" size={18} color={C.textSecondary} />
            </Pressable>
          ) : (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[styles.emptyField, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => router.push('/(business)/edit-profile' as never)}>
              <Text style={[styles.emptyFieldText, { color: C.textSecondary }]}>{t('profile.addWebsite')}</Text>
            </Pressable>
          )}

          {/* Industries */}
          {(profile?.categories.length ?? 0) > 0 ? (
            <View style={[styles.infoCard, { backgroundColor: C.surface }]}>
              <View style={styles.infoHeader}>
                <Ionicons name="pricetag" size={16} color={C.brinjal1} />
                <Text style={[styles.infoTitle, { color: C.text }]}>{t('profile.industries')}</Text>
                <View style={{ flex: 1 }} />
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => router.push('/(business)/edit-categories' as never)} hitSlop={8}>
                  <Text style={[styles.infoManage, { color: C.brinjal1 }]}>{t('profile.manage')}</Text>
                </Pressable>
              </View>
              <View style={styles.categoriesWrap}>
                {profile!.categories.map((cat) => {
                  const meta = getCategoryMeta(allCategories, cat);
                  return (
                    <View key={cat} style={[styles.categoryChip, { backgroundColor: meta.bg }]}>
                      <FontAwesome5 name={meta.icon} size={11} color={meta.color} />
                      <Text style={[styles.categoryChipText, { color: meta.color }]}>{cat}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[styles.emptyField, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => router.push('/(business)/edit-categories' as never)}>
              <Text style={[styles.emptyFieldText, { color: C.textSecondary }]}>{t('profile.addCategories')}</Text>
            </Pressable>
          )}

          {/* Quick actions */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navBar:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1 },
  navTitle:         { flex: 1, fontSize: 15, textAlign: 'center', fontFamily: F.bold },

  cameraBadge:      { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },

  hero:             { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 32, overflow: 'hidden' },
  heroBubble1:      { position: 'absolute', width: 220, height: 220, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.07)', top: -70, right: -50 },
  heroBubble2:      { position: 'absolute', width: 140, height: 140, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -30, left: -30 },
  heroInner:        { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  heroMeta:         { flex: 1, paddingTop: 4 },
  heroNameRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  heroName:         { fontSize: 20, color: '#fff', lineHeight: 28, marginBottom: 6, fontFamily: F.bold, flexShrink: 1 },
  heroLocationRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  heroLocation:     { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontFamily: F.medium, flexShrink: 1 },
  heroStats:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroStat:         { alignItems: 'center' },
  heroStatValue:    { fontSize: 16, color: '#fff', fontFamily: F.bold },
  heroStatLabel:    { fontSize: 10, textTransform: 'uppercase', marginTop: 1, color: 'rgba(255,255,255,0.75)', fontFamily: F.semibold },
  heroStatDivider:  { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.25)' },

  body:             { padding: 16, gap: 12 },
  editCta:          { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, padding: 14, gap: 12, borderWidth: 1, ...SHADOW.card },
  editCtaText:      { flex: 1 },
  editCtaTitle:     { fontSize: 14, fontFamily: F.bold },
  editCtaSub:       { fontSize: 12, marginTop: 2, fontFamily: F.regular },

  infoCard:         { borderRadius: RADIUS.lg, padding: 16, gap: 10, ...SHADOW.card },
  infoHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoTitle:        { fontSize: 14, fontFamily: F.bold },
  infoManage:       { fontSize: 13, fontFamily: F.bold },
  aboutText:        { fontSize: 14, lineHeight: 22, fontFamily: F.regular },
  contactRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactText:      { fontSize: 14, fontFamily: F.regular },

  emptyField:       { borderRadius: RADIUS.md, borderWidth: 1.5, borderStyle: 'dashed', padding: 16, alignItems: 'center' },
  emptyFieldText:   { fontSize: 13, fontFamily: F.medium },

  websiteCard:      { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, padding: 14, gap: 12, borderWidth: 1, ...SHADOW.card },
  websiteIconBox:   { width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  websiteTextWrap:  { flex: 1 },
  websiteLabel:     { fontSize: 10, textTransform: 'uppercase', marginBottom: 2, fontFamily: F.bold },
  websiteUrl:       { fontSize: 13, fontFamily: F.semibold },

  categoriesWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  categoryChipText: { fontSize: 12, fontFamily: F.bold },

  sectionDivider:   { height: 1, marginVertical: 4 },
  quickRow:         { flexDirection: 'row', gap: 10 },
  quickBtn:         { flex: 1, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', gap: 6, ...SHADOW.card },
  quickLabel:       { fontSize: 11, fontFamily: F.semibold },
});
