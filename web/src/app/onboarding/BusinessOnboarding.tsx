import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Building2, Mail } from 'lucide-react';
import { useAppAuth } from '../auth/AppAuthContext';
import { useT } from '../i18n';
import { roleHome } from '../routes';
import { useAsync } from '../lib/useAsync';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { updateBusinessProfile } from '../api/business';
import { isEmailAvailable, completeOnboarding } from '../api/auth';
import { fetchCategories } from '../api/catalog';
import { sortOtherLast } from '../lib/sortOtherLast';
import { OnboardingShell, OnboardingSuccess } from './OnboardingShell';
import { ChoiceCardGroup, type ChoiceOption } from './ChoiceCard';
import { CategoryPicker } from './CategoryPicker';
import { LocationAutocomplete } from '../public/LocationAutocomplete';
import { TextField } from '../ui/TextField';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_INDUSTRIES = 5;
const MAX_INTERESTS = 5;

type RepresentingType = 'ORGANIZATION' | 'INDIVIDUAL';
type StepKey = 'HIRING_TYPE' | 'DETAILS' | 'INDUSTRY' | 'INTERESTS';
const INDIVIDUAL_STEPS: StepKey[] = ['HIRING_TYPE', 'DETAILS', 'INTERESTS'];
const ORGANIZATION_STEPS: StepKey[] = ['HIRING_TYPE', 'DETAILS', 'INDUSTRY'];

export function BusinessOnboarding() {
  const t = useT();
  const navigate = useNavigate();
  const { user, updateUser } = useAppAuth();
  const [step, setStep] = useState(1);
  const [finished, setFinished] = useState(false);

  const needsEmail = !user?.isEmailVerified;

  // ── Step 1 — hiring type ──
  const [representingType, setRepresentingType] = useState<RepresentingType | null>(null);
  const [step1Submitted, setStep1Submitted] = useState(false);
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1Error, setStep1Error] = useState('');
  const isIndividual = representingType === 'INDIVIDUAL';
  const stepKeys = isIndividual ? INDIVIDUAL_STEPS : ORGANIZATION_STEPS;
  const totalSteps = stepKeys.length;
  const stepKey = stepKeys[step - 1]!;

  const representingTypeOptions: ChoiceOption<RepresentingType>[] = [
    {
      value: 'INDIVIDUAL',
      icon: <User size={18} />,
      title: t('businessOnboarding.representingTypeIndividualTitle'),
      description: t('businessOnboarding.representingTypeIndividualDesc'),
      examples: t('businessOnboarding.representingTypeIndividualExamples'),
    },
    {
      value: 'ORGANIZATION',
      icon: <Building2 size={18} />,
      title: t('businessOnboarding.representingTypeOrganizationTitle'),
      description: t('businessOnboarding.representingTypeOrganizationDesc'),
      examples: t('businessOnboarding.representingTypeOrganizationExamples'),
    },
  ];

  async function handleRepresentingTypeContinue() {
    setStep1Submitted(true);
    if (!representingType) return;
    setStep1Loading(true);
    setStep1Error('');
    try {
      await updateBusinessProfile({
        representingType,
        ...(representingType === 'INDIVIDUAL' ? { categories: [] } : {}),
      });
      setStep(2);
    } catch (err) {
      setStep1Error(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setStep1Loading(false);
    }
  }

  // ── Step 2 — details ──
  const [businessName, setBusinessName] = useState('');
  const [contactPersonName, setContactPersonName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [detailsSubmitted, setDetailsSubmitted] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  const debouncedEmail = useDebouncedValue(email.trim(), 400);
  const emailCheck = useAsync(
    async (signal) => {
      if (!needsEmail || !EMAIL_REGEX.test(debouncedEmail)) return null;
      return isEmailAvailable(debouncedEmail, signal);
    },
    [debouncedEmail, needsEmail],
  );

  const emailValid = !needsEmail || (email.trim().length > 0 && EMAIL_REGEX.test(email.trim()));
  const contactPersonValid = isIndividual || contactPersonName.trim().length >= 2;
  const detailsValid =
    businessName.trim().length > 0 && contactPersonValid && emailValid && emailCheck.data !== false && location.trim().length > 0;

  const businessNameError = detailsSubmitted && !businessName.trim() ? t('businessOnboarding.nameRequired') : undefined;
  const contactPersonError = !isIndividual && detailsSubmitted && !contactPersonValid
    ? (contactPersonName.trim() ? t('businessOnboarding.contactPersonTooShort') : t('businessOnboarding.contactPersonRequired'))
    : undefined;
  const emailError = needsEmail && detailsSubmitted && !emailValid
    ? (!email.trim() ? t('businessOnboarding.emailRequired') : t('businessOnboarding.emailInvalid'))
    : emailCheck.data === false
      ? t('businessOnboarding.emailTaken')
      : undefined;
  const emailHint = emailCheck.loading ? t('businessOnboarding.emailChecking') : emailCheck.data === true ? t('businessOnboarding.emailAvailable') : undefined;
  const locationError = detailsSubmitted && !location.trim() ? t('businessOnboarding.locationRequired') : undefined;

  async function handleDetailsContinue() {
    setDetailsSubmitted(true);
    if (!detailsValid) return;
    setDetailsLoading(true);
    setDetailsError('');
    try {
      await updateBusinessProfile({
        businessName: businessName.trim(),
        contactPersonName: isIndividual ? null : contactPersonName.trim(),
        email: needsEmail ? email.trim() : undefined,
        location: location.trim(),
      });
      setStep((s) => s + 1);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setDetailsLoading(false);
    }
  }

  // ── Step 3a — industry (organizations) ──
  const [industries, setIndustries] = useState<string[]>([]);
  const [industrySubmitted, setIndustrySubmitted] = useState(false);
  const [industryLoading, setIndustryLoading] = useState(false);
  const [industryError, setIndustryError] = useState('');
  const industryCategories = useAsync((s) => fetchCategories(s, 'BUSINESS'), []);
  const industryOptions = useMemo(() => sortOtherLast(industryCategories.data ?? []), [industryCategories.data]);

  function toggleIndustry(name: string) {
    setIndustries((prev) => {
      if (prev.includes(name)) return prev.filter((c) => c !== name);
      if (prev.length >= MAX_INDUSTRIES) return prev;
      return [...prev, name];
    });
  }

  async function handleIndustryContinue() {
    setIndustrySubmitted(true);
    if (industries.length === 0) return;
    setIndustryLoading(true);
    setIndustryError('');
    try {
      await updateBusinessProfile({ categories: industries });
      await finish();
    } catch (err) {
      setIndustryError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setIndustryLoading(false);
    }
  }

  // ── Step 3b — interests (individuals) ──
  const [interests, setInterests] = useState<string[]>([]);
  const [interestsSubmitted, setInterestsSubmitted] = useState(false);
  const [interestsLoading, setInterestsLoading] = useState(false);
  const [interestsError, setInterestsError] = useState('');
  const interestCategories = useAsync((s) => fetchCategories(s, 'BOTH'), []);
  const interestOptions = useMemo(() => sortOtherLast(interestCategories.data ?? []), [interestCategories.data]);

  function toggleInterest(name: string) {
    setInterests((prev) => {
      if (prev.includes(name)) return prev.filter((c) => c !== name);
      if (prev.length >= MAX_INTERESTS) return prev;
      return [...prev, name];
    });
  }

  async function handleInterestsContinue() {
    setInterestsSubmitted(true);
    if (interests.length === 0) return;
    setInterestsLoading(true);
    setInterestsError('');
    try {
      await updateBusinessProfile({ defaultCreatorCategories: interests });
      await finish();
    } catch (err) {
      setInterestsError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setInterestsLoading(false);
    }
  }

  async function finish() {
    await completeOnboarding();
    // Session's `name` was whatever the backend fell back to at signup (the
    // phone number, for phone accounts) — patch it in-memory now so the
    // shell's navbar shows the real business name straight away instead of
    // waiting for the next full session restore.
    updateUser({
      isOnboarded: true,
      name: businessName.trim() || user?.name || '',
      businessProfile: { ...(user?.businessProfile ?? {}), businessName: businessName.trim() },
    });
    setFinished(true);
  }

  useEffect(() => {
    if (!finished) return;
    const id = setTimeout(
      () => navigate(roleHome('BUSINESS'), { replace: true, state: { welcomeToast: true } }),
      3000,
    );
    return () => clearTimeout(id);
  }, [finished, navigate]);

  if (finished) {
    return (
      <OnboardingSuccess
        title={t('businessOnboarding.successTitle')}
        body={t('businessOnboarding.successBody')}
        cta={t('businessOnboarding.exploreBtn')}
        onContinue={() => navigate(roleHome('BUSINESS'), { replace: true, state: { welcomeToast: true } })}
      />
    );
  }

  const STEP_CONFIG: Record<StepKey, { title: string; subtitle: string }> = {
    HIRING_TYPE: { title: t('businessOnboarding.representingTypeTitle'), subtitle: t('businessOnboarding.representingTypeSubtitle') },
    DETAILS: isIndividual
      ? { title: t('businessOnboarding.step1TitleIndividual'), subtitle: t('businessOnboarding.step1SubtitleIndividual') }
      : { title: t('businessOnboarding.step1Title'), subtitle: t('businessOnboarding.step1Subtitle') },
    INDUSTRY: { title: t('businessOnboarding.industryTitle'), subtitle: t('businessOnboarding.industrySubtitle') },
    INTERESTS: { title: t('businessOnboarding.step3Title'), subtitle: t('businessOnboarding.step3Subtitle') },
  };
  const { title, subtitle } = STEP_CONFIG[stepKey];

  return (
    <OnboardingShell
      step={step}
      total={totalSteps}
      stepLabel={t('businessOnboarding.stepIndicator', { n: step, total: totalSteps })}
      backLabel={t('common.back')}
      title={title}
      subtitle={subtitle}
      onBack={() => setStep((s) => s - 1)}
    >
      {stepKey === 'HIRING_TYPE' && (
        <div className="space-y-5">
          {step1Submitted && !representingType && <Alert>{t('businessOnboarding.representingTypeError')}</Alert>}
          {step1Error && <Alert>{step1Error}</Alert>}
          <ChoiceCardGroup
            ariaLabel={t('businessOnboarding.representingTypeTitle')}
            options={representingTypeOptions}
            value={representingType}
            onChange={(v) => {
              setRepresentingType(v);
              setStep1Error('');
            }}
          />
          <Button size="lg" fullWidth loading={step1Loading} onClick={handleRepresentingTypeContinue}>
            {t('businessOnboarding.continueBtn')}
          </Button>
        </div>
      )}

      {stepKey === 'DETAILS' && (
        <div className="space-y-4">
          {detailsError && <Alert>{detailsError}</Alert>}

          <TextField
            label={isIndividual ? t('businessOnboarding.individualNameLabel') : t('businessOnboarding.businessNameLabel')}
            icon={isIndividual ? <User /> : <Building2 />}
            placeholder={isIndividual ? t('businessOnboarding.individualNamePlaceholder') : t('businessOnboarding.businessNamePlaceholder')}
            hint={isIndividual ? t('businessOnboarding.individualNameHint') : t('businessOnboarding.nameHint')}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            error={businessNameError}
          />

          {!isIndividual && (
            <TextField
              label={t('businessOnboarding.contactPersonLabel')}
              icon={<User />}
              placeholder={t('businessOnboarding.contactPersonPlaceholder')}
              hint={t('businessOnboarding.contactPersonHint')}
              value={contactPersonName}
              onChange={(e) => setContactPersonName(e.target.value)}
              error={contactPersonError}
            />
          )}

          {needsEmail && (
            <TextField
              label={t('businessOnboarding.emailLabel')}
              icon={<Mail />}
              placeholder={t('businessOnboarding.emailPlaceholder')}
              inputMode="email"
              autoCapitalize="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
              hint={!emailError ? emailHint : undefined}
              hintTone={emailCheck.data === true ? 'success' : 'default'}
            />
          )}

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink">{t('businessOnboarding.locationLabel')}</p>
            <LocationAutocomplete
              value={location}
              onChange={setLocation}
              placeholder={t('businessOnboarding.locationPlaceholder')}
            />
            {locationError && <p className="mt-1.5 text-[13px] font-medium text-danger">{locationError}</p>}
          </div>

          <Button size="lg" fullWidth loading={detailsLoading} onClick={handleDetailsContinue}>
            {t('businessOnboarding.continueBtn')}
          </Button>
        </div>
      )}

      {stepKey === 'INDUSTRY' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-violet/10 px-3 py-1 text-[12.5px] font-bold text-violet-dark">
              {t('businessOnboarding.industryCounter', { n: industries.length, max: MAX_INDUSTRIES })}
            </span>
          </div>
          {industrySubmitted && industries.length === 0 && <Alert>{t('businessOnboarding.industryError')}</Alert>}
          {industryError && <Alert>{industryError}</Alert>}
          <CategoryPicker categories={industryOptions} selected={industries} onToggle={toggleIndustry} max={MAX_INDUSTRIES} />
          <Button size="lg" fullWidth loading={industryLoading} onClick={handleIndustryContinue}>
            {t('businessOnboarding.completeBtn')}
          </Button>
        </div>
      )}

      {stepKey === 'INTERESTS' && (
        <div className="space-y-5">
          <div className="flex items-center justify-end">
            <span className="rounded-full bg-violet/10 px-3 py-1 text-[12.5px] font-bold text-violet-dark">
              {t('businessOnboarding.interestsCounter', { n: interests.length })}
            </span>
          </div>
          {interestsSubmitted && interests.length === 0 && <Alert>{t('businessOnboarding.interestsError')}</Alert>}
          {interestsError && <Alert>{interestsError}</Alert>}
          <CategoryPicker categories={interestOptions} selected={interests} onToggle={toggleInterest} max={MAX_INTERESTS} />
          <Button size="lg" fullWidth loading={interestsLoading} onClick={handleInterestsContinue}>
            {t('businessOnboarding.completeBtn')}
          </Button>
        </div>
      )}
    </OnboardingShell>
  );
}
