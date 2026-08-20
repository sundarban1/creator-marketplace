import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
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
import { useCategories } from '@/hooks/useCategories';
import { LocationSearchModal } from '@/components/LocationSearchModal';
import { StepIndicator } from '@/components/StepIndicator';
import { GroupedCategoryPicker } from '@/components/GroupedCategoryPicker';
import { F, RADIUS, SHADOW } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';

// Four required steps, mirroring provider onboarding's structure: who they're
// representing, business info (name, location), what kind of providers
// they're looking for, then what it's for (+ industry, only when relevant) —
// matching what's actually needed before a business can use Kolab. Everything
// else (description, logo, socials, PAN, verification docs, ...) is collected
// progressively later via Settings/edit-profile.
const TOTAL_STEPS = 4;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com'];
const MAX_INTEREST_CATEGORIES = 5;

// "What are you looking for?" (interestOptions, below) widens to "CREATOR or
// BOTH" like every useCategories('CREATOR') call, but per product decision
// only the BOTH-scope industry rows belong on this step (not provider-type
// rows like Photographer/Dancer). BOTH-scope is the only scope left ungrouped
// (see the `group` field comment on the Category model), so filtering to
// ungrouped rows is equivalent to filtering to scope === 'BOTH' without the
// API exposing scope on ApiCategory.

// Initial focus is ORGANIZATION — that's where the paid-campaign use case
// lives — but INDIVIDUAL (sourcing providers for a personal project) is
// offered too.
const REPRESENTING_TYPE_OPTIONS = [
  { key: 'ORGANIZATION' as const, icon: 'building' as const, titleKey: 'businessOnboarding.representingTypeOrganizationTitle', descKey: 'businessOnboarding.representingTypeOrganizationDesc' },
  { key: 'INDIVIDUAL'   as const, icon: 'user'     as const, titleKey: 'businessOnboarding.representingTypeIndividualTitle',   descKey: 'businessOnboarding.representingTypeIndividualDesc' },
];

// §26 — optional, shown on the same step as representingType rather than as
// its own step: a lightweight classifier, not worth a whole extra screen.
type BusinessSizeKey = 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'AGENCY' | 'ENTERPRISE';
const BUSINESS_SIZE_OPTIONS: { key: BusinessSizeKey; labelKey: string }[] = [
  { key: 'SOLO',       labelKey: 'businessOnboarding.sizeSolo' },
  { key: 'SMALL',      labelKey: 'businessOnboarding.sizeSmall' },
  { key: 'MEDIUM',     labelKey: 'businessOnboarding.sizeMedium' },
  { key: 'LARGE',      labelKey: 'businessOnboarding.sizeLarge' },
  { key: 'AGENCY',     labelKey: 'businessOnboarding.sizeAgency' },
  { key: 'ENTERPRISE', labelKey: 'businessOnboarding.sizeEnterprise' },
];

type PurposeKey = 'BRAND_MARKETING' | 'CONTENT_CREATION' | 'EVENT' | 'WEDDING' | 'PHOTOSHOOT' | 'PERFORMANCE' | 'COLLABORATION' | 'OTHER';

const PURPOSE_OPTIONS: { key: PurposeKey; icon: keyof typeof FontAwesome5.glyphMap; labelKey: string }[] = [
  { key: 'BRAND_MARKETING',  icon: 'bullhorn',      labelKey: 'businessOnboarding.purposeBrandMarketing' },
  { key: 'CONTENT_CREATION', icon: 'video',         labelKey: 'businessOnboarding.purposeContentCreation' },
  { key: 'EVENT',            icon: 'calendar-alt',  labelKey: 'businessOnboarding.purposeEvent' },
  { key: 'WEDDING',          icon: 'ring',          labelKey: 'businessOnboarding.purposeWedding' },
  { key: 'PHOTOSHOOT',       icon: 'camera',        labelKey: 'businessOnboarding.purposePhotoshoot' },
  { key: 'PERFORMANCE',      icon: 'theater-masks', labelKey: 'businessOnboarding.purposePerformance' },
  { key: 'COLLABORATION',    icon: 'handshake',     labelKey: 'businessOnboarding.purposeCollaboration' },
  { key: 'OTHER',            icon: 'ellipsis-h',    labelKey: 'businessOnboarding.purposeOther' },
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
  const [businessSize, setBusinessSize] = useState<BusinessSizeKey | null>(null);

  // Step 2 — business info (name, conditional email, location)
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailChecking,  setEmailChecking]  = useState(false);
  const emailCheckDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailCheckRequestId = useRef(0);
  const [location, setLocation] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1Error, setStep1Error] = useState('');
  const [step1Submitted, setStep1Submitted] = useState(false);
  const step1ScrollRef = useRef<ScrollView>(null);

  // Step 3 — what kind of providers they're looking for
  const [interestCategories, setInterestCategories] = useState<string[]>([]);
  const [step3Submitted, setStep3Submitted] = useState(false);
  const [step3Loading, setStep3Loading] = useState(false);
  const [step3Error, setStep3Error] = useState('');
  const { categories: interestOptions } = useCategories('CREATOR');
  const visibleInterestOptions = interestOptions.filter((c) => !c.group);

  // Step 4 — what this is for (industry is already collected in step 3)
  const [purpose, setPurpose] = useState<PurposeKey | null>(null);
  const [purposeSubmitted, setPurposeSubmitted] = useState(false);
  const [step4Loading, setStep4Loading] = useState(false);
  const [step4Error, setStep4Error] = useState('');

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

  function toggleInterest(name: string) {
    setInterestCategories((prev) => {
      if (prev.includes(name)) return prev.filter((c) => c !== name);
      if (prev.length >= MAX_INTEREST_CATEGORIES) return prev;
      return [...prev, name];
    });
  }

  function handleLocationSelect(address: string, lat: number, lng: number) {
    setLocation(address);
    setLocationLat(lat || null);
    setLocationLng(lng || null);
    setLocationModalOpen(false);
    setStep1Error('');
  }

  const businessNameError = step1Submitted && !businessName.trim() ? t('businessOnboarding.nameRequired') : undefined;
  const emailError = !needsEmail || !step1Submitted ? undefined
    : !email.trim()                    ? t('businessOnboarding.emailRequired')
    : !EMAIL_REGEX.test(email.trim())  ? t('businessOnboarding.emailInvalid')
    : emailAvailable === false         ? t('businessOnboarding.emailTaken')
    : undefined;
  const locationError = step1Submitted && !location.trim() ? t('businessOnboarding.locationRequired') : undefined;
  const step1Valid =
    businessName.trim().length > 0 &&
    (!needsEmail || (email.trim().length > 0 && EMAIL_REGEX.test(email.trim()))) &&
    location.trim().length > 0;

  async function handleRepresentingTypeContinue() {
    setRepresentingTypeSubmitted(true);
    if (!representingType) return;
    setRepresentingTypeLoading(true);
    setRepresentingTypeError('');
    try {
      await profileService.updateBusinessProfile({ representingType, businessSize: businessSize ?? undefined });
      setStep(2);
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
      await profileService.updateBusinessProfile({
        businessName: businessName.trim(),
        email: needsEmail ? email.trim() : undefined,
        location: location.trim() || null,
        locationLat: locationLat ?? undefined,
        locationLng: locationLng ?? undefined,
      });
      updateUser({ name: businessName.trim(), ...(needsEmail ? { email: email.trim() } : {}) });
      setStep(3);
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
      // Also written to `categories` — the same field edit-categories.tsx and the
      // profile page's "Industries" card use — so this selection shows up there too
      // instead of only driving campaign-AI/search defaults via defaultCreatorCategories.
      await profileService.updateBusinessProfile({ defaultCreatorCategories: interestCategories, categories: interestCategories });
      setStep(4);
    } catch (e: any) {
      setStep3Error(e.message ?? 'Failed to save. Please try again.');
    } finally {
      setStep3Loading(false);
    }
  }

  async function handleStep4Finish() {
    setPurposeSubmitted(true);
    if (!purpose) return;
    setStep4Loading(true);
    setStep4Error('');
    try {
      await profileService.updateBusinessProfile({ purpose });
      await authService.completeOnboarding();
      updateUser({ isFirstLogin: false });
      setFinished(true);
    } catch (e: any) {
      setStep4Error(e.message ?? 'Failed to save. Please try again.');
    } finally {
      setStep4Loading(false);
    }
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

  const STEP_CONFIG = [
    { title: t('businessOnboarding.representingTypeTitle'), subtitle: t('businessOnboarding.representingTypeSubtitle') },
    { title: t('businessOnboarding.step1Title'), subtitle: t('businessOnboarding.step1Subtitle') },
    { title: t('businessOnboarding.step3Title'), subtitle: t('businessOnboarding.step3Subtitle') },
    { title: t('businessOnboarding.purposeTitle'), subtitle: t('businessOnboarding.purposeSubtitle') },
  ];
  const { title, subtitle } = STEP_CONFIG[step - 1];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.preLoginBackground }]} edges={['top']}>
      {/* No `behavior` prop — the ScrollViews below already use `automaticallyAdjustKeyboardInsets`,
          which handles iOS precisely on its own; stacking KeyboardAvoidingView's `padding` on top
          of that double-compensates for the same keyboard, pushing content up too far. */}
      <KeyboardAvoidingView style={styles.flex}>
      <MaxWidthContainer>

      <StepIndicator
        step={step} total={TOTAL_STEPS}
        stepLabel={t('businessOnboarding.stepIndicator', { n: step, total: TOTAL_STEPS })}
        title={title} subtitle={subtitle}
        onBack={() => setStep((s) => s - 1)}
      />

        {/* ────────── Step 1: Who are you representing? (Organization/Individual) ────────── */}
        {step === 1 && (
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
                    onPress={() => { setRepresentingType(opt.key); setRepresentingTypeError(''); }}
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

            <Text style={[styles.sizeLabel, { color: C.textSecondary }]}>{t('businessOnboarding.sizeLabel')}</Text>
            <View style={styles.sizeChipsRow}>
              {BUSINESS_SIZE_OPTIONS.map((opt) => {
                const active = businessSize === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setBusinessSize(active ? null : opt.key)}
                    style={[styles.sizeChip, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.surface }]}>
                    <Text style={[styles.sizeChipText, { color: active ? C.brinjal1 : C.textSecondary }]}>{t(opt.labelKey)}</Text>
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

        {/* ────────── Step 2: Business info (name) ────────── */}
        {step === 2 && (
          <ScrollView ref={step1ScrollRef} style={styles.flex} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>

            {step1Error ? (
              <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorBannerText, { color: '#EF4444' }]}>{step1Error}</Text>
              </View>
            ) : null}

            {/* Business Name */}
            <View style={styles.fieldGroup}>
              <TextInputWithLabel
                label={`${t('businessOnboarding.businessNameLabel')} *`}
                leftIcon="building"
                value={businessName}
                onChangeText={(v) => { setStep1Error(''); setBusinessName(v); }}
                placeholder={t('businessOnboarding.businessNamePlaceholder')}
                autoCapitalize="words"
                error={businessNameError}
                hint={t('businessOnboarding.nameHint')}
              />
            </View>

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

            {/* Where is your business? */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.text, marginBottom: 8 }]}>
                {t('businessOnboarding.locationLabel')} <Text style={{ color: C.error }}>*</Text>
              </Text>
              <Pressable
                style={[styles.locationBtn, { backgroundColor: C.surface, borderColor: locationError ? C.error : C.border }]}
                onPress={() => setLocationModalOpen(true)}>
                <FontAwesome5 name="map-marker-alt" size={16} color={C.textSecondary} />
                <Text style={[styles.locationBtnTxt, { color: location ? C.text : C.textSecondary }]} numberOfLines={2}>
                  {location || t('businessOnboarding.locationPlaceholder')}
                </Text>
                <Text style={styles.locationArrow}>›</Text>
              </Pressable>
              {locationError ? (
                <Text style={[styles.fieldError, { color: C.error }]}>{locationError}</Text>
              ) : (
                <Text style={[styles.inputHint, { color: C.textSecondary }]}>
                  {t('businessOnboarding.locationHint')}
                </Text>
              )}
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

        <LocationSearchModal
          visible={locationModalOpen}
          initialValue={location}
          onSelect={handleLocationSelect}
          onClose={() => setLocationModalOpen(false)}
        />

        {/* ────────── Step 3: What are you looking for? ────────── */}
        {step === 3 && (
          <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {step3Error ? (
              <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorBannerText, { color: '#EF4444' }]}>{step3Error}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: C.text }]}>
                  {t('businessOnboarding.interestsLabel')} <Text style={{ color: C.error }}>*</Text>
                </Text>
                <View style={[styles.countBadge, { backgroundColor: interestCategories.length > 0 ? C.primaryLight : C.border }]}>
                  <Text style={[styles.countBadgeText, { color: interestCategories.length > 0 ? C.brinjal1 : C.textSecondary }]}>
                    {t('businessOnboarding.interestsCounter', { n: interestCategories.length })}
                  </Text>
                </View>
              </View>
              {step3Submitted && interestCategories.length === 0 && (
                <Text style={[styles.fieldError, { color: C.error, marginBottom: 8 }]}>{t('businessOnboarding.interestsError')}</Text>
              )}
              <GroupedCategoryPicker categories={visibleInterestOptions} selected={interestCategories} onToggle={toggleInterest} max={MAX_INTEREST_CATEGORIES} />
            </View>

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, (interestCategories.length === 0 || step3Loading) && styles.primaryBtnDisabled]}
              onPress={handleStep3Continue}
              disabled={step3Loading}>
              {step3Loading ? (
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

        {/* ────────── Step 4: What is this for? (+ Industry, only if relevant) ────────── */}
        {step === 4 && (
          <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {step4Error ? (
              <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorBannerText, { color: '#EF4444' }]}>{step4Error}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              {purposeSubmitted && !purpose && (
                <Text style={[styles.fieldError, { color: C.error, marginBottom: 8 }]}>{t('businessOnboarding.purposeError')}</Text>
              )}
              <View style={styles.purposeGrid}>
                {PURPOSE_OPTIONS.map((opt) => {
                  const active = purpose === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => { setPurpose(opt.key); setPurposeSubmitted(false); }}
                      style={[styles.purposeTile, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.surface }]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}>
                      <View style={[styles.purposeIcon, { backgroundColor: active ? C.brinjal1 : C.primaryLight }]}>
                        <FontAwesome5 name={opt.icon} size={16} color={active ? '#fff' : C.brinjal1} solid />
                      </View>
                      <Text style={[styles.purposeLabel, { color: C.text }]}>{t(opt.labelKey)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: C.active, shadowColor: C.active }, (!purpose || step4Loading) && styles.primaryBtnDisabled]}
              onPress={handleStep4Finish}
              disabled={step4Loading}>
              {step4Loading ? (
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 48 },
  errorBanner: { borderRadius: RADIUS.sm, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  errorBannerText: { fontSize: 13, fontFamily: F.semibold },

  // Step 1's Organization/Individual picker — a row-card per option (icon,
  // title + description, trailing check), matching provider onboarding's
  // equivalent Individual/Team/Agency picker.
  choiceCards: { gap: 12, marginBottom: 28 },
  choiceCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.lg, borderWidth: 1.5, padding: 14 },
  sizeLabel: { fontSize: 13, fontFamily: F.medium, marginBottom: 10 },
  sizeChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
  sizeChip: { borderRadius: RADIUS.full, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 8 },
  sizeChipText: { fontSize: 13, fontFamily: F.medium },
  choiceIcon:  { width: 44, height: 44, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  choiceText:  { flex: 1, gap: 2 },
  choiceTitle: { fontSize: 15, fontFamily: F.bold },
  choiceDesc:  { fontSize: 12.5, fontFamily: F.regular, lineHeight: 17 },

  fieldGroup: { marginBottom: 24 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  fieldLabel: { fontSize: 14, fontFamily: F.bold },
  fieldError: { fontSize: 12, fontFamily: F.medium },
  locationBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, gap: 8 },
  locationBtnTxt: { flex: 1, fontSize: 15, lineHeight: 20, fontFamily: F.regular },
  locationArrow: { fontSize: 20, color: '#9CA3AF' },
  inputHint: { fontSize: 11, marginTop: 5, fontFamily: F.regular },
  domainSuggestBox: { marginTop: 6, borderRadius: RADIUS.md, borderWidth: 1.5, overflow: 'hidden' },
  domainSuggestItem: { paddingHorizontal: 14, paddingVertical: 10 },
  domainSuggestText: { fontSize: 14, fontFamily: F.regular },
  countBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 3 },
  countBadgeText: { fontSize: 12, fontFamily: F.bold },

  // Step 5's "What is this for?" picker — a compact 2-column icon+label tile
  // grid (single-select) rather than choiceCards' row-with-description layout,
  // since there are 8 options here instead of 2-3.
  purposeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  purposeTile: { width: '47%', borderRadius: RADIUS.lg, borderWidth: 1.5, padding: 14, alignItems: 'flex-start', gap: 10 },
  purposeIcon: { width: 36, height: 36, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  purposeLabel: { fontSize: 13, fontFamily: F.semibold, lineHeight: 17 },
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
