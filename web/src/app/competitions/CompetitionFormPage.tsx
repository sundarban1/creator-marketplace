import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, CalendarClock, Eye, FileText, Flag, Globe2, Gift, ListOrdered, Pencil, Plus, Repeat, Scale, ScrollText, Sparkles, Trash2, Trophy, Users } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { SegmentedControl } from '../ui/SegmentedControl';
import { PageHeader } from '../ui/PageHeader';
import { EventTypeSwitcher } from '../business/EventTypeSwitcher';
import { RichTextEditor } from '../ui/RichTextEditor';
import { markdownToPlain } from '../ui/richText';
import { cn } from '../ui/cn';
import { Alert } from '../ui/Alert';
import { Modal } from '../ui/Modal';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import { EventCoverPicker } from '../business/EventCoverPicker';
import { EventAttachmentsEditor } from '../events/EventAttachments';
import {
  createCompetition, updateCompetition, fetchManagedCompetition, submitCompetitionForReview,
  type CompetitionInput, type ManagedCompetition, type Prize, type Criterion,
} from '../api/competitions';
import { NptDateTimeField } from './parts';
import { StepShell, Field, ProgressRail, ChoiceChips } from '../business/guided/parts';
import { CompetitionOverview, type OverviewData } from './CompetitionOverview';
import { nptInputIn, fromNptInput, formatNpt, npr } from './format';
import { CRITERIA_SUGGESTIONS, FORMAT_OPTIONS, MAX_OBJECTIVES, MAX_TAGS, OBJECTIVE_OPTIONS, SKILL_OPTIONS, parseObjectives, serializeObjectives } from './options';

type StageForm = CompetitionInput['stages'][number];

const iso = (hours: number) => fromNptInput(nptInputIn(hours));

function emptyStage(opensH: number, deadlineH: number, name = ''): StageForm {
  return { name, description: null, brief: null, requirements: null, opensAt: iso(opensH), deadline: iso(deadlineH), advanceLimit: null,
    // Google Drive links only for now; direct video upload is hidden (add 'VIDEO_UPLOAD' to re-enable).
    allowedMethods: ['EXTERNAL_LINK'], videoMinSec: null, videoMaxSec: null };
}

function emptyForm(): CompetitionInput {
  return {
    title: '', description: '', objectives: null, coverImageUrl: null, rules: '', eligibility: null, contentFormats: [], skills: [],
    submissionInstructions: null, videoMinSec: null, videoMaxSec: null, contactInstructions: null, attachments: [],
    resultsVisibility: 'PUBLIC', submissionMode: 'PER_STAGE',
    registrationOpensAt: iso(1), registrationDeadline: iso(24 * 7), startsAt: iso(1), endsAt: iso(24 * 30),
    allowSubmissionEdits: true, onePrizePerCreator: true, scoringEnabled: false, judgingCriteria: [],
    stages: [emptyStage(1, 24 * 10, 'Round 1')],
    prizes: [],
  };
}

function fromManaged(c: ManagedCompetition): CompetitionInput {
  // Show the organizer their own proposal when an edit is waiting for review.
  const pending = c.review.pendingChanges;
  return {
    title: c.title, description: c.description, objectives: c.objectives, coverImageUrl: c.coverImageUrl, rules: pending?.rules ?? c.rules,
    eligibility: pending && 'eligibility' in pending ? pending.eligibility ?? null : c.eligibility, contentFormats: c.contentFormats, skills: c.skills ?? [], submissionInstructions: c.submissionInstructions,
    videoMinSec: c.videoMinSec, videoMaxSec: c.videoMaxSec, contactInstructions: c.contactInstructions, attachments: c.attachments ?? [],
    resultsVisibility: c.resultsVisibility, submissionMode: c.submissionMode ?? 'PER_STAGE', registrationOpensAt: c.registrationOpensAt, registrationDeadline: c.registrationDeadline,
    startsAt: c.startsAt, endsAt: c.endsAt, allowSubmissionEdits: c.allowSubmissionEdits, onePrizePerCreator: c.onePrizePerCreator,
    scoringEnabled: c.scoringEnabled, judgingCriteria: c.judgingCriteria,
    stages: c.stages.map((s) => ({ id: s.id, name: s.name, description: s.description, brief: s.brief, requirements: s.requirements, opensAt: s.opensAt, deadline: s.deadline, advanceLimit: s.advanceLimit, allowedMethods: s.allowedMethods, videoMinSec: s.videoMinSec, videoMaxSec: s.videoMaxSec })),
    prizes: (pending?.prizes ?? c.prizes).map((p) => ({ id: p.id, kind: p.kind, title: p.title, description: p.description, amount: p.amount, currency: 'NPR', recipientCount: p.recipientCount, notes: p.notes })),
  };
}

type FormStep = 'basics' | 'rules' | 'schedule' | 'stages' | 'prizes' | 'judging' | 'review';
const FORM_STEPS: Exclude<FormStep, 'review'>[] = ['basics', 'rules', 'schedule', 'stages', 'prizes', 'judging'];

/**
 * Client-side mirror of the server's rules, grouped by the step that owns
 * the field so "Continue" can stop on the right page. Inline feedback only —
 * the server re-validates everything.
 */
function validateStep(f: CompetitionInput, step: Exclude<FormStep, 'review'>, t: (k: string, v?: Record<string, string | number>) => string): string[] {
  const e: string[] = [];
  const ts = (s: string) => new Date(s).getTime();
  switch (step) {
    case 'basics':
      if (f.title.trim().length < 3) e.push(t('comp.vTitle'));
      if (f.description.trim().length < 10) e.push(t('comp.vDescription'));
      break;
    case 'rules':
      if (f.rules.trim().length < 10) e.push(t('comp.vRules'));
      if (f.videoMinSec && f.videoMaxSec && f.videoMinSec > f.videoMaxSec) e.push(t('comp.vVideoRange'));
      break;
    case 'schedule':
      if (!f.registrationOpensAt || !f.registrationDeadline || !f.startsAt || !f.endsAt) e.push(t('comp.vDates'));
      if (ts(f.registrationDeadline) <= ts(f.registrationOpensAt)) e.push(t('comp.vRegistration'));
      if (ts(f.endsAt) <= ts(f.startsAt)) e.push(t('comp.vEnd'));
      if (ts(f.registrationDeadline) > ts(f.endsAt)) e.push(t('comp.vRegBeforeEnd'));
      break;
    case 'stages':
      f.stages.forEach((s, i) => {
        const n = s.name || t('comp.stageN', { n: i + 1 });
        if (!s.name.trim()) e.push(t('comp.vStageName', { n: i + 1 }));
        if (isReviewRound(f, i)) return; // no dates of its own
        if (ts(s.deadline) <= ts(s.opensAt)) e.push(t('comp.vStageDeadline', { name: n }));
        if (ts(s.opensAt) < ts(f.startsAt)) e.push(t('comp.vStageStart', { name: n }));
        if (ts(s.deadline) > ts(f.endsAt)) e.push(t('comp.vStageEnd', { name: n }));
        if (i > 0 && ts(s.opensAt) < ts(f.stages[i - 1].deadline)) e.push(t('comp.vStageOrder', { name: n }));
        if (!s.allowedMethods.length) e.push(t('comp.vStageMethods', { name: n }));
      });
      break;
    case 'prizes':
      f.prizes.forEach((p, i) => { if (!p.title.trim()) e.push(t('comp.vPrizeTitle', { n: i + 1 })); });
      break;
    case 'judging':
      if (f.scoringEnabled) {
        const total = f.judgingCriteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
        if (!f.judgingCriteria.length || total !== 100) e.push(t('comp.vWeights', { total }));
      }
      break;
  }
  return Array.from(new Set(e));
}

function validateAll(f: CompetitionInput, t: Parameters<typeof validateStep>[2]): Array<{ step: Exclude<FormStep, 'review'>; message: string }> {
  return FORM_STEPS.flatMap((step) => validateStep(f, step, t).map((message) => ({ step, message })));
}

/** SINGLE mode: stage 2+ only shortlists entries already submitted (mirrors the server's rules.isReviewRound). */
const isReviewRound = (f: Pick<CompetitionInput, 'submissionMode'>, index: number) => f.submissionMode === 'SINGLE' && index > 0;

/** Review rounds get derived dates (entry deadline → competition end), same as the server stores. */
function withDerivedStageDates(f: CompetitionInput): CompetitionInput['stages'] {
  if (f.submissionMode !== 'SINGLE' || f.stages.length < 2) return f.stages;
  const entryDeadline = f.stages[0].deadline;
  const end = new Date(f.endsAt) > new Date(entryDeadline) ? f.endsAt : entryDeadline;
  return f.stages.map((s, i) => (i === 0 ? s : { ...s, opensAt: entryDeadline, deadline: end }));
}

const FORM_TOP_ID = 'competition-form-top';
const scrollToTop = () => document.getElementById(FORM_TOP_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

const keyFor = (label: string, i: number) => (label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'criterion') + `_${i + 1}`;

export function CompetitionFormPage() {
  const { id } = useParams();
  const t = useT();
  const isEdit = !!id;
  const existing = useAsync((s) => (id ? fetchManagedCompetition(id, s) : Promise.resolve(null)), [id]);
  if (isEdit && existing.loading) return <div className="mx-auto max-w-3xl space-y-4"><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-96 rounded-2xl" /></div>;
  if (isEdit && (existing.error || !existing.data)) return <EmptyState variant="error" title={t('comp.notFoundTitle')} action={{ label: t('comp.backToCompetitions'), href: '/business/competitions' }} />;
  return <CompetitionForm key={id ?? 'new'} existing={existing.data} />;
}

function CompetitionForm({ existing }: { existing: ManagedCompetition | null }) {
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const [f, setF] = useState<CompetitionInput>(() => (existing ? fromManaged(existing) : emptyForm()));
  // Edit opens on the summary (like the paid-event editor); create walks the steps.
  const [step, setStep] = useState<FormStep>(existing ? 'review' : 'basics');
  const [reached, setReached] = useState<number>(existing ? FORM_STEPS.length : 0);
  const [returnToReview, setReturnToReview] = useState(false);
  const [busy, setBusy] = useState<'draft' | 'submit' | 'save' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  const [goLive, setGoLive] = useState<'approval' | 'schedule'>('approval');
  const [publishAt, setPublishAt] = useState('');

  // After publication the stage structure and dates are fixed (deadline
  // controls live on the manage page); content stays editable.
  const structural = !existing || !!existing.allowedActions.editStructure;
  // Not yet sent to (or sent back from) Kolab review — can be saved half-filled.
  const isDraft = !!existing && ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(existing.status);
  const set = <K extends keyof CompetitionInput>(k: K, v: CompetitionInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const setStage = (i: number, patch: Partial<StageForm>) => setF((p) => ({ ...p, stages: p.stages.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const setPrize = (i: number, patch: Partial<Prize>) => setF((p) => ({ ...p, prizes: p.prizes.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const setCriterion = (i: number, patch: Partial<Criterion>) => setF((p) => ({ ...p, judgingCriteria: p.judgingCriteria.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const weightTotal = f.judgingCriteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);

  const objectives = parseObjectives(f.objectives);

  function addStage() {
    if (f.submissionMode === 'SINGLE') {
      // Shortlist rounds have no dates of their own (derived on save).
      setF((p) => ({ ...p, stages: [...p.stages, { ...emptyStage(0, 1), name: t('comp.stageN', { n: p.stages.length + 1 }) }] }));
      return;
    }
    const last = f.stages[f.stages.length - 1];
    const opens = new Date(new Date(last.deadline).getTime() + 2 * 86_400_000).toISOString();
    const deadline = new Date(new Date(opens).getTime() + 5 * 86_400_000).toISOString();
    setF((p) => ({
      ...p,
      stages: [...p.stages, { ...emptyStage(0, 1), name: t('comp.stageN', { n: p.stages.length + 1 }), opensAt: opens, deadline }],
      endsAt: new Date(deadline).getTime() > new Date(p.endsAt).getTime() ? new Date(new Date(deadline).getTime() + 3 * 86_400_000).toISOString() : p.endsAt,
    }));
  }
  function moveStage(i: number, dir: -1 | 1) {
    setF((p) => {
      const s = [...p.stages];
      const j = i + dir;
      if (j < 0 || j >= s.length) return p;
      // Keep the dates in place (they define the order); swap the content.
      const a = s[i], b = s[j];
      s[i] = { ...b, opensAt: a.opensAt, deadline: a.deadline };
      s[j] = { ...a, opensAt: b.opensAt, deadline: b.deadline };
      return { ...p, stages: s };
    });
  }

  const payload = useMemo<CompetitionInput>(() => ({
    ...f,
    judgingCriteria: f.judgingCriteria.map((c, i) => ({ ...c, key: c.key || keyFor(c.label, i), weight: Number(c.weight) || 0 })),
    prizes: f.prizes.map((p) => ({ ...p, amount: p.amount === null || p.amount === undefined || Number.isNaN(Number(p.amount)) ? null : Number(p.amount), recipientCount: Math.max(1, Number(p.recipientCount) || 1) })),
    stages: withDerivedStageDates(f).map((s, i) => ({ ...s, advanceLimit: i === f.stages.length - 1 ? null : s.advanceLimit ? Number(s.advanceLimit) : null })),
  }), [f]);

  const allIssues = validateAll(payload, t);

  function go(next: FormStep) {
    setErrors([]);
    setStep(next);
    if (next !== 'review') setReached((r) => Math.max(r, FORM_STEPS.indexOf(next)));
    else setReached(FORM_STEPS.length);
    requestAnimationFrame(scrollToTop);
  }

  function next(current: Exclude<FormStep, 'review'>) {
    const v = validateStep(payload, current, t);
    if (v.length) { setErrors(v); return; }
    const i = FORM_STEPS.indexOf(current);
    if (returnToReview || i === FORM_STEPS.length - 1) { setReturnToReview(false); go('review'); }
    else go(FORM_STEPS[i + 1]);
  }

  function back(current: Exclude<FormStep, 'review'>) {
    const i = FORM_STEPS.indexOf(current);
    if (i > 0) go(FORM_STEPS[i - 1]);
  }

  function editFromReview(s: Exclude<FormStep, 'review'>) {
    setReturnToReview(true);
    go(s);
  }

  function bodyForSave(): Partial<CompetitionInput> {
    if (!existing || structural) return payload;
    // Live competitions: dates go through the deadline controls.
    const rest: Partial<CompetitionInput> = { ...payload };
    delete rest.registrationOpensAt;
    delete rest.registrationDeadline;
    delete rest.startsAt;
    delete rest.endsAt;
    return rest;
  }

  /** "draft" saves and leaves; "submit" also sends a new competition to Kolab review; "save" updates an existing one. */
  async function save(mode: 'draft' | 'submit' | 'save') {
    // A draft can be saved half-filled from any step — only the basics are required.
    const blocking = mode === 'draft' ? validateStep(payload, 'basics', t) : allIssues.map((i) => i.message);
    if (blocking.length) {
      setErrors(blocking);
      if (mode === 'draft' && step !== 'basics') { go('basics'); setErrors(blocking); }
      return;
    }
    if (mode === 'submit' && goLive === 'schedule' && (!publishAt || new Date(publishAt) <= new Date())) { setErrors([t('comp.scheduleFuture')]); return; }
    setBusy(mode);
    setErrors([]);
    try {
      if (existing && mode === 'draft') {
        // Saving a draft keeps the business on the form so they can carry on editing.
        await updateCompetition(existing.id, bodyForSave());
        toast.success(t('comp.draftSavedToast'));
        return;
      }
      if (existing) {
        const saved = await updateCompetition(existing.id, bodyForSave());
        const sentForReview = (existing.status === 'SCHEDULED' && saved.status === 'PENDING_REVIEW')
          || (!!saved.review.pendingChangesSubmittedAt && saved.review.pendingChangesSubmittedAt !== existing.review.pendingChangesSubmittedAt);
        toast.success(sentForReview ? t('comp.savedForReviewToast') : t('comp.savedToast'));
        navigate(`/business/competitions/${saved.id}`);
        return;
      }
      const created = await createCompetition(payload);
      if (mode === 'submit') {
        try {
          await submitCompetitionForReview(created.id, goLive === 'schedule' ? publishAt : null);
          toast.success(t('comp.submittedToast'));
        } catch (e) {
          // The draft exists — land on it with the reason rather than losing the work.
          toast.error(e instanceof Error ? e.message : t('common.somethingWrong'));
        }
      } else {
        toast.success(t('comp.draftCreatedToast'));
      }
      navigate(`/business/competitions/${created.id}`);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : t('common.somethingWrong')]);
    } finally {
      setBusy(null);
    }
  }

  const previewData: OverviewData = {
    ...payload,
    objectives: payload.objectives ?? null,
    coverImageUrl: payload.coverImageUrl ?? null,
    eligibility: payload.eligibility ?? null,
    submissionInstructions: payload.submissionInstructions ?? null,
    videoMinSec: payload.videoMinSec ?? null,
    videoMaxSec: payload.videoMaxSec ?? null,
    contactInstructions: payload.contactInstructions ?? null,
    status: existing?.status ?? 'DRAFT',
    pauseReason: null, cancelReason: null,
    attachments: payload.attachments ?? [],
    judgingCriteria: payload.scoringEnabled ? payload.judgingCriteria.map((c) => ({ label: c.label, weight: c.weight })) : [],
    organizer: { name: t('comp.yourBusiness'), slug: null, logoUrl: null, isVerified: false },
    stages: payload.stages.map((s, i) => ({ ...s, description: s.description ?? null, brief: s.brief ?? null, requirements: s.requirements ?? null, advanceLimit: s.advanceLimit ?? null, videoMinSec: s.videoMinSec ?? null, videoMaxSec: s.videoMaxSec ?? null, id: s.id ?? `new-${i}`, order: i + 1, status: 'UPCOMING' as const })),
    prizePool: payload.prizes.some((p) => p.amount != null) ? { amount: payload.prizes.reduce((s, p) => s + (p.amount ?? 0) * p.recipientCount, 0), currency: 'NPR' } : null,
  };

  const railSteps = [...FORM_STEPS, 'review' as const].map((k) => ({ key: k, label: t(`comp.step_${k}`) }));
  const nextLabel = returnToReview ? t('guided.backToReview') : undefined;
  // Errors sit right above the buttons that triggered them (and inside the
  // sticky footer on phones), so they're never scrolled out of view.
  const errorAlert = errors.length > 0 && (
    <Alert tone="error" className="mb-3">
      <ul className="list-disc space-y-0.5 pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
    </Alert>
  );
  const stepFooter = (s: Exclude<FormStep, 'review'>) => (
    <>
      {errorAlert}
      <StepFooter onBack={FORM_STEPS.indexOf(s) > 0 ? () => back(s) : undefined} onNext={() => next(s)} nextLabel={nextLabel} nextDisabled={uploading} />
    </>
  );

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="ghost" onClick={() => setPreview(true)}><Eye size={14} />{t('comp.preview')}</Button>
      {((!existing && step !== 'review') || isDraft) && (
        <Button size="sm" variant="secondary" loading={busy === 'draft'} disabled={uploading || busy !== null} onClick={() => save('draft')}>{t('comp.saveDraft')}</Button>
      )}
    </div>
  );

  return (
    <div id={FORM_TOP_ID} className="mx-auto max-w-2xl scroll-mt-24 pb-6">
      {existing ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link to={`/business/competitions/${existing.id}`} className="inline-flex items-center gap-1 text-[13px] font-semibold uppercase tracking-wider text-ink-soft hover:text-ink">
            <ArrowLeft size={14} aria-hidden /> {t('comp.editTitle')}
          </Link>
          {headerActions}
        </div>
      ) : (
        <>
          <PageHeader title={t('biz.newCompetition')} actions={headerActions} />
          {step === 'basics' && (
            <div className="mb-6">
              <EventTypeSwitcher value="COMPETITION" />
            </div>
          )}
        </>
      )}

      {existing && !structural && <Alert tone="info" className="mb-5">{t('comp.liveEditNote')}</Alert>}
      {existing?.status === 'SCHEDULED' && <Alert tone="info" className="mb-5">{t('comp.scheduledEditNote')}</Alert>}
      {existing?.review.pendingChanges && <Alert tone="info" className="mb-5">{t('comp.editingPendingNote')}</Alert>}

      <ProgressRail
        steps={railSteps}
        current={step}
        onJump={(k) => {
          const i = k === 'review' ? FORM_STEPS.length : FORM_STEPS.indexOf(k as Exclude<FormStep, 'review'>);
          if (i <= reached) { if (step === 'review' && k !== 'review') setReturnToReview(true); go(k as FormStep); }
        }}
      />

      {step === 'basics' && (
        <StepShell title={t('comp.stepTitle_basics')} subtitle={t('comp.stepSub_basics')} footer={stepFooter('basics')}>
          <TextField label={t('comp.fTitle')} placeholder={t('comp.fTitlePh')} value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={150} />
          <Field label={t('comp.fCover')} optional>
            <EventCoverPicker value={f.coverImageUrl ?? ''} onChange={(url) => set('coverImageUrl', url || null)} onError={(m) => setErrors([m])} />
          </Field>
          <RichTextEditor label={t('comp.fDescription')} hint={t('comp.fDescriptionHint')} value={f.description} onChange={(v) => set('description', v)} maxLength={5000} minHeight={160} />
          <PillField label={t('comp.fObjectives')} hint={t('comp.fObjectivesHint')} count={objectives.length} max={MAX_OBJECTIVES}>
            <PillPicker presets={OBJECTIVE_OPTIONS} customLabel={t('comp.otherCustom')} value={objectives} max={MAX_OBJECTIVES} maxLength={80} ariaLabel={t('comp.fObjectives')} onChange={(v) => set('objectives', serializeObjectives(v))} />
          </PillField>
          <PillField label={t('comp.fFormatsOnly')} hint={t('comp.fFormatsOnlyHint')} count={f.contentFormats.length} max={MAX_TAGS}>
            <PillPicker presets={FORMAT_OPTIONS} customLabel={t('comp.otherCustom')} value={f.contentFormats} max={MAX_TAGS} maxLength={40} ariaLabel={t('comp.fFormatsOnly')} onChange={(v) => set('contentFormats', v)} />
          </PillField>
          <PillField label={t('comp.fSkills')} hint={t('comp.fSkillsHint')} count={f.skills.length} max={MAX_TAGS}>
            <PillPicker presets={SKILL_OPTIONS} customLabel={t('comp.other')} value={f.skills} max={MAX_TAGS} maxLength={40} ariaLabel={t('comp.fSkills')} onChange={(v) => set('skills', v)} />
          </PillField>
        </StepShell>
      )}

      {step === 'rules' && (
        <StepShell title={t('comp.stepTitle_rules')} subtitle={t('comp.stepSub_rules')} footer={stepFooter('rules')}>
          <RichTextEditor label={t('comp.fRules')} hint={t('comp.fRulesHint')} value={f.rules} onChange={(v) => set('rules', v)} maxLength={10000} minHeight={200} />
          <Textarea label={t('comp.fEligibility')} rows={2} value={f.eligibility ?? ''} onChange={(e) => set('eligibility', e.target.value || null)} maxLength={3000} />
          <Textarea label={t('comp.fInstructions')} rows={3} value={f.submissionInstructions ?? ''} onChange={(e) => set('submissionInstructions', e.target.value || null)} maxLength={5000} />
          <Field label={t('comp.videoLengthLabel')} optional help={<span className="text-[12px] text-ink-soft">{t('comp.videoLengthHelp')}</span>}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField type="number" min={1} label={t('comp.fMinSec')} value={f.videoMinSec ?? ''} onChange={(e) => set('videoMinSec', e.target.value ? Number(e.target.value) : null)} />
              <TextField type="number" min={1} label={t('comp.fMaxSec')} value={f.videoMaxSec ?? ''} onChange={(e) => set('videoMaxSec', e.target.value ? Number(e.target.value) : null)} />
            </div>
          </Field>
          <Textarea label={t('comp.fContact')} hint={t('comp.fContactHint')} rows={2} value={f.contactInstructions ?? ''} onChange={(e) => set('contactInstructions', e.target.value || null)} maxLength={1000} />
          <Field label={t('comp.fDocuments')} optional help={<span className="text-[12px] text-ink-soft">{t('comp.fDocumentsHint')}</span>}>
            <EventAttachmentsEditor value={f.attachments ?? []} onChange={(a) => set('attachments', a)} onBusyChange={setUploading} />
          </Field>
        </StepShell>
      )}

      {step === 'schedule' && (
        <StepShell title={t('comp.stepTitle_schedule')} subtitle={t('comp.stepSub_schedule')} footer={stepFooter('schedule')}>
          {!structural && <Alert tone="info">{t('comp.scheduleLocked')}</Alert>}
          <fieldset disabled={!structural} className="space-y-6">
            <Field label={t('comp.registrationWindow')}>
              <div className="grid gap-4 sm:grid-cols-2">
                <NptDateTimeField label={t('comp.fRegOpens')} value={f.registrationOpensAt} onChange={(v) => set('registrationOpensAt', v)} />
                <NptDateTimeField label={t('comp.fRegDeadline')} value={f.registrationDeadline} onChange={(v) => set('registrationDeadline', v)} />
              </div>
            </Field>
            <Field label={t('comp.competitionWindow')}>
              <div className="grid gap-4 sm:grid-cols-2">
                <NptDateTimeField label={t('comp.fStarts')} value={f.startsAt} onChange={(v) => set('startsAt', v)} />
                <NptDateTimeField label={t('comp.fEnds')} value={f.endsAt} onChange={(v) => set('endsAt', v)} />
              </div>
            </Field>
          </fieldset>
        </StepShell>
      )}

      {step === 'stages' && (
        <StepShell title={t('comp.stepTitle_stages')} subtitle={f.submissionMode === 'SINGLE' ? t('comp.stagesHelpSingle') : t('comp.stagesHelp')} footer={stepFooter('stages')}>
          <Field label={t('comp.deadlineModeTitle')}>
            <fieldset disabled={!structural}>
              <SegmentedControl
                variant="cards"
                ariaLabel={t('comp.deadlineModeTitle')}
                value={f.submissionMode}
                onChange={(v) => set('submissionMode', v)}
                options={[
                  { value: 'SINGLE', label: t('comp.modeSingle'), description: t('comp.modeSingleDesc'), icon: <Flag size={15} /> },
                  { value: 'PER_STAGE', label: t('comp.modePerStage'), description: t('comp.modePerStageDesc'), icon: <CalendarClock size={15} /> },
                ]}
              />
            </fieldset>
          </Field>
          <ol className="space-y-4">
            {f.stages.map((s, i) => {
              const isFinal = i === f.stages.length - 1;
              const single = f.submissionMode === 'SINGLE';
              const review = isReviewRound(f, i);
              const upcoming = !existing || structural || existing.stages.find((x) => x.id === s.id)?.status === 'UPCOMING';
              return (
                <li key={s.id ?? i} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-ink">
                      {t('comp.stageN', { n: i + 1 })}{isFinal ? ` · ${t('comp.finalStage')}` : ''}
                      {single && (
                        <span className={cn('rounded-full px-2 py-0.5 text-[11.5px] font-semibold', review ? 'bg-violet/10 text-violet-dark' : 'bg-brand-orange/10 text-brand-orange')}>
                          {review ? t('comp.shortlistRound') : t('comp.entryRound')}
                        </span>
                      )}
                    </span>
                    {structural && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" aria-label={t('comp.moveUp')} disabled={i === 0} onClick={() => moveStage(i, -1)}><ArrowUp size={14} /></Button>
                        <Button size="sm" variant="ghost" aria-label={t('comp.moveDown')} disabled={isFinal} onClick={() => moveStage(i, 1)}><ArrowDown size={14} /></Button>
                        <Button size="sm" variant="ghost" aria-label={t('comp.removeStage')} disabled={f.stages.length === 1} onClick={() => setF((p) => ({ ...p, stages: p.stages.filter((_, j) => j !== i) }))}><Trash2 size={14} /></Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <TextField label={t('comp.fStageName')} placeholder={t('comp.fStageNamePh')} value={s.name} onChange={(e) => setStage(i, { name: e.target.value })} maxLength={80} />
                    {review && (
                      <p className="rounded-xl bg-violet/[0.06] px-3 py-2.5 text-[13px] text-ink-soft">{t('comp.reviewRoundFormHint', { name: f.stages[i - 1].name || t('comp.stageN', { n: i }) })}</p>
                    )}
                    <RichTextEditor label={t('comp.fStageBrief')} hint={review ? t('comp.fStageBriefHintReview') : t('comp.fStageBriefHint')} value={s.brief ?? ''} onChange={(v) => setStage(i, { brief: v || null })} maxLength={5000} minHeight={110} />
                    {!review && (
                      <fieldset disabled={!structural} className="grid gap-3 sm:grid-cols-2">
                        <NptDateTimeField label={single ? t('comp.fEntryOpens') : t('comp.fStageOpens')} value={s.opensAt} onChange={(v) => setStage(i, { opensAt: v })} />
                        <NptDateTimeField label={single ? t('comp.fEntryDeadline') : t('comp.fStageDeadline')} value={s.deadline} onChange={(v) => setStage(i, { deadline: v })} />
                      </fieldset>
                    )}
                    <fieldset disabled={!upcoming} className="space-y-3">
                      {!isFinal && (
                        <TextField type="number" min={1} label={t('comp.fAdvanceLimit')} hint={t('comp.fAdvanceLimitHint')} value={s.advanceLimit ?? ''} onChange={(e) => setStage(i, { advanceLimit: e.target.value ? Number(e.target.value) : null })} />
                      )}
                      {/* Submission-method picker hidden for now — creators submit a Google Drive link only.
                      <div>
                        <p className="mb-1.5 text-[13px] font-medium text-ink">{t('comp.fMethods')}</p>
                        <div className="flex flex-wrap gap-4">
                          {(['VIDEO_UPLOAD', 'EXTERNAL_LINK'] as SubmissionMethod[]).map((m) => (
                            <Switch
                              key={m}
                              label={m === 'VIDEO_UPLOAD' ? t('comp.methodVideo') : t('comp.methodLink')}
                              checked={s.allowedMethods.includes(m)}
                              onChange={(on) => setStage(i, { allowedMethods: on ? [...s.allowedMethods, m] : s.allowedMethods.filter((x) => x !== m) })}
                            />
                          ))}
                        </div>
                      </div>
                      */}
                      {!review && <div className="grid gap-3 sm:grid-cols-2">
                        <TextField type="number" min={1} label={t('comp.fStageMinSec')} value={s.videoMinSec ?? ''} onChange={(e) => setStage(i, { videoMinSec: e.target.value ? Number(e.target.value) : null })} />
                        <TextField type="number" min={1} label={t('comp.fStageMaxSec')} value={s.videoMaxSec ?? ''} onChange={(e) => setStage(i, { videoMaxSec: e.target.value ? Number(e.target.value) : null })} />
                      </div>}
                    </fieldset>
                    {!review && <Textarea label={t('comp.fStageRequirements')} rows={2} value={s.requirements ?? ''} onChange={(e) => setStage(i, { requirements: e.target.value || null })} maxLength={2000} />}
                  </div>
                </li>
              );
            })}
          </ol>
          {structural && (
            <Button variant="secondary" onClick={addStage} disabled={f.stages.length >= 10}><Plus size={16} />{t('comp.addStage')}</Button>
          )}
        </StepShell>
      )}

      {step === 'prizes' && (
        <StepShell title={t('comp.stepTitle_prizes')} subtitle={t('comp.prizesHelp')} footer={stepFooter('prizes')}>
          {f.prizes.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line-strong px-4 py-6 text-center text-[14px] text-ink-soft">{t('comp.noPrizesYet')}</p>
          ) : (
            <ol className="space-y-3">
              {f.prizes.map((p, i) => (
                <li key={p.id ?? i} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                    <TextField label={t('comp.fPrizeTitle')} placeholder={t('comp.fPrizeTitlePh')} value={p.title} onChange={(e) => setPrize(i, { title: e.target.value })} maxLength={80} />
                    <Select label={t('comp.fPrizeKind')} value={p.kind} onChange={(e) => setPrize(i, { kind: e.target.value as Prize['kind'] })} options={[{ value: 'PLACEMENT', label: t('comp.kindPlacement') }, { value: 'SPECIAL', label: t('comp.kindSpecial') }]} />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <TextField type="number" min={0} label={t('comp.fPrizeAmount')} hint={t('comp.fPrizeAmountHint')} value={p.amount ?? ''} onChange={(e) => setPrize(i, { amount: e.target.value === '' ? null : Number(e.target.value) })} />
                    <TextField type="number" min={1} max={100} label={t('comp.fPrizeRecipients')} value={p.recipientCount} onChange={(e) => setPrize(i, { recipientCount: Number(e.target.value) || 1 })} />
                  </div>
                  <TextField className="mt-3" label={t('comp.fPrizeDescription')} placeholder={t('comp.fPrizeDescriptionPh')} value={p.description ?? ''} onChange={(e) => setPrize(i, { description: e.target.value || null })} maxLength={1000} />
                  <div className="mt-3 flex items-end gap-3">
                    <TextField className="flex-1" label={t('comp.fPrizeNotes')} value={p.notes ?? ''} onChange={(e) => setPrize(i, { notes: e.target.value || null })} maxLength={500} />
                    <Button variant="ghost" aria-label={t('comp.removePrize')} onClick={() => set('prizes', f.prizes.filter((_, j) => j !== i))}><Trash2 size={16} /></Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <Button variant="secondary" onClick={() => set('prizes', [...f.prizes, { kind: 'PLACEMENT', title: '', amount: null, currency: 'NPR', recipientCount: 1 }])}><Plus size={16} />{t('comp.addPrize')}</Button>
        </StepShell>
      )}

      {step === 'judging' && (
        <StepShell title={t('comp.stepTitle_judging')} subtitle={t('comp.stepSub_judging')} footer={stepFooter('judging')}>
          <Field label={t('comp.secEntries')}>
            <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
              <SettingRow icon={<Repeat size={16} />} title={t('comp.fAllowEdits')} description={t('comp.fAllowEditsDesc')} checked={f.allowSubmissionEdits} onChange={(v) => set('allowSubmissionEdits', v)} />
              <SettingRow icon={<Gift size={16} />} title={t('comp.fOnePrize')} description={t('comp.fOnePrizeDesc')} checked={f.onePrizePerCreator} onChange={(v) => set('onePrizePerCreator', v)} />
            </div>
          </Field>
          <Field label={t('comp.fResultsVisibility')}>
            <SegmentedControl
              variant="cards"
              ariaLabel={t('comp.fResultsVisibility')}
              value={f.resultsVisibility}
              onChange={(v) => set('resultsVisibility', v)}
              options={[
                { value: 'PUBLIC', label: t('comp.visPublic'), description: t('comp.visPublicDesc'), icon: <Globe2 size={15} /> },
                { value: 'PARTICIPANTS', label: t('comp.visParticipants'), description: t('comp.visParticipantsDesc'), icon: <Users size={15} /> },
              ]}
            />
          </Field>
          <div className="rounded-2xl border border-line bg-surface">
            <SettingRow icon={<Scale size={16} />} title={t('comp.scoringTitle')} description={t('comp.scoringHelp')} checked={f.scoringEnabled} onChange={(v) => set('scoringEnabled', v)} badge={t('guided.optional')} />
            {f.scoringEnabled && (
              <CriteriaEditor
                criteria={f.judgingCriteria}
                onChange={(v) => set('judgingCriteria', v)}
                onPatch={setCriterion}
                total={weightTotal}
              />
            )}
          </div>
        </StepShell>
      )}

      {step === 'review' && (
        <StepShell
          title={existing ? t('comp.stepTitle_reviewEdit') : t('comp.stepTitle_review')}
          subtitle={existing ? t('comp.stepSub_reviewEdit') : t('comp.stepSub_review')}
          footer={<>{errorAlert}{existing ? (
            <div className="flex justify-end">
              <Button size="lg" loading={busy === 'save'} disabled={uploading} onClick={() => save('save')}>{t('comp.saveChanges')}</Button>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="secondary" size="lg" loading={busy === 'draft'} disabled={uploading || busy !== null} onClick={() => save('draft')}>{t('comp.saveDraft')}</Button>
              <Button size="lg" loading={busy === 'submit'} disabled={uploading || busy !== null || allIssues.length > 0} onClick={() => save('submit')}>{t('comp.submitForReview')}</Button>
            </div>
          )}</>}
        >
          {allIssues.length > 0 && (
            <Alert tone="warning">
              <p className="mb-1 font-semibold">{t('comp.fixBeforeSubmit')}</p>
              <ul className="space-y-1">
                {allIssues.map((i) => (
                  <li key={i.step + i.message}>
                    <button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => editFromReview(i.step)}>{t(`comp.step_${i.step}`)}: {i.message}</button>
                  </li>
                ))}
              </ul>
            </Alert>
          )}

          <div className="rounded-2xl border border-line bg-surface px-4">
            <SummaryRow icon={<FileText size={16} />} label={t('comp.step_basics')} onEdit={() => editFromReview('basics')}>
              <span className="font-semibold">{f.title || '—'}</span>
              {f.description && <span className="mt-0.5 line-clamp-2 block text-[13.5px] text-ink-soft">{markdownToPlain(f.description)}</span>}
              {(objectives.length > 0 || f.contentFormats.length > 0 || f.skills.length > 0) && (
                <span className="mt-0.5 line-clamp-1 block text-[13px] text-ink-soft">{[...objectives, ...f.contentFormats, ...f.skills].join(' · ')}</span>
              )}
            </SummaryRow>
            <SummaryRow icon={<ScrollText size={16} />} label={t('comp.step_rules')} onEdit={() => editFromReview('rules')}>
              <span className="line-clamp-2 block">{markdownToPlain(f.rules) || '—'}</span>
              <span className="mt-0.5 block text-[13px] text-ink-soft">
                {[f.eligibility && t('comp.summaryEligibility'), (f.attachments?.length ?? 0) > 0 && t('comp.summaryDocs', { n: f.attachments!.length })].filter(Boolean).join(' · ') || t('comp.summaryNoExtras')}
              </span>
            </SummaryRow>
            <SummaryRow icon={<CalendarClock size={16} />} label={t('comp.step_schedule')} onEdit={() => editFromReview('schedule')}>
              <span className="block">{t('comp.summaryRegistration', { from: formatNpt(f.registrationOpensAt), to: formatNpt(f.registrationDeadline) })}</span>
              <span className="block text-[13px] text-ink-soft">{t('comp.summaryRuns', { from: formatNpt(f.startsAt, { time: false }), to: formatNpt(f.endsAt, { time: false }) })}</span>
            </SummaryRow>
            <SummaryRow icon={<ListOrdered size={16} />} label={t('comp.step_stages')} onEdit={() => editFromReview('stages')}>
              <span className="block">{f.stages.map((s) => s.name || '—').join(' → ')}</span>
              <span className="block text-[13px] text-ink-soft">{f.submissionMode === 'SINGLE' ? t('comp.summarySingle', { when: formatNpt(f.stages[0]?.deadline) }) : t('comp.summaryPerStage')}</span>
              <span className="block text-[13px] text-ink-soft">{f.stages.map((s, i) => (i < f.stages.length - 1 && s.advanceLimit ? t('comp.topN', { n: s.advanceLimit }) : null)).filter(Boolean).join(' · ') || t('comp.summaryManualAdvance')}</span>
            </SummaryRow>
            <SummaryRow icon={<Trophy size={16} />} label={t('comp.step_prizes')} onEdit={() => editFromReview('prizes')}>
              {f.prizes.length === 0 ? <span className="text-ink-soft">{t('comp.noPrizesYet')}</span> : (
                <>
                  <span className="block">{f.prizes.map((p) => (p.recipientCount > 1 ? `${p.title} × ${p.recipientCount}` : p.title)).join(', ')}</span>
                  {previewData.prizePool && <span className="block text-[13px] text-ink-soft">{t('comp.prizePool', { amount: npr(previewData.prizePool.amount) })}</span>}
                </>
              )}
            </SummaryRow>
            <SummaryRow icon={<Scale size={16} />} label={t('comp.step_judging')} onEdit={() => editFromReview('judging')}>
              <span className="block">{f.scoringEnabled ? t('comp.summaryScoring', { n: f.judgingCriteria.length }) : t('comp.summaryNoScoring')}</span>
              <span className="block text-[13px] text-ink-soft">
                {[f.allowSubmissionEdits ? t('comp.ruleEditsAllowed') : t('comp.ruleEditsLocked'), f.onePrizePerCreator && t('comp.ruleOnePrize')].filter(Boolean).join(' ')}
              </span>
            </SummaryRow>
          </div>

          <Button variant="secondary" onClick={() => setPreview(true)}><Eye size={16} />{t('comp.previewAsCreator')}</Button>

          {!existing && (
            <Field label={t('comp.whenLive')} help={<span className="text-[12px] text-ink-soft">{t('comp.reviewNote')}</span>}>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[14px] text-ink"><input type="radio" name="golive" checked={goLive === 'approval'} onChange={() => setGoLive('approval')} />{t('comp.liveOnApproval')}</label>
                <label className="flex items-center gap-2 text-[14px] text-ink"><input type="radio" name="golive" checked={goLive === 'schedule'} onChange={() => setGoLive('schedule')} />{t('comp.scheduleFor')}</label>
                {goLive === 'schedule' && <NptDateTimeField label={t('comp.publishAt')} value={publishAt} onChange={setPublishAt} />}
              </div>
            </Field>
          )}
        </StepShell>
      )}

      <Modal open={preview} onClose={() => setPreview(false)} title={t('comp.previewTitle')} size="lg">
        <CompetitionOverview c={previewData} />
      </Modal>
    </div>
  );
}

function StepFooter({ onBack, onNext, nextLabel, nextDisabled }: { onBack?: () => void; onNext: () => void; nextLabel?: string; nextDisabled?: boolean }) {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-3">
      {onBack ? (
        <Button type="button" variant="secondary" size="lg" onClick={onBack}><ArrowLeft size={16} aria-hidden />{t('guided.back')}</Button>
      ) : <span />}
      <Button type="button" size="lg" onClick={onNext} disabled={nextDisabled} className="min-w-[9rem]">{nextLabel ?? t('guided.continue')}</Button>
    </div>
  );
}

/** One section of the review summary — same shape as the paid-event review step. */
function SummaryRow({ icon, label, onEdit, children }: { icon: ReactNode; label: string; onEdit: () => void; children: ReactNode }) {
  const t = useT();
  return (
    <div className="flex items-start gap-3 border-b border-line py-4 last:border-0">
      <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-orange/[0.1] text-brand-orange" aria-hidden>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
        <div className="mt-0.5 text-[15px] text-ink">{children}</div>
      </div>
      <button type="button" onClick={onEdit} aria-label={`${t('comp.edit')} ${label}`} className="inline-flex min-h-[40px] items-center gap-1 rounded-full px-3 text-[13px] font-semibold text-violet-dark hover:bg-violet/[0.07]">
        <Pencil size={13} aria-hidden />{t('comp.edit')}
      </button>
    </div>
  );
}

/** Label + hint + "n/max selected" counter above a pill picker. */
function PillField({ label, hint, count, max, children }: { label: string; hint: string; count: number; max: number; children: ReactNode }) {
  const t = useT();
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-semibold text-ink">{label}</p>
        <span className={cn('text-[12px] tabular-nums', count >= max ? 'font-semibold text-violet-dark' : 'text-ink-soft')}>{t('comp.selectedOfMax', { n: count, max })}</span>
      </div>
      <p className="mb-2.5 text-[13px] text-ink-soft">{hint}</p>
      {children}
    </div>
  );
}

/** Multi-select preset pills, plus an "Add your own" pill for anything not listed. */
function PillPicker({ presets, value, onChange, max, maxLength, ariaLabel, customLabel }: {
  presets: string[]; value: string[]; onChange: (v: string[]) => void; max: number; maxLength: number; ariaLabel: string;
  /** Text on the add-your-own pill (defaults to "Add your own"). */
  customLabel?: string;
}) {
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const lower = (x: string) => x.trim().toLowerCase();
  // Custom picks (and older free-text tags) show as pills next to the presets.
  const options = [...presets, ...value.filter((v) => !presets.some((p) => lower(p) === lower(v)))];
  const full = value.length >= max;
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : full ? value : [...value, v]);

  function commit() {
    const v = draft.trim().replace(/,$/, '').slice(0, maxLength);
    setDraft('');
    setAdding(false);
    if (!v || full) return;
    const preset = presets.find((p) => lower(p) === lower(v));
    const pick = preset ?? v;
    if (!value.some((x) => lower(x) === lower(pick))) onChange([...value, pick]);
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { setDraft(''); setAdding(false); }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="contents">
        <ChoiceChips multi max={max} ariaLabel={ariaLabel} value={value} onChange={toggle} options={options.map((o) => ({ value: o, label: o }))} />
      </div>
      {adding ? (
        <input
          autoFocus
          value={draft}
          maxLength={maxLength}
          placeholder={t('comp.addOwnPh')}
          aria-label={customLabel ?? t('comp.addOwn')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={commit}
          className="min-h-[44px] w-48 rounded-full border border-violet bg-surface px-4 text-[14px] text-ink outline-none ring-2 ring-violet/20 placeholder:text-ink-soft/60"
        />
      ) : (
        <button
          type="button"
          disabled={full}
          onClick={() => setAdding(true)}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-dashed border-line-strong px-4 text-[14px] font-medium text-ink-soft transition-colors hover:border-violet/50 hover:text-violet-dark disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Plus size={14} aria-hidden />{customLabel ?? t('comp.addOwn')}
        </button>
      )}
    </div>
  );
}

/** One toggle setting: icon, title and explanation on the left, switch on the right. */
function SettingRow({ icon, title, description, checked, onChange, badge }: {
  icon: ReactNode; title: string; description: string; checked: boolean; onChange: (v: boolean) => void; badge?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 p-4">
      <span className={cn('mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors', checked ? 'bg-violet/10 text-violet-dark' : 'bg-ink/[0.05] text-ink-soft')} aria-hidden>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold text-ink">
          {title}
          {badge && <span className="text-[12px] font-normal text-ink-soft">{badge}</span>}
        </span>
        <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">{description}</span>
      </span>
      <Switch label={title} checked={checked} onChange={onChange} className="mt-1.5" />
    </label>
  );
}

/** Rubric rows with a weight slider each, a running total bar and quick actions. */
function CriteriaEditor({ criteria, onChange, onPatch, total }: {
  criteria: Criterion[]; onChange: (v: Criterion[]) => void; onPatch: (i: number, patch: Partial<Criterion>) => void; total: number;
}) {
  const t = useT();
  const maxCriteria = 10;
  const remaining = 100 - total;
  const add = (label = '') => {
    if (criteria.length >= maxCriteria) return;
    onChange([...criteria, { key: '', label, weight: Math.max(1, Math.min(100, remaining)) }]);
  };
  const splitEvenly = () => {
    const n = criteria.length;
    if (!n) return;
    const base = Math.floor(100 / n);
    onChange(criteria.map((c, i) => ({ ...c, weight: base + (i < 100 - base * n ? 1 : 0) })));
  };
  const suggestions = CRITERIA_SUGGESTIONS.filter((s) => !criteria.some((c) => c.label.trim().toLowerCase() === s.toLowerCase()));
  const tone = total === 100 ? 'success' : total > 100 ? 'danger' : 'warning';

  return (
    <div className="space-y-4 border-t border-line p-4">
      {criteria.length > 0 && (
        <ul className="space-y-2.5">
          {criteria.map((c, i) => (
            <li key={i} className="rounded-xl border border-line bg-surface-dim/40 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={c.label}
                  maxLength={80}
                  placeholder={t('comp.criterionPh')}
                  aria-label={t('comp.fCriterion')}
                  onChange={(e) => onPatch(i, { label: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-[14.5px] font-medium text-ink outline-none placeholder:text-ink-soft/60 hover:border-line focus:border-brand focus:bg-surface"
                />
                <span className="w-12 text-right text-[15px] font-semibold tabular-nums text-ink">{c.weight}%</span>
                <button type="button" aria-label={t('common.remove')} onClick={() => onChange(criteria.filter((_, j) => j !== i))} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-danger/10 hover:text-danger">
                  <Trash2 size={15} />
                </button>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={c.weight || 1}
                aria-label={t('comp.weightFor', { name: c.label || t('comp.fCriterion') })}
                onChange={(e) => onPatch(i, { weight: Number(e.target.value) })}
                className="mt-1 h-2 w-full cursor-pointer accent-violet"
              />
            </li>
          ))}
        </ul>
      )}

      <div>
        <div className="h-2 overflow-hidden rounded-full bg-ink/[0.07]" aria-hidden>
          <div className={cn('h-full rounded-full transition-[width] duration-200', { success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' }[tone])} style={{ width: `${Math.min(100, total)}%` }} />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <span className={cn('font-semibold', { success: 'text-success', warning: 'text-warning', danger: 'text-danger' }[tone])} aria-live="polite">
            {total === 100 ? t('comp.weightDone') : total > 100 ? t('comp.weightOver', { n: total - 100 }) : t('comp.weightLeft', { n: remaining })}
          </span>
          <span className="tabular-nums text-ink-soft">{t('comp.weightTotal', { total })}</span>
        </div>
      </div>

      {suggestions.length > 0 && criteria.length < maxCriteria && (
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wide text-ink-soft"><Sparkles size={12} aria-hidden />{t('comp.quickAdd')}</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => add(s)} className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink hover:border-violet/40">
                <Plus size={12} aria-hidden />{s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => add()} disabled={criteria.length >= maxCriteria}><Plus size={14} />{t('comp.addCriterion')}</Button>
        {criteria.length > 1 && total !== 100 && <Button size="sm" variant="ghost" onClick={splitEvenly}>{t('comp.splitEvenly')}</Button>}
      </div>
    </div>
  );
}
