import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppColors } from '@/context/ThemeContext';
import { authService } from '@/services/auth';
import { profileService } from '@/services/profile';
import { F } from '@/utilities/constants';

const CATEGORIES = [
  { emoji: '🍔', label: 'Food' },
  { emoji: '✈️', label: 'Travel' },
  { emoji: '👗', label: 'Fashion' },
  { emoji: '💄', label: 'Beauty' },
  { emoji: '💪', label: 'Fitness' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '📱', label: 'Tech' },
  { emoji: '📚', label: 'Education' },
  { emoji: '🌟', label: 'Lifestyle' },
  { emoji: '🏠', label: 'Home & Living' },
  { emoji: '🌿', label: 'Wellness' },
  { emoji: '🎵', label: 'Music' },
  { emoji: '🎨', label: 'Art & Design' },
  { emoji: '🐾', label: 'Pets' },
  { emoji: '🧸', label: 'Parenting' },
  { emoji: '🚗', label: 'Automotive' },
  { emoji: '💰', label: 'Finance' },
  { emoji: '🌍', label: 'Sustainability' },
  { emoji: '📷', label: 'Photography' },
  { emoji: '🏋️', label: 'Sports' },
  { emoji: '🎬', label: 'Film & TV' },
  { emoji: '🧘', label: 'Mindfulness' },
  { emoji: '🍷', label: 'Food & Drink' },
  { emoji: '🎪', label: 'Entertainment' },
];

const TOTAL_STEPS = 2;

export default function OnboardingScreen() {
  const { updateUser } = useAuth();
  const C = useAppColors();
  const [step, setStep] = useState(1);

  // Step 1
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [step1Submitted, setStep1Submitted] = useState(false);
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1Error, setStep1Error] = useState('');

  // Step 2
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [step2Submitted, setStep2Submitted] = useState(false);
  const [step2Loading, setStep2Loading] = useState(false);
  const [step2Error, setStep2Error] = useState('');

  const scaleAnim  = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!finished) return;
    Animated.parallel([
      Animated.spring(scaleAnim,  { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    const id = setTimeout(goHome, 3000);
    return () => clearTimeout(id);
  }, [finished]);

  function toggleCategory(label: string) {
    setSelectedCategories((prev) => {
      if (prev.includes(label)) return prev.filter((c) => c !== label);
      if (prev.length >= 5) return prev;
      return [...prev, label];
    });
  }

  // ── Inline validation ──
  const usernameError = step2Submitted
    ? !username.trim() ? 'Username is required'
    : username.trim().length < 3 ? 'Must be at least 3 characters'
    : !/^[a-zA-Z0-9_]+$/.test(username.trim()) ? 'Only letters, numbers, and underscores'
    : undefined
    : undefined;

  const bioError   = step2Submitted && !bio.trim() ? 'Bio is required' : undefined;
  const cityError  = step2Submitted && !city.trim() ? 'City is required' : undefined;

  const step2Valid =
    username.trim().length >= 3 &&
    /^[a-zA-Z0-9_]+$/.test(username.trim()) &&
    bio.trim().length > 0 &&
    city.trim().length > 0;

  async function handleStep1Continue() {
    setStep1Submitted(true);
    if (selectedCategories.length === 0) return;

    setStep1Loading(true);
    setStep1Error('');
    try {
      await profileService.updateCreatorProfile({ categories: selectedCategories });
      setStep(2);
    } catch (e: any) {
      setStep1Error(e.message ?? 'Failed to save. Please try again.');
    } finally {
      setStep1Loading(false);
    }
  }

  async function handleStep2Finish() {
    setStep2Submitted(true);
    if (!step2Valid) return;

    setStep2Loading(true);
    setStep2Error('');
    try {
      await profileService.updateCreatorProfile({
        username: username.trim(),
        bio:      bio.trim(),
        location: city.trim(),
      });
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
    router.replace('/(creator)');
  }

  // ── Success screen ──
  if (finished) {
    return (
      <SafeAreaView style={[styles.successContainer, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <Animated.View style={[styles.successContent, { opacity: opacityAnim }]}>
          <Animated.View style={[styles.checkCircle, { backgroundColor: C.active, shadowColor: C.active, transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.checkMark}>✓</Text>
          </Animated.View>
          <Text style={[styles.successTitle, { color: C.text }]}>Profile Created! 🎉</Text>
          <Text style={[styles.successSub, { color: C.textSecondary }]}>
            You are ready to collaborate with businesses.{'\n'}Redirecting to home…
          </Text>
          <Pressable style={[styles.goHomeBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }]} onPress={goHome}>
            <Text style={styles.goHomeBtnText}>Let's Go!</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  const STEP_CONFIG = [
    { title: 'What do you create?', subtitle: 'Choose 1 to 5 categories. You can update this anytime.' },
    { title: 'About you', subtitle: 'Fill in your details so brands can discover you.' },
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
          <View style={styles.backBtn} />
        )}
        <View style={styles.progressRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[styles.progressSegment, { backgroundColor: i + 1 <= step ? C.brinjal1 : C.border }]} />
          ))}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Step header ── */}
      <View style={styles.stepHeader}>
        <Text style={[styles.stepNum, { color: C.brinjal1 }]}>Step {step} of {TOTAL_STEPS}</Text>
        <Text style={[styles.stepTitle, { color: C.text }]}>{title}</Text>
        <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>{subtitle}</Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* ────────── Step 1: Categories ────────── */}
        {step === 1 && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <View style={styles.selectionBadgeRow}>
              <View style={[styles.selectionBadge, { backgroundColor: selectedCategories.length > 0 ? C.primaryLight : C.border }]}>
                <Text style={[styles.selectionText, { color: selectedCategories.length > 0 ? C.brinjal1 : C.textSecondary }]}>
                  {selectedCategories.length} / 5 selected
                </Text>
              </View>
              {selectedCategories.length === 5 && (
                <Text style={[styles.maxReachedText, { color: C.error }]}>Max reached</Text>
              )}
            </View>

            {step1Submitted && selectedCategories.length === 0 && (
              <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorBannerText, { color: C.error }]}>
                  Please select at least 1 category to continue.
                </Text>
              </View>
            )}

            {step1Error ? (
              <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorBannerText, { color: C.error }]}>{step1Error}</Text>
              </View>
            ) : null}

            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat.label);
                const isDisabled = !isSelected && selectedCategories.length >= 5;
                return (
                  <Pressable
                    key={cat.label}
                    style={[
                      styles.categoryChip,
                      { borderColor: C.border, backgroundColor: C.surface },
                      isSelected && { borderColor: C.brinjal1, backgroundColor: C.primaryLight },
                      isDisabled && styles.categoryChipDisabled,
                    ]}
                    onPress={() => { if (!isDisabled) toggleCategory(cat.label); }}>
                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                    <Text style={[styles.categoryLabel, { color: isSelected ? C.brinjal1 : C.text }, isSelected && { fontWeight: '700' }]}>
                      {cat.label}
                    </Text>
                    {isSelected && <Text style={[styles.categoryCheck, { color: C.brinjal1 }]}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 },
                (selectedCategories.length === 0 || step1Loading) && styles.primaryBtnDisabled]}
              onPress={handleStep1Continue}
              disabled={step1Loading}>
              {step1Loading ? (
                <View style={styles.loadingRow}>
                  <View style={[styles.spinner, { borderTopColor: '#fff' }]} />
                  <Text style={styles.primaryBtnText}>Saving…</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>Continue</Text>
              )}
            </Pressable>

          </ScrollView>
        )}

        {/* ────────── Step 2: About you ────────── */}
        {step === 2 && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {step2Error ? (
              <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA', marginBottom: 16 }]}>
                <Text style={[styles.errorBannerText, { color: C.error }]}>{step2Error}</Text>
              </View>
            ) : null}

            <View style={styles.form}>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: C.text }]}>Username <Text style={{ color: C.error }}>*</Text></Text>
                <View style={[styles.usernameRow, { backgroundColor: C.surface, borderColor: usernameError ? C.error : C.border }]}>
                  <Text style={[styles.atSign, { color: C.brinjal1 }]}>@</Text>
                  <TextInput
                    style={[styles.usernameInput, { color: C.text }]}
                    value={username}
                    onChangeText={(t) => {
                      setStep2Error('');
                      setUsername(t.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20));
                    }}
                    placeholder="yourhandle"
                    placeholderTextColor={C.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={[styles.usernameLimit, { color: C.textSecondary }]}>{username.length}/20</Text>
                </View>
                {usernameError && <Text style={[styles.fieldError, { color: C.error }]}>{usernameError}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: C.text }]}>Bio <Text style={{ color: C.error }}>*</Text></Text>
                <TextInput
                  style={[styles.formInput, styles.formTextarea, { backgroundColor: C.surface, borderColor: bioError ? C.error : C.border, color: C.text }]}
                  value={bio}
                  onChangeText={(t) => setBio(t.slice(0, 250))}
                  placeholder="Tell brands what you create and what makes you unique..."
                  placeholderTextColor={C.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <View style={styles.charCountRow}>
                  {bioError && <Text style={[styles.fieldError, { color: C.error }]}>{bioError}</Text>}
                  <Text style={[styles.charCount, { color: bio.length >= 250 ? C.error : C.textSecondary }]}>
                    {bio.length} / 250
                  </Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: C.text }]}>City <Text style={{ color: C.error }}>*</Text></Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: C.surface, borderColor: cityError ? C.error : C.border, color: C.text }]}
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. Kathmandu"
                  placeholderTextColor={C.textSecondary}
                  autoCapitalize="words"
                />
                {cityError && <Text style={[styles.fieldError, { color: C.error }]}>{cityError}</Text>}
              </View>

            </View>

            <Pressable
              style={[styles.primaryBtn, styles.primaryBtnFinish, { backgroundColor: C.active, shadowColor: C.active },
                (step2Loading) && styles.primaryBtnDisabled]}
              onPress={handleStep2Finish}
              disabled={step2Loading}>
              {step2Loading ? (
                <View style={styles.loadingRow}>
                  <View style={[styles.spinner, { borderTopColor: '#fff' }]} />
                  <Text style={styles.primaryBtnText}>Saving…</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>Finish Setup  →</Text>
              )}
            </Pressable>
            <Text style={[styles.finishNote, { color: C.textSecondary }]}>All fields marked * are required.</Text>

          </ScrollView>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 26, lineHeight: 30 },
  progressRow: { flex: 1, flexDirection: 'row', gap: 6 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  stepHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 4 },
  stepNum: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontFamily: F.bold },
  stepTitle: { fontSize: 24, fontWeight: '800', fontFamily: F.extrabold },
  stepSubtitle: { fontSize: 14, lineHeight: 20, marginTop: 4, fontFamily: F.regular },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 48 },
  errorBanner: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
  errorBannerText: { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },
  selectionBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  selectionBadge: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  selectionText: { fontSize: 13, fontWeight: '700', fontFamily: F.bold },
  maxReachedText: { fontSize: 12, fontWeight: '600', fontFamily: F.semibold },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5 },
  categoryChipDisabled: { opacity: 0.35 },
  categoryEmoji: { fontSize: 16 },
  categoryLabel: { fontSize: 13, fontWeight: '500', fontFamily: F.medium },
  categoryCheck: { fontSize: 11, fontWeight: '800', fontFamily: F.extrabold },
  form: { gap: 16, marginBottom: 28 },
  formGroup: { gap: 6 },
  formLabel: { fontSize: 13, fontWeight: '700', fontFamily: F.bold },
  formInput: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: F.regular },
  formTextarea: { minHeight: 110, paddingTop: 12 },
  charCountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  charCount: { alignSelf: 'flex-end', fontSize: 11, fontFamily: F.regular },
  usernameRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14 },
  atSign: { fontSize: 16, fontWeight: '700', marginRight: 2, fontFamily: F.bold },
  usernameInput: { flex: 1, fontSize: 15, paddingVertical: 13, fontFamily: F.regular },
  usernameLimit: { fontSize: 11, fontFamily: F.regular },
  fieldError: { fontSize: 12, fontWeight: '500', fontFamily: F.medium },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spinner: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  primaryBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5, marginBottom: 12 },
  primaryBtnFinish: {},
  primaryBtnDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  finishNote: { textAlign: 'center', fontSize: 12, marginTop: 4, fontFamily: F.regular },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successContent: { alignItems: 'center', gap: 16 },
  checkCircle: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10, marginBottom: 8 },
  checkMark: { fontSize: 52, color: '#fff', fontWeight: '700', lineHeight: 62, fontFamily: F.bold },
  successTitle: { fontSize: 28, fontWeight: '800', fontFamily: F.extrabold },
  successSub: { fontSize: 15, textAlign: 'center', lineHeight: 24, fontFamily: F.regular },
  goHomeBtn: { marginTop: 16, borderRadius: 14, paddingHorizontal: 48, paddingVertical: 15, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  goHomeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: F.bold },
});
