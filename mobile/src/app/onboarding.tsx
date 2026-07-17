import { router } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { authService } from '@/services/auth';
import { creatorService } from '@/services/creator';
import { profileService } from '@/services/profile';
import { useCategories } from '@/hooks/useCategories';
import { PlacesAutocompleteInput } from '@/components/PlacesAutocompleteInput';
import { F, RADIUS, SHADOW } from '@/utilities/constants';

const TOTAL_STEPS = 2;
const GENDER_KEYS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'] as const;

function generateCreatorBio(categories: string[]): string {
  if (categories.length === 0) return '';
  const catStr = categories.length === 1
    ? categories[0]
    : categories.slice(0, -1).join(', ') + ' and ' + categories[categories.length - 1];
  return `I'm a ${catStr} content creator passionate about sharing authentic stories and engaging experiences. I love collaborating with brands that align with my values to create content that truly connects with audiences and drives meaningful results.`;
}

function generateUsernameCandidates(name: string): string[] {
  const clean = name.toLowerCase().replace(/[^a-z0-9 ]/gi, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return [];
  const out: string[] = [];
  if (parts.length >= 2) {
    out.push(`${parts[0]}_${parts[1]}`.slice(0, 20));
    out.push(`${parts[0]}${parts[1]}`.slice(0, 20));
    out.push(`${parts[0]}${parts[1][0]}`.slice(0, 20));
    out.push(`${parts[0][0]}${parts[1]}`.slice(0, 20));
  } else {
    out.push(parts[0].slice(0, 20));
    out.push(`the_${parts[0]}`.slice(0, 20));
    out.push(`${parts[0]}_official`.slice(0, 20));
  }
  const base = out[0] ?? parts[0];
  for (let n = 1; n <= 12; n++) out.push(`${base}${n}`.slice(0, 20));
  return [...new Set(out.filter(s => s.length >= 3 && /^[a-zA-Z0-9_]+$/.test(s)))];
}

// Checks candidates against the backend and returns the first `max` that aren't already taken.
async function resolveAvailableUsernames(name: string, max = 4): Promise<string[]> {
  const candidates = generateUsernameCandidates(name);
  const results = await Promise.all(
    candidates.map(async (candidate) => {
      try {
        return (await creatorService.isUsernameAvailable(candidate)) ? candidate : null;
      } catch {
        return null;
      }
    })
  );
  return results.filter((c): c is string => c !== null).slice(0, max);
}

export default function OnboardingScreen() {
  const { updateUser } = useAuth();
  const { t } = useLanguage();
  const C = useAppColors();
  const [step, setStep] = useState(1);

  // Step 1 — profile basics
  const [fullName,  setFullName]  = useState('');
  const [username,  setUsername]  = useState('');
  const [gender,    setGender]    = useState('');
  const [location, setLocation] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const usernameSuggestDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameSuggestRequestId = useRef(0);
  const [step1Submitted, setStep1Submitted] = useState(false);
  const [step1Loading,   setStep1Loading]   = useState(false);
  const [step1Error,     setStep1Error]     = useState('');
  const step1ScrollRef = useRef<ScrollView>(null);
  const locationFocusedRef = useRef(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Location sits at the bottom of the step-1 form, right above the submit
  // button. iOS already handles this correctly on its own — the ScrollView's
  // `automaticallyAdjustKeyboardInsets` (below) auto-scrolls a focused field
  // above the keyboard, and stacking a manual scrollToEnd on top of that was
  // exactly what caused the form to shoot up too far (both mechanisms
  // compensating for the same keyboard at once). So this effect is
  // Android-only: adjustResize shrinks the window when the keyboard opens but
  // never auto-scrolls a mid-form field into the new (shrunk) viewport, so
  // without this the field ends up hidden behind the keyboard there.
  //
  // `keyboardVisible` adds a small fixed buffer (not the full keyboard height —
  // that was the other source of the overshoot) so a short form has somewhere
  // to scroll to; scrollToEnd only fires once the keyboard has actually
  // finished resizing the window, so it lands correctly on the first try.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      if (locationFocusedRef.current) step1ScrollRef.current?.scrollToEnd({ animated: true });
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Step 2 — categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [step2Submitted, setStep2Submitted] = useState(false);
  const [step2Loading,   setStep2Loading]   = useState(false);
  const [step2Error,     setStep2Error]     = useState('');
  const { categories } = useCategories('CREATOR');

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

  // ── Step 1 validation ──
  const fullNameError = step1Submitted && !fullName.trim() ? t('onboarding.fullNameRequired') : undefined;
  const usernameError = step1Submitted
    ? !username.trim()                          ? t('onboarding.usernameRequired')
    : username.trim().length < 3               ? t('onboarding.usernameMinLength')
    : !/^[a-zA-Z0-9_]+$/.test(username.trim()) ? t('onboarding.usernamePattern')
    : undefined
    : undefined;
  const genderError   = step1Submitted && !gender ? t('onboarding.genderRequired') : undefined;
  const locationError = step1Submitted && !location.trim() ? t('onboarding.locationRequired') : undefined;

  const step1Valid =
    fullName.trim().length > 0 &&
    username.trim().length >= 3 &&
    /^[a-zA-Z0-9_]+$/.test(username.trim()) &&
    !!gender &&
    location.trim().length > 0;

  function handleFullNameChange(v: string) {
    setStep1Error('');
    setFullName(v);
    if (usernameSuggestDebounce.current) clearTimeout(usernameSuggestDebounce.current);
    if (!v.trim()) { setUsernameSuggestions([]); return; }
    const requestId = ++usernameSuggestRequestId.current;
    usernameSuggestDebounce.current = setTimeout(async () => {
      const available = await resolveAvailableUsernames(v);
      if (requestId === usernameSuggestRequestId.current) setUsernameSuggestions(available);
    }, 400);
  }

  function toggleCategory(label: string) {
    setSelectedCategories((prev) => {
      if (prev.includes(label)) return prev.filter((c) => c !== label);
      if (prev.length >= 5) return prev;
      return [...prev, label];
    });
  }

  function handleLocationChange(text: string) {
    setLocation(text);
    setStep1Error('');
  }

  async function handleStep1Continue() {
    setStep1Submitted(true);
    if (!step1Valid) return;
    setStep1Loading(true);
    setStep1Error('');
    try {
      await profileService.updateCreatorProfile({
        fullName: fullName.trim(),
        username: username.trim(),
        gender:   gender || undefined,
        location: location.trim(),
      });
      updateUser({ name: fullName.trim() });
      setStep(2);
    } catch (e: any) {
      setStep1Error(e.message ?? 'Failed to save. Please try again.');
    } finally {
      setStep1Loading(false);
    }
  }

  async function handleStep2Finish() {
    setStep2Submitted(true);
    if (selectedCategories.length === 0) return;
    setStep2Loading(true);
    setStep2Error('');
    try {
      const bio = generateCreatorBio(selectedCategories);
      await profileService.updateCreatorProfile({ categories: selectedCategories, bio });
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
            <Ionicons name="checkmark" size={52} color="#fff" />
          </Animated.View>
          <Text style={[styles.successTitle, { color: C.text }]}>{t('onboarding.successTitle')}</Text>
          <Text style={[styles.successSub, { color: C.textSecondary }]}>
            {t('onboarding.successBody')}
          </Text>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.goHomeBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }]} onPress={goHome}>
            <Text style={styles.goHomeBtnText}>{t('onboarding.successBtn')}</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  const STEP_CONFIG = [
    { title: t('onboarding.step1Title'), subtitle: t('onboarding.step1Subtitle') },
    { title: t('onboarding.step2Title'), subtitle: t('onboarding.step2Subtitle') },
  ];
  const { title, subtitle } = STEP_CONFIG[step - 1];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      {/* No `behavior` prop here — the step-1 ScrollView's `automaticallyAdjustKeyboardInsets`
          already handles iOS precisely on its own (auto-scrolls whichever field is focused
          just above the keyboard). Adding KeyboardAvoidingView's `padding` behavior on top of
          that double-compensates for the same keyboard — that's what was producing the gap
          between the Continue button and the keyboard. Android has no such prop; it relies on
          adjustResize (AndroidManifest) + the manual scrollToEnd effect above. */}
      <KeyboardAvoidingView style={styles.flex}>

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        {step > 1 ? (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} hitSlop={8} style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.border }]} onPress={() => setStep((s) => s - 1)}>
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
        <Text style={[styles.stepNum, { color: C.brinjal1 }]}>{t('onboarding.stepIndicator', { n: step, total: TOTAL_STEPS })}</Text>
        <Text style={[styles.stepTitle, { color: C.text }]}>{title}</Text>
        <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>{subtitle}</Text>
      </View>

        {/* ────────── Step 1: Profile basics ────────── */}
        {step === 1 && (
          <ScrollView ref={step1ScrollRef} style={styles.flex} contentContainerStyle={[styles.scrollContent, keyboardVisible && { paddingBottom: 24 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>

            {step1Error ? (
              <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorBannerText, { color: '#EF4444' }]}>{step1Error}</Text>
              </View>
            ) : null}

            <View style={styles.form}>

              {/* Full Name */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: C.text }]}>{t('onboarding.fullNameLabel')} <Text style={{ color: C.error }}>*</Text></Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: C.surface, borderColor: fullNameError ? C.error : C.border, color: C.text }]}
                  value={fullName}
                  onChangeText={handleFullNameChange}
                  onFocus={() => { locationFocusedRef.current = false; }}
                  placeholder={t('onboarding.fullNamePlaceholder')}
                  placeholderTextColor={C.textSecondary}
                  autoCapitalize="words"
                />
                {fullNameError && <Text style={[styles.fieldError, { color: C.error }]}>{fullNameError}</Text>}
              </View>

              {/* Username */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: C.text }]}>{t('onboarding.usernameLabel')} <Text style={{ color: C.error }}>*</Text></Text>
                <View style={[styles.usernameRow, { backgroundColor: C.surface, borderColor: usernameError ? C.error : C.border }]}>
                  <Text style={[styles.atSign, { color: C.brinjal1 }]}>@</Text>
                  <TextInput
                    style={[styles.usernameInput, { color: C.text }]}
                    value={username}
                    onChangeText={(v) => {
                      setStep1Error('');
                      setUsername(v.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20));
                    }}
                    onFocus={() => { locationFocusedRef.current = false; }}
                    placeholder={t('onboarding.usernamePlaceholder')}
                    placeholderTextColor={C.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={[styles.usernameLimit, { color: C.textSecondary }]}>{t('onboarding.usernameLimit', { n: username.length })}</Text>
                </View>
                {usernameError && <Text style={[styles.fieldError, { color: C.error }]}>{usernameError}</Text>}
                {!usernameError && <Text style={[styles.fieldHint, { color: C.textSecondary }]}>{t('onboarding.usernameHint')}</Text>}
                {usernameSuggestions.length > 0 && (
                  <View>
                    <Text style={[styles.suggestionLabel, { color: C.textSecondary }]}>{t('onboarding.usernameSuggestions')}</Text>
                    <View style={styles.suggestionRow}>
                      {usernameSuggestions.map((s) => (
                        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                          key={s}
                          style={[styles.suggestionChip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}
                          onPress={() => setUsername(s)}>
                          <Text style={[styles.suggestionChipText, { color: C.brinjal1 }]}>@{s}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Gender */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: C.text }]}>{t('onboarding.genderLabel')} <Text style={{ color: C.error }}>*</Text></Text>
                <View style={styles.genderRow}>
                  {GENDER_KEYS.map((g) => {
                    const selected = gender === g;
                    return (
                      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                        key={g}
                        style={[styles.genderChip, { borderColor: selected ? C.brinjal1 : genderError ? C.error : C.border, backgroundColor: selected ? C.primaryLight : C.surface }]}
                        onPress={() => { setGender(selected ? '' : g); setStep1Error(''); }}>
                        <Text style={[styles.genderChipText, { color: selected ? C.brinjal1 : C.text, fontFamily: selected ? F.bold : F.regular }]}>
                          {g === 'Male' ? t('onboarding.genderMale')
                            : g === 'Female' ? t('onboarding.genderFemale')
                            : g === 'Non-binary' ? t('onboarding.genderNonBinary')
                            : t('onboarding.genderPreferNot')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {genderError && <Text style={[styles.fieldError, { color: C.error }]}>{genderError}</Text>}
              </View>

              {/* Location */}
              <View style={[styles.formGroup, { zIndex: 10 }]}>
                <Text style={[styles.formLabel, { color: C.text }]}>{t('onboarding.locationLabel')} <Text style={{ color: C.error }}>*</Text></Text>
                <PlacesAutocompleteInput
                  value={location}
                  onChangeText={handleLocationChange}
                  placeholder={t('onboarding.locationPlaceholder')}
                  types="geocode"
                  autoCapitalize="words"
                  error={locationError}
                  onFocus={() => { locationFocusedRef.current = true; }}
                />
              </View>

            </View>

            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[styles.primaryBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 },
                (!step1Valid || step1Loading) && styles.primaryBtnDisabled]}
              onPress={handleStep1Continue}
              disabled={step1Loading}>
              {step1Loading ? (
                <View style={styles.loadingRow}>
                  <View style={[styles.spinner, { borderTopColor: '#fff' }]} />
                  <Text style={styles.primaryBtnText}>{t('onboarding.saving')}</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>{t('onboarding.continueBtn')}</Text>
              )}
            </Pressable>

          </ScrollView>
        )}

        {/* ────────── Step 2: Categories ────────── */}
        {step === 2 && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <View style={styles.selectionBadgeRow}>
              <View style={[styles.selectionBadge, { backgroundColor: selectedCategories.length > 0 ? C.primaryLight : C.border }]}>
                <Text style={[styles.selectionText, { color: selectedCategories.length > 0 ? C.brinjal1 : C.textSecondary }]}>
                  {t('onboarding.categorySelected', { n: selectedCategories.length })}
                </Text>
              </View>
              {selectedCategories.length === 5 && (
                <Text style={[styles.maxReachedText, { color: C.error }]}>{t('onboarding.maxReached')}</Text>
              )}
            </View>

            {step2Submitted && selectedCategories.length === 0 && (
              <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorBannerText, { color: '#EF4444' }]}>
                  {t('onboarding.categoryError')}
                </Text>
              </View>
            )}

            {step2Error ? (
              <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorBannerText, { color: '#EF4444' }]}>{step2Error}</Text>
              </View>
            ) : null}

            <View style={styles.categoryGrid}>
              {categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.name);
                const isDisabled = !isSelected && selectedCategories.length >= 5;
                return (
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      { borderColor: C.border, backgroundColor: C.surface },
                      isSelected && { borderColor: C.brinjal1, backgroundColor: C.primaryLight },
                      isDisabled && styles.categoryChipDisabled,
                    ]}
                    onPress={() => { if (!isDisabled) toggleCategory(cat.name); }}>
                    <FontAwesome5 name={cat.icon} size={16} color={isSelected ? cat.color : C.textSecondary} />
                    <Text style={[styles.categoryLabel, { color: isSelected ? C.brinjal1 : C.text }, isSelected && { fontWeight: '700' }]}>
                      {cat.name}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={16} color={C.brinjal1} />}
                  </Pressable>
                );
              })}
            </View>

            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[styles.primaryBtn, { backgroundColor: C.active, shadowColor: C.active },
                (selectedCategories.length === 0 || step2Loading) && styles.primaryBtnDisabled]}
              onPress={handleStep2Finish}
              disabled={step2Loading}>
              {step2Loading ? (
                <View style={styles.loadingRow}>
                  <View style={[styles.spinner, { borderTopColor: '#fff' }]} />
                  <Text style={styles.primaryBtnText}>{t('onboarding.saving')}</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>{t('onboarding.completeBtn')}</Text>
              )}
            </Pressable>

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
  backBtn: { width: 36, height: 36, borderRadius: RADIUS.full, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 26, lineHeight: 30 },
  progressRow: { flex: 1, flexDirection: 'row', gap: 6 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  stepHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 4 },
  stepNum: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontFamily: F.bold },
  stepTitle: { fontSize: 24, fontFamily: F.bold },
  stepSubtitle: { fontSize: 14, lineHeight: 20, marginTop: 4, fontFamily: F.regular },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 48 },
  errorBanner: { borderRadius: RADIUS.sm, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  errorBannerText: { fontSize: 13, fontFamily: F.semibold },

  form: { gap: 16, marginBottom: 28 },
  formGroup: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formLabel: { fontSize: 13, fontFamily: F.bold },
  optionalTag: { fontSize: 12, fontFamily: F.medium },
  formInput: { borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: F.regular },
  fieldError: { fontSize: 12, fontFamily: F.medium },
  fieldHint: { fontSize: 11, fontFamily: F.regular },

  usernameRow: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14 },
  atSign: { fontSize: 16, marginRight: 2, fontFamily: F.bold },
  usernameInput: { flex: 1, fontSize: 15, paddingVertical: 13, fontFamily: F.regular },
  usernameLimit: { fontSize: 11, fontFamily: F.regular },

  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genderChip: { borderRadius: RADIUS.sm, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 8 },
  genderChipText: { fontSize: 13 },

  suggestionLabel: { fontSize: 11, fontFamily: F.medium, marginTop: 8, marginBottom: 6 },
  suggestionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: { borderRadius: RADIUS.full, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6 },
  suggestionChipText: { fontSize: 13, fontFamily: F.semibold },

  selectionBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  selectionBadge: { alignSelf: 'flex-start', borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 5 },
  selectionText: { fontSize: 13, fontFamily: F.bold },
  maxReachedText: { fontSize: 12, fontFamily: F.semibold },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.sm, borderWidth: 1.5 },
  categoryChipDisabled: { opacity: 0.35 },
  categoryLabel: { fontSize: 13, fontFamily: F.medium },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spinner: { width: 16, height: 16, borderRadius: RADIUS.full, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  primaryBtn: { borderRadius: RADIUS.md, paddingVertical: 15, alignItems: 'center', ...SHADOW.raised, marginBottom: 12 },
  primaryBtnDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: F.bold },

  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successContent: { alignItems: 'center', gap: 16 },
  checkCircle: { width: 110, height: 110, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', ...SHADOW.floating, marginBottom: 8 },
  successTitle: { fontSize: 28, fontFamily: F.bold },
  successSub: { fontSize: 15, textAlign: 'center', lineHeight: 24, fontFamily: F.regular },
  goHomeBtn: { marginTop: 16, borderRadius: RADIUS.md, paddingHorizontal: 48, paddingVertical: 15, ...SHADOW.raised },
  goHomeBtnText: { color: '#fff', fontSize: 16, fontFamily: F.bold },
});
