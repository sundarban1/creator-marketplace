import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { authService } from '@/services/auth';
import { creatorService } from '@/services/creator';
import { profileService } from '@/services/profile';
import { useCategories } from '@/hooks/useCategories';
import { LocationSearchModal } from '@/components/LocationSearchModal';
import { StepIndicator } from '@/components/StepIndicator';
import { GroupedCategoryPicker } from '@/components/GroupedCategoryPicker';
import { F, RADIUS, SHADOW } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';

// Three required steps, matching what's actually needed before a provider can
// use Kolab (how they operate, profile [name, username, email, location],
// services) — everything else (bio, photo, portfolio, social platforms,
// pricing, verification docs, ...) is collected progressively later via
// Settings/edit-profile/portfolio screens, not here.
const TOTAL_STEPS = 3;

const PROVIDER_TYPE_OPTIONS = [
  { key: 'INDIVIDUAL' as const, icon: 'user'     as const, titleKey: 'onboarding.providerTypeIndividualTitle', descKey: 'onboarding.providerTypeIndividualDesc' },
  { key: 'TEAM'       as const, icon: 'users'    as const, titleKey: 'onboarding.providerTypeTeamTitle',       descKey: 'onboarding.providerTypeTeamDesc' },
  { key: 'AGENCY'     as const, icon: 'building' as const, titleKey: 'onboarding.providerTypeAgencyTitle',     descKey: 'onboarding.providerTypeAgencyDesc' },
];

function generateCreatorBio(categories: string[]): string {
  if (categories.length === 0) return '';
  const catStr = categories.length === 1
    ? categories[0]
    : categories.slice(0, -1).join(', ') + ' and ' + categories[categories.length - 1];
  return `I'm a ${catStr} content creator passionate about sharing authentic stories and engaging experiences. I love collaborating with businesses that align with my values to create content that truly connects with audiences and drives meaningful results.`;
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com'];

export default function OnboardingScreen() {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const C = useAppColors();
  const [step, setStep] = useState(1);

  // Phone-signup accounts still hold a placeholder email and stay
  // isEmailVerified: false until they add a real one — collect it here.
  const needsEmail = !user?.isEmailVerified;

  // Step 1 — how they provide their services (Individual / Team / Agency)
  const [providerType, setProviderType] = useState<'INDIVIDUAL' | 'TEAM' | 'AGENCY' | null>(null);
  const [providerTypeSubmitted, setProviderTypeSubmitted] = useState(false);
  const [providerTypeLoading,   setProviderTypeLoading]   = useState(false);
  const [providerTypeError,     setProviderTypeError]     = useState('');

  // Step 2 — profile (name, username, email, location)
  const [fullName,  setFullName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailChecking,  setEmailChecking]  = useState(false);
  const emailCheckDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailCheckRequestId = useRef(0);
  const [username,  setUsername]  = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const usernameSuggestDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameSuggestRequestId = useRef(0);
  const [step1Submitted, setStep1Submitted] = useState(false);
  const [step1Loading,   setStep1Loading]   = useState(false);
  const [step1Error,     setStep1Error]     = useState('');
  const step1ScrollRef = useRef<ScrollView>(null);
  // Username and (for phone-signups) Email are the last text fields in the
  // profile form (step 2) — the Location picker below them doesn't open the
  // keyboard.
  const lastTextFieldFocusedRef = useRef(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Right above the submit button. iOS already handles this correctly on its
  // own — the ScrollView's `automaticallyAdjustKeyboardInsets` (below)
  // auto-scrolls a focused field above the keyboard, and stacking a manual
  // scrollToEnd on top of that was exactly what caused the form to shoot up
  // too far (both mechanisms compensating for the same keyboard at once). So
  // this effect is Android-only: adjustResize shrinks the window when the
  // keyboard opens but never auto-scrolls a mid-form field into the new
  // (shrunk) viewport, so without this the field ends up hidden behind the
  // keyboard there.
  //
  // `keyboardVisible` adds a small fixed buffer (not the full keyboard height —
  // that was the other source of the overshoot) so a short form has somewhere
  // to scroll to; scrollToEnd only fires once the keyboard has actually
  // finished resizing the window, so it lands correctly on the first try.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      if (lastTextFieldFocusedRef.current) step1ScrollRef.current?.scrollToEnd({ animated: true });
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Location — part of Step 2's profile form, below Email.
  const [location, setLocation] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  // Step 3 — services (categories); also the final step, so its Continue
  // button completes onboarding.
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [step2Submitted, setStep2Submitted] = useState(false);
  const [step2Loading,   setStep2Loading]   = useState(false);
  const [step2Error,     setStep2Error]     = useState('');
  // strict:true excludes BOTH-scope content-niche rows (e.g. "Hotels",
  // "Resorts", "Restaurants") that have no group/parent — wrong to mix into
  // this provider-type picker. See service-form.tsx for the same exclusion.
  const { categories } = useCategories('CREATOR', true);

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
  const emailError = !needsEmail || !step1Submitted ? undefined
    : !email.trim()                    ? t('onboarding.emailRequired')
    : !EMAIL_REGEX.test(email.trim())  ? t('onboarding.emailInvalid')
    : emailAvailable === false         ? t('onboarding.emailTaken')
    : undefined;
  const usernameError = step1Submitted
    ? !username.trim()                          ? t('onboarding.usernameRequired')
    : username.trim().length < 3               ? t('onboarding.usernameMinLength')
    : !/^[a-zA-Z0-9_]+$/.test(username.trim()) ? t('onboarding.usernamePattern')
    : undefined
    : undefined;

  const locationError = step1Submitted && !location.trim() ? t('onboarding.locationRequired') : undefined;

  const step1Valid =
    fullName.trim().length > 0 &&
    (!needsEmail || (email.trim().length > 0 && EMAIL_REGEX.test(email.trim()))) &&
    username.trim().length >= 3 &&
    /^[a-zA-Z0-9_]+$/.test(username.trim()) &&
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

  function handleEmailChange(v: string) {
    setStep1Error('');
    setEmail(v);
    setEmailAvailable(null);
    if (emailCheckDebounce.current) clearTimeout(emailCheckDebounce.current);
    const trimmed = v.trim();
    if (!EMAIL_REGEX.test(trimmed)) { setEmailChecking(false); return; }
    const requestId = ++emailCheckRequestId.current;
    setEmailChecking(true);
    emailCheckDebounce.current = setTimeout(async () => {
      try {
        const available = await authService.isEmailAvailable(trimmed);
        if (requestId === emailCheckRequestId.current) setEmailAvailable(available);
      } finally {
        if (requestId === emailCheckRequestId.current) setEmailChecking(false);
      }
    }, 400);
  }

  function toggleCategory(label: string) {
    setSelectedCategories((prev) => {
      if (prev.includes(label)) return prev.filter((c) => c !== label);
      if (prev.length >= 5) return prev;
      return [...prev, label];
    });
  }

  function handleLocationSelect(address: string, lat: number, lng: number) {
    setLocation(address);
    setLocationLat(lat || null);
    setLocationLng(lng || null);
    setLocationModalOpen(false);
    setStep1Error('');
  }

  async function handleProviderTypeContinue() {
    setProviderTypeSubmitted(true);
    if (!providerType) return;
    setProviderTypeLoading(true);
    setProviderTypeError('');
    try {
      await profileService.updateCreatorProfile({ providerType });
      setStep(2);
    } catch (e: any) {
      setProviderTypeError(e.message ?? 'Failed to save. Please try again.');
    } finally {
      setProviderTypeLoading(false);
    }
  }

  async function handleStep1Continue() {
    setStep1Submitted(true);
    if (!step1Valid) return;
    setStep1Loading(true);
    setStep1Error('');
    try {
      await profileService.updateCreatorProfile({
        fullName: fullName.trim(),
        email:    needsEmail ? email.trim() : undefined,
        username: username.trim(),
        location: location.trim(),
        locationLat: locationLat ?? undefined,
        locationLng: locationLng ?? undefined,
      });
      updateUser({ name: fullName.trim(), ...(needsEmail ? { email: email.trim() } : {}) });
      setStep(3);
    } catch (e: any) {
      setStep1Error(e.message ?? 'Failed to save. Please try again.');
    } finally {
      setStep1Loading(false);
    }
  }

  // Final step — categories submit also completes onboarding (Location moved
  // into Step 2 above, so there's no separate step after this one).
  async function handleStep2Continue() {
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
      <SafeAreaView style={[styles.successContainer, { backgroundColor: C.preLoginBackground }]} edges={['top', 'bottom']}>
        <Animated.View style={[styles.successContent, { opacity: opacityAnim }]}>
          <Animated.View style={[styles.checkCircle, { backgroundColor: C.active, shadowColor: C.active, transform: [{ scale: scaleAnim }] }]}>
            <FontAwesome5 name="check" solid size={52} color="#fff" />
          </Animated.View>
          <Text style={[styles.successTitle, { color: C.text }]}>{t('onboarding.successTitle')}</Text>
          <Text style={[styles.successSub, { color: C.textSecondary }]}>
            {t('onboarding.successBody')}
          </Text>
          <Pressable style={[styles.goHomeBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }]} onPress={goHome}>
            <Text style={styles.goHomeBtnText}>{t('onboarding.successBtn')}</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  const STEP_CONFIG = [
    { title: t('onboarding.providerTypeTitle'), subtitle: t('onboarding.providerTypeSubtitle') },
    { title: t('onboarding.step1Title'), subtitle: t('onboarding.step1Subtitle') },
    { title: t('onboarding.step2Title'), subtitle: t('onboarding.step2Subtitle') },
  ];
  const { title, subtitle } = STEP_CONFIG[step - 1];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.preLoginBackground }]} edges={['top']}>
      {/* No `behavior` prop here — the step-1 ScrollView's `automaticallyAdjustKeyboardInsets`
          already handles iOS precisely on its own (auto-scrolls whichever field is focused
          just above the keyboard). Adding KeyboardAvoidingView's `padding` behavior on top of
          that double-compensates for the same keyboard — that's what was producing the gap
          between the Continue button and the keyboard. Android has no such prop; it relies on
          adjustResize (AndroidManifest) + the manual scrollToEnd effect above. */}
      <KeyboardAvoidingView style={styles.flex}>
      <MaxWidthContainer>

      <StepIndicator
        step={step} total={TOTAL_STEPS}
        stepLabel={t('onboarding.stepIndicator', { n: step, total: TOTAL_STEPS })}
        title={title} subtitle={subtitle}
        onBack={() => setStep((s) => s - 1)}
      />

        {/* ────────── Step 1: How do you provide your services? (Individual/Team/Agency) ────────── */}
        {step === 1 && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {providerTypeSubmitted && !providerType && (
              <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorBannerText, { color: '#EF4444' }]}>{t('onboarding.providerTypeError')}</Text>
              </View>
            )}

            {providerTypeError ? (
              <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorBannerText, { color: '#EF4444' }]}>{providerTypeError}</Text>
              </View>
            ) : null}

            <View style={styles.choiceCards}>
              {PROVIDER_TYPE_OPTIONS.map((opt) => {
                const active = providerType === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => { setProviderType(opt.key); setProviderTypeError(''); }}
                    style={[styles.choiceCard, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.surface }]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}>
                    <View style={[styles.choiceIcon, { backgroundColor: active ? C.brinjal1 : C.primaryLight }]}>
                      <FontAwesome5 name={opt.icon} size={18} color={active ? '#fff' : C.brinjal1} solid />
                    </View>
                    <View style={styles.choiceText}>
                      <Text style={[styles.choiceTitle, { color: C.text }]}>{t(opt.titleKey)}</Text>
                      <Text style={[styles.choiceDesc, { color: C.textSecondary }]}>{t(opt.descKey)}</Text>
                    </View>
                    <FontAwesome5 name={active ? 'check-circle' : 'circle'} solid={active} size={20} color={active ? C.brinjal1 : C.border} />
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 },
                (!providerType || providerTypeLoading) && styles.primaryBtnDisabled]}
              onPress={handleProviderTypeContinue}
              disabled={providerTypeLoading}>
              {providerTypeLoading ? (
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

        {/* ────────── Step 2: Profile (name, username, email, location) ────────── */}
        {step === 2 && (
          <ScrollView ref={step1ScrollRef} style={styles.flex} contentContainerStyle={[styles.scrollContent, keyboardVisible && { paddingBottom: 24 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>

            {step1Error ? (
              <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorBannerText, { color: '#EF4444' }]}>{step1Error}</Text>
              </View>
            ) : null}

            <View style={styles.form}>

              {/* Full Name */}
              <TextInputWithLabel
                label={`${t('onboarding.fullNameLabel')} *`}
                leftIcon="user"
                value={fullName}
                onChangeText={handleFullNameChange}
                onFocus={() => { lastTextFieldFocusedRef.current = false; }}
                placeholder={t('onboarding.fullNamePlaceholder')}
                autoCapitalize="words"
                error={fullNameError}
              />

              {/* Username */}
              <View style={styles.formGroup}>
                <TextInputWithLabel
                  label={`${t('onboarding.usernameLabel')} *`}
                  leftIcon="at"
                  value={username}
                  onChangeText={(v) => {
                    setStep1Error('');
                    setUsername(v.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20));
                  }}
                  onFocus={() => { lastTextFieldFocusedRef.current = !needsEmail; }}
                  placeholder={t('onboarding.usernamePlaceholder')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={usernameError}
                  hint={t('onboarding.usernameHint')}
                  rightSlot={<Text style={[styles.usernameLimit, { color: C.textSecondary }]}>{t('onboarding.usernameLimit', { n: username.length })}</Text>}
                />
                {usernameSuggestions.length > 0 && (
                  <View>
                    <Text style={[styles.suggestionLabel, { color: C.textSecondary }]}>{t('onboarding.usernameSuggestions')}</Text>
                    <View style={styles.suggestionRow}>
                      {usernameSuggestions.map((s) => (
                        <Pressable
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

              {/* Email — only for phone-signup accounts, which start without a real one */}
              {needsEmail && (
                <View style={styles.formGroup}>
                  <TextInputWithLabel
                    label={`${t('onboarding.emailLabel')} *`}
                    leftIcon="envelope"
                    value={email}
                    onChangeText={handleEmailChange}
                    onFocus={() => { lastTextFieldFocusedRef.current = true; setEmailFocused(true); }}
                    onBlur={() => { setTimeout(() => setEmailFocused(false), 150); }}
                    placeholder={t('onboarding.emailPlaceholder')}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    error={emailError}
                    hint={emailChecking ? t('onboarding.emailChecking') : emailAvailable === true ? t('onboarding.emailAvailable') : undefined}
                  />
                  {emailFocused && (() => {
                    const atIndex = email.indexOf('@');
                    if (atIndex === -1) return null;
                    const localPart  = email.slice(0, atIndex);
                    const domainPart = email.slice(atIndex + 1);
                    if (domainPart.includes('.')) return null;
                    const suggestions = EMAIL_DOMAINS.filter((d) => d.startsWith(domainPart));
                    if (suggestions.length === 0) return null;
                    return (
                      <View style={[styles.domainSuggestBox, { backgroundColor: C.surface, borderColor: C.border }]}>
                        {suggestions.map((domain) => (
                          <Pressable
                            key={domain}
                            style={styles.domainSuggestItem}
                            onPress={() => handleEmailChange(`${localPart}@${domain}`)}>
                            <Text style={[styles.domainSuggestText, { color: C.textSecondary }]}>
                              {localPart}@<Text style={{ color: C.text, fontFamily: F.semibold }}>{domain}</Text>
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    );
                  })()}
                </View>
              )}

              {/* Location */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: C.text }]}>{t('onboarding.locationLabel')} <Text style={{ color: C.error }}>*</Text></Text>
                <Pressable
                  style={[styles.locationBtn, { backgroundColor: C.surface, borderColor: locationError ? C.error : C.border }]}
                  onPress={() => setLocationModalOpen(true)}>
                  <FontAwesome5 name="map-marker-alt" size={16} color={C.textSecondary} />
                  <Text style={[styles.locationBtnTxt, { color: location ? C.text : C.textSecondary }]} numberOfLines={2}>
                    {location || t('onboarding.locationPlaceholder')}
                  </Text>
                  <Text style={styles.locationArrow}>›</Text>
                </Pressable>
                {locationError && <Text style={[styles.fieldError, { color: C.error }]}>{locationError}</Text>}
              </View>

            </View>

            <Pressable
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

        {/* ────────── Step 3: Services (categories) — final step ────────── */}
        {step === 3 && (
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

            <View style={{ marginBottom: 28 }}>
              <GroupedCategoryPicker categories={categories} selected={selectedCategories} onToggle={toggleCategory} max={5} variant="pill" />
            </View>

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: C.active, shadowColor: C.active },
                (selectedCategories.length === 0 || step2Loading) && styles.primaryBtnDisabled]}
              onPress={handleStep2Continue}
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

        <LocationSearchModal
          visible={locationModalOpen}
          initialValue={location}
          onSelect={handleLocationSelect}
          onClose={() => setLocationModalOpen(false)}
        />

      </MaxWidthContainer>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 48 },
  errorBanner: { borderRadius: RADIUS.sm, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  errorBannerText: { fontSize: 13, fontFamily: F.semibold },

  // Step 1's Individual/Team/Agency picker — a row-card per option (icon,
  // title + description, trailing check) rather than the large square cards
  // on /account-type, since there are three of these instead of two.
  choiceCards: { gap: 12, marginBottom: 28 },
  choiceCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.lg, borderWidth: 1.5, padding: 14 },
  choiceIcon:  { width: 44, height: 44, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  choiceText:  { flex: 1, gap: 2 },
  choiceTitle: { fontSize: 15, fontFamily: F.bold },
  choiceDesc:  { fontSize: 12.5, fontFamily: F.regular, lineHeight: 19 },

  form: { gap: 16, marginBottom: 28 },
  formGroup: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formLabel: { fontSize: 13, fontFamily: F.bold },
  optionalTag: { fontSize: 12, fontFamily: F.medium },
  fieldError: { fontSize: 12, fontFamily: F.medium },

  locationBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, gap: 8 },
  locationBtnTxt: { flex: 1, fontSize: 15, lineHeight: 23, fontFamily: F.regular },
  locationArrow: { fontSize: 20, color: '#9CA3AF' },

  usernameLimit: { fontSize: 11, fontFamily: F.regular },

  suggestionLabel: { fontSize: 11, fontFamily: F.medium, marginTop: 8, marginBottom: 6 },
  suggestionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: { borderRadius: RADIUS.full, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6 },
  suggestionChipText: { fontSize: 13, fontFamily: F.semibold },

  domainSuggestBox: { marginTop: 6, borderRadius: RADIUS.md, borderWidth: 1.5, overflow: 'hidden' },
  domainSuggestItem: { paddingHorizontal: 14, paddingVertical: 10 },
  domainSuggestText: { fontSize: 14, fontFamily: F.regular },

  selectionBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  selectionBadge: { alignSelf: 'flex-start', borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 5 },
  selectionText: { fontSize: 13, fontFamily: F.bold },
  maxReachedText: { fontSize: 12, fontFamily: F.semibold },

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
