import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Camera, X } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchCategories } from '../api/catalog';
import { createCampaign, generateAiDraft, generateEventAiDraft, uploadCampaignFeatureImage } from '../api/business';
import { AiGeneratingOverlay } from './AiGeneratingOverlay';
import { LocationAutocomplete } from '../public/LocationAutocomplete';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Alert } from '../ui/Alert';
import { SegmentedControl } from '../ui/SegmentedControl';
import { FeaturedEventToggle } from './FeaturedEventToggle';
import { NeedHelpButton } from './NeedHelpModal';
import { cn } from '../ui/cn';
import { OFFERING_OPTIONS, MIN_BUDGET_PER_CREATOR, isoInDays } from './eventFormConstants';
import { ChipGroup } from './eventFormShared';
import { BudgetPicker } from './BudgetPicker';
import { budgetPickerResetKey, type BudgetRateType, type BudgetInputType } from './budgetPickerTypes';
import type { AiDraft } from '../api/business';

type CType = 'PAID_CAMPAIGN' | 'OPEN_EVENT';
// 'prompt' — the AI textarea (or "enter manually"); 'budget' — a dedicated
// "what is your budget?" step shown only when the prompt didn't state one
// (mirrors the mobile app's budget phase); 'details' — the full form,
// pre-filled with everything the AI (or the business) has supplied so far.
type Phase = 'prompt' | 'budget' | 'details';

export function CreateEventPage() {
  const t = useT();
  const navigate = useNavigate();
  const categories = useAsync((s) => fetchCategories(s), []);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);
  const [phase, setPhase] = useState<Phase>('prompt');

  const [featureImageUrl, setFeatureImageUrl] = useState('');
  const [featureImageCredit, setFeatureImageCredit] = useState<{ name: string; profileUrl: string } | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageIsCustom, setImageIsCustom] = useState(false);

  const [cType, setCType] = useState<CType>('PAID_CAMPAIGN');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [selPlatforms, setSelPlatforms] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [budgetRateType, setBudgetRateType] = useState<BudgetRateType>('FIXED');
  const [budgetInputType, setBudgetInputType] = useState<BudgetInputType>('PER_CREATOR');
  // The AI never invents a budget — this tracks whether the prompt actually
  // stated one, so we can ask the business directly when it didn't (mirrors
  // the mobile app's "What is your budget?" step).
  const [aiBudgetStatus, setAiBudgetStatus] = useState<AiDraft['budgetStatus'] | null>(null);
  const [aiStatedAmount, setAiStatedAmount] = useState<number | null>(null);
  const [creatorsNeeded, setCreatorsNeeded] = useState('1');
  const [deadline, setDeadline] = useState(isoInDays(14));
  const [deliverables, setDeliverables] = useState('');
  const [minFollowers, setMinFollowers] = useState('0');
  const [location, setLocation] = useState('');
  const [locationType, setLocationType] = useState<'ONSITE' | 'REMOTE'>('REMOTE');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  // Open-event-only fields (mirrors mobile's "Create Invitation" flow).
  const [benefits, setBenefits] = useState<string[]>([]);
  const [exchangeType, setExchangeType] = useState<string[]>([]);
  const [expectedContent, setExpectedContent] = useState('');
  // The app connects content creators with businesses only, so every open
  // event targets content creators — no picker needed.
  const roleTypes = ['Content Creators'];
  // Defaults to after the shared `deadline` default (isoInDays(14)) so the
  // "RSVP deadline must be before the event date" invariant holds out of the box.
  const [eventDate, setEventDate] = useState(isoInDays(16));
  const [eventTime, setEventTime] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isFree = cType === 'OPEN_EVENT';
  // The AI never invents a budget — when the prompt didn't state one (or gave
  // an amount that could be per-creator or a total), ask for it explicitly
  // instead of leaving the fields silently blank.
  const budgetNeedsInput = aiBudgetStatus === 'AMBIGUOUS' || !(Number(budgetMax) > 0);

  function addHashtag() {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (tag && !hashtags.includes(tag)) setHashtags((prev) => [...prev, tag]);
    setHashtagInput('');
  }

  function onHashtagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addHashtag();
    }
  }

  async function runAi() {
    if (aiPrompt.trim().length < 3) return;
    setAiBusy(true);
    setError('');
    try {
      if (isFree) {
        const d = await generateEventAiDraft(aiPrompt.trim());
        setTitle(d.title);
        setDescription(d.description);
        setCategory(d.category);
        if (d.platform) setSelPlatforms([d.platform]);
        setBenefits(d.benefits ?? []);
        setExchangeType(d.exchangeType ?? []);
        setExpectedContent(d.expectedContent ?? '');
        setCreatorsNeeded(String(d.capacity || 1));
        const venueText = d.venue || d.location;
        if (venueText) {
          setLocation(venueText);
          setLocationType('ONSITE');
        }
        if (d.eventDate) {
          setEventDate(d.eventDate);
          const twoDaysBefore = new Date(d.eventDate);
          twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);
          setDeadline(twoDaysBefore.toISOString().slice(0, 10));
        }
        if (d.eventTime) setEventTime(d.eventTime);
        if (d.featureImageUrl && !imageIsCustom) {
          setFeatureImageUrl(d.featureImageUrl);
          setFeatureImageCredit(d.featureImageCredit ?? null);
        }
      } else {
        const d = await generateAiDraft(aiPrompt.trim());
        setTitle(d.title);
        setDescription(d.description);
        setCategory(d.category);
        if (d.platform) setSelPlatforms([d.platform]);
        setCreatorsNeeded(String(d.creatorsNeeded));
        // budgetMin/budgetMax are the backend-derived per-creator bounds: real
        // numbers only when the prompt stated a budget, 0/0 otherwise (the AI
        // never invents one). Track the status so we can ask for it below.
        setAiBudgetStatus(d.budgetStatus);
        setAiStatedAmount(d.statedAmount);
        setBudgetRateType(d.budgetRateType || 'FIXED');
        setBudgetInputType('PER_CREATOR');
        if (d.budgetMax > 0) {
          setBudgetMin(String(d.budgetMin));
          setBudgetMax(String(d.budgetMax));
        } else {
          setBudgetMin('');
          setBudgetMax('');
        }
        setDeadline(isoInDays(d.suggestedDurationDays || 14));
        const delivText = Object.entries(d.deliverables || {})
          .filter(([, n]) => n > 0)
          .map(([k, n]) => `${n} ${k}`)
          .join(', ');
        if (delivText) setDeliverables(delivText);
        if (d.hashtags?.length) setHashtags(d.hashtags);
        if (d.location) {
          setLocation(d.location);
          setLocationType('ONSITE');
        }
        if (d.featureImageUrl && !imageIsCustom) {
          setFeatureImageUrl(d.featureImageUrl);
          setFeatureImageCredit(d.featureImageCredit ?? null);
        }
        setAiUsed(true);
        // The AI never invents a budget — route through the dedicated budget
        // step first when the prompt didn't state one (or gave an ambiguous
        // figure) instead of landing on the full form budget-less.
        const needsBudget = d.budgetStatus === 'AMBIGUOUS' || !(d.budgetMax > 0);
        setPhase(needsBudget ? 'budget' : 'details');
        return;
      }
      setAiUsed(true);
      setPhase('details');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setAiBusy(false);
    }
  }

  function updateBudget(min: number, max: number, rateType: BudgetRateType, inputType: BudgetInputType) {
    setBudgetMin(String(min));
    setBudgetMax(String(max));
    setBudgetRateType(rateType);
    setBudgetInputType(inputType);
  }

  // The brand stated one figure and the AI couldn't tell if it was per
  // creator or a whole-campaign total — apply the business's answer.
  function resolveAmbiguousBudget(mode: BudgetInputType) {
    const amt = aiStatedAmount ?? 0;
    const count = Math.max(1, Number(creatorsNeeded) || 1);
    const perCreator = mode === 'TOTAL' ? Math.max(0, Math.floor(amt / count)) : amt;
    setBudgetMin(String(perCreator));
    setBudgetMax(String(perCreator));
    setBudgetRateType('FIXED');
    setBudgetInputType(mode);
    setAiBudgetStatus('STATED_PER_CREATOR');
  }

  // Shared by the dedicated budget step and the final publish/save-draft
  // submit, so the two can never validate the same numbers differently.
  function budgetError(): string {
    if (aiBudgetStatus === 'AMBIGUOUS') return t('biz.errBudgetNotSet');
    const max = Number(budgetMax) || 0;
    const min = Number(budgetMin) || max;
    if (max <= 0) return t('biz.errBudgetNotSet');
    if (max < MIN_BUDGET_PER_CREATOR || (budgetRateType === 'RANGE' && min < MIN_BUDGET_PER_CREATOR)) {
      return t('biz.errBudgetMin');
    }
    if (budgetRateType === 'RANGE' && max < min) return t('biz.errBudgetMinMax');
    return '';
  }

  function continueFromBudget() {
    const err = budgetError();
    if (err) return setError(err);
    setError('');
    setPhase('details');
  }

  async function onPickImage(file: File) {
    setImageUploading(true);
    try {
      const { imageUrl } = await uploadCampaignFeatureImage(file);
      setFeatureImageUrl(imageUrl);
      setFeatureImageCredit(null);
      setImageIsCustom(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setImageUploading(false);
    }
  }

  async function submit(e: FormEvent, status: 'DRAFT' | 'ACTIVE') {
    e.preventDefault();
    setError('');

    if (title.trim().length < 3) return setError('Add a title.');
    if (!category) return setError('Pick a category.');

    const min = isFree ? 0 : Number(budgetMin) || 0;
    const max = isFree ? 0 : Number(budgetMax) || min;
    if (!isFree) {
      const err = budgetError();
      if (err) return setError(err);
    }
    if (isFree) {
      if (!eventDate) return setError('Pick an event date.');
      if (new Date(deadline) >= new Date(eventDate)) return setError(t('biz.eventDateBeforeDeadline'));
    }

    setSubmitting(true);
    try {
      const { id } = await createCampaign({
        title: title.trim(),
        description: description.trim(),
        category,
        platforms: selPlatforms,
        campaignType: cType,
        budgetMin: min,
        budgetMax: max,
        budgetInputType,
        budgetRateType,
        creatorsNeeded: Math.max(1, Number(creatorsNeeded) || 1),
        deadline: new Date(deadline).toISOString(),
        deliverables: isFree ? [...exchangeType, expectedContent].filter(Boolean).join(' — ') : deliverables.trim(),
        minFollowers: isFree ? 0 : Number(minFollowers) || 0,
        location: locationType === 'ONSITE' ? location.trim() || undefined : undefined,
        locationType,
        goals: [],
        status,
        aiGenerated: aiUsed,
        aiPrompt: aiUsed ? aiPrompt.trim() : undefined,
        featureImageUrl: featureImageUrl || undefined,
        isFeatured,
        hashtags: isFree ? undefined : hashtags,
        capacity: isFree ? Math.max(1, Number(creatorsNeeded) || 1) : undefined,
        eventDate: isFree ? new Date(eventDate).toISOString() : undefined,
        eventTime: isFree ? eventTime || undefined : undefined,
        venue: isFree ? (location.trim() || undefined) : undefined,
        benefits: isFree ? benefits : undefined,
        targetAudience: isFree ? roleTypes : undefined,
      });
      navigate(`/business/events/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  const promptExamples = isFree
    ? [t('biz.aiExampleFree1'), t('biz.aiExampleFree2'), t('biz.aiExampleFree3')]
    : [t('biz.aiExamplePaid1'), t('biz.aiExamplePaid2'), t('biz.aiExamplePaid3')];

  return (
    <div className="mx-auto max-w-3xl">
      {aiBusy && <AiGeneratingOverlay />}
      <PageHeader title={t('biz.newEvent')} actions={<NeedHelpButton />} />

      {error && <Alert tone="error" className="mb-5">{error}</Alert>}

      {phase !== 'budget' && (
        <>
          <SegmentedControl<CType>
            ariaLabel="Type"
            variant="pill"
            value={cType}
            onChange={(next) => {
              if (next === cType) return;
              setCType(next);
              // Paid and free events use different AI prompt shapes (budget
              // vs. no budget) — a prompt written for one reads oddly, and
              // half-applies, against the other, so start it fresh.
              setAiPrompt('');
            }}
            options={[
              { value: 'PAID_CAMPAIGN', label: t('public.typePaid') },
              { value: 'OPEN_EVENT', label: t('public.typeOpenEvent') },
            ]}
          />

          {/* AI assist */}
          <Card className="mb-6 mt-4 border-violet/25 bg-violet/[0.05]">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-violet" />
              <h2 className="font-serif text-[15px] font-medium tracking-tight text-ink">{t('biz.aiHeading')}</h2>
            </div>
            <Textarea
              label=""
              rows={2}
              className="mt-2"
              placeholder={isFree ? t('biz.aiPlaceholderEvent') : t('biz.aiPlaceholder')}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            />
            <Button variant="secondary" size="sm" loading={aiBusy} disabled={aiPrompt.trim().length < 3} onClick={runAi}>
              <Sparkles size={14} />
              {t('biz.aiGenerate')}
            </Button>
            {phase === 'prompt' && (
              <button type="button" onClick={() => setPhase('details')} className="mt-3 block text-[13px] font-medium text-violet-dark underline">
                {t('biz.enterManually')}
              </button>
            )}
          </Card>

          {phase === 'prompt' && (
            <div className="-mt-4 mb-6">
              <p className="mb-2 text-[12px] font-semibold text-ink-soft">{t('biz.aiExamplesLabel')}</p>
              <div className="flex flex-col gap-2">
                {promptExamples.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setAiPrompt(ex)}
                    className="rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-left text-[13px] text-ink-soft transition-colors hover:border-violet/40 hover:bg-violet/[0.04] hover:text-ink"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {phase === 'budget' && (
        <Card className="mt-4 border-violet/25 bg-violet/[0.05]">
          <button type="button" onClick={() => { setError(''); setPhase('prompt'); }} className="mb-3 text-[13px] font-medium text-ink-soft hover:text-ink">
            {t('biz.backToPrompt')}
          </button>
          <h2 className="font-serif text-[17px] font-medium tracking-tight text-ink">{t('biz.askBudgetHeading')}</h2>
          <p className="mt-1 text-[13px] text-ink-soft">{t('biz.askBudgetSub')}</p>
          <div className="mt-4">
            <BudgetPicker
              key={budgetPickerResetKey({
                inputType: budgetInputType,
                rateType: budgetRateType,
                creatorsNeeded: Number(creatorsNeeded) || 1,
                budgetStatus: aiBudgetStatus,
              })}
              rateType={budgetRateType}
              inputType={budgetInputType}
              budgetMin={Number(budgetMin) || 0}
              budgetMax={Number(budgetMax) || 0}
              creatorsNeeded={Number(creatorsNeeded) || 1}
              onChange={updateBudget}
              ambiguousAmount={aiBudgetStatus === 'AMBIGUOUS' ? aiStatedAmount : null}
              onResolveAmbiguous={resolveAmbiguousBudget}
            />
          </div>
          <Button className="mt-4" size="lg" onClick={continueFromBudget}>
            {t('biz.budgetContinueBtn')}
          </Button>
        </Card>
      )}

      {phase === 'details' && (
        <form onSubmit={(e) => submit(e, 'ACTIVE')} className="space-y-4">
          <div>
            <h2 className="font-serif text-[15px] font-medium tracking-tight text-ink">{t('biz.detailsHeading')}</h2>
            {aiUsed && <p className="mt-0.5 text-[13px] text-ink-soft">{t('biz.detailsHint')}</p>}
          </div>

          {/* Cover image — only appears once there's one to show (AI-suggested
              or previously uploaded); no empty "add an image" prompt upfront. */}
          {featureImageUrl && (
            <Card padded={false}>
              <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-2xl bg-surface-dim sm:h-48">
                <img src={featureImageUrl} alt="" className="h-full w-full object-cover" />

                <button
                  type="button"
                  aria-label={t('biz.removeCoverImage')}
                  onClick={() => {
                    setFeatureImageUrl('');
                    setFeatureImageCredit(null);
                    setImageIsCustom(true);
                  }}
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/50"
                >
                  <X size={15} />
                </button>

                <label
                  className={cn(
                    'absolute bottom-4 right-4 flex cursor-pointer items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-[13px] font-medium text-white backdrop-blur transition-colors hover:bg-black/50',
                    imageUploading ? 'pointer-events-none opacity-70' : '',
                  )}
                >
                  {imageUploading ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                  ) : (
                    <Camera size={14} />
                  )}
                  {t('biz.changeCoverImage')}
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    disabled={imageUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onPickImage(f);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              {featureImageCredit && (
                <p className="px-4 py-2 text-[11px] text-ink-soft">
                  Photo by{' '}
                  <a href={featureImageCredit.profileUrl} target="_blank" rel="noreferrer" className="underline">
                    {featureImageCredit.name}
                  </a>
                </p>
              )}
            </Card>
          )}

          <TextField label={t('biz.fieldTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea label={t('public.eventAboutHeading')} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />

          <Select
            label={t('public.category')}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="—"
            options={(categories.data ?? []).map((c) => ({ value: c.name, label: c.name }))}
          />

          {isFree ? (
            <>
              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-ink">{t('biz.offeringHeading')}</p>
                <ChipGroup options={OFFERING_OPTIONS} values={benefits} onChange={setBenefits} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TextField label={t('biz.eventDateLabel')} type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                <TextField label={t('biz.eventTimeLabel')} type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TextField label={t('biz.capacityLabel')} type="number" min={1} value={creatorsNeeded} onChange={(e) => setCreatorsNeeded(e.target.value)} />
                <TextField label={t('biz.rsvpDeadlineLabel')} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label={t('public.location')}
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value as 'ONSITE' | 'REMOTE')}
                  options={[
                    { value: 'REMOTE', label: t('public.remote') },
                    { value: 'ONSITE', label: t('public.onsite') },
                  ]}
                />
                {locationType === 'ONSITE' && (
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-ink">{t('biz.venueLabel')}</label>
                    <LocationAutocomplete value={location} onChange={setLocation} placeholder={t('biz.venueLabel')} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="mb-1 text-[13px] font-semibold text-ink">
                  {budgetNeedsInput ? t('biz.askBudgetHeading') : t('biz.budgetHeading')}
                </p>
                {budgetNeedsInput && (
                  <p className="mb-2 text-[12px] text-ink-soft">{t('biz.askBudgetSub')}</p>
                )}
                <BudgetPicker
                  key={budgetPickerResetKey({
                    inputType: budgetInputType,
                    rateType: budgetRateType,
                    creatorsNeeded: Number(creatorsNeeded) || 1,
                    budgetStatus: aiBudgetStatus,
                  })}
                  rateType={budgetRateType}
                  inputType={budgetInputType}
                  budgetMin={Number(budgetMin) || 0}
                  budgetMax={Number(budgetMax) || 0}
                  creatorsNeeded={Number(creatorsNeeded) || 1}
                  onChange={updateBudget}
                  ambiguousAmount={aiBudgetStatus === 'AMBIGUOUS' ? aiStatedAmount : null}
                  onResolveAmbiguous={resolveAmbiguousBudget}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TextField label={t('public.navCreators')} type="number" value={creatorsNeeded} onChange={(e) => setCreatorsNeeded(e.target.value)} />
                <TextField label={t('public.deadlineLabel')} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>

              <Textarea label={t('public.deliverablesHeading')} rows={2} value={deliverables} onChange={(e) => setDeliverables(e.target.value)} />

              <div className="grid grid-cols-2 gap-3">
                <TextField label={t('biz.minFollowersField')} type="number" value={minFollowers} onChange={(e) => setMinFollowers(e.target.value)} />
                <Select
                  label={t('public.location')}
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value as 'ONSITE' | 'REMOTE')}
                  options={[
                    { value: 'REMOTE', label: t('public.remote') },
                    { value: 'ONSITE', label: t('public.onsite') },
                  ]}
                />
              </div>
              {locationType === 'ONSITE' && (
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-ink">{t('public.location')}</label>
                  <LocationAutocomplete value={location} onChange={setLocation} placeholder={t('public.location')} />
                </div>
              )}

              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-ink">{t('biz.hashtagsLabel')}</p>
                {hashtags.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {hashtags.map((h) => (
                      <span key={h} className="inline-flex items-center gap-1 rounded-full bg-violet/[0.06] px-2.5 py-1 text-[12px] font-medium text-violet-dark">
                        #{h}
                        <button type="button" onClick={() => setHashtags((prev) => prev.filter((x) => x !== h))} aria-label={`Remove #${h}`}>
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <TextField
                  label=""
                  placeholder={t('biz.hashtagsPlaceholder')}
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={onHashtagKeyDown}
                  onBlur={addHashtag}
                />
              </div>
            </>
          )}

          <FeaturedEventToggle checked={isFeatured} onChange={setIsFeatured} />

          <div className="flex gap-2 pt-2">
            <Button type="submit" size="lg" loading={submitting}>
              {t('biz.publish')}
            </Button>
            <Button type="button" size="lg" variant="secondary" disabled={submitting} onClick={(e) => submit(e as unknown as FormEvent, 'DRAFT')}>
              {t('biz.saveDraft')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
