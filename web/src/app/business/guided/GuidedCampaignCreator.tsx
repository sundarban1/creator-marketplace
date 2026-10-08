import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Trash2, History } from 'lucide-react';
import { useT } from '../../i18n';
import { ApiError } from '../../lib/apiClient';
import {
  createDraftFrom, createGuidedDraft, deleteCampaign, fetchCampaign, fetchLatestDraft, generateAiDraft, publishGuidedDraft,
  updateCampaign, type AiClarifyingQuestion, type MyCampaign,
} from '../../api/business';
import { AiGeneratingOverlay } from '../AiGeneratingOverlay';
import { NeedHelpButton } from '../NeedHelpModal';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Skeleton, SkeletonText } from '../../ui/Skeleton';
import { getCampaignIssues, blockingIssues, type CampaignStep } from '../campaignRules';
import {
  FLOW_STEPS, applyAiDraft, diffForUpdate, emptyForm, formFromCampaign, hasAnyInput, plannedSteps, toPayload, toRulesInput,
  type GuidedForm, type GuidedStep,
} from './guidedModel';
import { useAutosave, readLocalBackup, clearLocalBackup } from './useAutosave';
import { ProgressRail, SaveIndicator } from './parts';
import { AskKolabButton } from './AskKolab';
import { StartStep, ClarifyStep, BasicsStep, CreatorsStep, ContentStep, BudgetStep, RequirementsStep, type Update } from './steps';
import { ReviewStep } from './ReviewStep';
import type { StartSource } from './templates';

type Mode = 'create' | 'edit';

/**
 * The guided, AI-first campaign creator for paid campaigns (UX spec).
 * create: one-question start → AI → only the steps that still need something
 *         → review → publish. Autosaves a draft throughout; resumes via ?draft=.
 * edit:   the same screens, opened on the review summary, saving only what
 *         changed (live campaigns lock some fields once creators applied).
 */
export function GuidedCampaignCreator({ mode = 'create', campaign, onSwitchToFree }: {
  mode?: Mode;
  campaign?: MyCampaign;
  onSwitchToFree?: () => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const draftParam = mode === 'create' ? params.get('draft') : null;

  const initialForm = useMemo(() => (campaign ? formFromCampaign(campaign) : emptyForm()), [campaign]);
  const [form, setForm] = useState<GuidedForm>(initialForm);
  const [step, setStep] = useState<GuidedStep>(mode === 'edit' ? 'review' : 'idea');
  const [planned, setPlanned] = useState<CampaignStep[]>(mode === 'edit' ? FLOW_STEPS : []);
  const [questions, setQuestions] = useState<AiClarifyingQuestion[]>([]);
  const [draftId, setDraftId] = useState<string | null>(draftParam);
  const [loadingDraft, setLoadingDraft] = useState(!!draftParam);
  const [resumeOffer, setResumeOffer] = useState<MyCampaign | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [returnToReview, setReturnToReview] = useState(mode === 'edit');
  // Unsaved work left on this device: a create session that never reached the
  // server, or edits to a live campaign that were never saved.
  const [restoreOffer, setRestoreOffer] = useState<GuidedForm | null>(() => {
    if (mode === 'create') {
      if (draftParam) return null;
      const local = readLocalBackup('new');
      return local && local.form.aiPrompt.trim() ? local.form : null;
    }
    if (!campaign) return null;
    const local = readLocalBackup(`edit-${campaign.id}`);
    const at = campaign.updatedAt ? Date.parse(campaign.updatedAt) : 0;
    return local && local.savedAt > at && JSON.stringify(local.form) !== JSON.stringify(formFromCampaign(campaign)) ? local.form : null;
  });
  const topRef = useRef<HTMLDivElement>(null);

  const localKey = mode === 'edit' ? `edit-${campaign?.id}` : draftId ?? 'new';
  // A draft autosave created in this session also lands in ?draft= — it must
  // not trigger the resume loader, which would reload the server copy over
  // what the business is still typing.
  const createdHere = useRef<string | null>(null);
  const onDraftCreated = useCallback((id: string) => {
    createdHere.current = id;
    setDraftId(id);
    clearLocalBackup('new');
    setParams((p) => { const n = new URLSearchParams(p); n.set('draft', id); return n; }, { replace: true });
  }, [setParams]);

  // Autosave only once there's something worth keeping (§22): nothing is
  // saved while still on the idea step (typing / picking a pill) — the draft
  // is created on leaving it (Create with AI, or "I'll fill it in myself"
  // with something entered). Once a draft exists, every change is saved.
  const worthSaving = mode === 'create' && !loadingDraft && (!!draftId || (step !== 'idea' && hasAnyInput(form)));
  const autosave = useAutosave({ enabled: worthSaving, ready: !loadingDraft, draftId, onDraftCreated, form, step, localKey });

  // ── Resume (§22) ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'create') return;
    if (draftParam && draftParam === createdHere.current) return;
    const ctrl = new AbortController();
    if (draftParam) {
      fetchCampaign(draftParam, ctrl.signal)
        .then((c) => {
          if (ctrl.signal.aborted) return;
          if (c.status !== 'DRAFT') { navigate(`/business/events/${c.id}/edit`, { replace: true }); return; }
          const server = formFromCampaign(c);
          // A device copy only wins when it's newer AND actually has content
          // (e.g. the last save never reached the server).
          const local = readLocalBackup(c.id);
          const serverAt = c.updatedAt ? Date.parse(c.updatedAt) : 0;
          const useLocal = !!local && local.savedAt > serverAt && !!(local.form.title.trim() || local.form.aiPrompt.trim());
          setForm(useLocal ? local!.form : server);
          const resumeStep = (useLocal ? local!.step : (c.draftStep as GuidedStep | null)) ?? 'basics';
          setPlanned(FLOW_STEPS);
          setStep(resumeStep === 'clarify' ? 'basics' : resumeStep);
        })
        // A cancelled request (the page re-mounting) isn't a failure — the
        // next mount's request takes over.
        .catch(() => { if (!ctrl.signal.aborted) setError(t('guided.resumeFailed')); })
        .finally(() => { if (!ctrl.signal.aborted) setLoadingDraft(false); });
    } else {
      fetchLatestDraft(ctrl.signal).then((d) => { if (d) setResumeOffer(d); }).catch(() => undefined);
    }
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftParam, mode]);

  useEffect(() => { topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, [step]);

  const update: Update = useCallback((patch, userKeys) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      if (userKeys?.length) next.aiProvenance = { ...next.aiProvenance, ...Object.fromEntries(userKeys.map((k) => [k, 'USER' as const])) };
      return next;
    });
  }, []);

  const issues = useMemo(() => getCampaignIssues(toRulesInput(form)), [form]);

  // ── Navigation ───────────────────────────────────────────────────────────
  const goNext = (from: GuidedStep) => {
    if (returnToReview) { setStep('review'); return; }
    const order: GuidedStep[] = [...planned, 'review'];
    const anchor = from === 'requirements' ? 'content' : from === 'clarify' ? null : from;
    const idx = anchor ? order.indexOf(anchor as GuidedStep) : -1;
    setStep(order[idx + 1] ?? 'review');
  };
  const goBack = (from: GuidedStep) => {
    if (returnToReview) { setStep('review'); return; }
    const order: GuidedStep[] = ['idea', ...(questions.length ? ['clarify' as const] : []), ...planned];
    const idx = order.indexOf(from === 'requirements' ? 'content' : from);
    setStep(from === 'requirements' ? 'content' : order[Math.max(0, idx - 1)]);
  };
  const editFromReview = (s: GuidedStep) => { setReturnToReview(true); setStep(s); };

  // ── AI (§4) ──────────────────────────────────────────────────────────────
  const runAi = async () => {
    setAiBusy(true);
    setError('');
    try {
      const d = await generateAiDraft(form.aiPrompt.trim());
      const next = applyAiDraft(form, d, form.aiPrompt.trim());
      setForm(next);
      const qs = d.guided?.clarifyingQuestions ?? [];
      setQuestions(qs);
      const blockingSteps = new Set(blockingIssues(getCampaignIssues(toRulesInput(next))).map((i) => i.step));
      const steps = plannedSteps(d.guided?.missingInformation ?? [], blockingSteps);
      setPlanned(steps);
      setReturnToReview(false);
      setStep(qs.length ? 'clarify' : steps[0] ?? 'review');
      if (d.aiFallback) setError(t('guided.aiFallback'));
    } catch (err) {
      // "No campaign intent" comes back as a friendly question — show it as-is.
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setAiBusy(false);
    }
  };

  // Template / past campaign → a new server draft, then resume it like any
  // other draft (same autosave/resume/publish path).
  const [startingFrom, setStartingFrom] = useState<string | null>(null);
  const startFrom = async ({ source, id }: StartSource) => {
    setStartingFrom(id);
    setError('');
    try {
      autosave.markClean();
      const draft = await createDraftFrom(source, id);
      clearLocalBackup('new');
      setLoadingDraft(true);
      setDraftId(draft.id);
      setResumeOffer(null);
      setParams({ draft: draft.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setStartingFrom(null);
    }
  };

  const startManual = () => {
    setPlanned(FLOW_STEPS);
    setStep('basics');
  };

  // ── Publish / save ───────────────────────────────────────────────────────
  const mapServerError = (err: unknown): string => {
    if (err instanceof ApiError) {
      const list = (err.details.errors as { step?: CampaignStep; message: string }[] | undefined) ?? [];
      const target = list.find((e) => e.step)?.step;
      if (target) { setReturnToReview(true); setStep(target); }
      return list[0]?.message ?? err.message;
    }
    return err instanceof Error ? err.message : t('common.somethingWrong');
  };

  const publish = async () => {
    setPublishing(true);
    setError('');
    try {
      if (mode === 'edit' && campaign) {
        const changes = diffForUpdate(initialForm, form);
        if (Object.keys(changes).length) await updateCampaign(campaign.id, changes);
        clearLocalBackup(localKey);
        navigate(`/business/events/${campaign.id}`, { state: { flash: t('guided.changesSaved') } });
        return;
      }
      await autosave.flush();
      let id = draftId;
      if (!id) {
        const created = await createGuidedDraft(toPayload(form, 'review'));
        id = created.id;
      }
      autosave.markClean();
      const published = await publishGuidedDraft(id);
      clearLocalBackup(id);
      clearLocalBackup('new');
      navigate(`/business/events/${published.id}`, { replace: true, state: { flash: t('guided.publishedFlash') } });
    } catch (err) {
      setError(mapServerError(err));
    } finally {
      setPublishing(false);
    }
  };

  const saveAndExit = async () => {
    if (mode === 'edit' && campaign) { navigate(`/business/events/${campaign.id}`); return; }
    await autosave.flush();
    navigate('/business/events?tab=draft', { state: { flash: t('guided.draftSavedFlash') } });
  };

  const discard = async () => {
    if (!window.confirm(t('guided.discardConfirm'))) return;
    autosave.markClean();
    if (draftId) await deleteCampaign(draftId).catch(() => undefined);
    clearLocalBackup(draftId ?? 'new');
    clearLocalBackup('new');
    setDraftId(null);
    setForm(emptyForm());
    setStep('idea');
    setQuestions([]);
    setPlanned([]);
    setParams({}, { replace: true });
  };

  if (loadingDraft) {
    return (
      <div className="mx-auto max-w-2xl">
        <Skeleton className="h-8 w-2/3" />
        <SkeletonText lines={4} className="mt-6" />
      </div>
    );
  }

  const railSteps = [...planned, 'review' as const].map((k) => ({ key: k, label: t(`guided.stepLabel_${k}`) }));
  const railCurrent = step === 'requirements' ? 'content' : step;
  const stepProps = { form, update, issues };

  return (
    <div ref={topRef} className="mx-auto max-w-2xl scroll-mt-24 pb-6">
      {aiBusy && <AiGeneratingOverlay />}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-ink-soft">
          {mode === 'edit' ? t('guided.editKicker') : t('guided.createKicker')}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 whitespace-nowrap">
          {mode === 'create' && <SaveIndicator status={autosave.status} />}
          {mode === 'create' && (draftId || step !== 'idea') && (
            <button type="button" onClick={discard} aria-label={t('guided.discard')} className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-[12px] font-medium text-ink-soft transition-colors hover:border-danger/40 hover:bg-danger/[0.06] hover:text-danger">
              <Trash2 size={13} />
              <span className="hidden sm:inline">{t('guided.discard')}</span>
            </button>
          )}
          {step !== 'idea' && step !== 'clarify' && <AskKolabButton step={step} form={form} />}
          <NeedHelpButton />
        </div>
      </div>

      {resumeOffer && step === 'idea' && !draftId && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-violet/25 bg-violet/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <History size={18} className="mt-0.5 flex-shrink-0 text-violet" />
            <div>
              <p className="text-[15px] font-semibold text-ink">{t('guided.continueTitle')}</p>
              <p className="text-[13px] text-ink-soft">
                {resumeOffer.title === 'Untitled campaign' ? t('guided.untitled') : resumeOffer.title}
                {resumeOffer.draftStep ? ` · ${t('guided.leftOff', { step: t(`guided.stepLabel_${resumeOffer.draftStep}`) })}` : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setResumeOffer(null)}>{t('guided.startNew')}</Button>
            <Button size="sm" onClick={() => { setLoadingDraft(true); setDraftId(resumeOffer.id); setResumeOffer(null); setParams({ draft: resumeOffer.id }); }}>{t('guided.continue')}</Button>
          </div>
        </div>
      )}

      {restoreOffer && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[14px] text-ink">{t('guided.restoreTitle')}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => { clearLocalBackup(localKey); setRestoreOffer(null); }}>{t('guided.restoreDiscard')}</Button>
            <Button size="sm" onClick={() => { setForm(restoreOffer); setRestoreOffer(null); if (mode === 'create' && step === 'idea') { setPlanned(FLOW_STEPS); setStep('basics'); } }}>{t('guided.restore')}</Button>
          </div>
        </div>
      )}

      {error && <Alert tone="error" className="mb-5">{error}</Alert>}

      {step !== 'idea' && step !== 'clarify' && planned.length > 0 && (
        <ProgressRail steps={railSteps} current={railCurrent} onJump={(k) => setStep(k as GuidedStep)} />
      )}

      {step === 'idea' && (
        <StartStep
          form={form}
          update={update}
          onCreateWithAi={runAi}
          onManual={startManual}
          busy={aiBusy}
          onSwitchToFree={mode === 'create' ? onSwitchToFree : undefined}
          onStartFrom={startFrom}
          startingFrom={startingFrom}
        />
      )}
      {step === 'clarify' && (
        <ClarifyStep {...stepProps} questions={questions} onNext={() => { setStep(planned[0] ?? 'review'); }} onBack={() => setStep('idea')} />
      )}
      {step === 'basics' && <BasicsStep {...stepProps} onNext={() => goNext('basics')} onBack={() => goBack('basics')} nextLabel={returnToReview ? t('guided.backToReview') : undefined} />}
      {step === 'creators' && <CreatorsStep {...stepProps} onNext={() => goNext('creators')} onBack={() => goBack('creators')} nextLabel={returnToReview ? t('guided.backToReview') : undefined} />}
      {step === 'content' && <ContentStep {...stepProps} onNext={() => goNext('content')} onBack={() => goBack('content')} onAdvanced={() => setStep('requirements')} nextLabel={returnToReview ? t('guided.backToReview') : undefined} />}
      {step === 'budget' && <BudgetStep {...stepProps} onNext={() => goNext('budget')} onBack={() => goBack('budget')} nextLabel={returnToReview ? t('guided.backToReview') : undefined} />}
      {step === 'requirements' && <RequirementsStep {...stepProps} onNext={() => goNext('requirements')} onBack={() => goBack('requirements')} nextLabel={returnToReview ? t('guided.backToReview') : undefined} />}
      {step === 'review' && (
        <ReviewStep
          form={form}
          issues={issues}
          mode={mode}
          onEdit={editFromReview}
          onPublish={publish}
          onSaveExit={saveAndExit}
          publishing={publishing}
          campaignId={mode === 'edit' ? campaign?.id ?? null : draftId}
          beforeSaveTemplate={mode === 'create' ? () => autosave.flush() : undefined}
          onAttachmentsChange={(attachments) => setForm((f) => ({ ...f, brief: { ...f.brief, attachments } }))}
          onAnswerVisit={(visit) => update(visit ? { locationType: 'ONSITE', locationScope: 'SPECIFIC' } : { locationType: 'REMOTE' }, ['locationType'])}
        />
      )}
    </div>
  );
}
