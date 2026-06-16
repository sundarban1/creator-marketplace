import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
import { useToast } from '@/components/Toast';
import { creatorService } from '@/services/creator';

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
            <Text style={[lsm.cancelTxt, { color: C.brinjal1 }]}>Cancel</Text>
          </Pressable>
          <Text style={[lsm.title, { color: C.text }]}>Search Location</Text>
          <View style={{ width: 56 }} />
        </View>

        <View style={[lsm.inputRow, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <Ionicons name="search" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            style={[lsm.input, { color: C.text }]}
            value={query}
            onChangeText={handleChangeText}
            placeholder="Type an address or city…"
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
                <Text style={[lsm.emptyTxt, { color: C.textSecondary }]}>No results found</Text>
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
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  useEffect(() => {
    creatorService
      .getProfile()
      .then((profile) => {
        setFullName(profile.fullName ?? '');
        setBio(profile.bio ?? '');
        setLocation(profile.location ?? '');
        setLocationLat(profile.locationLat ?? null);
        setLocationLng(profile.locationLng ?? null);
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
      <View style={[styles.topBar, { backgroundColor: C.background, borderBottomColor: C.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Ionicons name="chevron-back" size={20} color={C.brinjal1} />
        </Pressable>
        <Text style={[styles.topTitle, { color: C.text }]}>Edit Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">

        <Text style={[styles.sectionHeader, { color: C.textSecondary }]}>PROFILE INFO</Text>
        <View style={[styles.card, { backgroundColor: C.surface }]}>

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textSecondary }]}>FULL NAME *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor={C.textSecondary}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: C.border }]} />

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textSecondary }]}>BIO</Text>
            <TextInput
              style={[styles.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
              value={bio}
              onChangeText={(t) => setBio(t.slice(0, 500))}
              placeholder="Tell brands about yourself..."
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
  topBar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  backBtn:    { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  backArrow:  { fontSize: 26, lineHeight: 30 },
  topTitle:   { fontSize: 16, fontWeight: '700' },
  content:    { paddingBottom: 24 },
  sectionHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 20, marginBottom: 6, marginHorizontal: 20 },
  card:       { marginHorizontal: 16, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2, overflow: 'hidden' },
  field:      { padding: 16, gap: 6 },
  divider:    { height: 1 },
  label:      { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  input:      { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textarea:   { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 100 },
  charCount:  { fontSize: 11, textAlign: 'right' },
  locationBtn:    { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  locationBtnTxt: { flex: 1, fontSize: 14, lineHeight: 20 },
  locationArrow:  { fontSize: 20, color: '#9CA3AF' },
  clearLocation:  { fontSize: 12, fontWeight: '600', marginTop: 2 },
  saveBtn:    { marginHorizontal: 16, marginTop: 20, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText:{ fontSize: 15, fontWeight: '700', color: '#fff' },
});
