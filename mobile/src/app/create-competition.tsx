import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/Button';
import { BackButton } from '@/components/BackButton';
import { F, FONT_SIZE, MIN_TOUCH_TARGET, RADIUS, SCREEN_GUTTER, SPACING, lineHeightFor } from '@/utilities/constants';
import { pickAndUpload } from '@/utilities/uploadImage';
import { StepShell, Field, FooterNav, ProgressRail, ChoiceChips, Input, st } from '@/features/business/guided/parts';
import { DateTimeField } from '@/features/business/competition/DateTimeField';
import {
  ALL_STEPS, CRITERIA_SUGGESTIONS, FORMAT_OPTIONS, FORM_STEPS, MAX_OBJECTIVES, MAX_STAGES, MAX_TAGS, OBJECTIVE_OPTIONS, SKILL_OPTIONS,
  cashPrizeTotal, emptyForm, emptyStage, formatNpt, fromManaged, isReviewRound, parseObjectives, serializeObjectives, toPayload, validateAll, validateStep,
  type FormStep,
} from '@/features/business/competition/model';
import { competitionService, type CompetitionInput, type CompetitionPrize, type CompetitionStageInput, type EditableCompetition } from '@/services/competition';
import { FormErrorBanner } from '@/components/FieldError';
import { VerifyBusinessModal, checkVerificationGate, isVerificationRequiredError, type VerifyGate } from '@/features/business/competition/VerifyBusinessModal';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { withAlpha } from '@/utilities/color';

type Step = Exclude<FormStep, 'review'>;
const numOrNull = (v: string) => (v.trim() === '' || Number.isNaN(Number(v)) ? null : Number(v));

/**
 * Native competition builder — the counterpart of web's CompetitionFormPage.
 * Basics → Rules → Schedule → Stages → Prizes → Judging → Review.
 * New: "Save draft" (stays here) or "Submit for review".
 * Edit (`?id=`): opens on the summary; "Save changes" from any step. Once
 * live, dates/stage structure are locked (deadline controls live on the
 * manage screen) and rules/eligibility/prize edits go to Kolab review.
 */
export default function CreateCompetitionScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [existing, setExisting] = useState<EditableCompetition | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    competitionService.getForEdit(id)
      .then((c) => { if (alive) setExisting(c); })
      .catch((e) => { if (alive) setLoadError(e instanceof Error ? e.message : t('competition.somethingWrong')); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per id
  }, [id]);

  if (!id) return <CompetitionBuilder existing={null} />;
  if (existing) return <CompetitionBuilder key={existing.id} existing={existing} />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md }}>
        <BackButton onPress={() => router.back()} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SCREEN_GUTTER, gap: SPACING.md }}>
        {loadError ? (
          <>
            <Text style={[st.body, { color: C.textSecondary, textAlign: 'center' }]}>{loadError}</Text>
            <Button label={t('competition.ok')} variant="secondary" onPress={() => router.back()} />
          </>
        ) : <ActivityIndicator size="large" color={C.brinjal1} />}
      </View>
    </SafeAreaView>
  );
}

function CompetitionBuilder({ existing }: { existing: EditableCompetition | null }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [f, setF] = useState<CompetitionInput>(() => (existing ? fromManaged(existing) : emptyForm()));
  const [savedId, setSavedId] = useState<string | null>(existing?.id ?? null);
  const [dirty, setDirty] = useState(false);
  const [step, setStep] = useState<FormStep>(existing ? 'review' : 'basics');
  const [returnToReview, setReturnToReview] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState<'draft' | 'submit' | 'save' | 'cover' | null>(null);
  // Set when submit was blocked because a direct-paying business isn't verified yet (draft already saved).
  const [verifyGate, setVerifyGate] = useState<VerifyGate | null>(null);

  const edit = (fn: (p: CompetitionInput) => CompetitionInput) => { setF(fn); setDirty(true); };
  const set = <K extends keyof CompetitionInput>(k: K, v: CompetitionInput[K]) => edit((p) => ({ ...p, [k]: v }));
  const setStage = (i: number, patch: Partial<CompetitionStageInput>) => edit((p) => ({ ...p, stages: p.stages.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const setPrize = (i: number, patch: Partial<CompetitionPrize>) => edit((p) => ({ ...p, prizes: p.prizes.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  // After publication the stage structure and dates are fixed; content stays editable.
  const structural = !existing || !!existing.allowedActions?.editStructure;
  // Not yet sent to (or sent back from) Kolab review — can be saved half-filled.
  const isDraft = !!existing && ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(existing.status);
  const paymentEditable = !existing || isDraft;
  // Existing competitions keep their saved payment setup untouched unless the business changes it here.
  const [paymentTouched, setPaymentTouched] = useState(false);
  const checkPayment = paymentEditable && (!existing || paymentTouched);
  const allIssues = validateAll(f, t, { payment: checkPayment });
  const cashTotal = cashPrizeTotal(f.prizes);
  const [kolabPayments, setKolabPayments] = useState(false);
  useEffect(() => {
    competitionService.paymentConfig().then((c) => setKolabPayments(!!c.kolabPaymentsEnabled)).catch(() => {});
  }, []);
  // Switching method means agreeing to that method's terms again (the server does the same).
  // Paying winners directly needs a verified business — warn while they're still filling the form.
  const bizProfile = useBusinessProfile();
  const unverified = !!bizProfile.data && !bizProfile.data.isVerified && bizProfile.data.verificationStatus !== 'VERIFIED';
  const setPayMethod = (m: 'KOLAB' | 'DIRECT') => { setPaymentTouched(true); edit((p) => ({ ...p, prizePaymentMethod: m, paymentTermsAccepted: p.prizePaymentMethod === m ? p.paymentTermsAccepted : false })); };

  function go(next: FormStep) { setErrors([]); setStep(next); }
  function next(current: Step) {
    const v = validateStep(f, current, t, { payment: checkPayment });
    if (v.length) { setErrors(v); return; }
    const i = FORM_STEPS.indexOf(current);
    if (returnToReview || i === FORM_STEPS.length - 1) { setReturnToReview(false); go('review'); }
    else go(FORM_STEPS[i + 1]);
  }
  function back(current: Step) {
    const i = FORM_STEPS.indexOf(current);
    if (i > 0) go(FORM_STEPS[i - 1]);
  }
  function editFromReview(s: Step) { setReturnToReview(true); go(s); }

  /** What an update sends — mirrors web's bodyForSave. */
  function bodyForSave(): Partial<CompetitionInput> {
    const body: Partial<CompetitionInput> = toPayload(f);
    // Payment setup is fixed after review; for an existing competition it's only sent when changed here.
    if (!paymentEditable || (existing && !paymentTouched)) {
      delete body.prizePaymentMethod;
      delete body.cashPrizePool;
      delete body.paymentTermsAccepted;
    }
    if (structural) return body;
    // Live competitions: dates go through the deadline controls on the manage screen.
    delete body.registrationOpensAt;
    delete body.registrationDeadline;
    delete body.startsAt;
    delete body.endsAt;
    return body;
  }

  /** Creates the competition the first time, updates it after that. */
  async function persist(): Promise<string> {
    const saved = savedId ? await competitionService.update(savedId, bodyForSave()) : await competitionService.create(toPayload(f));
    setSavedId(saved.id);
    setDirty(false);
    return saved.id;
  }

  async function saveDraft() {
    // A draft can be saved half-filled — only the basics are required.
    const blocking = validateStep(f, 'basics', t);
    if (blocking.length) { setErrors(blocking); if (step !== 'basics') { setStep('basics'); setErrors(blocking); } return; }
    setBusy('draft');
    setErrors([]);
    try {
      await persist();
      toast.success(t('competition.draftSaved'));
    } catch (e) {
      setErrors([e instanceof Error ? e.message : t('competition.somethingWrong')]);
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    if (allIssues.length) { setErrors(allIssues.map((i) => i.message)); return; }
    setBusy('submit');
    setErrors([]);
    try {
      const id = await persist();
      // Paying winners directly needs a verified business: keep the draft and explain how to verify.
      const gate = await checkVerificationGate(f.prizePaymentMethod);
      if (gate) { setVerifyGate(gate); return; }
      try {
        await competitionService.submitForReview(id);
      } catch (e) {
        if (isVerificationRequiredError(e)) { setVerifyGate('NOT_VERIFIED'); return; }
        // The draft is saved — keep the business here with the reason.
        setErrors([e instanceof Error ? e.message : t('competition.somethingWrong')]);
        return;
      }
      Alert.alert(t('competition.submittedTitle'), t('competition.submittedBody'), [{ text: t('competition.ok'), onPress: () => router.back() }]);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : t('competition.somethingWrong')]);
    } finally {
      setBusy(null);
    }
  }

  /** Edit mode: save everything and go back to the manage screen. */
  async function saveChanges() {
    if (!existing) return;
    if (allIssues.length) { setErrors(allIssues.map((i) => i.message)); return; }
    setBusy('save');
    setErrors([]);
    try {
      const saved = await competitionService.update(existing.id, bodyForSave());
      setDirty(false);
      const sentForReview = (existing.status === 'SCHEDULED' && saved.status === 'PENDING_REVIEW')
        || (!!saved.review?.pendingChangesSubmittedAt && saved.review.pendingChangesSubmittedAt !== existing.review?.pendingChangesSubmittedAt);
      toast.success(sentForReview ? t('comp.savedForReviewToast') : t('comp.savedToast'));
      void queryClient.invalidateQueries({ queryKey: ['competition', 'manage', existing.id] });
      void queryClient.invalidateQueries({ queryKey: ['competitions', 'mine'] });
      router.back();
    } catch (e) {
      setErrors([e instanceof Error ? e.message : t('competition.somethingWrong')]);
    } finally {
      setBusy(null);
    }
  }

  function close() {
    if (!dirty) { router.back(); return; }
    Alert.alert(t('competition.leaveTitle'), t('competition.leaveBody'), [
      { text: t('competition.keepEditing'), style: 'cancel' },
      { text: t('competition.leave'), style: 'destructive', onPress: () => router.back() },
    ]);
  }

  async function pickCover() {
    setBusy('cover');
    try {
      const res = await pickAndUpload('campaign-feature');
      if (res?.url) set('coverImageUrl', res.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('competition.somethingWrong'));
    } finally {
      setBusy(null);
    }
  }

  function addStage() {
    if (f.submissionMode === 'SINGLE') {
      edit((p) => ({ ...p, stages: [...p.stages, { ...emptyStage(0, 1), name: t('competition.stageN', { n: p.stages.length + 1 }) }] }));
      return;
    }
    const last = f.stages[f.stages.length - 1];
    const opensAt = new Date(new Date(last.deadline).getTime() + 2 * 86_400_000).toISOString();
    const deadline = new Date(new Date(opensAt).getTime() + 5 * 86_400_000).toISOString();
    edit((p) => ({
      ...p,
      stages: [...p.stages, { ...emptyStage(0, 1), name: t('competition.stageN', { n: p.stages.length + 1 }), opensAt, deadline }],
      endsAt: new Date(deadline) > new Date(p.endsAt) ? new Date(new Date(deadline).getTime() + 3 * 86_400_000).toISOString() : p.endsAt,
    }));
  }

  const rail = <ProgressRail steps={ALL_STEPS.map((k) => ({ key: k, label: t(`competition.step_${k}`) }))} current={step} />;
  const errorBox = <FormErrorBanner message={errors} style={{ marginBottom: SPACING.md }} />;
  const nav = (s: Step) => (
    <>
      {errorBox}
      <FooterNav onBack={FORM_STEPS.indexOf(s) > 0 ? () => back(s) : undefined} onNext={() => next(s)} nextLabel={returnToReview ? t('competition.backToReview') : undefined} />
      {/* Editing: save straight from any step, no trip back to the summary. */}
      {existing ? (
        <View style={{ marginTop: SPACING.md }}>
          <Button label={t('comp.saveChanges')} icon="check" loading={busy === 'save'} disabled={busy !== null && busy !== 'save'} onPress={saveChanges} fullWidth />
        </View>
      ) : null}
    </>
  );
  // Live competitions: greyed out and untouchable (web disables the same fieldsets).
  const lockStyle = (locked: boolean) => (locked ? { opacity: 0.5 } : null);
  const lockProps = (locked: boolean) => ({ pointerEvents: locked ? ('none' as const) : ('auto' as const), style: lockStyle(locked) });
  const objectives = parseObjectives(f.objectives);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md, gap: SPACING.sm }}>
        <View style={{ minWidth: 88, alignItems: 'flex-start' }}><BackButton onPress={close} /></View>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 18, fontFamily: F.bold, color: C.text }} numberOfLines={1}>{existing ? t('comp.editTitle') : t('competition.newTitle')}</Text>
        <View style={{ minWidth: 88, alignItems: 'flex-end' }}>
          {!existing || isDraft ? (
          <Pressable
            onPress={saveDraft}
            disabled={busy !== null}
            hitSlop={8}
            accessibilityRole="button"
            style={({ pressed }) => [pill.btn, { borderColor: C.brinjal1, opacity: busy !== null ? 0.5 : pressed ? 0.7 : 1 }]}>
            <Text style={[pill.txt, { color: C.brinjal1 }]}>{busy === 'draft' ? t('competition.saving') : t('competition.saveDraft')}</Text>
          </Pressable>
          ) : null}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {step === 'basics' && (
          <StepShell header={rail} title={t('competition.stepTitle_basics')} subtitle={t('competition.stepSub_basics')} footer={nav('basics')}>
            <Field label={t('competition.fTitle')}>
              <Input value={f.title} onChangeText={(v) => set('title', v)} placeholder={t('competition.fTitlePh')} maxLength={150} />
            </Field>
            <Field label={t('competition.fCover')} optional>
              {f.coverImageUrl ? (
                <View style={{ gap: SPACING.sm }}>
                  <Image source={{ uri: f.coverImageUrl }} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: RADIUS.md }} accessibilityIgnoresInvertColors />
                  <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                    <View style={{ flex: 1 }}><Button label={t('competition.changeCover')} size="small" variant="secondary" loading={busy === 'cover'} onPress={pickCover} /></View>
                    <View style={{ flex: 1 }}><Button label={t('competition.removeCover')} size="small" variant="ghost" onPress={() => set('coverImageUrl', null)} /></View>
                  </View>
                </View>
              ) : (
                <Button label={t('competition.addCover')} icon="image" variant="secondary" loading={busy === 'cover'} onPress={pickCover} />
              )}
            </Field>
            <Field label={t('competition.fDescription')}>
              <Input value={f.description} onChangeText={(v) => set('description', v)} placeholder={t('competition.fDescriptionPh')} multiline maxLength={5000} />
            </Field>
            <Field label={t('competition.fObjectives')} optional>
              <TagPicker presets={OBJECTIVE_OPTIONS} value={objectives} max={MAX_OBJECTIVES} maxLength={80} onChange={(v) => set('objectives', serializeObjectives(v))} />
            </Field>
            <Field label={t('competition.fFormats')} optional>
              <TagPicker presets={FORMAT_OPTIONS} value={f.contentFormats} max={MAX_TAGS} maxLength={40} onChange={(v) => set('contentFormats', v)} />
            </Field>
            <Field label={t('competition.fSkills')} optional>
              <TagPicker presets={SKILL_OPTIONS} value={f.skills} max={MAX_TAGS} maxLength={40} onChange={(v) => set('skills', v)} />
            </Field>
          </StepShell>
        )}

        {step === 'rules' && (
          <StepShell header={rail} title={t('competition.stepTitle_rules')} subtitle={t('competition.stepSub_rules')} footer={nav('rules')}>
            <Field label={t('competition.fRules')}>
              <Input value={f.rules} onChangeText={(v) => set('rules', v)} placeholder={t('competition.fRulesPh')} multiline maxLength={10000} />
            </Field>
            <Field label={t('competition.fEligibility')} optional>
              <Input value={f.eligibility ?? ''} onChangeText={(v) => set('eligibility', v || null)} multiline maxLength={3000} />
            </Field>
            <Field label={t('competition.fInstructions')} optional>
              <Input value={f.submissionInstructions ?? ''} onChangeText={(v) => set('submissionInstructions', v || null)} multiline maxLength={5000} />
            </Field>
            <Field label={t('competition.fVideoLength')} optional>
              <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                <View style={{ flex: 1 }}><Input value={f.videoMinSec?.toString() ?? ''} onChangeText={(v) => set('videoMinSec', numOrNull(v))} placeholder={t('competition.minSec')} keyboardType="number-pad" /></View>
                <View style={{ flex: 1 }}><Input value={f.videoMaxSec?.toString() ?? ''} onChangeText={(v) => set('videoMaxSec', numOrNull(v))} placeholder={t('competition.maxSec')} keyboardType="number-pad" /></View>
              </View>
            </Field>
            <Field label={t('competition.fContact')} optional>
              <Input value={f.contactInstructions ?? ''} onChangeText={(v) => set('contactInstructions', v || null)} placeholder={t('competition.fContactPh')} multiline maxLength={1000} />
            </Field>
          </StepShell>
        )}

        {step === 'schedule' && (
          <StepShell header={rail} title={t('competition.stepTitle_schedule')} subtitle={t('competition.stepSub_schedule')} footer={nav('schedule')}>
            {!structural ? <View style={[st.note, { borderColor: C.border }]}><Text style={[st.small, { color: C.textSecondary }]}>{t('comp.scheduleLocked')}</Text></View> : null}
            <Field label={t('competition.registrationWindow')}>
              <View style={{ gap: SPACING.md }}>
                <DateTimeField label={t('competition.fRegOpens')} value={f.registrationOpensAt} onChange={(v) => set('registrationOpensAt', v)} disabled={!structural} />
                <DateTimeField label={t('competition.fRegDeadline')} value={f.registrationDeadline} onChange={(v) => set('registrationDeadline', v)} disabled={!structural} />
              </View>
            </Field>
            <Field label={t('competition.competitionWindow')}>
              <View style={{ gap: SPACING.md }}>
                <DateTimeField label={t('competition.fStarts')} value={f.startsAt} onChange={(v) => set('startsAt', v)} disabled={!structural} />
                <DateTimeField label={t('competition.fEnds')} value={f.endsAt} onChange={(v) => set('endsAt', v)} disabled={!structural} />
              </View>
            </Field>
          </StepShell>
        )}

        {step === 'stages' && (
          <StepShell header={rail} title={t('competition.stepTitle_stages')} subtitle={f.submissionMode === 'SINGLE' ? t('competition.stagesHelpSingle') : t('competition.stagesHelp')} footer={nav('stages')}>
            <Field label={t('competition.deadlineMode')}>
              <View {...lockProps(!structural)}>
              <ChoiceChips
                value={f.submissionMode}
                onChange={(v) => set('submissionMode', v)}
                options={[
                  { value: 'SINGLE', label: t('competition.modeSingle'), icon: 'flag' },
                  { value: 'PER_STAGE', label: t('competition.modePerStage'), icon: 'calendar-alt' },
                ]}
              />
              </View>
              <Text style={[st.small, { color: C.textSecondary, marginTop: SPACING.sm }]}>
                {f.submissionMode === 'SINGLE' ? t('competition.modeSingleDesc') : t('competition.modePerStageDesc')}
              </Text>
            </Field>
            {f.stages.map((s, i) => {
              const isFinal = i === f.stages.length - 1;
              const review = isReviewRound(f, i);
              const single = f.submissionMode === 'SINGLE';
              // Live: only stages that haven't opened yet keep their shortlist size editable.
              const upcoming = structural || existing?.stages.find((x) => x.id === s.id)?.status === 'UPCOMING';
              return (
                <View key={s.id ?? i} style={[st.card, { borderColor: C.border, backgroundColor: C.surface }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[st.fieldLabel, { color: C.text, flex: 1 }]}>
                      {t('competition.stageN', { n: i + 1 })}{isFinal ? ` · ${t('competition.finalStage')}` : ''}
                      {single ? ` · ${review ? t('competition.shortlistRound') : t('competition.entryRound')}` : ''}
                    </Text>
                    {structural ? (
                    <Pressable
                      onPress={() => edit((p) => ({ ...p, stages: p.stages.filter((_, j) => j !== i) }))}
                      disabled={f.stages.length === 1}
                      hitSlop={8}
                      style={[st.iconBtn, { opacity: f.stages.length === 1 ? 0.3 : 1 }]}
                      accessibilityRole="button"
                      accessibilityLabel={t('competition.removeStage')}>
                      <FontAwesome5 name="trash-alt" size={14} color={C.textSecondary} />
                    </Pressable>
                    ) : null}
                  </View>
                  <Input value={s.name} onChangeText={(v) => setStage(i, { name: v })} placeholder={t('competition.fStageName')} maxLength={80} />
                  {review ? (
                    <Text style={[st.small, { color: C.textSecondary }]}>{t('competition.reviewRoundHint', { name: f.stages[i - 1].name || t('competition.stageN', { n: i }) })}</Text>
                  ) : null}
                  <Input value={s.brief ?? ''} onChangeText={(v) => setStage(i, { brief: v || null })} placeholder={t('competition.fStageBrief')} multiline maxLength={5000} />
                  {!review ? (
                    <>
                      <DateTimeField label={single ? t('competition.fEntryOpens') : t('competition.fStageOpens')} value={s.opensAt} onChange={(v) => setStage(i, { opensAt: v })} disabled={!structural} />
                      <DateTimeField label={single ? t('competition.fEntryDeadline') : t('competition.fStageDeadline')} value={s.deadline} onChange={(v) => setStage(i, { deadline: v })} disabled={!structural} />
                    </>
                  ) : null}
                  {!isFinal ? (
                    <View {...lockProps(!upcoming)}>
                    <Input value={s.advanceLimit?.toString() ?? ''} onChangeText={(v) => setStage(i, { advanceLimit: numOrNull(v) })} placeholder={t('competition.fAdvanceLimit')} keyboardType="number-pad" />
                    </View>
                  ) : null}
                  {!review ? (
                    <Input value={s.requirements ?? ''} onChangeText={(v) => setStage(i, { requirements: v || null })} placeholder={t('competition.fStageRequirements')} multiline maxLength={2000} />
                  ) : null}
                </View>
              );
            })}
            {structural ? <Button label={t('competition.addStage')} icon="plus" variant="secondary" onPress={addStage} disabled={f.stages.length >= MAX_STAGES} /> : null}
          </StepShell>
        )}

        {step === 'prizes' && (
          <StepShell header={rail} title={t('competition.stepTitle_prizes')} subtitle={t('competition.prizesHelp')} footer={nav('prizes')}>
            {f.prizes.length === 0 ? (
              <Text style={[st.body, { color: C.textSecondary, textAlign: 'center' }]}>{t('competition.noPrizesYet')}</Text>
            ) : f.prizes.map((p, i) => (
              <View key={i} style={[st.card, { borderColor: C.border, backgroundColor: C.surface }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                  <View style={{ flex: 1 }}><Input value={p.title} onChangeText={(v) => setPrize(i, { title: v })} placeholder={t('competition.fPrizeTitle')} maxLength={80} /></View>
                  <Pressable onPress={() => set('prizes', f.prizes.filter((_, j) => j !== i))} hitSlop={8} style={st.iconBtn} accessibilityRole="button" accessibilityLabel={t('competition.removePrize')}>
                    <FontAwesome5 name="trash-alt" size={14} color={C.textSecondary} />
                  </Pressable>
                </View>
                <ChoiceChips
                  value={p.kind}
                  onChange={(v) => setPrize(i, { kind: v })}
                  options={[{ value: 'PLACEMENT', label: t('competition.kindPlacement') }, { value: 'SPECIAL', label: t('competition.kindSpecial') }]}
                />
                <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                  <View style={{ flex: 1 }}><Input value={p.amount?.toString() ?? ''} onChangeText={(v) => setPrize(i, { amount: numOrNull(v) })} placeholder={t('competition.fPrizeAmount')} keyboardType="number-pad" /></View>
                  <View style={{ flex: 1 }}><Input value={String(p.recipientCount)} onChangeText={(v) => setPrize(i, { recipientCount: Number(v) || 1 })} placeholder={t('competition.fPrizeRecipients')} keyboardType="number-pad" /></View>
                </View>
                <Input value={p.description ?? ''} onChangeText={(v) => setPrize(i, { description: v || null })} placeholder={t('competition.fPrizeDescription')} maxLength={1000} />
              </View>
            ))}
            <Button
              label={t('competition.addPrize')}
              icon="plus"
              variant="secondary"
              onPress={() => set('prizes', [...f.prizes, { kind: 'PLACEMENT', title: '', amount: null, currency: 'NPR', recipientCount: 1 }])}
            />
            {cashTotal > 0 ? (
              <View style={[st.card, { borderColor: C.border, backgroundColor: C.surface }]}>
                <Text style={[st.fieldLabel, { color: C.text }]}>{t('competition.payTitle')}</Text>
                <Text style={[st.small, { color: C.textSecondary }]}>{t('competition.payPool', { amount: cashTotal.toLocaleString('en-IN') })}</Text>
                {!paymentEditable ? (
                  <Text style={[st.body, { color: C.text }]}>
                    {f.prizePaymentMethod === 'KOLAB' ? t('competition.payKolab') : f.prizePaymentMethod === 'DIRECT' ? t('competition.payDirect') : '—'}
                  </Text>
                ) : (<>
                <ChoiceChips
                  value={f.prizePaymentMethod ?? null}
                  onChange={setPayMethod}
                  options={[
                    { value: 'DIRECT' as const, label: t('competition.payDirect'), icon: 'hand-holding-usd' as const },
                    ...(kolabPayments || f.prizePaymentMethod === 'KOLAB' ? [{ value: 'KOLAB' as const, label: t('competition.payKolab'), icon: 'shield-alt' as const }] : []),
                  ]}
                />
                {f.prizePaymentMethod ? (
                  <Text style={[st.small, { color: C.textSecondary }]}>
                    {f.prizePaymentMethod === 'KOLAB' ? t('competition.payKolabDesc') : t('competition.payDirectDesc')}
                  </Text>
                ) : null}
                {f.prizePaymentMethod === 'DIRECT' && unverified ? (
                  <Pressable
                    onPress={() => router.push('/(business)/settings?section=verification' as Parameters<typeof router.push>[0])}
                    accessibilityRole="link"
                    style={{ flexDirection: 'row', gap: SPACING.sm, borderRadius: RADIUS.sm, padding: SPACING.md, backgroundColor: withAlpha(C.brinjal1, 0.08) }}>
                    <FontAwesome5 name="shield-alt" size={14} color={C.brinjal1} style={{ marginTop: 2 }} />
                    <Text style={[st.small, { color: C.text, flex: 1 }]}>
                      {t('competition.payDirectVerifyNote')}{' '}
                      <Text style={{ color: C.brinjal1, fontFamily: F.semibold, textDecorationLine: 'underline' }}>{t('comp.verifyCta')}</Text>
                    </Text>
                  </Pressable>
                ) : null}
                {f.prizePaymentMethod ? (
                  <Pressable
                    onPress={() => { setPaymentTouched(true); set('paymentTermsAccepted', !f.paymentTermsAccepted); }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: !!f.paymentTermsAccepted }}
                    style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, minHeight: MIN_TOUCH_TARGET, paddingTop: SPACING.xs }}>
                    <FontAwesome5 name={f.paymentTermsAccepted ? 'check-square' : 'square'} solid={!!f.paymentTermsAccepted} size={18} color={f.paymentTermsAccepted ? C.brinjal1 : C.textSecondary} />
                    <Text style={[st.small, { color: C.text, flex: 1 }]}>
                      {f.prizePaymentMethod === 'KOLAB' ? t('competition.payTermsKolab', { amount: cashTotal.toLocaleString('en-IN') }) : t('competition.payTermsDirect')}
                    </Text>
                  </Pressable>
                ) : null}
                </>)}
              </View>
            ) : null}
          </StepShell>
        )}

        {step === 'judging' && (
          <StepShell header={rail} title={t('competition.stepTitle_judging')} subtitle={t('competition.stepSub_judging')} footer={nav('judging')}>
            <ToggleRow title={t('competition.fAllowEdits')} description={t('competition.fAllowEditsDesc')} value={f.allowSubmissionEdits} onChange={(v) => set('allowSubmissionEdits', v)} />
            <ToggleRow title={t('competition.fOnePrize')} description={t('competition.fOnePrizeDesc')} value={f.onePrizePerCreator} onChange={(v) => set('onePrizePerCreator', v)} />
            <Field label={t('competition.fResultsVisibility')}>
              <ChoiceChips
                value={f.resultsVisibility}
                onChange={(v) => set('resultsVisibility', v)}
                options={[
                  { value: 'PUBLIC', label: t('competition.visPublic'), icon: 'globe-asia' },
                  { value: 'PARTICIPANTS', label: t('competition.visParticipants'), icon: 'users' },
                ]}
              />
            </Field>
            <ToggleRow title={t('competition.scoringTitle')} description={t('competition.scoringHelp')} value={f.scoringEnabled} onChange={(v) => set('scoringEnabled', v)} />
            {f.scoringEnabled ? (
              <View style={{ gap: SPACING.md }}>
                {f.judgingCriteria.map((c, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                    <View style={{ flex: 2 }}><Input value={c.label} onChangeText={(v) => set('judgingCriteria', f.judgingCriteria.map((x, j) => (j === i ? { ...x, label: v } : x)))} placeholder={t('competition.criterion')} maxLength={80} /></View>
                    <View style={{ flex: 1 }}><Input value={c.weight ? String(c.weight) : ''} onChangeText={(v) => set('judgingCriteria', f.judgingCriteria.map((x, j) => (j === i ? { ...x, weight: Number(v) || 0 } : x)))} placeholder="%" keyboardType="number-pad" /></View>
                    <Pressable onPress={() => set('judgingCriteria', f.judgingCriteria.filter((_, j) => j !== i))} hitSlop={8} style={st.iconBtn} accessibilityRole="button" accessibilityLabel={t('competition.removeCriterion')}>
                      <FontAwesome5 name="times" size={14} color={C.textSecondary} />
                    </Pressable>
                  </View>
                ))}
                <Text style={[st.small, { color: C.textSecondary }]}>
                  {t('competition.weightTotal', { total: f.judgingCriteria.reduce((s, c) => s + (Number(c.weight) || 0), 0) })}
                </Text>
                <ChoiceChips
                  value={null}
                  onChange={(label) => set('judgingCriteria', [...f.judgingCriteria, { key: '', label, weight: 0 }])}
                  options={CRITERIA_SUGGESTIONS.filter((l) => !f.judgingCriteria.some((c) => c.label === l)).map((l) => ({ value: l, label: `+ ${l}` }))}
                />
              </View>
            ) : null}
          </StepShell>
        )}

        {step === 'review' && (
          <StepShell
            header={rail}
            title={existing ? t('comp.stepTitle_reviewEdit') : t('competition.stepTitle_review')}
            subtitle={existing ? t('comp.stepSub_reviewEdit') : t('competition.stepSub_review')}
            footer={
              <>
                {errorBox}
                {existing ? (
                  <Button label={t('comp.saveChanges')} icon="check" loading={busy === 'save'} disabled={busy !== null && busy !== 'save'} onPress={saveChanges} fullWidth />
                ) : (
                <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                  <View style={{ flex: 1 }}><Button label={t('competition.saveDraft')} variant="secondary" loading={busy === 'draft'} disabled={busy !== null} onPress={saveDraft} /></View>
                  <View style={{ flex: 1.4 }}><Button label={t('competition.submitForReview')} loading={busy === 'submit'} disabled={busy !== null || allIssues.length > 0} onPress={submit} /></View>
                </View>
                )}
              </>
            }>
            {existing && !structural ? (
              <View style={[st.note, { borderColor: C.border }]}><Text style={[st.small, { color: C.textSecondary }]}>{t('comp.liveEditNote')}</Text></View>
            ) : existing?.status === 'SCHEDULED' ? (
              <View style={[st.note, { borderColor: C.border }]}><Text style={[st.small, { color: C.textSecondary }]}>{t('comp.scheduledEditNote')}</Text></View>
            ) : null}
            {allIssues.length ? (
              <View style={[st.note, { borderColor: C.draft, gap: 6 }]}>
                <Text style={[st.fieldLabel, { color: C.text }]}>{t('competition.fixBeforeSubmit')}</Text>
                {allIssues.map((i) => (
                  <Pressable key={i.step + i.message} onPress={() => editFromReview(i.step)} accessibilityRole="button">
                    <Text style={[st.small, { color: C.textSecondary }]}>• {t(`competition.step_${i.step}`)}: {i.message}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <SummaryRow label={t('competition.step_basics')} onEdit={() => editFromReview('basics')} lines={[f.title || '—', f.description]} />
            <SummaryRow label={t('competition.step_rules')} onEdit={() => editFromReview('rules')} lines={[f.rules || '—']} />
            <SummaryRow
              label={t('competition.step_schedule')}
              onEdit={() => editFromReview('schedule')}
              lines={[
                t('competition.summaryRegistration', { from: formatNpt(f.registrationOpensAt), to: formatNpt(f.registrationDeadline) }),
                t('competition.summaryRuns', { from: formatNpt(f.startsAt, false), to: formatNpt(f.endsAt, false) }),
              ]}
            />
            <SummaryRow label={t('competition.step_stages')} onEdit={() => editFromReview('stages')} lines={[f.stages.map((s) => s.name || '—').join(' → ')]} />
            <SummaryRow
              label={t('competition.step_prizes')}
              onEdit={() => editFromReview('prizes')}
              lines={[
                f.prizes.length ? f.prizes.map((p) => (p.recipientCount > 1 ? `${p.title} × ${p.recipientCount}` : p.title)).join(', ') : t('competition.noPrizesYet'),
                cashTotal > 0 ? `${t('competition.payPool', { amount: cashTotal.toLocaleString('en-IN') })} · ${f.prizePaymentMethod === 'KOLAB' ? t('competition.payKolab') : f.prizePaymentMethod === 'DIRECT' ? t('competition.payDirect') : '—'}` : '',
              ]}
            />
            <SummaryRow
              label={t('competition.step_judging')}
              onEdit={() => editFromReview('judging')}
              lines={[f.scoringEnabled ? t('competition.summaryScoring', { n: f.judgingCriteria.length }) : t('competition.summaryNoScoring')]}
            />
            {!existing ? <Text style={[st.small, { color: C.textSecondary }]}>{t('competition.reviewNote')}</Text> : null}
          </StepShell>
        )}
      </KeyboardAvoidingView>
      <VerifyBusinessModal gate={verifyGate} draftSaved onClose={() => setVerifyGate(null)} />
    </SafeAreaView>
  );
}

// ── Small pieces ─────────────────────────────────────────────────────────────

/** Preset pills plus "add your own", capped at `max` (web's PillPicker). */
function TagPicker({ presets, value, onChange, max, maxLength }: { presets: string[]; value: string[]; onChange: (v: string[]) => void; max: number; maxLength: number }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [custom, setCustom] = useState('');
  const options = [...presets, ...value.filter((v) => !presets.includes(v))];
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const add = () => {
    const v = custom.trim();
    if (v && !value.includes(v) && value.length < max) onChange([...value, v]);
    setCustom('');
  };
  return (
    <View style={{ gap: SPACING.sm }}>
      <ChoiceChips multi max={max} value={value} onChange={toggle} options={options.map((o) => ({ value: o, label: o }))} />
      {value.length < max ? (
        <View style={{ flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' }}>
          <TextInput
            value={custom}
            onChangeText={setCustom}
            onSubmitEditing={add}
            placeholder={t('competition.addYourOwn')}
            placeholderTextColor={C.textPlaceholder}
            maxLength={maxLength}
            returnKeyType="done"
            style={[st.input, { flex: 1, borderColor: C.border, backgroundColor: C.surface, color: C.text }]}
          />
          <Pressable onPress={add} style={[st.squareBtn, { borderColor: C.border }]} accessibilityRole="button" accessibilityLabel={t('competition.add')}>
            <FontAwesome5 name="plus" size={14} color={C.brinjal1} />
          </Pressable>
        </View>
      ) : null}
      <Text style={[st.small, { color: C.textPlaceholder }]}>{t('competition.pickedOf', { n: value.length, max })}</Text>
    </View>
  );
}

function ToggleRow({ title, description, value, onChange }: { title: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  const C = useAppColors();
  return (
    <View style={[st.card, { borderColor: C.border, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center' }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[st.fieldLabel, { color: C.text }]}>{title}</Text>
        <Text style={[st.small, { color: C.textSecondary }]}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={title} trackColor={{ true: C.brinjal1, false: C.border }} />
    </View>
  );
}

function SummaryRow({ label, lines, onEdit }: { label: string; lines: string[]; onEdit: () => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  return (
    <View style={[st.card, { borderColor: C.border, backgroundColor: C.surface }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[st.fieldLabel, { color: C.text }]}>{label}</Text>
        <Pressable onPress={onEdit} hitSlop={8} style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel={`${t('competition.edit')} ${label}`}>
          <Text style={[st.linkTxt, { color: C.brinjal1 }]}>{t('competition.edit')}</Text>
        </Pressable>
      </View>
      {lines.filter(Boolean).map((l, i) => (
        <Text key={i} numberOfLines={2} style={[st.small, { color: i === 0 ? C.text : C.textSecondary }]}>{l}</Text>
      ))}
    </View>
  );
}

const pill = {
  btn: { minHeight: 36, paddingHorizontal: SPACING.md, borderRadius: RADIUS.full, borderWidth: 1.5, alignItems: 'center' as const, justifyContent: 'center' as const },
  txt: { fontSize: FONT_SIZE.sm, lineHeight: lineHeightFor(FONT_SIZE.sm), fontFamily: F.semibold },
};
