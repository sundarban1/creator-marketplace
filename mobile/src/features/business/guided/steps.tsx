import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCategories, sortOtherLast } from '@/hooks/useCategories';
import { usePlatforms } from '@/hooks/usePlatforms';
import { Button } from '@/components/Button';
import { DatePickerField } from '@/features/business/components/DatePickerField';
import { PerCreatorBudgetPicker } from '@/features/business/components/CampaignFormControls';
import { VoicePromptInput } from '@/features/business/components/VoicePromptInput';
import { transcribeAudio } from '@/services/audioTranscribe';
import { F, SPACING } from '@/utilities/constants';
import { guidedCampaignService, type AiClarifyingQuestion, type CampaignBrief, type DeliverableItem } from '@/services/guidedCampaign';
import { MIN_BUDGET_PER_CREATOR, type CampaignRuleIssue } from '../utils/campaignRules';
import { toAiContext, type GuidedForm } from './guidedModel';
import { StartFromTemplates, type StartSource } from './templates';
import { BRIEF_SECTIONS, CREATOR_TIERS, sectionFilled, type BriefFieldDef } from './briefSections';
import {
  StepShell, Field, FooterNav, ChoiceChips, RecommendButton, LinkButton, SuggestionNote, ProvenanceTag,
  IssueNote, WhyAsking, Input, ListInput, Stepper, LocationPicker, DeliverablesEditor, st,
} from './parts';

// Native step screens — same flow and rules as web/src/app/business/guided/steps.tsx.

export type Update = (patch: Partial<GuidedForm>, userKeys?: string[]) => void;

interface StepProps {
  form: GuidedForm;
  update: Update;
  issues: CampaignRuleIssue[];
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  header?: ReactNode;
}

const issueFor = (issues: CampaignRuleIssue[], ...fields: string[]) => issues.find((i) => fields.includes(i.field));
const toDate = (d: string) => (d ? new Date(`${d}T00:00:00`) : null);
const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "Make this clearer" (§18) — the business picks: use it or keep theirs. */
function MakeClearer({ field, text, form, onUse }: { field: 'idea' | 'description'; text: string; form: GuidedForm; onUse: (v: string) => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [none, setNone] = useState(false);
  if (text.trim().length < 3) return null;
  return (
    <View style={{ marginTop: SPACING.sm }}>
      {!suggestion ? (
        <LinkButton
          icon="magic"
          label={busy ? t('guided.thinking') : t('guided.makeClearer')}
          onPress={async () => {
            if (busy) return;
            setBusy(true); setNone(false);
            try {
              const s = await guidedCampaignService.improve(field, text, toAiContext(form));
              if (s) setSuggestion(s); else setNone(true);
            } catch { setNone(true); } finally { setBusy(false); }
          }}
        />
      ) : null}
      {none ? <Text style={[st.small, { color: C.textSecondary }]}>{t('guided.makeClearerNone')}</Text> : null}
      {suggestion ? (
        <SuggestionNote actions={<>
          <Button label={t('guided.useThis')} size="small" onPress={() => { onUse(suggestion); setSuggestion(null); }} />
          <Button label={t('guided.keepMine')} size="small" variant="ghost" onPress={() => setSuggestion(null)} />
        </>}>
          {suggestion}
        </SuggestionNote>
      ) : null}
    </View>
  );
}

// ── Start (§3) ───────────────────────────────────────────────────────────────

const QUICK_STARTS = ['promote', 'launch', 'event', 'ugc', 'awareness', 'other'] as const;
type QuickStart = (typeof QUICK_STARTS)[number];

export function StartStep({ form, update, onCreateWithAi, onManual, busy, onInputSource, header, onStartFrom, startingFrom }: {
  form: GuidedForm;
  update: Update;
  onCreateWithAi: () => void;
  onManual: () => void;
  busy: boolean;
  onInputSource: (s: 'voice' | 'text') => void;
  header?: ReactNode;
  onStartFrom?: (s: StartSource) => void;
  startingFrom?: string | null;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const text = form.aiPrompt;
  // Quick-start pills can be switched freely: the previous pill's seed is
  // swapped for the new one (anything typed after it is kept); text the
  // business wrote from scratch is never overwritten.
  const seedOf = (k: QuickStart) => t(`guided.quickStartSeed_${k}`);
  const [quickStart, setQuickStart] = useState<QuickStart | null>(() => QUICK_STARTS.find((k) => seedOf(k) && text.startsWith(seedOf(k))) ?? null);
  const pickQuickStart = (k: QuickStart) => {
    const prevSeed = QUICK_STARTS.map(seedOf).find((s) => s && text.startsWith(s));
    const rest = prevSeed ? text.slice(prevSeed.length) : text;
    const aiPrompt = prevSeed || !text.trim() ? seedOf(k) + rest.trimStart() : text;
    const goal = k === 'awareness' ? 'Brand Awareness' : quickStart === 'awareness' && form.goal === 'Brand Awareness' ? '' : form.goal;
    setQuickStart(k);
    update({ aiPrompt, goal });
  };
  return (
    <StepShell
      header={header}
      subtitle={t('guided.startSub')}
      footer={
        <View style={{ gap: SPACING.sm }}>
          <Button label={t('guided.createWithAi')} icon="magic" onPress={onCreateWithAi} loading={busy} disabled={text.trim().length < 3 || transcribing} fullWidth />
          <Button label={t('guided.fillMyself')} variant="ghost" onPress={onManual} fullWidth />
        </View>
      }>
      <View>
        <TextInput
          value={text}
          onChangeText={(v) => { onInputSource('text'); update({ aiPrompt: v }); }}
          placeholder={t('guided.startPlaceholder')}
          placeholderTextColor={C.textPlaceholder}
          multiline
          textAlignVertical="top"
          accessibilityLabel={t('guided.startSub')}
          style={[st.input, { minHeight: 140, paddingTop: 14, borderColor: C.border, backgroundColor: C.surface, color: C.text }]}
        />
        <MakeClearer field="idea" text={text} form={form} onUse={(v) => update({ aiPrompt: v })} />
      </View>

      {/* Speak instead of typing — transcribed into the box for the business to check.
          Voice input disabled for now; uncomment to bring it back.
      <View style={{ gap: SPACING.sm }}>
        <Text style={[st.small, { color: C.textSecondary }]}>{t('guided.orSpeak')}</Text>
        <VoicePromptInput
          disabled={busy || transcribing}
          onRecorded={async (uri) => {
            setTranscribing(true); setVoiceError('');
            try {
              const said = await transcribeAudio(uri);
              onInputSource('voice');
              update({ aiPrompt: text.trim() ? `${text.trim()} ${said}` : said });
            } catch (e) {
              setVoiceError(e instanceof Error ? e.message : t('guided.voiceFailed'));
            } finally { setTranscribing(false); }
          }}
          onDiscard={() => undefined}
          onError={setVoiceError}
        />
        {transcribing ? <ActivityIndicator color={C.brinjal1} /> : null}
        {voiceError ? <Text style={[st.small, { color: C.error }]}>{voiceError}</Text> : null}
      </View>
      */}

      <Field label={t('guided.quickStartLabel')}>
        <ChoiceChips<QuickStart>
          value={quickStart}
          onChange={pickQuickStart}
          options={QUICK_STARTS.map((k) => ({ value: k, label: t(`guided.quickStart_${k}`) }))}
        />
      </Field>

      {onStartFrom ? <StartFromTemplates onPick={onStartFrom} busyId={startingFrom ?? null} /> : null}
    </StepShell>
  );
}

// ── Clarify (§14) ────────────────────────────────────────────────────────────

export function ClarifyStep({ form, update, questions, onNext, onBack }: StepProps & { questions: AiClarifyingQuestion[] }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [answers, setAnswers] = useState<Record<string, string | null>>(() => Object.fromEntries(questions.map((q) => [q.id, q.suggested])));
  const answer = (q: AiClarifyingQuestion, value: string) => {
    setAnswers((a) => ({ ...a, [q.id]: value }));
    if (q.id === 'CREATORS_VISIT') {
      if (value === 'YES') update({ locationType: 'ONSITE', locationScope: 'SPECIFIC' }, ['locationType']);
      else if (value === 'NO') update({ locationType: 'REMOTE' }, ['locationType']);
      else update({ locationType: null }, ['locationType']);
    }
    if (q.id === 'LOCATION') update({ locationScope: value as GuidedForm['locationScope'], ...(value !== 'SPECIFIC' ? { locations: [] } : {}) }, ['locations']);
  };
  return (
    <StepShell title={t('guided.clarifyTitle')} subtitle={t('guided.clarifySub')} footer={<FooterNav onBack={onBack} onNext={onNext} />}>
      {questions.map((q) => (
        <View key={q.id} style={[st.card, { borderColor: C.border, backgroundColor: C.surface }]}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <FontAwesome5 name="lightbulb" solid size={14} color={C.accent} style={{ marginTop: 3 }} />
            <Text style={[st.fieldLabel, { color: C.text, flex: 1 }]}>{q.question}</Text>
          </View>
          <ChoiceChips value={answers[q.id] ?? null} onChange={(v) => answer(q, v)} options={q.options} />
          {q.suggested && answers[q.id] === q.suggested ? <Text style={[st.small, { color: C.textSecondary }]}>{t('guided.kolabGuessed')}</Text> : null}
          {q.id === 'LOCATION' && answers[q.id] === 'SPECIFIC' ? (
            <LocationPicker locationType={form.locationType} locationScope="SPECIFIC" locations={form.locations} onChange={(n) => update(n, ['locations'])} />
          ) : null}
        </View>
      ))}
    </StepShell>
  );
}

// ── Basics (Step 2) ──────────────────────────────────────────────────────────

const GOALS = ['Brand Awareness', 'More Customers', 'Sales', 'Followers & Engagement'] as const;

export function BasicsStep({ form, update, issues, onNext, onBack, nextLabel, header }: StepProps) {
  const { t } = useLanguage();
  return (
    <StepShell header={header} title={t('guided.basicsTitle')} subtitle={t('guided.basicsSub')} footer={<FooterNav onBack={onBack} onNext={onNext} nextLabel={nextLabel} />}>
      <Field label={t('guided.titleLabel')} accessory={<ProvenanceTag value={form.aiProvenance.title} />}>
        <Input value={form.title} maxLength={120} placeholder={t('guided.titlePlaceholder')} onChangeText={(v) => update({ title: v }, ['title'])} />
        <IssueNote issue={issueFor(issues, 'title')} />
      </Field>
      <Field label={t('guided.descriptionLabel')} accessory={<ProvenanceTag value={form.aiProvenance.description} />}>
        <Input value={form.description} multiline placeholder={t('guided.descriptionPlaceholder')} onChangeText={(v) => update({ description: v }, ['description'])} />
        <MakeClearer field="description" text={form.description} form={form} onUse={(v) => update({ description: v }, ['description'])} />
        <IssueNote issue={issueFor(issues, 'description')} />
      </Field>
      <Field label={t('guided.goalLabel')} accessory={<ProvenanceTag value={form.aiProvenance.goal} />}>
        <ChoiceChips<string>
          value={form.goal || null}
          onChange={(v) => update({ goal: v === 'NOT_SURE' ? '' : v }, ['goal'])}
          options={[...GOALS.map((g) => ({ value: g, label: t(`guided.goal_${g}`) })), { value: 'NOT_SURE', label: t('guided.notSure') }]}
        />
      </Field>
      <View>
        <LocationPicker locationType={form.locationType} locationScope={form.locationScope} locations={form.locations} onChange={(n) => update(n, ['locations', 'locationType'])} />
        <IssueNote issue={issueFor(issues, 'locations')} />
      </View>
    </StepShell>
  );
}

// ── Creators (Step 3) ────────────────────────────────────────────────────────

const COUNT_BUCKETS = [{ value: '1-3', n: 2 }, { value: '4-10', n: 5 }, { value: '10+', n: 12 }] as const;

export function CreatorsStep({ form, update, issues, onNext, onBack, nextLabel, header }: StepProps) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories } = useCategories('BOTH');
  const { platforms: livePlatforms } = usePlatforms();
  const [rec, setRec] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const recommendCount = async () => {
    setBusy(true);
    try {
      const r = await guidedCampaignService.recommend<number>('creatorsNeeded', toAiContext(form));
      update({ creatorsNeeded: r.value, aiProvenance: { ...form.aiProvenance, creatorsNeeded: 'AI_SUGGESTED' } });
      setRec(r.reason);
    } catch { /* optional */ } finally { setBusy(false); }
  };

  const allCats = sortOtherLast(categories).map((c) => c.name);
  const cats = Array.from(new Set([form.category, ...allCats].filter(Boolean))).slice(0, showAll ? 80 : 8);
  const count = form.creatorsNeeded;
  const bucket = count == null ? null : count <= 3 ? '1-3' : count <= 10 ? '4-10' : '10+';
  const platforms = Array.from(new Set([...(livePlatforms.length ? livePlatforms.map((p) => p.name) : ['Instagram', 'TikTok', 'YouTube', 'Facebook']), ...form.platforms]));

  return (
    <StepShell header={header} title={t('guided.creatorsTitle')} subtitle={t('guided.creatorsSub')} footer={<FooterNav onBack={onBack} onNext={onNext} nextLabel={nextLabel} />}>
      <Field label={t('guided.creatorTypeLabel')} accessory={<ProvenanceTag value={form.aiProvenance.category} />}>
        <ChoiceChips<string> value={form.category || null} onChange={(v) => update({ category: v }, ['category'])} options={cats.map((c) => ({ value: c, label: c }))} />
        {allCats.length > 8 ? <LinkButton icon={showAll ? 'chevron-up' : 'chevron-down'} label={showAll ? t('guided.showFewer') : t('guided.showAllTypes')} onPress={() => setShowAll((v) => !v)} /> : null}
        <IssueNote issue={issueFor(issues, 'category')} />
      </Field>

      <Field label={t('guided.howManyLabel')} accessory={<><ProvenanceTag value={form.aiProvenance.creatorsNeeded} /><WhyAsking text={t('guided.whyCreatorsCount')} onRecommend={recommendCount} /></>}>
        <ChoiceChips<string>
          value={bucket}
          onChange={(v) => {
            if (v === 'NOT_SURE') { void recommendCount(); return; }
            setRec(null);
            update({ creatorsNeeded: COUNT_BUCKETS.find((b) => b.value === v)!.n }, ['creatorsNeeded']);
          }}
          options={[...COUNT_BUCKETS.map((b) => ({ value: b.value, label: b.value })), { value: 'NOT_SURE', label: t('guided.notSure') }]}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.md, flexWrap: 'wrap' }}>
          <Stepper value={count ?? 1} onChange={(n) => { setRec(null); update({ creatorsNeeded: n }, ['creatorsNeeded']); }} label={t('guided.howManyLabel')} />
          <RecommendButton onPress={recommendCount} loading={busy} />
        </View>
        {rec ? <View style={{ marginTop: SPACING.sm }}><SuggestionNote>{rec}</SuggestionNote></View> : null}
        <IssueNote issue={issueFor(issues, 'creatorsNeeded')} />
      </Field>

      <Field label={t('guided.platformsLabel')} accessory={<><ProvenanceTag value={form.aiProvenance.platforms} /><WhyAsking text={t('guided.whyPlatforms')} /></>}>
        <ChoiceChips<string>
          multi
          value={form.platforms}
          onChange={(p) => {
            const next = form.platforms.includes(p) ? form.platforms.filter((x) => x !== p) : [...form.platforms, p].slice(-3);
            update({ platforms: next }, ['platforms']);
          }}
          options={platforms.map((p) => ({ value: p, label: p }))}
        />
        <Text style={[st.small, { color: C.textSecondary, marginTop: 6 }]}>{t('guided.platformsHint')}</Text>
        <IssueNote issue={issueFor(issues, 'platforms')} />
      </Field>

      <Field label={t('guided.minFollowersLabel')} optional accessory={<WhyAsking text={t('guided.whyMinFollowers')} />}>
        <Input
          value={form.minFollowers ? String(form.minFollowers) : ''}
          keyboardType="number-pad"
          placeholder={t('guided.minFollowersPlaceholder')}
          onChangeText={(v) => update({ minFollowers: Math.max(0, Number(v.replace(/\D/g, '')) || 0) }, ['minFollowers'])}
        />
      </Field>
    </StepShell>
  );
}

// ── Content (Step 4) ─────────────────────────────────────────────────────────

export function ContentStep({ form, update, issues, onNext, onBack, onAdvanced, nextLabel, header }: StepProps & { onAdvanced: () => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [rec, setRec] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const recommend = async () => {
    setBusy(true);
    try {
      const r = await guidedCampaignService.recommend<DeliverableItem[]>('deliverables', toAiContext(form));
      update({ deliverableItems: r.value, aiProvenance: { ...form.aiProvenance, deliverableItems: 'AI_SUGGESTED' } });
      setRec(r.reason);
    } catch { /* optional */ } finally { setBusy(false); }
  };
  return (
    <StepShell header={header} title={t('guided.contentTitle')} subtitle={t('guided.contentSub')} example={t('guided.contentExample')} footer={<FooterNav onBack={onBack} onNext={onNext} nextLabel={nextLabel} />}>
      <Field label={t('guided.deliverablesLabel')} accessory={<><ProvenanceTag value={form.aiProvenance.deliverableItems} /><WhyAsking label={t('guided.whatsTheDifference')} text={t('guided.helpDeliverableTypes')} onRecommend={recommend} /></>}>
        <DeliverablesEditor items={form.deliverableItems} platforms={form.platforms} onChange={(items) => { setRec(null); update({ deliverableItems: items }, ['deliverableItems']); }} />
        <RecommendButton onPress={recommend} loading={busy} />
        {rec ? <SuggestionNote>{rec}</SuggestionNote> : null}
        <IssueNote issue={issueFor(issues, 'deliverableItems')} />
      </Field>
      <Field label={t('guided.hashtagsLabel')} optional accessory={<ProvenanceTag value={form.aiProvenance.hashtags} />}>
        <ListInput values={form.hashtags} prefix="#" placeholder={t('guided.hashtagsPlaceholder')} onChange={(v) => update({ hashtags: v }, ['hashtags'])} />
      </Field>
      <Pressable onPress={onAdvanced} style={({ pressed }) => [st.chip, { borderColor: C.border, borderStyle: 'dashed', alignSelf: 'flex-start', opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button">
        <FontAwesome5 name="plus" size={11} color={C.text} />
        <Text style={[st.chipTxt, { color: C.text }]}>{t('guided.addAdvanced')}</Text>
      </Pressable>
    </StepShell>
  );
}

// ── Budget & timing (Step 5) ─────────────────────────────────────────────────

const BUDGET_BUCKETS = [{ value: 'UNDER_5K', total: 5000 }, { value: '5K_25K', total: 15000 }, { value: '25K_100K', total: 50000 }] as const;

export function BudgetStep({ form, update, issues, onNext, onBack, nextLabel, header }: StepProps) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [nonce, setNonce] = useState(0);
  const [rec, setRec] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bucket, setBucket] = useState<string | null>(null);
  const creators = Math.max(1, form.creatorsNeeded ?? 1);
  const exchange = form.paymentType === 'Product Exchange';

  const recommend = async () => {
    setBusy(true);
    try {
      const r = await guidedCampaignService.recommend<{ budgetMin: number; budgetMax: number }>('budget', toAiContext(form));
      update({ budgetMin: r.value.budgetMin, budgetMax: r.value.budgetMax, budgetRateType: 'RANGE', budgetInputType: 'PER_CREATOR', aiProvenance: { ...form.aiProvenance, budget: 'AI_SUGGESTED' } });
      setNonce((n) => n + 1);
      setRec(r.reason);
    } catch { /* optional */ } finally { setBusy(false); }
  };
  const pickBucket = (v: string) => {
    setBucket(v);
    if (v === 'NOT_SURE') { void recommend(); return; }
    const b = BUDGET_BUCKETS.find((x) => x.value === v)!;
    const per = Math.max(MIN_BUDGET_PER_CREATOR, Math.floor(b.total / creators));
    setRec(null);
    update({ budgetMin: per, budgetMax: per, budgetRateType: 'FIXED', budgetInputType: 'TOTAL' }, ['budget']);
    setNonce((n) => n + 1);
  };

  return (
    <StepShell header={header} title={t('guided.budgetTitle')} subtitle={t('guided.budgetSub')} footer={<FooterNav onBack={onBack} onNext={onNext} nextLabel={nextLabel} />}>
      <Field label={t('guided.paymentLabel')}>
        <ChoiceChips<'CASH' | 'EXCHANGE'>
          value={exchange ? 'EXCHANGE' : 'CASH'}
          onChange={(v) => update({ paymentType: v === 'EXCHANGE' ? 'Product Exchange' : 'Fixed Fee' }, ['budget'])}
          options={[{ value: 'CASH', label: t('guided.payCash') }, { value: 'EXCHANGE', label: t('guided.payExchange') }]}
        />
      </Field>
      {!exchange ? (
        <Field label={t('guided.budgetQuestion')} accessory={<><ProvenanceTag value={form.aiProvenance.budget} /><WhyAsking text={t('guided.whyBudget')} onRecommend={recommend} /></>}>
          <ChoiceChips<string>
            value={bucket}
            onChange={pickBucket}
            options={[...BUDGET_BUCKETS.map((b) => ({ value: b.value, label: t(`guided.budgetBucket_${b.value}`) })), { value: 'NOT_SURE', label: t('guided.notSure') }]}
          />
          <View style={{ marginTop: SPACING.md }}>
            <PerCreatorBudgetPicker
              key={`${form.budgetInputType}:${form.budgetRateType}:${creators}:${nonce}`}
              rateType={form.budgetRateType}
              inputType={form.budgetInputType}
              budgetMin={form.budgetMin}
              budgetMax={form.budgetMax}
              creatorsNeeded={creators}
              colors={C}
              onChange={(min, max, rateType, inputType) => { setRec(null); update({ budgetMin: min, budgetMax: max, budgetRateType: rateType, budgetInputType: inputType }, ['budget']); }}
            />
          </View>
          <RecommendButton onPress={recommend} loading={busy} label={t('guided.recommendBudget')} />
          {rec ? <SuggestionNote>{rec}</SuggestionNote> : null}
          <IssueNote issue={issueFor(issues, 'budgetMax')} />
        </Field>
      ) : null}
      <Field label={t('guided.timingLabel')} accessory={<><ProvenanceTag value={form.aiProvenance.deadline} /><WhyAsking text={t('guided.whyApplyBy')} /></>}>
        <View style={{ gap: SPACING.md }}>
          <DatePickerField label={t('guided.finishBy')} value={toDate(form.deadline)} minDate={new Date()} onChange={(d) => update({ deadline: toYmd(d) }, ['deadline'])} />
          <DatePickerField label={`${t('guided.startOn')} · ${t('guided.optional')}`} value={toDate(form.startDate)} minDate={new Date()} onChange={(d) => update({ startDate: toYmd(d) }, ['startDate'])} />
          <DatePickerField label={`${t('guided.applyBy')} · ${t('guided.optional')}`} value={toDate(form.applicationDeadline)} minDate={new Date()} onChange={(d) => update({ applicationDeadline: toYmd(d) }, ['applicationDeadline'])} />
        </View>
        <IssueNote issue={issueFor(issues, 'deadline', 'startDate', 'applicationDeadline')} />
      </Field>
    </StepShell>
  );
}

// ── Advanced requirements (optional) ─────────────────────────────────────────

export function RequirementsStep({ form, update, onNext, onBack, nextLabel }: StepProps) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [open, setOpen] = useState<string | null>(() => BRIEF_SECTIONS.find((s) => sectionFilled(form.brief, s.key))?.key ?? 'content');
  const setField = (section: keyof CampaignBrief, key: string, value: unknown) => {
    const current = (form.brief[section] as Record<string, unknown> | undefined) ?? {};
    update({ brief: { ...form.brief, [section]: { ...current, [key]: value } } }, ['brief']);
  };
  return (
    <StepShell title={t('guided.reqTitle')} subtitle={t('guided.reqSub')} footer={<FooterNav onBack={onBack} onNext={onNext} nextLabel={nextLabel ?? t('guided.done')} />}>
      {BRIEF_SECTIONS.map((s) => {
        const isOpen = open === s.key;
        const values = (form.brief[s.key] as Record<string, unknown> | undefined) ?? {};
        return (
          <View key={s.key} style={[st.card, { borderColor: C.border, backgroundColor: C.surface, gap: 0, padding: 0 }]}>
            <Pressable onPress={() => setOpen(isOpen ? null : s.key)} style={{ flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm, minHeight: 56 }} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
              <View style={{ flex: 1 }}>
                <Text style={[st.fieldLabel, { color: C.text }]}>{t(s.title)}</Text>
                <Text style={[st.small, { color: C.textSecondary }]}>{t(s.hint)}</Text>
              </View>
              {sectionFilled(form.brief, s.key) ? <Text style={[st.tagTxt, { color: C.active }]}>{t('guided.added')}</Text> : null}
              <FontAwesome5 name={isOpen ? 'chevron-up' : 'chevron-down'} size={12} color={C.textSecondary} />
            </Pressable>
            {isOpen ? (
              <View style={{ borderTopWidth: 1, borderTopColor: C.border, padding: SPACING.md, gap: SPACING.lg }}>
                {s.fields.map((f) => <BriefFieldEditor key={f.key} def={f} value={values[f.key]} onChange={(v) => setField(s.key, f.key, v)} />)}
              </View>
            ) : null}
          </View>
        );
      })}
    </StepShell>
  );
}

function BriefFieldEditor({ def, value, onChange }: { def: BriefFieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const label = t(def.label);
  const placeholder = def.placeholder ? t(def.placeholder) : undefined;
  const why = def.why ? <WhyAsking text={t(def.why)} /> : undefined;
  switch (def.kind) {
    case 'list':
      return <Field label={label} optional accessory={why}><ListInput values={(value as string[]) ?? []} placeholder={placeholder} onChange={onChange} /></Field>;
    case 'text':
      return <Field label={label} optional accessory={why}><Input value={(value as string) ?? ''} placeholder={placeholder} onChangeText={onChange} /></Field>;
    case 'longtext':
      return <Field label={label} optional accessory={why}><Input value={(value as string) ?? ''} multiline placeholder={placeholder} onChangeText={onChange} /></Field>;
    case 'number':
      return (
        <Field label={label} optional accessory={why}>
          <Input
            value={value == null ? '' : String(value)}
            keyboardType="number-pad"
            onChangeText={(raw) => {
              const digits = raw.replace(/[^\d.]/g, '');
              if (!digits) return onChange(null);
              onChange(Math.max(def.min ?? 0, Math.min(def.max ?? 1e9, Number(digits))));
            }}
          />
        </Field>
      );
    case 'bool':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[st.fieldLabel, { color: C.text }]}>{label}</Text>
            {why}
          </View>
          <Switch value={!!value} onValueChange={onChange} accessibilityLabel={label} trackColor={{ true: C.brinjal1, false: C.border }} />
        </View>
      );
    case 'date':
      return (
        <DatePickerField
          label={`${label} · ${t('guided.optional')}`}
          value={value ? new Date(String(value)) : null}
          minDate={new Date()}
          onChange={(d) => { const x = new Date(d); x.setHours(23, 59, 0, 0); onChange(x.toISOString()); }}
        />
      );
    case 'tiers':
      return (
        <Field label={label} optional accessory={why}>
          <ChoiceChips<string>
            multi
            value={(value as string[]) ?? []}
            onChange={(tier) => { const cur = (value as string[]) ?? []; onChange(cur.includes(tier) ? cur.filter((x) => x !== tier) : [...cur, tier]); }}
            options={CREATOR_TIERS.map((tier) => ({ value: tier, label: t(`guided.tier_${tier}`) }))}
          />
        </Field>
      );
  }
}

