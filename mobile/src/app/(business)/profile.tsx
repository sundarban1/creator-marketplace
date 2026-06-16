import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { profileService, type BusinessProfile } from '@/services/profile';
import { campaignService } from '@/services/campaign';

const CATEGORY_BG: Record<string, string> = {
  Fashion: '#F2DCF0', Beauty: '#DCF2E6', Tech: '#DCE6F2', Food: '#F2E6DC',
  Travel: '#F2F2DC', Fitness: '#DCF2EE', Gaming: '#E6DCF2', Education: '#FDEFD0',
  'Food & Beverage': '#F2E6DC', 'Fashion & Apparel': '#F2DCF0',
  'Beauty & Cosmetics': '#DCF2E6', 'Health & Fitness': '#DCF2EE',
};

function BusinessAvatar({ name, logoUrl, size = 88 }: { name: string; logoUrl: string | null; size?: number }) {
  const C = useAppColors();
  const letter = (name?.[0] ?? '?').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '800', color: '#fff' }}>{letter}</Text>
    </View>
  );
}

export default function BusinessProfileScreen() {
  const { user } = useAuth();
  const C = useAppColors();
  const [profile, setProfile]             = useState<BusinessProfile | null>(null);
  const [activeCampaigns, setActiveCampaigns] = useState(0);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
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
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <View style={[styles.navBar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.push('/(business)/' as never)} style={styles.navBackBtn}>
            <Ionicons name="chevron-back" size={26} color={C.brinjal1} />
          </Pressable>
          <Text style={[styles.navTitle, { color: C.text }]}>Profile</Text>
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
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.push('/(business)/' as never)} style={styles.navBackBtn}>
          <Ionicons name="chevron-back" size={26} color={C.brinjal1} />
        </Pressable>
        <Text style={[styles.navTitle, { color: C.text }]} numberOfLines={1}>{name}</Text>
        <Pressable style={[styles.editNavBtn, { backgroundColor: C.primaryLight }]} onPress={() => router.push('/(business)/edit-profile' as never)}>
          <Text style={[styles.editNavText, { color: C.brinjal1 }]}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── Hero ── */}
        <View style={[styles.hero, { backgroundColor: C.brinjal1 }]}>
          <View style={styles.heroBubble1} />
          <View style={styles.heroBubble2} />
          <View style={styles.heroInner}>
            <BusinessAvatar name={name} logoUrl={profile?.logoUrl ?? null} size={88} />
            <View style={styles.heroMeta}>
              <Text style={styles.heroName} numberOfLines={2}>{name}</Text>
              {profile?.isVerified && (
                <View style={styles.verifiedRow}>
                  <Text style={styles.verifiedText}>✓ Verified Business</Text>
                </View>
              )}
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{activeCampaigns}</Text>
                  <Text style={styles.heroStatLabel}>Active</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{joinedYear}</Text>
                  <Text style={styles.heroStatLabel}>Joined</Text>
                </View>
                {(profile?.categories.length ?? 0) > 0 && (
                  <>
                    <View style={styles.heroStatDivider} />
                    <View style={styles.heroStat}>
                      <Text style={styles.heroStatValue}>{profile!.categories.length}</Text>
                      <Text style={styles.heroStatLabel}>Sectors</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* Edit Profile CTA */}
          <Pressable
            style={[styles.editCta, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 + '33' }]}
            onPress={() => router.push('/(business)/edit-profile' as never)}>
            <Ionicons name="create" size={22} color={C.brinjal1} />
            <View style={styles.editCtaText}>
              <Text style={[styles.editCtaTitle, { color: C.text }]}>Edit Business Profile</Text>
              <Text style={[styles.editCtaSub, { color: C.textSecondary }]}>Update name, description, website & categories</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={C.brinjal1} />
          </Pressable>

          {/* About */}
          {profile?.description ? (
            <View style={[styles.infoCard, { backgroundColor: C.surface }]}>
              <View style={styles.infoHeader}>
                <Ionicons name="document-text" size={16} color={C.brinjal1} />
                <Text style={[styles.infoTitle, { color: C.text }]}>About</Text>
              </View>
              <Text style={[styles.aboutText, { color: C.text }]}>{profile.description}</Text>
            </View>
          ) : (
            <Pressable
              style={[styles.emptyField, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => router.push('/(business)/edit-profile' as never)}>
              <Text style={[styles.emptyFieldText, { color: C.textSecondary }]}>+ Add a business description</Text>
            </Pressable>
          )}

          {/* Email */}
          <View style={[styles.infoCard, { backgroundColor: C.surface }]}>
            <View style={styles.infoHeader}>
              <Ionicons name="mail" size={16} color={C.brinjal1} />
              <Text style={[styles.infoTitle, { color: C.text }]}>Contact</Text>
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
                <Text style={[styles.websiteLabel, { color: C.textSecondary }]}>Website</Text>
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
              <Text style={[styles.emptyFieldText, { color: C.textSecondary }]}>+ Add website URL</Text>
            </Pressable>
          )}

          {/* Industries */}
          {(profile?.categories.length ?? 0) > 0 ? (
            <View style={[styles.infoCard, { backgroundColor: C.surface }]}>
              <View style={styles.infoHeader}>
                <Ionicons name="pricetag" size={16} color={C.brinjal1} />
                <Text style={[styles.infoTitle, { color: C.text }]}>Industries</Text>
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
              <Text style={[styles.emptyFieldText, { color: C.textSecondary }]}>+ Add industry categories</Text>
            </Pressable>
          )}

          {/* Quick actions */}
          <View style={[styles.sectionDivider, { backgroundColor: C.border }]} />
          <View style={styles.quickRow}>
            <Pressable style={[styles.quickBtn, { backgroundColor: C.surface }]} onPress={() => router.push('/create-campaign')}>
              <Ionicons name="megaphone" size={22} color={C.brinjal1} />
              <Text style={[styles.quickLabel, { color: C.text }]}>New Campaign</Text>
            </Pressable>
            <Pressable style={[styles.quickBtn, { backgroundColor: C.surface }]} onPress={() => router.push('/(business)/campaigns' as never)}>
              <Ionicons name="briefcase" size={22} color={C.brinjal1} />
              <Text style={[styles.quickLabel, { color: C.text }]}>Campaigns</Text>
            </Pressable>
            <Pressable style={[styles.quickBtn, { backgroundColor: C.surface }]} onPress={() => router.push('/(business)/settings' as never)}>
              <Ionicons name="settings" size={22} color={C.brinjal1} />
              <Text style={[styles.quickLabel, { color: C.text }]}>Settings</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navBar:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1 },
  navBackBtn:       { width: 44, height: 40, justifyContent: 'center', alignItems: 'center' },
  navTitle:         { flex: 1, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  editNavBtn:       { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  editNavText:      { fontSize: 13, fontWeight: '700' },

  hero:             { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 32, overflow: 'hidden' },
  heroBubble1:      { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.07)', top: -70, right: -50 },
  heroBubble2:      { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -30, left: -30 },
  heroInner:        { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  heroMeta:         { flex: 1, paddingTop: 4 },
  heroName:         { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 28, marginBottom: 6 },
  verifiedRow:      { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12 },
  verifiedText:     { fontSize: 11, fontWeight: '700', color: '#fff' },
  heroStats:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroStat:         { alignItems: 'center' },
  heroStatValue:    { fontSize: 18, fontWeight: '800', color: '#fff' },
  heroStatLabel:    { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginTop: 1, color: 'rgba(255,255,255,0.75)' },
  heroStatDivider:  { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.25)' },

  body:             { padding: 16, gap: 12 },
  editCta:          { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, gap: 12, borderWidth: 1 },
  editCtaText:      { flex: 1 },
  editCtaTitle:     { fontSize: 14, fontWeight: '700' },
  editCtaSub:       { fontSize: 12, marginTop: 2 },

  infoCard:         { borderRadius: 16, padding: 16, gap: 10 },
  infoHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoTitle:        { fontSize: 14, fontWeight: '700' },
  aboutText:        { fontSize: 14, lineHeight: 22 },
  contactText:      { fontSize: 14 },

  emptyField:       { borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', padding: 16, alignItems: 'center' },
  emptyFieldText:   { fontSize: 13, fontWeight: '500' },

  websiteCard:      { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, gap: 12, borderWidth: 1 },
  websiteIconBox:   { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  websiteTextWrap:  { flex: 1 },
  websiteLabel:     { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  websiteUrl:       { fontSize: 13, fontWeight: '600' },

  categoriesWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip:     { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  categoryChipText: { fontSize: 12, fontWeight: '700' },

  sectionDivider:   { height: 1, marginVertical: 4 },
  quickRow:         { flexDirection: 'row', gap: 10 },
  quickBtn:         { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 6, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  quickLabel:       { fontSize: 11, fontWeight: '600' },
});
