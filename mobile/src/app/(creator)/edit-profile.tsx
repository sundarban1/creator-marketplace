import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BackButton } from '@/components/BackButton';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { creatorService } from '@/services/creator';
import { profileService, type Category } from '@/services/profile';
import { F } from '@/utilities/constants';

const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? '';

// ─── Types ────────────────────────────────────────────────────────────────────

type Prediction = {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
};

// ─── LocationSearchModal ──────────────────────────────────────────────────────

function LocationSearchModal({
  visible,
  initialValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  initialValue: string;
  onSelect: (address: string, lat: number, lng: number) => void;
  onClose: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setQuery(initialValue);
      setPredictions([]);
    }
  }, [visible, initialValue]);

  function handleChangeText(text: string) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setPredictions([]); return; }
    debounceRef.current = setTimeout(() => fetchPredictions(text), 350);
  }

  async function fetchPredictions(text: string) {
    if (!PLACES_KEY) { setPredictions([]); return; }
    setSearching(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${PLACES_KEY}&language=en`;
      const res = await fetch(url);
      const data = (await res.json()) as { predictions: Prediction[]; status: string };
      setPredictions(data.status === 'OK' ? data.predictions : []);
    } catch {
      setPredictions([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleSelectPrediction(prediction: Prediction) {
    if (!PLACES_KEY) {
      onSelect(prediction.description, 0, 0);
      return;
    }
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address&key=${PLACES_KEY}`;
      const res = await fetch(url);
      const data = (await res.json()) as {
        result: { geometry: { location: { lat: number; lng: number } }; formatted_address: string };
        status: string;
      };
      if (data.status === 'OK') {
        onSelect(
          data.result.formatted_address,
          data.result.geometry.location.lat,
          data.result.geometry.location.lng,
        );
      } else {
        onSelect(prediction.description, 0, 0);
      }
    } catch {
      onSelect(prediction.description, 0, 0);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[lsm.container, { backgroundColor: C.background }]} edges={['top']}>
        <View style={[lsm.topBar, { borderBottomColor: C.border, backgroundColor: C.background }]}>
          <Pressable onPress={onClose}>
            <Text style={[lsm.cancelTxt, { color: C.brinjal1 }]}>{t('profile.editCreator.locationModalCancel')}</Text>
          </Pressable>
          <Text style={[lsm.title, { color: C.text }]}>{t('profile.editCreator.locationModalTitle')}</Text>
          <View style={{ width: 56 }} />
        </View>

        <View style={[lsm.inputRow, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <Ionicons name="search" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            style={[lsm.input, { color: C.text }]}
            value={query}
            onChangeText={handleChangeText}
            placeholder={t('profile.editCreator.locationModalPlaceholder')}
            placeholderTextColor={C.textSecondary}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searching && <ActivityIndicator size="small" color={C.brinjal1} style={{ marginRight: 12 }} />}
        </View>

        <FlatList
          data={predictions}
          keyExtractor={(item) => item.place_id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[lsm.row, { borderBottomColor: C.border }]}
              onPress={() => handleSelectPrediction(item)}>
              <Ionicons name="location" size={18} color="#9CA3AF" />
              <View style={lsm.rowText}>
                <Text style={[lsm.mainTxt, { color: C.text }]}>{item.structured_formatting.main_text}</Text>
                <Text style={[lsm.secTxt, { color: C.textSecondary }]} numberOfLines={1}>
                  {item.structured_formatting.secondary_text}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            query.trim() && !searching ? (
              <View style={lsm.empty}>
                <Text style={[lsm.emptyTxt, { color: C.textSecondary }]}>{t('profile.editCreator.locationModalNoResults')}</Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const lsm = StyleSheet.create({
  container:  { flex: 1 },
  topBar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  cancelTxt:  { fontSize: 15, fontWeight: '600' },
  title:      { fontSize: 16, fontWeight: '700' },
  inputRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: 1 },
  searchEmoji:{ fontSize: 16, marginRight: 8 },
  input:      { flex: 1, fontSize: 15, paddingVertical: 14 },
  banner:     { marginHorizontal: 16, marginTop: 10, borderRadius: 8, padding: 10 },
  bannerTxt:  { fontSize: 12, color: '#6B5000' },
  row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  pin:        { fontSize: 18, flexShrink: 0 },
  rowText:    { flex: 1, gap: 2 },
  mainTxt:    { fontSize: 14, fontWeight: '600' },
  secTxt:     { fontSize: 12 },
  empty:      { paddingVertical: 40, alignItems: 'center' },
  emptyTxt:   { fontSize: 14 },
});

// ─── EditProfileScreen ────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const { updateUser } = useAuth();
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  useEffect(() => {
    Promise.all([
      creatorService.getProfile(),
      profileService.getCategories(),
    ])
      .then(([profile, cats]) => {
        setFullName(profile.fullName ?? '');
        setBio(profile.bio ?? '');
        setLocation(profile.location ?? '');
        setLocationLat(profile.locationLat ?? null);
        setLocationLng(profile.locationLng ?? null);
        setCategories(profile.categories ?? []);
        setAllCategories(cats);
      })
      .catch(() => toast.error('Could not load profile. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  function handleLocationSelect(address: string, lat: number, lng: number) {
    setLocation(address);
    setLocationLat(lat || null);
    setLocationLng(lng || null);
    setLocationModalOpen(false);
  }

  async function handleSave() {
    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.warning('Full name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    try {
      const payload: Parameters<typeof creatorService.updateProfile>[0] = {
        fullName: fullName.trim(),
        bio: bio.trim() || undefined,
        categories,
      };
      if (location.trim()) {
        payload.location = location.trim();
        if (locationLat !== null) payload.locationLat = locationLat;
        if (locationLng !== null) payload.locationLng = locationLng;
      }
      const profile = await creatorService.updateProfile(payload);
      updateUser({ name: profile.fullName, avatar: profile.avatarUrl ?? undefined });
      toast.success('Profile saved successfully!');
      router.back();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.brinjal1} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient colors={['#312e81', '#4f46e5', '#8b5cf6']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.gradientTopBar}>
        <View style={styles.topBar}>
          <BackButton fallback="/(creator)/profile" />
          <Text style={[styles.topTitle, { color: '#fff' }]}>{t('profile.editCreator.headerTitle')}</Text>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">

        <Text style={[styles.sectionHeader, { color: C.textSecondary }]}>{t('profile.editCreator.sectionHeader')}</Text>
        <View style={[styles.card, { backgroundColor: C.surface }]}>

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textSecondary }]}>{t('profile.editCreator.fullNameLabel')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('profile.editCreator.fullNamePlaceholder')}
              placeholderTextColor={C.textSecondary}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: C.border }]} />

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textSecondary }]}>{t('profile.editCreator.bioLabel')}</Text>
            <TextInput
              style={[styles.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
              value={bio}
              onChangeText={(v) => setBio(v.slice(0, 500))}
              placeholder={t('profile.editCreator.bioPlaceholder')}
              placeholderTextColor={C.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, { color: C.textSecondary }]}>{bio.length}/500</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: C.border }]} />

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textSecondary }]}>LOCATION</Text>
            <Pressable
              style={[styles.locationBtn, { backgroundColor: C.background, borderColor: C.border }]}
              onPress={() => setLocationModalOpen(true)}>
              <Text style={[styles.locationBtnTxt, { color: location ? C.text : C.textSecondary }]} numberOfLines={2}>
                {location || 'Tap to search location…'}
              </Text>
              <Text style={styles.locationArrow}>›</Text>
            </Pressable>
            {location ? (
              <Pressable onPress={() => { setLocation(''); setLocationLat(null); setLocationLng(null); }}>
                <Text style={[styles.clearLocation, { color: C.error ?? '#EF4444' }]}>Clear location</Text>
              </Pressable>
            ) : null}
          </View>

        </View>

        {/* ── Content Categories ── */}
        {allCategories.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, { color: C.textSecondary }]}>{t('profile.editCreator.sectionCategories')}</Text>
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: C.textSecondary }]}>{t('profile.editCreator.categoriesHint')}</Text>
                <View style={styles.chipGrid}>
                  {allCategories.map(({ emoji, label }) => {
                    const selected = categories.includes(label);
                    return (
                      <Pressable
                        key={label}
                        style={[
                          styles.chip,
                          selected
                            ? { backgroundColor: '#4f46e5' }
                            : { backgroundColor: C.background, borderColor: C.border, borderWidth: 1.5 },
                        ]}
                        onPress={() =>
                          setCategories((prev) =>
                            prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label],
                          )
                        }>
                        <Text style={[styles.chipText, { color: selected ? '#fff' : C.text }]}>{emoji} {label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </>
        )}

        <Pressable
          style={[styles.saveBtn, { backgroundColor: saving ? C.border : C.brinjal1 }]}
          onPress={handleSave}
          disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Profile</Text>}
        </Pressable>

        <View style={{ height: 32 }} />
      </ScrollView>

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
  container:  { flex: 1 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gradientTopBar: { overflow: 'hidden', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  topBar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  topTitle:   { fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  content:    { paddingBottom: 24 },
  sectionHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 0, marginTop: 20, marginBottom: 6, marginHorizontal: 20, fontFamily: F.bold },
  card:       { marginHorizontal: 16, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2, overflow: 'hidden' },
  field:      { padding: 16, gap: 6 },
  divider:    { height: 1 },
  label:      { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: F.bold },
  input:      { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: F.regular },
  textarea:   { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 100, fontFamily: F.regular },
  charCount:  { fontSize: 11, textAlign: 'right', fontFamily: F.regular },
  locationBtn:    { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  locationBtnTxt: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: F.regular },
  locationArrow:  { fontSize: 20, color: '#9CA3AF' },
  clearLocation:  { fontSize: 12, fontWeight: '600', marginTop: 2, fontFamily: F.semibold },
  chipGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip:       { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  chipText:   { fontSize: 13, fontFamily: F.semibold },
  saveBtn:    { marginHorizontal: 16, marginTop: 20, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText:{ fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: F.bold },
});
