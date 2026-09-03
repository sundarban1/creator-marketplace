import { router } from 'expo-router';
import { BackButton } from '@/components/BackButton';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { profileService } from '@/services/profile';
import { LocationSearchModal } from '@/components/LocationSearchModal';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { LocationField } from '@/components/LocationField';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { isValidWebsiteUrl, normalizeWebsiteUrl } from '@/utilities/url';

function generateBusinessDescription(name: string, cats: string[]): string {
  if (cats.length === 0) return '';
  const catStr = cats.length === 1
    ? cats[0]
    : cats.slice(0, -1).join(', ') + ' and ' + cats[cats.length - 1];
  const catLower = catStr.toLowerCase();
  const brandName = name.trim() || 'We';
  return `${brandName} is a ${catStr} business passionate about delivering quality products and experiences that make a real difference for our customers.\n\nWe love partnering with creators who share our values and help us connect with the right audience through authentic, engaging content. If you create content around ${catLower}, we would love to collaborate with you!`;
}

export default function EditBusinessProfileScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const { updateUser } = useAuth();

  const [loading, setLoading]                   = useState(true);
  const [saving, setSaving]                     = useState(false);
  const [businessName, setBusinessName]         = useState('');
  const [nameError, setNameError]               = useState<string | undefined>(undefined);
  const [description, setDescription]           = useState('');
  const [descriptionManuallyEdited, setDescriptionManuallyEdited] = useState(false);
  const [website, setWebsite]                   = useState('');
  const [websiteError, setWebsiteError]         = useState<string | undefined>(undefined);
  const [locationError, setLocationError]       = useState<string | undefined>(undefined);
  const [location, setLocation]                 = useState('');
  const [locationLat, setLocationLat]           = useState<number | null>(null);
  const [locationLng, setLocationLng]           = useState<number | null>(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [categories, setCategories]             = useState<string[]>([]);

  useEffect(() => {
    profileService.getBusinessProfile()
      .then((profile) => {
        setBusinessName(profile.businessName ?? '');
        setDescription(profile.description ?? '');
        setWebsite(profile.website ?? '');
        setLocation(profile.location ?? '');
        setLocationLat(profile.locationLat ?? null);
        setLocationLng(profile.locationLng ?? null);
        setCategories(profile.categories ?? []);
      })
      .catch(() => toast.error(t('profile.editBusiness.loadError')))
      .finally(() => setLoading(false));
  }, []);

  function handleLocationSelect(address: string, lat: number, lng: number) {
    setLocation(address);
    setLocationLat(lat || null);
    setLocationLng(lng || null);
    setLocationError(undefined);
    setLocationModalOpen(false);
  }

  function handleRegenerateDescription() {
    setDescription(generateBusinessDescription(businessName, categories));
    setDescriptionManuallyEdited(false);
  }

  async function handleSave() {
    let hasError = false;
    if (!businessName.trim() || businessName.trim().length < 2) {
      setNameError(t('profile.editBusiness.nameMinLengthWarning'));
      hasError = true;
    }
    if (website.trim() && !isValidWebsiteUrl(website)) {
      setWebsiteError(t('profile.editBusiness.websiteInvalidWarning'));
      hasError = true;
    }
    if (!location.trim()) {
      setLocationError(t('profile.editBusiness.locationRequiredWarning'));
      hasError = true;
    }
    if (hasError) return;
    setSaving(true);
    try {
      // Always send location as a trio (or null-out the whole trio when
      // cleared) rather than location alone — sending the address text
      // without matching coordinates would leave stale coordinates behind
      // on the backend (an omitted key means "leave unchanged", not
      // "clear"), pairing a new/cleared address with an old, wrong pin.
      const trimmedLocation = location.trim();
      await profileService.updateBusinessProfile({
        businessName: businessName.trim(),
        description:  description.trim() || undefined,
        website:      normalizeWebsiteUrl(website) || undefined,
        location:     trimmedLocation || null,
        locationLat:  trimmedLocation ? locationLat : null,
        locationLng:  trimmedLocation ? locationLng : null,
        // Deliberately NOT sent — this screen has no UI for editing industries,
        // `categories` is only fetched locally to auto-generate the description
        // text (see handleRegenerateDescription). Sending it here would
        // silently revert whatever the dedicated Edit Industries screen most
        // recently saved back to this screen's stale mount-time snapshot.
      });
      // The saved name only lives in the backend profile record until this
      // syncs it into AuthContext — every screen that reads user.name
      // (home greeting, drawer, settings) would otherwise stay stuck on
      // whatever was typed during onboarding.
      updateUser({ name: businessName.trim() });
      toast.success(t('profile.editBusiness.saveSuccess'));
      router.back();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('profile.editBusiness.saveError'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
        <View style={styles.center}><ActivityIndicator size="large" color={C.brinjal1} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
      <View style={{ backgroundColor: C.surface }}>
        <View style={styles.topBar}>
          <BackButton fallback="/(business)/(tabs)/profile" />
          <Text style={[styles.topTitle, { color: C.text }]}>{t('profile.editBusiness.headerTitle')}</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={[styles.headerSeparator, { backgroundColor: C.border }]} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">

        {/* ── Business Info ── */}
        <Text style={[styles.sectionHeader, { color: C.textSecondary }]}>{t('profile.editBusiness.sectionBizInfo')}</Text>
        <View style={[styles.card, { backgroundColor: C.surface }]}>

          <View style={styles.field}>
            <TextInputWithLabel
              label={t('profile.editBusiness.nameLabel')}
              value={businessName}
              onChangeText={(txt) => { setBusinessName(txt); setNameError(undefined); }}
              placeholder={t('profile.editBusiness.namePlaceholder')}
              leftIcon="building"
              error={nameError}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: C.border }]} />

          <View style={styles.field}>
            <TextInputWithLabel
              label={t('profile.editBusiness.descriptionLabel')}
              rightSlot={categories.length > 0 ? (
                <Pressable onPress={handleRegenerateDescription} style={[styles.regenerateBtn, { backgroundColor: C.primaryLight }]}>
                  <Text style={[styles.regenerateBtnText, { color: C.brinjal1 }]}>{t('profile.editBusiness.regenerateBtn')}</Text>
                </Pressable>
              ) : undefined}
              value={description}
              onChangeText={(txt) => { setDescription(txt.slice(0, 600)); setDescriptionManuallyEdited(true); }}
              placeholder={t('profile.editBusiness.descriptionPlaceholder')}
              multiline
              numberOfLines={4}
            />
            <Text style={[styles.charCount, { color: C.textSecondary }]}>{t('profile.editBusiness.charCount', { n: description.length })}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: C.border }]} />

          <View style={styles.field}>
            <TextInputWithLabel
              label={t('profile.editBusiness.websiteLabel')}
              value={website}
              onChangeText={(txt) => { setWebsite(txt); setWebsiteError(undefined); }}
              onBlur={() => setWebsiteError(
                website.trim() && !isValidWebsiteUrl(website)
                  ? t('profile.editBusiness.websiteInvalidWarning')
                  : undefined,
              )}
              placeholder={t('profile.editBusiness.websitePlaceholder')}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon="globe"
              error={websiteError}
              hint={t('profile.editBusiness.websiteHint')}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: C.border }]} />

          <View style={styles.field}>
            <LocationField
              label={t('profile.editBusiness.locationLabel')}
              required
              hint={t('profile.editBusiness.locationHint')}
              error={locationError}
              value={location}
              placeholder={t('profile.editBusiness.locationPlaceholder')}
              onPress={() => setLocationModalOpen(true)}
              onClear={() => { setLocation(''); setLocationLat(null); setLocationLng(null); }}
              clearLabel={t('profile.editCreator.clearLocation')}
            />
          </View>

        </View>

        {/* ── Save ── */}
        <Pressable
          style={[
            styles.saveBtn,
            { backgroundColor: saving ? C.border : C.brinjal1 },
            !saving && { shadowColor: C.brinjal1, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
          ]}
          onPress={handleSave}
          disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>{t('profile.editBusiness.saveBtn')}</Text>}
        </Pressable>

        <View style={{ height: 32 }} />
      </ScrollView>
      </KeyboardAvoidingView>
      </MaxWidthContainer>

      <LocationSearchModal
        visible={locationModalOpen}
        initialValue={location}
        onSelect={handleLocationSelect}
        onClose={() => setLocationModalOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md },
  headerSeparator: { height: StyleSheet.hairlineWidth, marginHorizontal: SCREEN_GUTTER },
  topTitle:      { fontSize: 18, fontFamily: F.bold, lineHeight: 27 },
  content:       { paddingBottom: SPACING.xxxl },
  // marginHorizontal matches card/topBar/saveBtn's 16 below — this used to be
  // a stray 20, so the section label sat 4px further in than the card under it.
  sectionHeader: { fontSize: 11, letterSpacing: 0, marginTop: 20, marginBottom: 6, marginHorizontal: SCREEN_GUTTER, fontFamily: F.bold },
  card:          { marginHorizontal: SCREEN_GUTTER, borderRadius: RADIUS.md, ...SHADOW.card, overflow: 'hidden' },
  field:         { padding: 16, gap: 8 },
  divider:       { height: 1 },
  regenerateBtn: { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
  regenerateBtnText: { fontSize: 11, fontFamily: F.semibold },
  charCount:     { fontSize: 11, textAlign: 'right', fontFamily: F.regular },
  saveBtn:       { marginHorizontal: 16, marginTop: 20, borderRadius: RADIUS.full, paddingVertical: 14, alignItems: 'center' },
  saveBtnText:   { fontSize: 15, color: '#fff', fontFamily: F.bold },
});
