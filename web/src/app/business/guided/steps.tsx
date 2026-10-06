import { useState } from 'react';
import { Sparkles, ChevronDown, Lightbulb, Wand2 } from 'lucide-react';
import { useT } from '../../i18n';
import { useAsync } from '../../lib/useAsync';
import { fetchCategories, fetchCampaignPlatforms } from '../../api/catalog';
import {
  improveCampaignText, recommendForCampaign,
  type AiClarifyingQuestion, type CampaignBrief, type DeliverableItem,
} from '../../api/business';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { Textarea } from '../../ui/Textarea';
import { Switch } from '../../ui/Switch';
import { cn } from '../../ui/cn';
import { BudgetPicker } from '../BudgetPicker';
import { budgetPickerResetKey } from '../budgetPickerTypes';
import { MIN_BUDGET_PER_CREATOR, type CampaignRuleIssue } from '../campaignRules';
import type { GuidedForm } from './guidedModel';
import { StartFromTemplates, type StartSource } from './templates';
import { toAiContext } from './guidedModel';
import { BRIEF_SECTIONS, CREATOR_TIERS, sectionFilled, type BriefFieldDef } from './briefSections';
import {
  StepShell, Field, ChoiceChips, RecommendButton, SuggestionNote, ProvenanceTag, IssueNote,
  WhyAsking, ListInput, Stepper, LocationPicker, DeliverablesEditor,
} from './parts';

export type Update = (patch: Partial<GuidedForm>, userKeys?: string[]) => void;

interface StepProps {
  form: GuidedForm;
  update: Update;
  issues: CampaignRuleIssue[];
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
}

const issueFor = (issues: CampaignRuleIssue[], ...fields: string[]) => issues.find((i) => fields.includes(i.field));

function Footer({ onBack, onNext, nextLabel, nextDisabled, busy }: { onBack?: () => void; onNext: () => void; nextLabel?: string; nextDisabled?: boolean; busy?: boolean }) {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-3">
      {onBack ? <Button type="button" variant="ghost" onClick={onBack}>{t('guided.back')}</Button> : <span />}
      <Button type="button" size="lg" onClick={onNext} disabled={nextDisabled} loading={busy} className="min-w-[9rem]">
        {nextLabel ?? t('guided.continue')}
      </Button>
    </div>
  );
}

/** "Make this clearer" (§18) — offers a rewrite; the business picks. */
function MakeClearer({ field, text, form, onUse }: { field: 'idea' | 'description'; text: string; form: GuidedForm; onUse: (v: string) => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [none, setNone] = useState(false);
  if (text.trim().length < 3) return null;
  return (
    <div className="mt-2">
      {!suggestion && (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true); setNone(false);
            try {
              const r = await improveCampaignText(field, text, toAiContext(form));
              if (r.suggestion) setSuggestion(r.suggestion); else setNone(true);
            } catch { setNone(true); } finally { setBusy(false); }
          }}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-violet/30 bg-violet/[0.05] px-4 text-[13px] font-semibold text-violet-dark transition-colors hover:bg-violet/[0.1] disabled:opacity-60"
        >
          <Wand2 size={14} className={busy ? 'animate-pulse' : undefined} />
          {busy ? t('guided.thinking') : t('guided.makeClearer')}
        </button>
      )}
      {none && <p className="text-[12px] text-ink-soft">{t('guided.makeClearerNone')}</p>}
      {suggestion && (
        <SuggestionNote
          actions={<>
            <Button size="sm" onClick={() => { onUse(suggestion); setSuggestion(null); }}>{t('guided.useThis')}</Button>
            <Button size="sm" variant="ghost" onClick={() => setSuggestion(null)}>{t('guided.keepMine')}</Button>
          </>}
        >
          {suggestion}
        </SuggestionNote>
      )}
    </div>
  );
}

// ── Start (§3) ───────────────────────────────────────────────────────────────

const QUICK_STARTS = ['promote', 'launch', 'event', 'ugc', 'awareness', 'other'] as const;

export function StartStep({ form, update, onCreateWithAi, onManual, busy, onSwitchToFree, onStartFrom, startingFrom }: {
  form: GuidedForm;
  update: Update;
  onCreateWithAi: () => void;
  onManual: () => void;
  busy: boolean;
  onSwitchToFree?: () => void;
  onStartFrom?: (s: StartSource) => void;
  startingFrom?: string | null;
}) {
  const t = useT();
  const text = form.aiPrompt;
  return (
    <StepShell
      subtitle={t('guided.startSub')}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={onManual} className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-line-strong bg-surface px-5 text-[14px] font-medium text-ink transition-colors hover:border-violet/40 hover:bg-violet/[0.05]">
            {t('guided.fillMyself')}
          </button>
          <Button type="button" size="lg" onClick={onCreateWithAi} disabled={text.trim().length < 3} loading={busy}>
            <Sparkles size={16} />
            {t('guided.createWithAi')}
          </Button>
        </div>
      }
    >
      <div>
        <label htmlFor="guided-idea" className="sr-only">{t('guided.startSub')}</label>
        <textarea
          id="guided-idea"
          rows={5}
          value={text}
          onChange={(e) => update({ aiPrompt: e.target.value })}
          placeholder={t('guided.startPlaceholder')}
          className="w-full resize-y rounded-3xl border border-line-strong bg-surface px-5 py-4 text-[16px] leading-relaxed text-ink shadow-sm outline-none transition-shadow placeholder:text-ink-soft/55 focus:border-violet focus:shadow-md focus:ring-4 focus:ring-violet/10"
        />
        <MakeClearer field="idea" text={text} form={form} onUse={(v) => update({ aiPrompt: v })} />
      </div>

      <Field label={t('guided.quickStartLabel')}>
        <ChoiceChips<(typeof QUICK_STARTS)[number]>
          value={null}
          onChange={(k) => update({ aiPrompt: text.trim() ? text : t(`guided.quickStartSeed_${k}`), goal: k === 'awareness' ? 'Brand Awareness' : form.goal })}
          options={QUICK_STARTS.map((k) => ({ value: k, label: t(`guided.quickStart_${k}`) }))}
        />
      </Field>

      {onStartFrom && <StartFromTemplates onPick={onStartFrom} busyId={startingFrom ?? null} />}

      {onSwitchToFree && (
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-soft">
          <span>{t('guided.freeEventPrompt')}</span>
          <button type="button" onClick={onSwitchToFree} className="inline-flex min-h-[36px] items-center rounded-full border border-violet/30 bg-violet/[0.05] px-4 text-[13px] font-semibold text-violet-dark transition-colors hover:bg-violet/[0.1]">
            {t('guided.freeEventLink')}
          </button>
        </div>
      )}
    </StepShell>
  );
}

// ── Clarify (§14) ────────────────────────────────────────────────────────────

export function ClarifyStep({ form, update, questions, onNext, onBack }: StepProps & { questions: AiClarifyingQuestion[] }) {
  const t = useT();
  const [answers, setAnswers] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, q.suggested])));

  const answer = (q: AiClarifyingQuestion, value: string) => {
    setAnswers((a) => ({ ...a, [q.id]: value }));
    if (q.id === 'CREATORS_VISIT') {
      if (value === 'YES') update({ locationType: 'ONSITE', locationScope: 'SPECIFIC' }, ['locationType']);
      else if (value === 'NO') update({ locationType: 'REMOTE' }, ['locationType']);
      else update({ locationType: null }, ['locationType']);
    }
    if (q.id === 'LOCATION') {
      update({ locationScope: value as GuidedForm['locationScope'], ...(value !== 'SPECIFIC' ? { locations: [] } : {}) }, ['locations']);
    }
  };

  return (
    <StepShell
      title={t('guided.clarifyTitle')}
      subtitle={t('guided.clarifySub')}
      footer={<Footer onBack={onBack} onNext={onNext} />}
    >
      {questions.map((q) => (
        <div key={q.id} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <p className="flex items-start gap-2 text-[15px] font-semibold text-ink">
            <Lightbulb size={17} className="mt-0.5 flex-shrink-0 text-brand-orange" />
            {q.question}
          </p>
          <div className="mt-3 pl-0 sm:pl-6">
            <ChoiceChips value={answers[q.id] ?? null} onChange={(v) => answer(q, v)} options={q.options} />
            {q.suggested && answers[q.id] === q.suggested && (
              <p className="mt-2 text-[12px] text-ink-soft">{t('guided.kolabGuessed')}</p>
            )}
          </div>
          {q.id === 'LOCATION' && answers[q.id] === 'SPECIFIC' && (
            <div className="mt-4">
              <LocationPicker
                locationType={form.locationType}
                locationScope="SPECIFIC"
                locations={form.locations}
                onChange={(n) => update(n, ['locations'])}
              />
            </div>
          )}
        </div>
      ))}
    </StepShell>
  );
}

// ── Basics (Step 2) ──────────────────────────────────────────────────────────

const GOALS = ['Brand Awareness', 'More Customers', 'Sales', 'Followers & Engagement'] as const;

export function BasicsStep({ form, update, issues, onNext, onBack, nextLabel }: StepProps) {
  const t = useT();
  return (
    <StepShell title={t('guided.basicsTitle')} subtitle={t('guided.basicsSub')} footer={<Footer onBack={onBack} onNext={onNext} nextLabel={nextLabel} />}>
      <div>
        <TextField
          label={t('guided.titleLabel')}
          labelAccessory={<ProvenanceTag value={form.aiProvenance.title} />}
          value={form.title}
          maxLength={120}
          placeholder={t('guided.titlePlaceholder')}
          onChange={(e) => update({ title: e.target.value }, ['title'])}
        />
        <IssueNote issue={issueFor(issues, 'title')} />
      </div>

      <div>
        <Textarea
          label={t('guided.descriptionLabel')}
          labelAccessory={<ProvenanceTag value={form.aiProvenance.description} />}
          rows={4}
          value={form.description}
          placeholder={t('guided.descriptionPlaceholder')}
          onChange={(e) => update({ description: e.target.value }, ['description'])}
        />
        <MakeClearer field="description" text={form.description} form={form} onUse={(v) => update({ description: v }, ['description'])} />
        <IssueNote issue={issueFor(issues, 'description')} />
      </div>

      <Field label={t('guided.goalLabel')} help={<ProvenanceTag value={form.aiProvenance.goal} />}>
        <ChoiceChips<string>
          value={form.goal || null}
          onChange={(v) => update({ goal: v === 'NOT_SURE' ? '' : v }, ['goal'])}
          options={[...GOALS.map((g) => ({ value: g, label: t(`guided.goal_${g}`) })), { value: 'NOT_SURE', label: t('guided.notSure') }]}
        />
      </Field>

      <div>
        <LocationPicker
          locationType={form.locationType}
          locationScope={form.locationScope}
          locations={form.locations}
          onChange={(n) => update(n, ['locations', 'locationType'])}
        />
        <IssueNote issue={issueFor(issues, 'locations')} />
      </div>
    </StepShell>
  );
}

// ── Creators (Step 3) ────────────────────────────────────────────────────────

const COUNT_BUCKETS = [
  { value: '1-3', n: 2 }, { value: '4-10', n: 5 }, { value: '10+', n: 12 },
] as const;

export function CreatorsStep({ form, update, issues, onNext, onBack, nextLabel }: StepProps) {
  const t = useT();
  const categories = useAsync((s) => fetchCategories(s), []);
  const platformList = useAsync((s) => fetchCampaignPlatforms(s), []);
  const [rec, setRec] = useState<{ reason: string } | null>(null);
  const [recBusy, setRecBusy] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  const recommendCount = async () => {
    setRecBusy(true);
    try {
      const r = await recommendForCampaign<number>('creatorsNeeded', toAiContext(form));
      update({ creatorsNeeded: r.value, aiProvenance: { ...form.aiProvenance, creatorsNeeded: 'AI_SUGGESTED' } });
      setRec({ reason: r.reason });
    } catch { /* recommendation is optional */ } finally { setRecBusy(false); }
  };

  const allCats = (categories.data ?? []).map((c) => c.name);
  const topCats = Array.from(new Set([form.category, ...allCats].filter(Boolean))).slice(0, showCategories ? 60 : 8);
  const count = form.creatorsNeeded;
  const bucket = count == null ? null : count <= 3 ? '1-3' : count <= 10 ? '4-10' : '10+';
  const platforms = Array.from(new Set([...(platformList.data ?? ['Instagram', 'TikTok', 'YouTube', 'Facebook']), ...form.platforms]));

  return (
    <StepShell title={t('guided.creatorsTitle')} subtitle={t('guided.creatorsSub')} footer={<Footer onBack={onBack} onNext={onNext} nextLabel={nextLabel} />}>
      <Field label={t('guided.creatorTypeLabel')} help={<ProvenanceTag value={form.aiProvenance.category} />}>
        <ChoiceChips<string>
          value={form.category || null}
          onChange={(v) => update({ category: v }, ['category'])}
          options={topCats.map((c) => ({ value: c, label: c }))}
        />
        {allCats.length > 8 && (
          <button type="button" onClick={() => setShowCategories((v) => !v)} className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-violet-dark">
            <ChevronDown size={14} className={cn('transition-transform', showCategories && 'rotate-180')} />
            {showCategories ? t('guided.showFewer') : t('guided.showAllTypes')}
          </button>
        )}
        <IssueNote issue={issueFor(issues, 'category')} />
      </Field>

      <Field label={t('guided.howManyLabel')} help={<><ProvenanceTag value={form.aiProvenance.creatorsNeeded} /><WhyAsking text={t('guided.whyCreatorsCount')} onRecommend={recommendCount} /></>}>
        <ChoiceChips<string>
          value={bucket}
          onChange={(v) => {
            if (v === 'NOT_SURE') { void recommendCount(); return; }
            const b = COUNT_BUCKETS.find((x) => x.value === v)!;
            setRec(null);
            update({ creatorsNeeded: b.n }, ['creatorsNeeded']);
          }}
          options={[...COUNT_BUCKETS.map((b) => ({ value: b.value, label: b.value })), { value: 'NOT_SURE', label: t('guided.notSure') }]}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Stepper value={count ?? 1} onChange={(n) => { setRec(null); update({ creatorsNeeded: n }, ['creatorsNeeded']); }} ariaLabel={t('guided.howManyLabel')} />
          <RecommendButton onClick={recommendCount} loading={recBusy} />
        </div>
        {rec && <div className="mt-3"><SuggestionNote>{rec.reason}</SuggestionNote></div>}
        <IssueNote issue={issueFor(issues, 'creatorsNeeded')} />
      </Field>

      <Field label={t('guided.platformsLabel')} help={<><ProvenanceTag value={form.aiProvenance.platforms} /><WhyAsking text={t('guided.whyPlatforms')} /></>}>
        <ChoiceChips<string>
          multi
          value={form.platforms}
          onChange={(p) => {
            const has = form.platforms.includes(p);
            const next = has ? form.platforms.filter((x) => x !== p) : [...form.platforms, p].slice(-3);
            update({ platforms: next }, ['platforms']);
          }}
          options={platforms.map((p) => ({ value: p, label: p }))}
        />
        <p className="mt-2 text-[12px] text-ink-soft">{t('guided.platformsHint')}</p>
        <IssueNote issue={issueFor(issues, 'platforms')} />
      </Field>

      <Field label={t('guided.minFollowersLabel')} optional help={<WhyAsking text={t('guided.whyMinFollowers')} />}>
        <div className="max-w-[14rem]">
          <TextField
            label=""
            type="number"
            min={0}
            inputMode="numeric"
            placeholder={t('guided.minFollowersPlaceholder')}
            value={form.minFollowers ? String(form.minFollowers) : ''}
            onChange={(e) => update({ minFollowers: Math.max(0, Number(e.target.value) || 0) }, ['minFollowers'])}
          />
        </div>
      </Field>
    </StepShell>
  );
}

// ── Content (Step 4) ─────────────────────────────────────────────────────────

export function ContentStep({ form, update, issues, onNext, onBack, onAdvanced, nextLabel }: StepProps & { onAdvanced: () => void }) {
  const t = useT();
  const [rec, setRec] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const recommend = async () => {
    setBusy(true);
    try {
      const r = await recommendForCampaign<DeliverableItem[]>('deliverables', toAiContext(form));
      update({ deliverableItems: r.value, aiProvenance: { ...form.aiProvenance, deliverableItems: 'AI_SUGGESTED' } });
      setRec(r.reason);
    } catch { /* optional */ } finally { setBusy(false); }
  };
  return (
    <StepShell title={t('guided.contentTitle')} subtitle={t('guided.contentSub')} example={t('guided.contentExample')} footer={<Footer onBack={onBack} onNext={onNext} nextLabel={nextLabel} />}>
      <Field label={t('guided.deliverablesLabel')} help={<><ProvenanceTag value={form.aiProvenance.deliverableItems} /><WhyAsking label={t('guided.whatsTheDifference')} text={t('guided.helpDeliverableTypes')} onRecommend={recommend} /></>}>
        <DeliverablesEditor items={form.deliverableItems} platforms={form.platforms} onChange={(items) => { setRec(null); update({ deliverableItems: items }, ['deliverableItems']); }} />
        <div className="mt-1"><RecommendButton onClick={recommend} loading={busy} /></div>
        {rec && <div className="mt-2"><SuggestionNote>{rec}</SuggestionNote></div>}
        <IssueNote issue={issueFor(issues, 'deliverableItems')} />
      </Field>

      <Field label={t('guided.hashtagsLabel')} optional help={<ProvenanceTag value={form.aiProvenance.hashtags} />}>
        <ListInput values={form.hashtags} prefix="#" placeholder={t('guided.hashtagsPlaceholder')} onChange={(v) => update({ hashtags: v }, ['hashtags'])} />
      </Field>

      <button type="button" onClick={onAdvanced} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-dashed border-line-strong px-4 text-[14px] font-semibold text-ink hover:border-violet/50">
        + {t('guided.addAdvanced')}
      </button>
    </StepShell>
  );
}

// ── Budget & timing (Step 5) ─────────────────────────────────────────────────

const BUDGET_BUCKETS = [
  { value: 'UNDER_5K', total: 5000 },
  { value: '5K_25K', total: 15000 },
  { value: '25K_100K', total: 50000 },
] as const;

export function BudgetStep({ form, update, issues, onNext, onBack, nextLabel }: StepProps) {
  const t = useT();
  const [nonce, setNonce] = useState(0);
  const [rec, setRec] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bucket, setBucket] = useState<string | null>(null);
  const creators = Math.max(1, form.creatorsNeeded ?? 1);
  const exchange = form.paymentType === 'Product Exchange';

  const recommend = async () => {
    setBusy(true);
    try {
      const r = await recommendForCampaign<{ budgetMin: number; budgetMax: number }>('budget', toAiContext(form));
      update({
        budgetMin: r.value.budgetMin, budgetMax: r.value.budgetMax, budgetRateType: 'RANGE', budgetInputType: 'PER_CREATOR',
        aiProvenance: { ...form.aiProvenance, budget: 'AI_SUGGESTED' },
      });
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
    <StepShell title={t('guided.budgetTitle')} subtitle={t('guided.budgetSub')} footer={<Footer onBack={onBack} onNext={onNext} nextLabel={nextLabel} />}>
      <Field label={t('guided.paymentLabel')}>
        <ChoiceChips<'CASH' | 'EXCHANGE'>
          value={exchange ? 'EXCHANGE' : 'CASH'}
          onChange={(v) => update({ paymentType: v === 'EXCHANGE' ? 'Product Exchange' : 'Fixed Fee' }, ['budget'])}
          options={[{ value: 'CASH', label: t('guided.payCash') }, { value: 'EXCHANGE', label: t('guided.payExchange') }]}
        />
      </Field>

      {!exchange && (
        <Field label={t('guided.budgetQuestion')} help={<><ProvenanceTag value={form.aiProvenance.budget} /><WhyAsking text={t('guided.whyBudget')} onRecommend={recommend} /></>}>
          <ChoiceChips<string>
            value={bucket}
            onChange={pickBucket}
            options={[...BUDGET_BUCKETS.map((b) => ({ value: b.value, label: t(`guided.budgetBucket_${b.value}`) })), { value: 'NOT_SURE', label: t('guided.notSure') }]}
          />
          <div className="mt-4">
            <BudgetPicker
              key={`${budgetPickerResetKey({ inputType: form.budgetInputType, rateType: form.budgetRateType, creatorsNeeded: creators })}:${nonce}`}
              rateType={form.budgetRateType}
              inputType={form.budgetInputType}
              budgetMin={form.budgetMin}
              budgetMax={form.budgetMax}
              creatorsNeeded={creators}
              onChange={(min, max, rateType, inputType) => { setRec(null); update({ budgetMin: min, budgetMax: max, budgetRateType: rateType, budgetInputType: inputType }, ['budget']); }}
            />
          </div>
          <div className="mt-1"><RecommendButton onClick={recommend} loading={busy} label={t('guided.recommendBudget')} /></div>
          {rec && <div className="mt-2"><SuggestionNote>{rec}</SuggestionNote></div>}
          <IssueNote issue={issueFor(issues, 'budgetMax')} />
        </Field>
      )}

      <Field label={t('guided.timingLabel')} help={<><ProvenanceTag value={form.aiProvenance.deadline} /><WhyAsking text={t('guided.whyApplyBy')} /></>}>
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label={t('guided.finishBy')} type="date" value={form.deadline} onChange={(e) => update({ deadline: e.target.value }, ['deadline'])} />
          <TextField label={t('guided.startOn')} hint={t('guided.optional')} type="date" value={form.startDate} onChange={(e) => update({ startDate: e.target.value }, ['startDate'])} />
          <TextField label={t('guided.applyBy')} hint={t('guided.optional')} type="date" value={form.applicationDeadline} onChange={(e) => update({ applicationDeadline: e.target.value }, ['applicationDeadline'])} />
        </div>
        <IssueNote issue={issueFor(issues, 'deadline', 'startDate', 'applicationDeadline')} />
      </Field>
    </StepShell>
  );
}

// ── Advanced requirements (Step 6, optional) ─────────────────────────────────

export function RequirementsStep({ form, update, onNext, onBack, nextLabel }: StepProps) {
  const t = useT();
  const [open, setOpen] = useState<string | null>(() => BRIEF_SECTIONS.find((s) => sectionFilled(form.brief, s.key))?.key ?? 'content');

  const setField = (section: keyof CampaignBrief, key: string, value: unknown) => {
    const current = (form.brief[section] as Record<string, unknown> | undefined) ?? {};
    update({ brief: { ...form.brief, [section]: { ...current, [key]: value } } }, ['brief']);
  };

  return (
    <StepShell title={t('guided.reqTitle')} subtitle={t('guided.reqSub')} footer={<Footer onBack={onBack} onNext={onNext} nextLabel={nextLabel ?? t('guided.done')} />}>
      <div className="space-y-3">
        {BRIEF_SECTIONS.map((s) => {
          const isOpen = open === s.key;
          const values = (form.brief[s.key] as Record<string, unknown> | undefined) ?? {};
          return (
            <div key={s.key} className="rounded-2xl border border-line bg-surface">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : s.key)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <span>
                  <span className="block text-[15px] font-semibold text-ink">{t(s.title)}</span>
                  <span className="block text-[13px] text-ink-soft">{t(s.hint)}</span>
                </span>
                <span className="flex items-center gap-2">
                  {sectionFilled(form.brief, s.key) && <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">{t('guided.added')}</span>}
                  <ChevronDown size={18} className={cn('text-ink-soft transition-transform', isOpen && 'rotate-180')} />
                </span>
              </button>
              {isOpen && (
                <div className="space-y-5 border-t border-line px-4 pb-5 pt-4">
                  {s.fields.map((f) => (
                    <BriefFieldEditor key={f.key} def={f} value={values[f.key]} onChange={(v) => setField(s.key, f.key, v)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </StepShell>
  );
}

function BriefFieldEditor({ def, value, onChange }: { def: BriefFieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const t = useT();
  const label = t(def.label);
  const placeholder = def.placeholder ? t(def.placeholder) : undefined;
  const help = def.why ? <WhyAsking text={t(def.why)} /> : undefined;
  switch (def.kind) {
    case 'list':
      return <Field label={label} optional help={help}><ListInput values={(value as string[]) ?? []} placeholder={placeholder} onChange={onChange} /></Field>;
    case 'text':
      return <Field label={label} optional help={help}><TextField label="" value={(value as string) ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></Field>;
    case 'longtext':
      return <Field label={label} optional help={help}><Textarea label="" rows={3} value={(value as string) ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></Field>;
    case 'number':
      return (
        <Field label={label} optional help={help}>
          <div className="max-w-[12rem]">
            <TextField
              label=""
              type="number"
              inputMode="numeric"
              min={def.min}
              max={def.max}
              value={value == null ? '' : String(value)}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') return onChange(null);
                const n = Math.max(def.min ?? 0, Math.min(def.max ?? 1e9, Number(raw)));
                onChange(Number.isFinite(n) ? n : null);
              }}
            />
          </div>
        </Field>
      );
    case 'bool':
      return (
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[14px] font-semibold text-ink">{label}</p>
            {help}
          </div>
          <Switch checked={!!value} onChange={(v) => onChange(v)} label={label} />
        </div>
      );
    case 'date':
      return (
        <Field label={label} optional help={help}>
          <div className="max-w-[14rem]">
            <TextField label="" type="date" value={value ? String(value).slice(0, 10) : ''} onChange={(e) => onChange(e.target.value ? new Date(`${e.target.value}T23:59:00`).toISOString() : null)} />
          </div>
        </Field>
      );
    case 'tiers':
      return (
        <Field label={label} optional help={help}>
          <ChoiceChips<string>
            multi
            value={(value as string[]) ?? []}
            onChange={(tier) => {
              const cur = (value as string[]) ?? [];
              onChange(cur.includes(tier) ? cur.filter((x) => x !== tier) : [...cur, tier]);
            }}
            options={CREATOR_TIERS.map((tier) => ({ value: tier, label: t(`guided.tier_${tier}`) }))}
          />
        </Field>
      );
  }
}
