import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { profileService, type Category } from '@/services/profile';
import { categoryService } from '@/services/category';
import { PlacesAutocompleteInput } from '@/components/PlacesAutocompleteInput';
import { F } from '@/utilities/constants';

function generateBusinessDescription(name: string, cats: string[]): string {
  if (cats.length === 0) return '';
  const catStr = cats.length === 1
    ? cats[0]
    : cats.slice(0, -1).join(', ') + ' and ' + cats[cats.length - 1];
  const catLower = catStr.toLowerCase();
  const brandName = name.trim() || 'We';
  return `${brandName} is a ${catStr} brand passionate about delivering quality products and experiences that make a real difference for our customers.\n\nWe love partnering with creators who share our values and help us connect with the right audience through authentic, engaging content. If you create content around ${catLower}, we would love to collaborate with you!`;
}

export default function EditBusinessProfileScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();

  const [loading, setLoading]                   = useState(true);
  const [saving, setSaving]                     = useState(false);
  const [businessName, setBusinessName]         = useState('');
  const [description, setDescription]           = useState('');
  const [descriptionManuallyEdited, setDescriptionManuallyEdited] = useState(false);
  const [website, setWebsite]                   = useState('');
  const [location, setLocation]                 = useState('');
  const [categories, setCategories]             = useState<string[]>([]);
  const [allCategories, setAllCategories]       = useState<Category[]>([]);

  useEffect(() => {
    Promise.all([
      profileService.getBusinessProfile(),
      categoryService.getCategories('BUSINESS'),
    ])
      .then(([profile, apiCats]) => {
        const cats: Category[] = apiCats.map((c) => ({ emoji: c.icon, label: c.name }));
        setBusinessName(profile.businessName ?? '');
        setDescription(profile.description ?? '');
        setWebsite(profile.website ?? '');
        setLocation(profile.location ?? '');
        setCategories(profile.categories ?? []);
        setAllCategories(cats);
      })
      .catch(() => toast.error(t('profile.editBusiness.loadError')))
      .finally(() => setLoading(false));
  }, []);

  function toggleCategory(cat: string) {
    setCategories((prev) => {
      const next = prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat];
      if (!descriptionManuallyEdited && !description.trim()) {
        setDescription(generateBusinessDescription(businessName, next));
      }
      return next;
    });
  }

  function handleRegenerateDescription() {
    setDescription(generateBusinessDescription(businessName, categories));
    setDescriptionManuallyEdited(false);
  }

  async function handleSave() {
    if (!businessName.trim() || businessName.trim().length < 2) {
      toast.warning(t('profile.editBusiness.nameMinLengthWarning'));
      return;
    }
    setSaving(true);
    try {
      await profileService.updateBusinessProfile({
        businessName: businessName.trim(),
        description:  description.trim() || undefined,
        website:      website.trim() || undefined,
        location:     location.trim() || null,
        categories,
      });
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
      <LinearGradient colors={['#1e1b4b', '#4338ca', '#7c3aed']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.gradientTopBar}>
        <View style={styles.topBar}>
          <BackButton fallback="/(business)/profile" />
          <Text style={[styles.topTitle, { color: '#fff' }]}>{t('profile.editBusiness.headerTitle')}</Text>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">

        {/* ── Business Info ── */}
        <Text style={[styles.sectionHeader, { color: C.textSecondary }]}>{t('profile.editBusiness.sectionBizInfo')}</Text>
        <View style={[styles.card, { backgroundColor: C.surface }]}>

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textSecondary }]}>{t('profile.editBusiness.nameLabel')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder={t('profile.editBusiness.namePlaceholder')}
              placeholderTextColor={C.textSecondary}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: C.border }]} />

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: C.textSecondary }]}>{t('profile.editBusiness.descriptionLabel')}</Text>
              {categories.length > 0 && (
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={handleRegenerateDescription} style={[styles.regenerateBtn, { backgroundColor: C.primaryLight }]}>
                  <Text style={[styles.regenerateBtnText, { color: C.brinjal1 }]}>{t('profile.editBusiness.regenerateBtn')}</Text>
                </Pressable>
              )}
            </View>
            <TextInput
              style={[styles.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
              value={description}
              onChangeText={(t) => { setDescription(t.slice(0, 600)); setDescriptionManuallyEdited(true); }}
              placeholder={t('profile.editBusiness.descriptionPlaceholder')}
              placeholderTextColor={C.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, { color: C.textSecondary }]}>{t('profile.editBusiness.charCount', { n: description.length })}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: C.border }]} />

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textSecondary }]}>{t('profile.editBusiness.websiteLabel')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
              value={website}
              onChangeText={setWebsite}
              placeholder={t('profile.editBusiness.websitePlaceholder')}
              placeholderTextColor={C.textSecondary}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: C.border }]} />

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textSecondary }]}>{t('profile.editBusiness.locationLabel')}</Text>
            <PlacesAutocompleteInput
              value={location}
              onChangeText={setLocation}
              placeholder={t('profile.editBusiness.locationPlaceholder')}
              types="geocode"
              autoCorrect={false}
            />
          </View>

        </View>

        {/* ── Industry Categories ── */}
        <Text style={[styles.sectionHeader, { color: C.textSecondary }]}>{t('profile.editBusiness.sectionCategories')}</Text>
        <View style={[styles.card, { backgroundColor: C.surface }]}>
          <View style={styles.field}>
            <Text style={[styles.subHint, { color: C.textSecondary }]}>
              {t('profile.editBusiness.categoriesHint')}
            </Text>
            <View style={styles.chipGrid}>
              {allCategories.map(({ emoji, label }) => {
                const selected = categories.includes(label);
                return (
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                    key={label}
                    style={[
                      styles.chip,
                      selected
                        ? { backgroundColor: C.brinjal1 }
                        : { backgroundColor: C.background, borderColor: C.border, borderWidth: 1.5 },
                    ]}
                    onPress={() => toggleCategory(label)}>
                    <Text style={[styles.chipText, { color: selected ? '#fff' : C.text }]}>{emoji} {label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Save ── */}
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          style={[styles.saveBtn, { backgroundColor: saving ? C.border : C.brinjal1 }]}
          onPress={handleSave}
          disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>{t('profile.editBusiness.saveBtn')}</Text>}
        </Pressable>

        <View style={{ height: 32 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gradientTopBar: { overflow: 'hidden', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  topBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  topTitle:      { fontSize: 20, fontFamily: F.bold, lineHeight: 24 },
  content:       { paddingBottom: 24 },
  sectionHeader: { fontSize: 11, letterSpacing: 0, marginTop: 20, marginBottom: 6, marginHorizontal: 20, fontFamily: F.bold },
  card:          { marginHorizontal: 16, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2, overflow: 'hidden' },
  field:         { padding: 16, gap: 8 },
  divider:       { height: 1 },
  label:         { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: F.bold },
  labelRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  regenerateBtn: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  regenerateBtnText: { fontSize: 11, fontFamily: F.semibold },
  subHint:       { fontSize: 12, lineHeight: 18, fontFamily: F.regular },
  input:         { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: F.regular },
  textarea:      { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 100, fontFamily: F.regular },
  charCount:     { fontSize: 11, textAlign: 'right', fontFamily: F.regular },
  suggestBox:    { borderRadius: 10, borderWidth: 1.5, marginTop: 4, overflow: 'hidden' },
  suggestItem:   { paddingHorizontal: 12, paddingVertical: 11 },
  suggestText:   { fontSize: 13, fontFamily: F.regular },
  chipGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip:          { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  chipText:      { fontSize: 13, fontFamily: F.semibold },
  saveBtn:       { marginHorizontal: 16, marginTop: 20, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText:   { fontSize: 15, color: '#fff', fontFamily: F.bold },
});
