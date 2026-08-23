import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { authService } from '@/services/auth';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { profileService } from '@/services/profile';
import { useCategories, sortOtherLast } from '@/hooks/useCategories';
import { LocationSearchModal } from '@/components/LocationSearchModal';
import { geocodeAddress, resolvePlaceDetails, type ResolvedPlace } from '@/utilities/geolocation';
import { StepIndicator } from '@/components/StepIndicator';
import { GroupedCategoryPicker } from '@/components/GroupedCategoryPicker';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';

// The step sequence depends on the hiring type. Both start with "how are you
// hiring?" and their own basic details, then diverge on the last step: an
// ORGANIZATION is asked which industry it's in (an Individual doesn't have
// one), while only an Individual is asked what kind of provider they're
// looking for — an organization's industry is already a strong enough signal,
// and asking both back-to-back made onboarding drag. Whichever of those two a
// hiring type gets is its final step and completes onboarding. Everything else
// (description, logo, socials, PAN, verification docs, ...) is collected
// progressively later via Settings/edit-profile.
type StepKey = 'HIRING_TYPE' | 'DETAILS' | 'INDUSTRY' | 'INTERESTS';
const INDIVIDUAL_STEPS:   StepKey[] = ['HIRING_TYPE', 'DETAILS', 'INTERESTS'];
const ORGANIZATION_STEPS: StepKey[] = ['HIRING_TYPE', 'DETAILS', 'INDUSTRY'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com'];
const MAX_INTEREST_CATEGORIES = 5;
// Matches (business)/edit-categories.tsx, which edits the same `categories`
// field afterwards — the two must agree or onboarding could save more
// industries than the edit screen will let you keep.
const MAX_INDUSTRIES = 5;

// "What category of talent do you need?" — Individuals only — shows the
// BOTH-scope rows (Restaurants, Hotels, Fashion & Clothing, ...) with the
// catch-all "Other" pinned last. Note this is a broad *area* rather than a
// provider role: providers only ever carry CREATOR-scope categories, so the
// business home screen's "Recommended for you" rail (defaultCreatorCategories[0]
// → getRecommendedCreators({ category })) will not match on these. Organizations
// skip this step, which leaves defaultCreatorCategories empty and hides that
// rail for them.

// "How are you hiring?" — the two hiring types are equal-weight choices, not a
// primary and a fallback: plenty of Nepal demand is one person hiring a
// wedding photographer, so INDIVIDUAL is listed first and neither card is
// preselected. Everything downstream keys off this: an INDIVIDUAL is never
// asked for an organization name, PAN or registration.
const REPRESENTING_TYPE_OPTIONS = [
  { key: 'INDIVIDUAL'   as const, icon: 'user'     as const, titleKey: 'businessOnboarding.representingTypeIndividualTitle',   descKey: 'businessOnboarding.representingTypeIndividualDesc',   examplesKey: 'businessOnboarding.representingTypeIndividualExamples' },
  { key: 'ORGANIZATION' as const, icon: 'building' as const, titleKey: 'businessOnboarding.representingTypeOrganizationTitle', descKey: 'businessOnboarding.representingTypeOrganizationDesc', examplesKey: 'businessOnboarding.representingTypeOrganizationExamples' },
];

export default function BusinessOnboardingScreen() {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const C = useAppColors();
  const [step, setStep] = useState(1);

  // Phone-signup accounts still hold a placeholder email and stay
  // isEmailVerified: false until they add a real one — collect it here.
  const needsEmail = !user?.isEmailVerified;

  // Step 1 — who they're representing (Organization / Individual)
  const [representingType, setRepresentingType] = useState<'ORGANIZATION' | 'INDIVIDUAL' | null>(null);
  const [representingTypeSubmitted, setRepresentingTypeSubmitted] = useState(false);
  const [representingTypeLoading,   setRepresentingTypeLoading]   = useState(false);
  const [representingTypeError,     setRepresentingTypeError]     = useState('');
  const isIndividual = representingType === 'INDIVIDUAL';
  const stepKeys   = isIndividual ? INDIVIDUAL_STEPS : ORGANIZATION_STEPS;
  const totalSteps = stepKeys.length;
  const stepKey    = stepKeys[step - 1];

  // Step 2 — business info (name, conditional email, location)
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailChecking,  setEmailChecking]  = useState(false);
  const emailCheckDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailCheckRequestId = useRef(0);
  const [contactPersonName, setContactPersonName] = useState('');
  // One "where are you?" question backed by Google Places, rather than three
  // Province → District → City dropdowns. Picking a suggestion resolves the
  // place once and gives us both lat/lng (nearby search depends on it) and
  // whatever administrative levels Google knows, which still populate the
  // structured city/district/province columns the API stores.
  const [location, setLocation] = useState('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvedPlace, setResolvedPlace] = useState<ResolvedPlace | null>(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1Error, setStep1Error] = useState('');
  const [step1Submitted, setStep1Submitted] = useState(false);
  const step1ScrollRef = useRef<ScrollView>(null);

  // Industry step (organizations only) — the organization's OWN industry,
  // saved to `categories`. Deliberately separate from interestCategories
  // below: "we are a Restaurant" and "we need a Photographer" are different
  // questions, and conflating them made restaurants show up under a
  // Photographer business filter.
  const [industries, setIndustries] = useState<string[]>([]);
  const [industrySubmitted, setIndustrySubmitted] = useState(false);
  const [industryLoading,   setIndustryLoading]   = useState(false);
  const [industryError,     setIndustryError]     = useState('');
  const { categories: industryOptions } = useCategories('BUSINESS');

  // Final step (Individuals) — what kind of providers they're looking for
  const [interestCategories, setInterestCategories] = useState<string[]>([]);
  const [step3Submitted, setStep3Submitted] = useState(false);
  const [step3Loading, setStep3Loading] = useState(false);
  const [step3Error, setStep3Error] = useState('');
  const { categories: interestRows } = useCategories('BOTH');
  const interestOptions = useMemo(() => sortOtherLast(interestRows), [interestRows]);

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

  async function handleLocationSelect(address: string, lat: number, lng: number, placeId?: string) {
    setLocationModalOpen(false);
    setStep1Error('');
    setLocation(address);
    // (0, 0) is the modal's "no coordinates" sentinel — see LocationSearchModal.
    setLocationCoords(lat || lng ? { lat, lng } : null);
    // Second call, but only here: the modal asks Places for geometry alone, and
    // onboarding additionally needs the address components that backfill the
    // structured city/district/province columns.
    setResolvedPlace(placeId ? await resolvePlaceDetails(placeId) : null);
  }

  function toggleIndustry(name: string) {
    setIndustries((prev) => {
      if (prev.includes(name)) return prev.filter((c) => c !== name);
      if (prev.length >= MAX_INDUSTRIES) return prev;
      return [...prev, name];
    });
  }

  function toggleInterest(name: string) {
    setInterestCategories((prev) => {
      if (prev.includes(name)) return prev.filter((c) => c !== name);
      if (prev.length >= MAX_INTEREST_CATEGORIES) return prev;
      return [...prev, name];
    });
  }

  const businessNameError = step1Submitted && !businessName.trim() ? t('businessOnboarding.nameRequired') : undefined;
  const emailError = !needsEmail || !step1Submitted ? undefined
    : !email.trim()                    ? t('businessOnboarding.emailRequired')
    : !EMAIL_REGEX.test(email.trim())  ? t('businessOnboarding.emailInvalid')
    : emailAvailable === false         ? t('businessOnboarding.emailTaken')
    : undefined;
  const locationValid = location.trim().length > 0;
  const locationError = step1Submitted && !locationValid ? t('businessOnboarding.locationRequired') : undefined;
  const contactPersonError = isIndividual || !step1Submitted ? undefined
    : !contactPersonName.trim()             ? t('businessOnboarding.contactPersonRequired')
    : contactPersonName.trim().length < 2   ? t('businessOnboarding.contactPersonTooShort')
    : undefined;
  // The contact person gates the step only for organizations — an Individual
  // is never blocked on information they were never shown.
  const orgFieldsValid = isIndividual || contactPersonName.trim().length >= 2;
  const step1Valid =
    businessName.trim().length > 0 &&
    orgFieldsValid &&
    (!needsEmail || (email.trim().length > 0 && EMAIL_REGEX.test(email.trim()))) &&
    locationValid;

  async function handleRepresentingTypeContinue() {
    setRepresentingTypeSubmitted(true);
    if (!representingType) return;
    setRepresentingTypeLoading(true);
    setRepresentingTypeError('');
    try {
      await profileService.updateBusinessProfile({
        representingType,
        // Going back to step 1 and switching to Individual after the Industry
        // step has already saved `categories` would otherwise leave an
        // industry list on a personal profile. Safe to clear unconditionally
        // here: this screen only ever runs during first-login onboarding.
        ...(representingType === 'INDIVIDUAL' ? { categories: [] } : {}),
      });
      setStep((s) => s + 1);
    } catch (e: any) {
      setRepresentingTypeError(e.message ?? 'Failed to save. Please try again.');
    } finally {
      setRepresentingTypeLoading(false);
    }
  }

  async function handleStep1Continue() {
    setStep1Submitted(true);
    if (!step1Valid) return;
    setStep1Loading(true);
    setStep1Error('');
    try {
      const composedLocation = location.trim();
      // The picked place already carries coordinates; geocoding is only a
      // fallback for when both Places calls came back without geometry.
      const coords = locationCoords ?? resolvedPlace?.coords ?? await geocodeAddress(composedLocation);
      await profileService.updateBusinessProfile({
        businessName: businessName.trim(),
        // Organizations only — the backend also nulls this out whenever
        // representingType is INDIVIDUAL, so this is belt-and-braces.
        contactPersonName: isIndividual ? null : contactPersonName.trim(),
        email: needsEmail ? email.trim() : undefined,
        province: resolvedPlace?.province ?? null,
        district: resolvedPlace?.district ?? null,
        city:     resolvedPlace?.city ?? null,
        location: composedLocation,
        // Best-effort: nearby search degrades to "no coordinates" rather than
        // blocking onboarding if Google can't resolve the composed address.
        locationLat: coords?.lat ?? undefined,
        locationLng: coords?.lng ?? undefined,
      });
      updateUser({ name: businessName.trim(), ...(needsEmail ? { email: email.trim() } : {}) });
      setStep((s) => s + 1);
    } catch (e: any) {
      setStep1Error(e.message ?? 'Failed to save. Please try again.');
    } finally {
      setStep1Loading(false);
    }
  }

  async function handleStep3Continue() {
    setStep3Submitted(true);
    if (interestCategories.length === 0) return;
    setStep3Loading(true);
    setStep3Error('');
    try {
      // Only defaultCreatorCategories — NOT `categories`. `categories` is the
      // business's own industry (edit-categories.tsx and the profile page's
      // "Industries" card read it, and business search filters on it); writing
      // the provider types they're shopping for into it made a restaurant
      // looking for a photographer list itself as a photography business.
      await profileService.updateBusinessProfile({ defaultCreatorCategories: interestCategories });
      await finishOnboarding();
    } catch (e: any) {
      setStep3Error(e.message ?? 'Failed to save. Please try again.');
    } finally {
      setStep3Loading(false);
    }
  }

  async function handleIndustryContinue() {
    setIndustrySubmitted(true);
    if (industries.length === 0) return;
    setIndustryLoading(true);
    setIndustryError('');
    try {
      await profileService.updateBusinessProfile({ categories: industries });
      await finishOnboarding();
    } catch (e: any) {
      setIndustryError(e.message ?? 'Failed to save. Please try again.');
    } finally {
      setIndustryLoading(false);
    }
  }

  // Shared tail of the two terminal steps (INTERESTS for Individuals, INDUSTRY
  // for Organizations) — each saves its own field first, then lands here.
  // Deliberately not wrapped in its own try/catch: it runs inside the caller's,
  // so a failure surfaces on the step the user is actually looking at.
  async function finishOnboarding() {
    await authService.completeOnboarding();
    updateUser({ isFirstLogin: false });
    setFinished(true);
  }

  function goHome() {
    router.replace('/(business)');
  }

  // ── Success screen ──
  if (finished) {
    return (
      <SafeAreaView style={[styles.successContainer, { backgroundColor: C.preLoginBackground }]} edges={['top', 'bottom']}>
        <Animated.View style={[styles.successContent, { opacity: opacityAnim }]}>
          <Animated.View style={[styles.checkCircle, { backgroundColor: C.active, shadowColor: C.active, transform: [{ scale: scaleAnim }] }]}>
            <FontAwesome5 name="check" solid size={52} color="#fff" />
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

  const STEP_CONFIG: Record<StepKey, { title: string; subtitle: string }> = {
    HIRING_TYPE: { title: t('businessOnboarding.representingTypeTitle'), subtitle: t('businessOnboarding.representingTypeSubtitle') },
    DETAILS: isIndividual
      ? { title: t('businessOnboarding.step1TitleIndividual'), subtitle: t('businessOnboarding.step1SubtitleIndividual') }
      : { title: t('businessOnboarding.step1Title'),           subtitle: t('businessOnboarding.step1Subtitle') },
    INDUSTRY:  { title: t('businessOnboarding.industryTitle'),   subtitle: t('businessOnboarding.industrySubtitle') },
    INTERESTS: { title: t('businessOnboarding.step3Title'),      subtitle: t('businessOnboarding.step3Subtitle') },
  };
  const { title, subtitle } = STEP_CONFIG[stepKey];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.preLoginBackground }]} edges={['top']}>
      {/* No `behavior` prop — the ScrollViews below already use `automaticallyAdjustKeyboardInsets`,
          which handles iOS precisely on its own; stacking KeyboardAvoidingView's `padding` on top
          of that double-compensates for the same keyboard, pushing content up too far. */}
      <KeyboardAvoidingView style={styles.flex}>
      <MaxWidthContainer>

      <StepIndicator
        step={step} total={totalSteps}
        stepLabel={t('businessOnboarding.stepIndicator', { n: step, total: totalSteps })}
        title={title} subtitle={subtitle}
        onBack={() => setStep((s) => s - 1)}
      />

        {/* ────────── How are you hiring? (Individual / Business-Organization) ────────── */}
        {stepKey === 'HIRING_TYPE' && (
          <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {representingTypeSubmitted && !representingType && (
              <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorBannerText, { color: '#EF4444' }]}>{t('businessOnboarding.representingTypeError')}</Text>
              </View>
            )}

            {representingTypeError ? (
              <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorBannerText, { color: '#EF4444' }]}>{representingTypeError}</Text>
              </View>
            ) : null}

            <View style={styles.choiceCards}>
              {REPRESENTING_TYPE_OPTIONS.map((opt) => {
                const active = representingType === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => {
                      setRepresentingType(opt.key);
                      if (opt.key === 'INDIVIDUAL') setIndustries([]);
                      setRepresentingTypeError('');
                    }}
                    style={[styles.choiceCard, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.surface }]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}>
                    <View style={[styles.choiceIcon, { backgroundColor: active ? C.brinjal1 : C.primaryLight }]}>
                      <FontAwesome5 name={opt.icon} size={18} color={active ? '#fff' : C.brinjal1} solid />
                    </View>
                    <View style={styles.choiceText}>
                      <Text style={[styles.choiceTitle, { color: C.text }]}>{t(opt.titleKey)}</Text>
                      <Text style={[styles.choiceDesc, { color: C.textSecondary }]}>{t(opt.descKey)}</Text>
                      <Text style={[styles.choiceExamples, { color: C.textSecondary }]}>{t(opt.examplesKey)}</Text>
                    </View>
                    <FontAwesome5 name={active ? 'check-circle' : 'circle'} solid={active} size={20} color={active ? C.brinjal1 : C.border} />
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, (!representingType || representingTypeLoading) && styles.primaryBtnDisabled]}
              onPress={handleRepresentingTypeContinue}
              disabled={representingTypeLoading}>
              {representingTypeLoading ? (
                <View style={styles.loadingRow}>
                  <View style={[styles.spinner, { borderTopColor: '#fff' }]} />
                  <Text style={styles.primaryBtnText}>{t('businessOnboarding.saving')}</Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Text style={styles.primaryBtnText}>{t('businessOnboarding.continueBtn')}</Text>
                  <FontAwesome5 name="arrow-right" solid size={16} color="#fff" />
                </View>
              )}
            </Pressable>

          </ScrollView>
        )}

        {/* ────────── Basic details (name, org type, contact, email, location) ────────── */}
        {stepKey === 'DETAILS' && (
          <ScrollView ref={step1ScrollRef} style={styles.flex} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>

            {step1Error ? (
              <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorBannerText, { color: '#EF4444' }]}>{step1Error}</Text>
              </View>
            ) : null}

            {/* Business Name */}
            <View style={styles.fieldGroup}>
              <TextInputWithLabel
                label={`${isIndividual ? t('businessOnboarding.individualNameLabel') : t('businessOnboarding.businessNameLabel')} *`}
                leftIcon={isIndividual ? 'user' : 'building'}
                value={businessName}
                onChangeText={(v) => { setStep1Error(''); setBusinessName(v); }}
                placeholder={isIndividual ? t('businessOnboarding.individualNamePlaceholder') : t('businessOnboarding.businessNamePlaceholder')}
                autoCapitalize="words"
                error={businessNameError}
                hint={isIndividual ? t('businessOnboarding.individualNameHint') : t('businessOnboarding.nameHint')}
              />
            </View>

            {/* Contact person — §5, organizations only */}
            {!isIndividual && (
              <View style={styles.fieldGroup}>
                <TextInputWithLabel
                  label={`${t('businessOnboarding.contactPersonLabel')} *`}
                  leftIcon="user"
                  value={contactPersonName}
                  onChangeText={(v) => { setStep1Error(''); setContactPersonName(v); }}
                  placeholder={t('businessOnboarding.contactPersonPlaceholder')}
                  autoCapitalize="words"
                  error={contactPersonError}
                  hint={t('businessOnboarding.contactPersonHint')}
                />
              </View>
            )}

            {/* Email — only for phone-signup accounts, which start without a real one */}
            {needsEmail && (
              <View style={styles.fieldGroup}>
                <TextInputWithLabel
                  label={`${t('businessOnboarding.emailLabel')} *`}
                  leftIcon="envelope"
                  value={email}
                  onChangeText={handleEmailChange}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => { setTimeout(() => setEmailFocused(false), 150); }}
                  placeholder={t('businessOnboarding.emailPlaceholder')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  error={emailError}
                  hint={emailChecking ? t('businessOnboarding.emailChecking') : emailAvailable === true ? t('businessOnboarding.emailAvailable') : undefined}
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

            {/* Where they're based — opens the shared full-screen place search */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.text, marginBottom: 8 }]}>
                {t('businessOnboarding.locationLabel')} <Text style={{ color: C.error }}>*</Text>
              </Text>
              <Pressable
                style={[styles.locationBtn, { backgroundColor: C.background, borderColor: locationError ? C.error : C.border }]}
                onPress={() => setLocationModalOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={t('businessOnboarding.locationLabel')}>
                <FontAwesome5 name="map-marker-alt" solid size={15} color={C.textSecondary} />
                <Text style={[styles.locationBtnTxt, { color: location ? C.text : C.textSecondary }]} numberOfLines={2}>
                  {location || t('businessOnboarding.locationPlaceholder')}
                </Text>
                <Text style={[styles.locationArrow, { color: C.textSecondary }]}>›</Text>
              </Pressable>
              {locationError ? <Text style={[styles.fieldError, { color: C.error, marginTop: 6 }]}>{locationError}</Text> : null}
            </View>

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, (!step1Valid || step1Loading) && styles.primaryBtnDisabled]}
              onPress={handleStep1Continue}
              disabled={step1Loading}>
              {step1Loading ? (
                <View style={styles.loadingRow}>
                  <View style={[styles.spinner, { borderTopColor: '#fff' }]} />
                  <Text style={styles.primaryBtnText}>{t('businessOnboarding.saving')}</Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Text style={styles.primaryBtnText}>{t('businessOnboarding.continueBtn')}</Text>
                  <FontAwesome5 name="arrow-right" solid size={16} color="#fff" />
                </View>
              )}
            </Pressable>

          </ScrollView>
        )}

        {/* ────────── §6 Industry — organizations only, saved to `categories` ────────── */}
        {stepKey === 'INDUSTRY' && (
          <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {industryError ? (
              <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorBannerText, { color: '#EF4444' }]}>{industryError}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: C.text }]}>
                  {t('businessOnboarding.industryLabel')} <Text style={{ color: C.error }}>*</Text>
                </Text>
                <View style={[styles.countBadge, { backgroundColor: industries.length > 0 ? C.primaryLight : C.border }]}>
                  <Text style={[styles.countBadgeText, { color: industries.length > 0 ? C.brinjal1 : C.textSecondary }]}>
                    {t('businessOnboarding.industryCounter', { n: industries.length, max: MAX_INDUSTRIES })}
                  </Text>
                </View>
              </View>
              {industrySubmitted && industries.length === 0 && (
                <Text style={[styles.fieldError, { color: C.error, marginBottom: 8 }]}>{t('businessOnboarding.industryError')}</Text>
              )}
              <GroupedCategoryPicker categories={industryOptions} selected={industries} onToggle={toggleIndustry} max={MAX_INDUSTRIES} />
            </View>

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: C.active, shadowColor: C.active }, (industries.length === 0 || industryLoading) && styles.primaryBtnDisabled]}
              onPress={handleIndustryContinue}
              disabled={industryLoading}>
              {industryLoading ? (
                <View style={styles.loadingRow}>
                  <View style={[styles.spinner, { borderTopColor: '#fff' }]} />
                  <Text style={styles.primaryBtnText}>{t('businessOnboarding.saving')}</Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Text style={styles.primaryBtnText}>{t('businessOnboarding.completeBtn')}</Text>
                  <FontAwesome5 name="arrow-right" solid size={16} color="#fff" />
                </View>
              )}
            </Pressable>

          </ScrollView>
        )}

        {/* ────────── What category of talent do you need? ────────── */}
        {stepKey === 'INTERESTS' && (
          <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {step3Error ? (
              <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorBannerText, { color: '#EF4444' }]}>{step3Error}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              {/* No field label here: the step header above already asks the
                  question ("What category of talent do you need?"), so the row
                  carries only the counter, pushed right on its own. */}
              <View style={[styles.labelRow, { justifyContent: 'flex-end' }]}>
                <View style={[styles.countBadge, { backgroundColor: interestCategories.length > 0 ? C.primaryLight : C.border }]}>
                  <Text style={[styles.countBadgeText, { color: interestCategories.length > 0 ? C.brinjal1 : C.textSecondary }]}>
                    {t('businessOnboarding.interestsCounter', { n: interestCategories.length })}
                  </Text>
                </View>
              </View>
              {step3Submitted && interestCategories.length === 0 && (
                <Text style={[styles.fieldError, { color: C.error, marginBottom: 8 }]}>{t('businessOnboarding.interestsError')}</Text>
              )}
              <GroupedCategoryPicker categories={interestOptions} selected={interestCategories} onToggle={toggleInterest} max={MAX_INTEREST_CATEGORIES} />
            </View>

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: C.active, shadowColor: C.active }, (interestCategories.length === 0 || step3Loading) && styles.primaryBtnDisabled]}
              onPress={handleStep3Continue}
              disabled={step3Loading}>
              {step3Loading ? (
                <View style={styles.loadingRow}>
                  <View style={[styles.spinner, { borderTopColor: '#fff' }]} />
                  <Text style={styles.primaryBtnText}>{t('businessOnboarding.saving')}</Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Text style={styles.primaryBtnText}>{t('businessOnboarding.completeBtn')}</Text>
                  <FontAwesome5 name="arrow-right" solid size={16} color="#fff" />
                </View>
              )}
            </Pressable>

          </ScrollView>
        )}

      </MaxWidthContainer>
      </KeyboardAvoidingView>

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
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xxxl },
  errorBanner: { borderRadius: RADIUS.sm, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  errorBannerText: { fontSize: 13, fontFamily: F.semibold },

  // Step 1's Organization/Individual picker — a row-card per option (icon,
  // title + description, trailing check), matching provider onboarding's
  // equivalent Individual/Team picker.
  choiceCards: { gap: 12, marginBottom: 28 },
  choiceCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.lg, borderWidth: 1.5, padding: SPACING.lg },
  choiceIcon:  { width: 44, height: 44, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  choiceText:  { flex: 1, gap: 2 },
  choiceTitle: { fontSize: 15, fontFamily: F.bold },
  choiceDesc:  { fontSize: 12.5, fontFamily: F.regular, lineHeight: 19 },
  choiceExamples: { fontSize: 11.5, fontFamily: F.regular, lineHeight: 18, opacity: 0.75, marginTop: 2 },

  fieldGroup: { marginBottom: 24 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  fieldLabel: { fontSize: 14, fontFamily: F.bold },
  fieldError: { fontSize: 12, fontFamily: F.medium },
  locationBtn:    { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.sm, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 12, gap: 8, minHeight: 50 },
  locationBtnTxt: { flex: 1, fontSize: 14, lineHeight: 21, fontFamily: F.regular },
  locationArrow:  { fontSize: 20 },
  inputHint: { fontSize: 11, marginTop: 5, fontFamily: F.regular },
  domainSuggestBox: { marginTop: 6, borderRadius: RADIUS.md, borderWidth: 1.5, overflow: 'hidden' },
  domainSuggestItem: { paddingHorizontal: 14, paddingVertical: 10 },
  domainSuggestText: { fontSize: 14, fontFamily: F.regular },
  countBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 3 },
  countBadgeText: { fontSize: 12, fontFamily: F.bold },

  maxBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
  maxBannerText: { fontSize: 13, fontFamily: F.semibold },
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
