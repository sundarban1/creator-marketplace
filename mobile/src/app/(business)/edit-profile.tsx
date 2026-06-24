import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BackButton } from '@/components/BackButton';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useToast } from '@/components/Toast';
import { profileService } from '@/services/profile';
import { CREATOR_CATEGORIES } from '@/features/creator/data/filterOptions';
import { F } from '@/utilities/constants';

const GOOGLE_PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? '';
const ALL_CATEGORIES = CREATOR_CATEGORIES.map((c) => c.label);

type PlacePrediction = { place_id: string; description: string };

function PlacesInput({ value, onChange, colors }: {
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useAppColors>;
}) {
  const C = colors;
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(text: string) {
    onChange(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim() || !GOOGLE_PLACES_KEY) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_PLACES_KEY}&language=en&types=geocode`;
        const res = await fetch(url);
        const json = await res.json();
        setSuggestions((json.predictions ?? []).slice(0, 5));
      } catch { setSuggestions([]); }
    }, 350);
  }

  return (
    <View>
      <TextInput
        style={[styles.input, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
        value={value}
        onChangeText={handleChange}
        placeholder="Search for a location…"
        placeholderTextColor={C.textSecondary}
        autoCorrect={false}
      />
      {suggestions.length > 0 && (
        <View style={[styles.suggestBox, { backgroundColor: C.surface, borderColor: C.border }]}>
          {suggestions.map((s, i) => (
            <Pressable
              key={s.place_id}
              style={[styles.suggestItem, i < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
              onPress={() => { onChange(s.description); setSuggestions([]); }}>
              <Text style={[styles.suggestText, { color: C.text }]} numberOfLines={2}>{s.description}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

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
  const toast = useToast();

  const [loading, setLoading]                   = useState(true);
  const [saving, setSaving]                     = useState(false);
  const [businessName, setBusinessName]         = useState('');
  const [description, setDescription]           = useState('');
  const [descriptionManuallyEdited, setDescriptionManuallyEdited] = useState(false);
  const [website, setWebsite]                   = useState('');
  const [location, setLocation]                 = useState('');
  const [categories, setCategories]             = useState<string[]>([]);
  useEffect(() => {
    profileService.getBusinessProfile()
      .then((profile) => {
        setBusinessName(profile.businessName ?? '');
        setDescription(profile.description ?? '');
        setWebsite(profile.website ?? '');
        setLocation(profile.location ?? '');
        setCategories(profile.categories ?? []);
      })
      .catch(() => toast.error('Could not load profile.'))
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
      toast.warning('Business name must be at least 2 characters.');
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
      toast.success('Profile saved!');
      router.back();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile.');
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
      <LinearGradient colors={['#4F46E5', '#7C3AED', '#9333EA']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.gradientTopBar}>
        <View style={styles.topBar}>
          <BackButton fallback="/(business)/profile" />
          <Text style={[styles.topTitle, { color: '#fff' }]}>Edit Business Profile</Text>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">

        {/* ── Business Info ── */}
        <Text style={[styles.sectionHeader, { color: C.textSecondary }]}>BUSINESS INFO</Text>
        <View style={[styles.card, { backgroundColor: C.surface }]}>

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textSecondary }]}>BUSINESS NAME *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Your business name"
              placeholderTextColor={C.textSecondary}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: C.border }]} />

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: C.textSecondary }]}>DESCRIPTION</Text>
              {categories.length > 0 && (
                <Pressable onPress={handleRegenerateDescription} style={[styles.regenerateBtn, { backgroundColor: C.primaryLight }]}>
                  <Text style={[styles.regenerateBtnText, { color: C.brinjal1 }]}>✨ Regenerate</Text>
                </Pressable>
              )}
            </View>
            <TextInput
              style={[styles.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
              value={description}
              onChangeText={(t) => { setDescription(t.slice(0, 600)); setDescriptionManuallyEdited(true); }}
              placeholder="Select categories below to auto-generate a description…"
              placeholderTextColor={C.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, { color: C.textSecondary }]}>{description.length}/600</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: C.border }]} />

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textSecondary }]}>WEBSITE</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
              value={website}
              onChangeText={setWebsite}
              placeholder="https://yourwebsite.com"
              placeholderTextColor={C.textSecondary}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: C.border }]} />

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textSecondary }]}>LOCATION</Text>
            <PlacesInput value={location} onChange={setLocation} colors={C} />
          </View>

        </View>

        {/* ── Industry Categories ── */}
        <Text style={[styles.sectionHeader, { color: C.textSecondary }]}>INDUSTRY CATEGORIES</Text>
        <View style={[styles.card, { backgroundColor: C.surface }]}>
          <View style={styles.field}>
            <Text style={[styles.subHint, { color: C.textSecondary }]}>
              Select all that apply — creators can filter events by industry.
            </Text>
            <View style={styles.chipGrid}>
              {ALL_CATEGORIES.map((cat) => {
                const selected = categories.includes(cat);
                return (
                  <Pressable
                    key={cat}
                    style={[
                      styles.chip,
                      selected
                        ? { backgroundColor: C.brinjal1 }
                        : { backgroundColor: C.background, borderColor: C.border, borderWidth: 1.5 },
                    ]}
                    onPress={() => toggleCategory(cat)}>
                    <Text style={[styles.chipText, { color: selected ? '#fff' : C.text }]}>{cat}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Save ── */}
        <Pressable
          style={[styles.saveBtn, { backgroundColor: saving ? C.border : C.brinjal1 }]}
          onPress={handleSave}
          disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save Profile</Text>}
        </Pressable>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gradientTopBar: { overflow: 'hidden', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  topBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  topTitle:      { fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  content:       { paddingBottom: 24 },
  sectionHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 20, marginBottom: 6, marginHorizontal: 20, fontFamily: F.bold },
  card:          { marginHorizontal: 16, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2, overflow: 'hidden' },
  field:         { padding: 16, gap: 8 },
  divider:       { height: 1 },
  label:         { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: F.bold },
  labelRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  regenerateBtn: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  regenerateBtnText: { fontSize: 11, fontWeight: '600', fontFamily: F.semibold },
  subHint:       { fontSize: 12, lineHeight: 18, fontFamily: F.regular },
  input:         { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: F.regular },
  textarea:      { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 100, fontFamily: F.regular },
  charCount:     { fontSize: 11, textAlign: 'right', fontFamily: F.regular },
  suggestBox:    { borderRadius: 10, borderWidth: 1.5, marginTop: 4, overflow: 'hidden' },
  suggestItem:   { paddingHorizontal: 12, paddingVertical: 11 },
  suggestText:   { fontSize: 13, fontFamily: F.regular },
  chipGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip:          { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipText:      { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },
  saveBtn:       { marginHorizontal: 16, marginTop: 20, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText:   { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: F.bold },
});
