import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Users, AtSign, Mail, Sparkles, Handshake, Wallet } from 'lucide-react';
import { useAppAuth } from '../auth/AppAuthContext';
import { useT } from '../i18n';
import { roleHome } from '../routes';
import { useAsync } from '../lib/useAsync';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { updateCreatorProfile, isUsernameAvailable } from '../api/creator';
import { isEmailAvailable, completeOnboarding } from '../api/auth';
import { fetchCategories } from '../api/catalog';
import { sortOtherLast } from '../lib/sortOtherLast';
import { resolveAvailableUsernames } from '../lib/usernameSuggestions';
import { OnboardingShell, OnboardingSuccess } from './OnboardingShell';
import { ChoiceCardGroup, type ChoiceOption } from './ChoiceCard';
import { CategoryPicker } from './CategoryPicker';
import { LocationAutocomplete } from '../public/LocationAutocomplete';
import { TextField } from '../ui/TextField';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

const TOTAL_STEPS = 3;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CATEGORIES = 5;

type ProviderType = 'INDIVIDUAL' | 'TEAM';

// Seeded bio, editable later from the profile page — worded per provider type,
// same templates mobile's onboarding.tsx uses.
function generateProviderBio(categories: string[], providerType: ProviderType | null): string {
  if (categories.length === 0) return '';
  const catStr =
    categories.length === 1
      ? categories[0]
      : `${categories.slice(0, -1).join(', ')} and ${categories[categories.length - 1]}`;
  if (providerType === 'TEAM') {
    return `We're a ${catStr} team that works together on every booking, from planning through final delivery. We love working with clients who care about the details and want a crew they can count on.`;
  }
  return `I'm a ${catStr} content creator passionate about sharing authentic stories and engaging experiences. I love collaborating with businesses that align with my values to create content that truly connects with audiences and drives meaningful results.`;
}

export function CreatorOnboarding() {
  const t = useT();
  const navigate = useNavigate();
  const { user, updateUser } = useAppAuth();
  const [step, setStep] = useState(1);
  const [finished, setFinished] = useState(false);

  const needsEmail = !user?.isEmailVerified;

  // ── Step 1 — provider type ──
  const [providerType, setProviderType] = useState<ProviderType | null>(null);
  const [step1Submitted, setStep1Submitted] = useState(false);
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1Error, setStep1Error] = useState('');

  const providerTypeOptions: ChoiceOption<ProviderType>[] = [
    { value: 'INDIVIDUAL', icon: <User size={18} />, title: t('providerType.individual'), description: t('providerType.individualDesc') },
    { value: 'TEAM', icon: <Users size={18} />, title: t('providerType.team'), description: t('providerType.teamDesc') },
  ];

  async function handleProviderTypeContinue() {
    setStep1Submitted(true);
    if (!providerType) return;
    setStep1Loading(true);
    setStep1Error('');
    try {
      await updateCreatorProfile({ providerType });
      setStep(2);
    } catch (err) {
      setStep1Error(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setStep1Loading(false);
    }
  }

  // ── Step 2 — profile basics ──
  const isTeam = providerType === 'TEAM';
  const [fullName, setFullName] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [location, setLocation] = useState('');
  const [step2Submitted, setStep2Submitted] = useState(false);
  const [step2Loading, setStep2Loading] = useState(false);
  const [step2Error, setStep2Error] = useState('');

  const debouncedUsername = useDebouncedValue(username.trim(), 400);
  const usernameCheck = useAsync(
    async (signal) => {
      if (debouncedUsername.length < 3 || !/^[a-zA-Z0-9_]+$/.test(debouncedUsername)) return null;
      return isUsernameAvailable(debouncedUsername, signal);
    },
    [debouncedUsername],
  );

  const debouncedFullName = useDebouncedValue(fullName.trim(), 400);
  const usernameSuggestions = useAsync(
    async (signal) => {
      if (!debouncedFullName) return [];
      return resolveAvailableUsernames(debouncedFullName, signal);
    },
    [debouncedFullName],
  );

  const debouncedEmail = useDebouncedValue(email.trim(), 400);
  const emailCheck = useAsync(
    async (signal) => {
      if (!needsEmail || !EMAIL_REGEX.test(debouncedEmail)) return null;
      return isEmailAvailable(debouncedEmail, signal);
    },
    [debouncedEmail, needsEmail],
  );

  const teamSizeNum = parseInt(teamSize, 10);
  const teamSizeValid = !isTeam || (Number.isFinite(teamSizeNum) && teamSizeNum >= 2 && teamSizeNum <= 500);
  const usernameValid = username.trim().length >= 3 && /^[a-zA-Z0-9_]+$/.test(username.trim());
  const emailValid = !needsEmail || (email.trim().length > 0 && EMAIL_REGEX.test(email.trim()));
  const step2Valid =
    fullName.trim().length > 0 &&
    teamSizeValid &&
    usernameValid &&
    usernameCheck.data !== false &&
    emailValid &&
    emailCheck.data !== false &&
    location.trim().length > 0;

  const fullNameError = step2Submitted && !fullName.trim() ? (isTeam ? t('onboarding.teamNameRequired') : t('onboarding.fullNameRequired')) : undefined;
  const teamSizeError = isTeam && step2Submitted && !teamSizeValid
    ? (teamSize.trim() ? t('onboarding.teamSizeInvalid') : t('onboarding.teamSizeRequired'))
    : undefined;
  const usernameError = step2Submitted && !usernameValid
    ? (!username.trim() ? t('onboarding.usernameRequired') : username.trim().length < 3 ? t('onboarding.usernameMinLength') : t('onboarding.usernamePattern'))
    : usernameCheck.data === false
      ? t('onboarding.usernameTaken')
      : undefined;
  const emailError = needsEmail && step2Submitted && !emailValid
    ? (!email.trim() ? t('onboarding.emailRequired') : t('onboarding.emailInvalid'))
    : emailCheck.data === false
      ? t('onboarding.emailTaken')
      : undefined;
  const usernameHint = usernameCheck.data === true ? t('onboarding.usernameAvailable') : t('onboarding.usernameHint');
  const emailHint = emailCheck.loading ? t('onboarding.emailChecking') : emailCheck.data === true ? t('onboarding.emailAvailable') : undefined;
  const locationError = step2Submitted && !location.trim() ? t('onboarding.locationRequired') : undefined;

  async function handleStep2Continue() {
    setStep2Submitted(true);
    if (!step2Valid) return;
    setStep2Loading(true);
    setStep2Error('');
    try {
      await updateCreatorProfile({
        fullName: fullName.trim(),
        teamSize: isTeam ? teamSizeNum : undefined,
        email: needsEmail ? email.trim() : undefined,
        username: username.trim(),
        location: location.trim(),
      });
      setStep(3);
    } catch (err) {
      setStep2Error(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setStep2Loading(false);
    }
  }

  // ── Step 3 — categories (final) ──
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [step3Submitted, setStep3Submitted] = useState(false);
  const [step3Loading, setStep3Loading] = useState(false);
  const [step3Error, setStep3Error] = useState('');
  const categories = useAsync((s) => fetchCategories(s, 'BOTH'), []);
  const categoryOptions = useMemo(() => sortOtherLast(categories.data ?? []), [categories.data]);

  function toggleCategory(name: string) {
    setSelectedCategories((prev) => {
      if (prev.includes(name)) return prev.filter((c) => c !== name);
      if (prev.length >= MAX_CATEGORIES) return prev;
      return [...prev, name];
    });
  }

  async function handleStep3Continue() {
    setStep3Submitted(true);
    if (selectedCategories.length === 0) return;
    setStep3Loading(true);
    setStep3Error('');
    try {
      const bio = generateProviderBio(selectedCategories, providerType);
      await updateCreatorProfile({ categories: selectedCategories, bio });
      await completeOnboarding();
      // Session's `name`/`creatorProfile.fullName` were whatever the backend
      // fell back to at signup (the phone number, for phone accounts) — patch
      // them in-memory now so the shell's navbar shows the real name straight
      // away instead of waiting for the next full session restore.
      updateUser({
        isOnboarded: true,
        name: fullName.trim() || user?.name || '',
        creatorProfile: user?.creatorProfile
          ? { ...user.creatorProfile, fullName: fullName.trim() }
          : user?.creatorProfile ?? null,
      });
      setFinished(true);
    } catch (err) {
      setStep3Error(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setStep3Loading(false);
    }
  }

  useEffect(() => {
    if (!finished) return;
    const id = setTimeout(
      () => navigate(roleHome('CREATOR'), { replace: true, state: { welcomeToast: true } }),
      3000,
    );
    return () => clearTimeout(id);
  }, [finished, navigate]);

  if (finished) {
    return (
      <OnboardingSuccess
        title={t('onboarding.successTitle')}
        body={t('onboarding.successBody')}
        cta={t('onboarding.successBtn')}
        onContinue={() => navigate(roleHome('CREATOR'), { replace: true, state: { welcomeToast: true } })}
      />
    );
  }

  const nameCopy = isTeam
    ? { label: t('onboarding.teamNameLabel'), placeholder: t('onboarding.teamNamePlaceholder') }
    : { label: t('onboarding.fullNameLabel'), placeholder: t('onboarding.fullNamePlaceholder') };

  const STEP_CONFIG = [
    { title: t('onboarding.providerTypeTitle'), subtitle: t('onboarding.providerTypeSubtitle') },
    isTeam
      ? { title: t('onboarding.step1TitleTeam'), subtitle: t('onboarding.step1SubtitleTeam') }
      : { title: t('onboarding.step1Title'), subtitle: t('onboarding.step1Subtitle') },
    { title: t('onboarding.step2Title'), subtitle: t('onboarding.step2Subtitle') },
  ];
  const { title, subtitle } = STEP_CONFIG[step - 1]!;

  return (
    <OnboardingShell
      step={step}
      total={TOTAL_STEPS}
      stepLabel={t('onboarding.stepIndicator', { n: step, total: TOTAL_STEPS })}
      backLabel={t('common.back')}
      title={title}
      subtitle={subtitle}
      onBack={() => setStep((s) => s - 1)}
      panelImage="/landing/photographer.jpeg"
      panelImageAlt=""
      panelHeadline={t('onboarding.panelHeadline')}
      panelPoints={[
        { icon: <Sparkles size={16} />, title: t('onboarding.panelPoint1Title'), desc: t('onboarding.panelPoint1Desc') },
        { icon: <Handshake size={16} />, title: t('onboarding.panelPoint2Title'), desc: t('onboarding.panelPoint2Desc') },
        { icon: <Wallet size={16} />, title: t('onboarding.panelPoint3Title'), desc: t('onboarding.panelPoint3Desc') },
      ]}
    >
      {step === 1 && (
        <div className="space-y-5">
          {step1Submitted && !providerType && <Alert>{t('onboarding.providerTypeError')}</Alert>}
          {step1Error && <Alert>{step1Error}</Alert>}
          <ChoiceCardGroup
            ariaLabel={t('onboarding.providerTypeTitle')}
            options={providerTypeOptions}
            value={providerType}
            onChange={(v) => {
              setProviderType(v);
              setStep1Error('');
            }}
          />
          <Button size="lg" fullWidth loading={step1Loading} onClick={handleProviderTypeContinue}>
            {t('onboarding.continueBtn')}
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {step2Error && <Alert>{step2Error}</Alert>}

          <TextField
            label={nameCopy.label}
            icon={<User />}
            placeholder={nameCopy.placeholder}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={fullNameError}
          />

          {isTeam && (
            <TextField
              label={t('onboarding.teamSizeLabel')}
              icon={<Users />}
              placeholder={t('onboarding.teamSizePlaceholder')}
              hint={t('onboarding.teamSizeHint')}
              inputMode="numeric"
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
              error={teamSizeError}
            />
          )}

          <div>
            <TextField
              label={t('onboarding.usernameLabel')}
              icon={<AtSign />}
              placeholder={t('onboarding.usernamePlaceholder')}
              autoCapitalize="none"
              autoCorrect="off"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))}
              error={usernameError}
              hint={!usernameError ? usernameHint : undefined}
            />
            {!!usernameSuggestions.data?.length && (
              <div className="mt-2">
                <p className="mb-1.5 text-[12px] font-medium text-ink-soft">{t('onboarding.usernameSuggestions')}</p>
                <div className="flex flex-wrap gap-2">
                  {usernameSuggestions.data.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setUsername(s)}
                      className="rounded-full border border-violet/30 bg-violet/10 px-3 py-1 text-[13px] font-semibold text-violet-dark transition-colors hover:bg-violet/20"
                    >
                      @{s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {needsEmail && (
            <TextField
              label={t('onboarding.emailLabel')}
              icon={<Mail />}
              placeholder={t('onboarding.emailPlaceholder')}
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
            <p className="mb-1.5 text-[13px] font-semibold text-ink">
              {isTeam ? t('onboarding.locationLabelBased') : t('onboarding.locationLabel')}
            </p>
            <LocationAutocomplete
              value={location}
              onChange={setLocation}
              placeholder={t('onboarding.locationPlaceholder')}
            />
            {locationError && <p className="mt-1.5 text-[13px] font-medium text-danger">{locationError}</p>}
          </div>

          <Button size="lg" fullWidth loading={step2Loading} onClick={handleStep2Continue}>
            {t('onboarding.continueBtn')}
          </Button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-violet/10 px-3 py-1 text-[12.5px] font-bold text-violet-dark">
              {t('onboarding.categorySelected', { n: selectedCategories.length })}
            </span>
            {selectedCategories.length === MAX_CATEGORIES && (
              <span className="text-[12px] font-semibold text-danger">{t('onboarding.maxReached')}</span>
            )}
          </div>

          {step3Submitted && selectedCategories.length === 0 && <Alert>{t('onboarding.categoryError')}</Alert>}
          {step3Error && <Alert>{step3Error}</Alert>}

          <CategoryPicker categories={categoryOptions} selected={selectedCategories} onToggle={toggleCategory} max={MAX_CATEGORIES} />

          <Button size="lg" fullWidth loading={step3Loading} onClick={handleStep3Continue}>
            {t('onboarding.completeBtn')}
          </Button>
        </div>
      )}
    </OnboardingShell>
  );
}
