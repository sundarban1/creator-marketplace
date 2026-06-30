import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { authService } from '@/services/auth';
import { profileService } from '@/services/profile';
import { F } from '@/utilities/constants';

const GOOGLE_PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? '';
type PlacePrediction = { place_id: string; description: string };

const BUSINESS_CATEGORIES = [
  { emoji: '🍔', label: 'Food & Beverage' },
  { emoji: '👗', label: 'Fashion & Apparel' },
  { emoji: '💄', label: 'Beauty & Cosmetics' },
  { emoji: '💪', label: 'Health & Fitness' },
  { emoji: '🏠', label: 'Home & Living' },
  { emoji: '📱', label: 'Technology' },
  { emoji: '🎓', label: 'Education' },
  { emoji: '✈️', label: 'Travel & Tourism' },
  { emoji: '🌿', label: 'Wellness' },
  { emoji: '🎮', label: 'Gaming & Entertainment' },
  { emoji: '🚗', label: 'Automotive' },
  { emoji: '💰', label: 'Finance & Banking' },
  { emoji: '🌍', label: 'Sustainability' },
  { emoji: '🏋️', label: 'Sports' },
  { emoji: '🍷', label: 'Food & Drink' },
  { emoji: '🎬', label: 'Media & Film' },
  { emoji: '🛒', label: 'E-commerce' },
  { emoji: '🏥', label: 'Healthcare' },
  { emoji: '🎨', label: 'Art & Design' },
  { emoji: '📷', label: 'Photography' },
];

const TOTAL_STEPS = 2;

export default function BusinessOnboardingScreen() {
  const { updateUser } = useAuth();
  const { t } = useLanguage();
  const C = useAppColors();
  const [step, setStep] = useState(1);

  // Step 1
  const [businessName, setBusinessName] = useState('');
  const [panNo, setPanNo] = useState('');
  const [location, setLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<PlacePrediction[]>([]);
  const locationDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1Error, setStep1Error] = useState('');
  const [step1Submitted, setStep1Submitted] = useState(false);

  // Step 2
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categorySubmitted, setCategorySubmitted] = useState(false);
  const [step2Loading, setStep2Loading] = useState(false);
  const [step2Error, setStep2Error] = useState('');

  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!finished) return;
    Animated.parallel([
      Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    const id = setTimeout(goHome, 3000);
    return () => clearTimeout(id);
  }, [finished]);

  function toggleCategory(label: string) {
    setSelectedCategories((prev) => {
      if (prev.includes(label)) return prev.filter((c) => c !== label);
      if (prev.length >= 3) return prev;
      return [...prev, label];
    });
  }

  function handleLocationChange(text: string) {
    setLocation(text);
    if (locationDebounce.current) clearTimeout(locationDebounce.current);
    if (!text.trim() || !GOOGLE_PLACES_KEY) { setLocationSuggestions([]); return; }
    locationDebounce.current = setTimeout(async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_PLACES_KEY}&language=en&types=geocode`;
        const res = await fetch(url);
        const json = await res.json();
        setLocationSuggestions(json.status === 'OK' ? json.predictions : []);
      } catch { setLocationSuggestions([]); }
    }, 350);
  }

  async function handleStep1Continue() {
    setStep1Submitted(true);
    if (!businessName.trim() || !location.trim()) return;
    setStep1Loading(true);
    setStep1Error('');
    try {
      await profileService.updateBusinessProfile({
        businessName: businessName.trim(),
        panNo: panNo.trim() || undefined,
        location: location.trim() || null,
      });
      updateUser({ name: businessName.trim() });
      setStep(2);
    } catch (e: any) {
      setStep1Error(e.message ?? 'Failed to save. Please try again.');
    } finally {
      setStep1Loading(false);
    }
  }

  async function handleFinish() {
    setCategorySubmitted(true);
    if (selectedCategories.length === 0) return;
    setStep2Loading(true);
    setStep2Error('');
    try {
      await profileService.updateBusinessProfile({ categories: selectedCategories });
      await authService.completeOnboarding();
      updateUser({ isFirstLogin: false });
      setFinished(true);
    } catch (e: any) {
      setStep2Error(e.message ?? 'Failed to save. Please try again.');
    } finally {
      setStep2Loading(false);
    }
  }

  function goHome() {
    router.replace('/(business)');
  }

  // ── Success screen ──
  if (finished) {
    return (
      <SafeAreaView style={[styles.successContainer, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <Animated.View style={[styles.successContent, { opacity: opacityAnim }]}>
          <Animated.View style={[styles.checkCircle, { backgroundColor: C.active, shadowColor: C.active, transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.checkMark}>✓</Text>
          </Animated.View>
          <Text style={[styles.successTitle, { color: C.text }]}>{t('businessOnboarding.successTitle')}</Text>
          <Text style={[styles.successSub, { color: C.textSecondary }]}>
            {t('businessOnboarding.successBody')}
          </Text>
          <Pressable style={[styles.goHomeBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }]} onPress={goHome}>
            <Text style={styles.goHomeBtnText}>{t('businessOnboarding.exploreBtn')}</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  const businessNameError = step1Submitted && !businessName.trim() ? t('businessOnboarding.nameRequired') : undefined;
  const locationError     = step1Submitted && !location.trim() ? 'Location is required' : undefined;

  const STEP_CONFIG = [
    { title: 'Tell us about your business', subtitle: 'Basic details that appear on your public profile.' },
    { title: 'What industry are you in?', subtitle: 'Select at least 1 and up to 3 categories that describe your business.' },
  ];
  const { title, subtitle } = STEP_CONFIG[step - 1];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        {step > 1 ? (
          <Pressable style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.border }]} onPress={() => setStep((s) => s - 1)}>
            <Text style={[styles.backArrow, { color: C.brinjal1 }]}>‹</Text>
          </Pressable>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}
        <View style={styles.progressRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[styles.progressSegment, { backgroundColor: i + 1 <= step ? C.brinjal1 : C.border }]} />
          ))}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Step header ── */}
      <View style={styles.stepHeader}>
        <Text style={[styles.stepNum, { color: C.brinjal1 }]}>Step {step} of {TOTAL_STEPS}</Text>
        <Text style={[styles.stepTitle, { color: C.text }]}>{title}</Text>
        <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>{subtitle}</Text>
      </View>

        {/* ────────── Step 1: Business basics ────────── */}
        {step === 1 && (
          <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>

            {step1Error ? (
              <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorBannerText, { color: C.error }]}>{step1Error}</Text>
              </View>
            ) : null}

            {/* Business Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.text, marginBottom: 8 }]}>
                Name <Text style={{ color: C.error }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.surface, borderColor: businessNameError ? C.error : C.border, color: C.text }]}
                value={businessName}
                onChangeText={(t) => { setStep1Error(''); setBusinessName(t); }}
                placeholder="e.g. Himalayan Trekking Co."
                placeholderTextColor={C.textSecondary}
                autoCapitalize="words"
              />
              {businessNameError ? (
                <Text style={[styles.fieldError, { color: C.error }]}>{businessNameError}</Text>
              ) : (
                <Text style={[styles.inputHint, { color: C.textSecondary }]}>
                  This will appear on your public profile and event listings.
                </Text>
              )}
            </View>

            {/* PAN No */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: C.text }]}>PAN No</Text>
                <Text style={[styles.optionalTag, { color: C.textSecondary }]}>Optional</Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
                value={panNo}
                onChangeText={setPanNo}
                placeholder="e.g. 123456789"
                placeholderTextColor={C.textSecondary}
                keyboardType="numeric"
                maxLength={20}
              />
              <Text style={[styles.inputHint, { color: C.textSecondary }]}>
                Your PAN helps verify your business with creators.
              </Text>
            </View>

            {/* Location */}
            <View style={[styles.fieldGroup, { zIndex: 10 }]}>
              <Text style={[styles.fieldLabel, { color: C.text, marginBottom: 8 }]}>
                Location <Text style={{ color: C.error }}>*</Text>
              </Text>
              <View>
                <TextInput
                  style={[styles.input, { backgroundColor: C.surface, borderColor: locationError ? C.error : C.border, color: C.text }]}
                  value={location}
                  onChangeText={handleLocationChange}
                  placeholder="e.g. Kathmandu, Thamel"
                  placeholderTextColor={C.textSecondary}
                />
                {locationSuggestions.length > 0 && (
                  <View style={[styles.suggestBox, { backgroundColor: C.surface, borderColor: C.border }]}>
                    {locationSuggestions.map((place, i) => (
                      <Pressable
                        key={place.place_id}
                        style={[styles.suggestItem, i < locationSuggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                        onPress={() => { setLocation(place.description); setLocationSuggestions([]); }}>
                        <Text style={styles.suggestPin}>📍</Text>
                        <Text style={[styles.suggestText, { color: C.text }]} numberOfLines={2}>{place.description}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
              {locationError ? (
                <Text style={[styles.fieldError, { color: C.error }]}>{locationError}</Text>
              ) : (
                <Text style={[styles.inputHint, { color: C.textSecondary }]}>
                  Creators will use this as a default location for your events.
                </Text>
              )}
            </View>

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, step1Loading && styles.primaryBtnDisabled]}
              onPress={handleStep1Continue}
              disabled={step1Loading}>
              {step1Loading ? (
                <View style={styles.loadingRow}>
                  <View style={[styles.spinner, { borderTopColor: '#fff' }]} />
                  <Text style={styles.primaryBtnText}>Saving…</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>Continue →</Text>
              )}
            </Pressable>

          </ScrollView>
        )}

        {/* ────────── Step 2: Business Category ────────── */}
        {step === 2 && (
          <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>

            {step2Error ? (
              <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorBannerText, { color: C.error }]}>{step2Error}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: C.text }]}>
                  Select Categories <Text style={{ color: C.error }}>*</Text>
                </Text>
                <View style={[styles.countBadge, { backgroundColor: selectedCategories.length > 0 ? C.primaryLight : C.border }]}>
                  <Text style={[styles.countBadgeText, { color: selectedCategories.length > 0 ? C.brinjal1 : C.textSecondary }]}>
                    {selectedCategories.length} / 3
                  </Text>
                </View>
              </View>
              {selectedCategories.length === 3 && (
                <View style={[styles.maxBanner, { backgroundColor: C.primaryLight }]}>
                  <Text style={[styles.maxBannerText, { color: C.brinjal1 }]}>✓ Max 3 categories selected</Text>
                </View>
              )}
              {categorySubmitted && selectedCategories.length === 0 && (
                <Text style={[styles.fieldError, { color: C.error, marginBottom: 8 }]}>Select at least one category</Text>
              )}
              <View style={styles.categoryGrid}>
                {BUSINESS_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.label);
                  const isDisabled = !isSelected && selectedCategories.length >= 3;
                  return (
                    <Pressable
                      key={cat.label}
                      style={[
                        styles.categoryChip,
                        { borderColor: C.border, backgroundColor: C.surface },
                        isSelected && { borderColor: C.brinjal1, backgroundColor: C.primaryLight },
                        isDisabled && styles.chipDisabled,
                      ]}
                      onPress={() => { if (!isDisabled) toggleCategory(cat.label); }}>
                      <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                      <Text style={[styles.chipLabel, { color: isSelected ? C.brinjal1 : C.text }, isSelected && { fontWeight: '700' }]}>
                        {cat.label}
                      </Text>
                      {isSelected && <Text style={[styles.chipCheck, { color: C.brinjal1 }]}>✓</Text>}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: C.active, shadowColor: C.active }, step2Loading && styles.primaryBtnDisabled]}
              onPress={handleFinish}
              disabled={step2Loading}>
              {step2Loading ? (
                <View style={styles.loadingRow}>
                  <View style={[styles.spinner, { borderTopColor: '#fff' }]} />
                  <Text style={styles.primaryBtnText}>Saving…</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>Complete Setup →</Text>
              )}
            </Pressable>
            <Text style={[styles.finishNote, { color: C.textSecondary }]}>At least 1 category is required</Text>

          </ScrollView>
        )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  backBtnPlaceholder: { width: 36, height: 36 },
  backArrow: { fontSize: 26, lineHeight: 30 },
  progressRow: { flex: 1, flexDirection: 'row', gap: 6 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  stepHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 4 },
  stepNum: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontFamily: F.bold },
  stepTitle: { fontSize: 24, fontWeight: '800', fontFamily: F.extrabold },
  stepSubtitle: { fontSize: 14, lineHeight: 20, marginTop: 4, fontFamily: F.regular },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 48 },
  errorBanner: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  errorBannerText: { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },
  fieldGroup: { marginBottom: 24 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  fieldLabel: { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  optionalTag: { fontSize: 12, fontWeight: '500', fontFamily: F.medium },
  fieldError: { fontSize: 12, fontWeight: '500', fontFamily: F.medium },
  input: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: F.regular },
  textarea: { minHeight: 120, paddingTop: 13, textAlignVertical: 'top' },
  inputHint: { fontSize: 11, marginTop: 5, fontFamily: F.regular },
  suggestBox: { borderRadius: 12, borderWidth: 1.5, marginTop: 6, overflow: 'hidden', elevation: 10 },
  suggestItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  suggestPin: { fontSize: 14 },
  suggestText: { fontSize: 13, flex: 1, fontFamily: F.regular },
  charRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  charCount: { fontSize: 11, alignSelf: 'flex-end', fontFamily: F.regular },
  countBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  countBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: F.bold },
  maxBanner: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
  maxBannerText: { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5 },
  chipDisabled: { opacity: 0.35 },
  chipEmoji: { fontSize: 15 },
  chipLabel: { fontSize: 13, fontWeight: '500', fontFamily: F.medium },
  chipCheck: { fontSize: 10, fontWeight: '800', fontFamily: F.extrabold },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spinner: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  primaryBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5, marginBottom: 12 },
  primaryBtnDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  finishNote: { textAlign: 'center', fontSize: 12, fontFamily: F.regular },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successContent: { alignItems: 'center', gap: 16 },
  checkCircle: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10, marginBottom: 8 },
  checkMark: { fontSize: 52, color: '#fff', fontWeight: '700', lineHeight: 62, fontFamily: F.bold },
  successTitle: { fontSize: 28, fontWeight: '800', fontFamily: F.extrabold },
  successSub: { fontSize: 15, textAlign: 'center', lineHeight: 24, fontFamily: F.regular },
  goHomeBtn: { marginTop: 16, borderRadius: 14, paddingHorizontal: 48, paddingVertical: 15, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  goHomeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: F.bold },
});
