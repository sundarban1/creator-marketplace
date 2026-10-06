import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/Button';
import { ApiError } from '@/lib/api';
import { F, SCREEN_GUTTER, SPACING } from '@/utilities/constants';
import { guidedCampaignService, type AiClarifyingQuestion, type GuidedCampaign } from '@/services/guidedCampaign';
import { getCampaignIssues, blockingIssues, type CampaignStep } from '@/features/business/utils/campaignRules';
import {
  FLOW_STEPS, applyAiDraft, diffForUpdate, emptyForm, formFromCampaign, plannedSteps, toPayload, toRulesInput,
  type GuidedForm, type GuidedStep,
} from '@/features/business/guided/guidedModel';
import { useAutosave, readLocalBackup, clearLocalBackup } from '@/features/business/guided/useAutosave';
import { ProgressRail, SaveIndicator, st } from '@/features/business/guided/parts';
import { AskKolabButton } from '@/features/business/guided/AskKolab';
import { StartStep, ClarifyStep, BasicsStep, CreatorsStep, ContentStep, BudgetStep, RequirementsStep, type Update } from '@/features/business/guided/steps';
import { ReviewStep } from '@/features/business/guided/ReviewStep';
import type { StartSource } from '@/features/business/guided/templates';

/**
 * Guided, AI-first creator for PAID campaigns (UX spec) — the native
 * counterpart of web's GuidedCampaignCreator.
 *   /guided-campaign                 new campaign (offers "Continue your campaign")
 *   /guided-campaign?draftId=…       resume a draft at the step it was left on
 *   /guided-campaign?campaignId=…    edit a live campaign (opens on review)
 * Free events keep the existing create-campaign invitation flow.
 */
export default function GuidedCampaignScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const params = useLocalSearchParams<{ draftId?: string; campaignId?: string }>();
  const mode: 'create' | 'edit' = params.campaignId ? 'edit' : 'create';

  const [campaign, setCampaign] = useState<GuidedCampaign | null>(null);
  const [initialForm, setInitialForm] = useState<GuidedForm>(emptyForm);
  const [form, setForm] = useState<GuidedForm>(emptyForm);
  const [step, setStep] = useState<GuidedStep>(mode === 'edit' ? 'review' : 'idea');
  const [planned, setPlanned] = useState<CampaignStep[]>(mode === 'edit' ? FLOW_STEPS : []);
  const [questions, setQuestions] = useState<AiClarifyingQuestion[]>([]);
  const [draftId, setDraftId] = useState<string | null>(params.draftId ?? null);
  const [loading, setLoading] = useState(!!(params.draftId || params.campaignId));
  const [resumeOffer, setResumeOffer] = useState<GuidedCampaign | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [returnToReview, setReturnToReview] = useState(mode === 'edit');
  const [inputSource, setInputSource] = useState<'voice' | 'text'>('text');
  // Last id loaded — router.replace() to this same route can keep the screen
  // mounted and only swap params, so reload whenever the id changes.
  const loadedRef = useRef<string | null>(null);

  const localKey = mode === 'edit' ? `edit-${params.campaignId}` : draftId ?? 'new';
  const onDraftCreated = useCallback((id: string) => { setDraftId(id); clearLocalBackup('new'); }, []);
  const worthSaving = mode === 'create' && !loading && (form.aiPrompt.trim().length >= 3 || step !== 'idea');
  const autosave = useAutosave({ enabled: worthSaving, ready: !loading, draftId, onDraftCreated, form, step, localKey });

  // ── Load: resume a draft, open a campaign for editing, or offer the latest draft.
  useEffect(() => {
    const id = params.draftId ?? params.campaignId;
    if (loadedRef.current === (id ?? '')) return;
    const reload = loadedRef.current !== null;
    loadedRef.current = id ?? '';
    if (!id) {
      void (async () => {
        const local = await readLocalBackup('new');
        if (local?.form.aiPrompt.trim()) setForm(local.form);
        guidedCampaignService.latestDraft().then((d) => { if (d) setResumeOffer(d); }).catch(() => undefined);
      })();
      return;
    }
    void (async () => {
      if (reload) { setLoading(true); setResumeOffer(null); setError(''); if (params.draftId) setDraftId(params.draftId); }
      try {
        const c = await guidedCampaignService.getCampaign(id);
        if (mode === 'create' && c.status !== 'DRAFT') { router.replace({ pathname: '/guided-campaign', params: { campaignId: c.id } }); return; }
        if (mode === 'edit' && c.status === 'DRAFT') { router.replace({ pathname: '/guided-campaign', params: { draftId: c.id } }); return; }
        const server = formFromCampaign(c);
        const local = await readLocalBackup(mode === 'edit' ? `edit-${c.id}` : c.id);
        const serverAt = c.updatedAt ? Date.parse(c.updatedAt) : 0;
        const useLocal = !!local && local.savedAt > serverAt && !!(local.form.title.trim() || local.form.aiPrompt.trim());
        setCampaign(c);
        setInitialForm(server);
        if (mode === 'edit') {
          setForm(server);
          if (useLocal && JSON.stringify(local!.form) !== JSON.stringify(server)) {
            Alert.alert(t('guided.restoreTitle'), '', [
              { text: t('guided.restoreDiscard'), style: 'cancel', onPress: () => clearLocalBackup(`edit-${c.id}`) },
              { text: t('guided.restore'), onPress: () => setForm(local!.form) },
            ]);
          }
        } else {
          setForm(useLocal ? local!.form : server);
          const s = (useLocal ? local!.step : (c.draftStep as GuidedStep | null)) ?? 'basics';
          setPlanned(FLOW_STEPS);
          setStep(s === 'clarify' || s === 'idea' ? 'basics' : s);
        }
      } catch {
        setError(t('guided.resumeFailed'));
      } finally {
        setLoading(false);
      }
    })();
  }, [params.draftId, params.campaignId, mode, t]);

  const update: Update = useCallback((patch, userKeys) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      if (userKeys?.length) next.aiProvenance = { ...next.aiProvenance, ...Object.fromEntries(userKeys.map((k) => [k, 'USER' as const])) };
      return next;
    });
  }, []);

  const issues = getCampaignIssues(toRulesInput(form));

  // ── Navigation ───────────────────────────────────────────────────────────
  const goNext = (from: GuidedStep) => {
    if (returnToReview) { setStep('review'); return; }
    const order: GuidedStep[] = [...planned, 'review'];
    const anchor = from === 'requirements' ? 'content' : from;
    setStep(order[order.indexOf(anchor) + 1] ?? 'review');
  };
  const goBack = (from: GuidedStep) => {
    if (returnToReview) { setStep('review'); return; }
    if (from === 'requirements') { setStep('content'); return; }
    const order: GuidedStep[] = ['idea', ...(questions.length ? ['clarify' as const] : []), ...planned];
    setStep(order[Math.max(0, order.indexOf(from) - 1)]);
  };
  const editFromReview = (s: GuidedStep) => { setReturnToReview(true); setStep(s); };

  // ── AI (§4) ──────────────────────────────────────────────────────────────
  const runAi = async () => {
    setAiBusy(true);
    setError('');
    try {
      const d = await guidedCampaignService.generate(form.aiPrompt.trim(), inputSource);
      const next = applyAiDraft(form, d, form.aiPrompt.trim());
      setForm(next);
      const qs = d.guided?.clarifyingQuestions ?? [];
      setQuestions(qs);
      const blocking = new Set(blockingIssues(getCampaignIssues(toRulesInput(next))).map((i) => i.step));
      const steps = plannedSteps(d.guided?.missingInformation ?? [], blocking);
      setPlanned(steps);
      setReturnToReview(false);
      setStep(qs.length ? 'clarify' : steps[0] ?? 'review');
      if (d.aiFallback) toast.info(t('guided.aiFallback'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('guided.genericError'));
    } finally {
      setAiBusy(false);
    }
  };

  // Template / past campaign → a new server draft, then reopen this screen on
  // it — the same resume path as "Continue your campaign".
  const [startingFrom, setStartingFrom] = useState<string | null>(null);
  const startFrom = async ({ source, id }: StartSource) => {
    setStartingFrom(id);
    setError('');
    try {
      autosave.markClean();
      const draft = await guidedCampaignService.draftFrom(source, id);
      clearLocalBackup('new');
      router.replace({ pathname: '/guided-campaign', params: { draftId: draft.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('guided.genericError'));
    } finally {
      setStartingFrom(null);
    }
  };

  // ── Publish / save / leave ───────────────────────────────────────────────
  const serverMessage = (err: unknown): string => {
    if (err instanceof ApiError) {
      const list = (err.details?.errors as { step?: CampaignStep; message: string }[] | undefined) ?? [];
      const target = list.find((e) => e.step)?.step;
      if (target) { setReturnToReview(true); setStep(target); }
      return list[0]?.message ?? err.message;
    }
    return err instanceof Error ? err.message : t('guided.genericError');
  };

  const publish = async () => {
    setPublishing(true);
    setError('');
    try {
      if (mode === 'edit' && campaign) {
        const changes = diffForUpdate(initialForm, form);
        if (Object.keys(changes).length) await guidedCampaignService.update(campaign.id, changes);
        clearLocalBackup(localKey);
        toast.success(t('guided.changesSaved'));
        router.back();
        return;
      }
      await autosave.flush();
      const id = draftId ?? (await guidedCampaignService.createDraft(toPayload(form, 'review'))).id;
      autosave.markClean();
      const published = await guidedCampaignService.publishDraft(id);
      clearLocalBackup(id);
      clearLocalBackup('new');
      toast.success(t('guided.publishedFlash'));
      router.replace({ pathname: '/campaign-detail', params: { campaignId: published.id } });
    } catch (err) {
      setError(serverMessage(err));
    } finally {
      setPublishing(false);
    }
  };

  const close = async () => {
    if (mode === 'create' && worthSaving) {
      await autosave.flush();
      toast.success(t('guided.draftSavedFlash'));
    }
    // '/' — RootNavigator sends a signed-in business to their home.
    if (router.canGoBack()) router.back(); else router.replace('/');
  };

  const discard = () => {
    Alert.alert(t('guided.discard'), t('guided.discardConfirm'), [
      { text: t('guided.cancel'), style: 'cancel' },
      {
        text: t('guided.discard'), style: 'destructive', onPress: async () => {
          autosave.markClean();
          if (draftId) await guidedCampaignService.deleteCampaign(draftId).catch(() => undefined);
          clearLocalBackup(draftId ?? 'new');
          clearLocalBackup('new');
          setDraftId(null); setForm(emptyForm()); setStep('idea'); setQuestions([]); setPlanned([]);
        },
      },
    ]);
  };

  const railSteps = [...planned, 'review' as const].map((k) => ({ key: k, label: t(`guided.stepLabel_${k}`) }));
  const progress = step !== 'idea' && step !== 'clarify' && planned.length > 0
    ? <>
        <ProgressRail steps={railSteps} current={step === 'requirements' ? 'content' : step} />
        <View style={{ marginBottom: SPACING.md }}><AskKolabButton step={step} form={form} /></View>
      </>
    : null;
  const banner = error ? <Text style={[st.small, { color: C.error, marginBottom: SPACING.md }]}>{error}</Text> : null;
  const header = <>{progress}{banner}</>;
  const stepProps = { form, update, issues, header, nextLabel: returnToReview ? t('guided.backToReview') : undefined };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      {/* Top bar: close (saves), autosave status, discard */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.sm, gap: SPACING.md }}>
        <Pressable onPress={close} hitSlop={10} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel={t('guided.close')}>
          <FontAwesome5 name="times" size={18} color={C.text} />
        </Pressable>
        <Text style={[st.fieldLabel, { color: C.text, flex: 1 }]} numberOfLines={1}>{mode === 'edit' ? t('guided.editKicker') : t('guided.createKicker')}</Text>
        {mode === 'create' ? <SaveIndicator status={autosave.status} /> : null}
        {mode === 'create' && (draftId || step !== 'idea') ? (
          <Pressable onPress={discard} hitSlop={10} style={{ minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel={t('guided.discard')}>
            <FontAwesome5 name="trash-alt" size={15} color={C.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.brinjal1} /></View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {step === 'idea' && (
            <StartStep
              form={form}
              update={update}
              busy={aiBusy}
              onInputSource={setInputSource}
              onCreateWithAi={runAi}
              onManual={() => { setPlanned(FLOW_STEPS); setStep('basics'); }}
              onStartFrom={startFrom}
              startingFrom={startingFrom}
              header={<>
                {banner}
                {resumeOffer && !draftId ? (
                  <View style={[st.note, { borderColor: C.brinjal1, backgroundColor: C.primaryLight, marginBottom: SPACING.lg, gap: SPACING.sm }]}>
                    <Text style={[st.fieldLabel, { color: C.text }]}>{t('guided.continueTitle')}</Text>
                    <Text style={[st.small, { color: C.textSecondary }]}>
                      {resumeOffer.title === 'Untitled campaign' ? t('guided.untitled') : resumeOffer.title}
                      {resumeOffer.draftStep ? ` · ${t('guided.leftOff', { step: t(`guided.stepLabel_${resumeOffer.draftStep}`) })}` : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                      <View style={{ flex: 1 }}><Button label={t('guided.startNew')} size="small" variant="ghost" onPress={() => setResumeOffer(null)} /></View>
                      <View style={{ flex: 1 }}><Button label={t('guided.continue')} size="small" onPress={() => router.replace({ pathname: '/guided-campaign', params: { draftId: resumeOffer.id } })} /></View>
                    </View>
                  </View>
                ) : null}
              </>}
            />
          )}
          {step === 'clarify' && <ClarifyStep {...stepProps} questions={questions} onNext={() => setStep(planned[0] ?? 'review')} onBack={() => setStep('idea')} />}
          {step === 'basics' && <BasicsStep {...stepProps} onNext={() => goNext('basics')} onBack={() => goBack('basics')} />}
          {step === 'creators' && <CreatorsStep {...stepProps} onNext={() => goNext('creators')} onBack={() => goBack('creators')} />}
          {step === 'content' && <ContentStep {...stepProps} onNext={() => goNext('content')} onBack={() => goBack('content')} onAdvanced={() => setStep('requirements')} />}
          {step === 'budget' && <BudgetStep {...stepProps} onNext={() => goNext('budget')} onBack={() => goBack('budget')} />}
          {step === 'requirements' && <RequirementsStep {...stepProps} onNext={() => goNext('requirements')} onBack={() => goBack('requirements')} />}
          {step === 'review' && (
            <ReviewStep
              form={form}
              issues={issues}
              mode={mode}
              header={progress}
              serverError={error}
              publishing={publishing}
              onEdit={editFromReview}
              onPublish={publish}
              onSaveExit={close}
              campaignId={mode === 'edit' ? campaign?.id ?? null : draftId}
              beforeSaveTemplate={mode === 'create' ? () => autosave.flush() : undefined}
              onAttachmentsChange={(attachments) => setForm((f) => ({ ...f, brief: { ...f.brief, attachments } }))}
              onAnswerVisit={(visit) => update(visit ? { locationType: 'ONSITE', locationScope: 'SPECIFIC' } : { locationType: 'REMOTE' }, ['locationType'])}
            />
          )}
        </KeyboardAvoidingView>
      )}
      {aiBusy ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', gap: SPACING.md, padding: SCREEN_GUTTER }}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: '#fff', fontFamily: F.semibold, fontSize: 16, textAlign: 'center' }}>{t('guided.aiWorking')}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
