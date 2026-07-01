import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BackButton } from '@/components/BackButton';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { profileService, type BusinessProfile } from '@/services/profile';
import { campaignService } from '@/services/campaign';
import { F } from '@/utilities/constants';
import { pickAndUpload } from '@/utilities/uploadImage';

const CATEGORY_BG: Record<string, string> = {
  Fashion: '#F2DCF0', Beauty: '#DCF2E6', Tech: '#DCE6F2', Food: '#F2E6DC',
  Travel: '#F2F2DC', Fitness: '#DCF2EE', Gaming: '#E6DCF2', Education: '#FDEFD0',
  'Food & Beverage': '#F2E6DC', 'Fashion & Apparel': '#F2DCF0',
  'Beauty & Cosmetics': '#DCF2E6', 'Health & Fitness': '#DCF2EE',
};

function BusinessAvatar({ name, logoUrl, size = 88, uploading, onPress }: {
  name: string; logoUrl: string | null; size?: number;
  uploading?: boolean; onPress?: () => void;
}) {
  const C = useAppColors();
  const letter = (name?.[0] ?? '?').toUpperCase();
  const radius = size / 2;
  return (
    <Pressable onPress={onPress} disabled={uploading} style={{ position: 'relative' }}>
      <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', overflow: 'hidden' }}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={{ width: size, height: size, borderRadius: radius }} />
        ) : (
          <Text style={{ fontSize: size * 0.38, fontWeight: '800', color: '#fff' }}>{letter}</Text>
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
  const [profile, setProfile]               = useState<BusinessProfile | null>(null);
  const [activeCampaigns, setActiveCampaigns] = useState(0);
  const [loading, setLoading]               = useState(true);
  const [logoUploading, setLogoUploading]   = useState(false);

  async function handleLogoPress() {
    setLogoUploading(true);
    try {
      const url = await pickAndUpload('business-logo');
      if (url) {
        setProfile((p) => p ? { ...p, logoUrl: url } : p);
        updateUser({ avatar: url });
      }
    } catch {
      Alert.alert(t('profile.uploadFailed'), t('profile.uploadFailedSub'));
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
        <Pressable style={[styles.editNavBtn, { backgroundColor: C.primaryLight }]} onPress={() => router.push('/(business)/edit-profile' as never)}>
          <Text style={[styles.editNavText, { color: C.brinjal1 }]}>{t('common.edit')}</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── Hero ── */}
        <LinearGradient colors={['#1e1b4b', '#4338ca', '#7c3aed']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.hero}>
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
              <Text style={styles.heroName} numberOfLines={2}>{name}</Text>
              {profile?.isVerified && (
                <View style={styles.verifiedRow}>
                  <Text style={styles.verifiedText}>{t('profileExtra.verifiedBusiness')}</Text>
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
          <Pressable
            style={[styles.editCta, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 + '33' }]}
            onPress={() => router.push('/(business)/edit-profile' as never)}>
            <Ionicons name="create" size={22} color={C.brinjal1} />
            <View style={styles.editCtaText}>
              <Text style={[styles.editCtaTitle, { color: C.text }]}>{t('profile.editBusinessBtn')}</Text>
              <Text style={[styles.editCtaSub, { color: C.textSecondary }]}>{t('profile.editBusinessSub')}</Text>
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
            <Pressable
              style={[styles.emptyField, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => router.push('/(business)/edit-profile' as never)}>
              <Text style={[styles.emptyFieldText, { color: C.textSecondary }]}>{t('profile.addDescription')}</Text>
            </Pressable>
          )}

          {/* Email */}
          <View style={[styles.infoCard, { backgroundColor: C.surface }]}>
            <View style={styles.infoHeader}>
              <Ionicons name="mail" size={16} color={C.brinjal1} />
              <Text style={[styles.infoTitle, { color: C.text }]}>{t('profile.contact')}</Text>
            </View>
            <Text style={[styles.contactText, { color: C.text }]}>{profile?.user?.email ?? user?.email ?? '—'}</Text>
          </View>

          {/* Website */}
          {profile?.website ? (
            <Pressable
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
            <Pressable
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
              </View>
              <View style={styles.categoriesWrap}>
                {profile!.categories.map((cat) => (
                  <View key={cat} style={[styles.categoryChip, { backgroundColor: CATEGORY_BG[cat] ?? C.primaryLight }]}>
                    <Text style={[styles.categoryChipText, { color: C.text }]}>{cat}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Pressable
              style={[styles.emptyField, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => router.push('/(business)/edit-profile' as never)}>
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
  navTitle:         { flex: 1, fontSize: 15, fontWeight: '700', textAlign: 'center', fontFamily: F.bold },
  editNavBtn:       { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  editNavText:      { fontSize: 13, fontWeight: '700', fontFamily: F.bold },

  cameraBadge:      { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },

  hero:             { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 32, overflow: 'hidden' },
  heroBubble1:      { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.07)', top: -70, right: -50 },
  heroBubble2:      { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -30, left: -30 },
  heroInner:        { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  heroMeta:         { flex: 1, paddingTop: 4 },
  heroName:         { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 28, marginBottom: 6, fontFamily: F.extrabold },
  verifiedRow:      { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12 },
  verifiedText:     { fontSize: 11, fontWeight: '700', color: '#fff', fontFamily: F.bold },
  heroStats:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroStat:         { alignItems: 'center' },
  heroStatValue:    { fontSize: 18, fontWeight: '800', color: '#fff', fontFamily: F.extrabold },
  heroStatLabel:    { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginTop: 1, color: 'rgba(255,255,255,0.75)', fontFamily: F.semibold },
  heroStatDivider:  { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.25)' },

  body:             { padding: 16, gap: 12 },
  editCta:          { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, gap: 12, borderWidth: 1 },
  editCtaText:      { flex: 1 },
  editCtaTitle:     { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  editCtaSub:       { fontSize: 12, marginTop: 2, fontFamily: F.regular },

  infoCard:         { borderRadius: 16, padding: 16, gap: 10 },
  infoHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoTitle:        { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  aboutText:        { fontSize: 14, lineHeight: 22, fontFamily: F.regular },
  contactText:      { fontSize: 14, fontFamily: F.regular },

  emptyField:       { borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', padding: 16, alignItems: 'center' },
  emptyFieldText:   { fontSize: 13, fontWeight: '500', fontFamily: F.medium },

  websiteCard:      { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, gap: 12, borderWidth: 1 },
  websiteIconBox:   { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  websiteTextWrap:  { flex: 1 },
  websiteLabel:     { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2, fontFamily: F.bold },
  websiteUrl:       { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },

  categoriesWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip:     { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  categoryChipText: { fontSize: 12, fontWeight: '700', fontFamily: F.bold },

  sectionDivider:   { height: 1, marginVertical: 4 },
  quickRow:         { flexDirection: 'row', gap: 10 },
  quickBtn:         { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 6, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  quickLabel:       { fontSize: 11, fontWeight: '600', fontFamily: F.semibold },
});
