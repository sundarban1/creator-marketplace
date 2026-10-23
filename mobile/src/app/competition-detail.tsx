// Creator competition detail — mobile counterpart of
// web/src/app/competitions/CreatorCompetitionDetailPage.tsx + CompetitionOverview.tsx:
// overview, join, "Your progress" and the stage entry form (Google Drive link,
// same as web — direct video upload is switched off there too).
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/Button';
import { AppModal } from '@/components/AppModal';
import { MarkdownText } from '@/components/MarkdownText';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { FormErrorBanner } from '@/components/FieldError';
import { useToast } from '@/components/Toast';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useFormValidation, useValidators } from '@/hooks/useFormValidation';
import { compose } from '@/utilities/validation';
import { withAlpha } from '@/utilities/color';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING, lineHeightFor } from '@/utilities/constants';
import { parseObjectives } from '@/features/business/competition/model';
import {
  creatorCompetitionService, type CompetitionDetail, type MyProgress, type MyProgressStage, type MySubmission,
} from '@/services/competition';
import {
  Badge, InfoRow, PrizeList, Section, StageTimeline, SubmissionPreview, TypeBadge, type TimelineStage,
} from '@/features/creator/competition/parts';
import {
  competitionStatusBadge, creatorStatusBadge, durationLabel, formatNpt, isGoogleDriveLink, npr, toneColor,
} from '@/features/creator/competition/format';
import { PersonAvatar, ProfileRow, useOpenProfile } from '@/features/creator/competition/ProfileAvatar';

const ORANGE = '#EA580C';

export default function CompetitionDetailScreen() {
  const C = useAppColors();
  const openProfile = useOpenProfile();
  const { t } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { id = '' } = useLocalSearchParams<{ id: string }>();

  const detail = useQuery({ queryKey: ['competition', id], queryFn: () => creatorCompetitionService.get(id), enabled: !!id });
  const joined = !!detail.data?.viewer.joined;
  const progress = useQuery({
    queryKey: ['competition', id, 'progress'],
    queryFn: () => creatorCompetitionService.progress(id),
    enabled: !!id && joined,
  });

  const [confirmJoin, setConfirmJoin] = useState(false);
  const [joining, setJoining] = useState(false);

  function refreshAll() {
    void queryClient.invalidateQueries({ queryKey: ['competition', id] });
    void queryClient.invalidateQueries({ queryKey: ['competitions'] });
  }

  async function join() {
    setJoining(true);
    try {
      await creatorCompetitionService.join(id);
      setConfirmJoin(false);
      toast.success(t('comp.joinedToast'));
      refreshAll();
    } catch (e) {
      setConfirmJoin(false);
      toast.error(e instanceof Error ? e.message : t('common.somethingWentWrong'));
    } finally {
      setJoining(false);
    }
  }

  const c = detail.data;
  const p = progress.data ?? null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <PageHeader title={c?.title ?? t('comp.typeBadge')} backFallback="/(creator)/(tabs)/discover" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <MaxWidthContainer>
          {detail.isPending ? (
            <View style={{ padding: SCREEN_GUTTER, gap: 14 }}>
              <Skeleton width="100%" height={220} radius={RADIUS.lg} />
              <Skeleton width="100%" height={140} radius={RADIUS.lg} />
            </View>
          ) : detail.isError || !c ? (
            <EmptyState faIcon="trophy" title={t('comp.notFoundTitle')} subtitle={t('comp.notFoundBody')} />
          ) : (
            <>
              <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <Hero c={c} />

                {c.status === 'PAUSED' && <Notice tone="warning" text={`${t('comp.pausedBanner')}${c.pauseReason ? ` ${c.pauseReason}` : ''}`} />}
                {c.status === 'CANCELLED' && <Notice tone="danger" text={`${t('comp.cancelledBanner')}${c.cancelReason ? ` ${t('comp.reasonLabel')}: ${c.cancelReason}` : ''}`} />}
                {c.status === 'AWAITING_RESULTS' && <Notice tone="info" text={t('comp.awaitingResultsBanner')} />}

                {p && <ProgressBlock c={c} p={p} onSaved={refreshAll} />}

                {!!c.results?.length && (
                  <Section title={t('comp.finalResults')}>
                    {c.results.map((r, i) => (
                      <View key={`${r.prize.id}-${i}`} style={styles.resultRow}>
                        <FontAwesome5 name="award" size={16} color={r.prize.kind === 'PLACEMENT' ? ORANGE : '#7C3AED'} />
                        <ProfileRow onPress={openProfile.creator(r.creator.id)} label={r.creator.fullName ?? r.creator.username ?? ''} style={{ flex: 1 }}>
                          <PersonAvatar uri={r.creator.avatarUrl} name={r.creator.fullName ?? r.creator.username} size={32} />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.strong, { color: C.text }]} numberOfLines={1}>
                              {r.creator.fullName ?? r.creator.username}{r.creator.fullName && r.creator.username ? <Text style={{ color: C.textSecondary, fontFamily: F.regular }}> @{r.creator.username}</Text> : null}
                            </Text>
                            <Text style={[styles.meta, { color: C.textSecondary }]}>{r.prize.title}</Text>
                          </View>
                        </ProfileRow>
                        {r.prize.amount != null && <Text style={[styles.strong, { color: C.text }]}>{npr(r.prize.amount)}</Text>}
                      </View>
                    ))}
                  </Section>
                )}

                <About c={c} />

                <Section title={t('comp.keyDates')}>
                  <InfoRow label={t('comp.registrationOpens')} value={formatNpt(c.registrationOpensAt)} />
                  <InfoRow label={t('comp.registrationCloses2')} value={formatNpt(c.registrationDeadline)} />
                  <InfoRow label={t('comp.runs')} value={`${formatNpt(c.startsAt, false)} – ${formatNpt(c.endsAt, false)}`} />
                  {c.submissionMode === 'SINGLE' && c.stages[0] && <InfoRow label={t('comp.entryDeadline')} value={formatNpt(c.stages[0].deadline)} />}
                </Section>

                <Stages c={c} p={p} />

                <Section title={t('comp.prizes')}>
                  <PrizeList prizes={c.prizes} pool={c.prizePool} />
                </Section>
              </ScrollView>

              <JoinBar c={c} p={p} onJoin={() => setConfirmJoin(true)} />
            </>
          )}
        </MaxWidthContainer>
      </KeyboardAvoidingView>

      {c && (
        <AppModal
          visible={confirmJoin}
          type="info"
          icon="trophy"
          title={t('comp.joinConfirmTitle')}
          body={t('comp.joinConfirmBody', { title: c.title })}
          confirmLabel={t('comp.ctaJoin')}
          cancelLabel={t('common.cancel')}
          loading={joining}
          onConfirm={() => void join()}
          onCancel={() => setConfirmJoin(false)}
        />
      )}
    </SafeAreaView>
  );
}

function Hero({ c }: { c: CompetitionDetail }) {
  const C = useAppColors();
  const openProfile = useOpenProfile();
  const { t } = useLanguage();
  const status = competitionStatusBadge(c.status, t);
  return (
    <View style={[styles.hero, SHADOW.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      {c.coverImageUrl
        ? <Image source={{ uri: c.coverImageUrl }} style={styles.heroCover} contentFit="cover" />
        : <View style={[styles.heroCover, styles.center, { backgroundColor: withAlpha(ORANGE, 0.1) }]}><FontAwesome5 name="trophy" size={40} color={withAlpha(ORANGE, 0.6)} /></View>}
      <View style={{ padding: SPACING.lg, gap: 10 }}>
        <View style={styles.rowWrap}>
          <TypeBadge />
          <Badge label={status.label} tone={status.tone} dot />
        </View>
        <Text style={[styles.heroTitle, { color: C.text }]}>{c.title}</Text>
        <ProfileRow onPress={openProfile.business(c.organizer.slug)} label={c.organizer.name ?? ''} style={{ gap: 8, alignSelf: 'flex-start' }}>
          <PersonAvatar uri={c.organizer.logoUrl} name={c.organizer.name} size={22} />
          <Text style={[styles.meta, { color: C.textSecondary, flexShrink: 1 }]}>{t('comp.byOrganizer', { name: c.organizer.name ?? '' })}</Text>
          {c.organizer.isVerified && <FontAwesome5 name="check-circle" solid size={12} color={toneColor('info')} />}
        </ProfileRow>
        <View style={{ gap: 6 }}>
          <MetaLine icon="calendar-alt" text={t('comp.registrationUntil', { when: formatNpt(c.registrationDeadline) })} />
          {c.prizePool && <MetaLine icon="trophy" color={ORANGE} bold text={t('comp.prizePool', { amount: npr(c.prizePool.amount) })} />}
        </View>
      </View>
    </View>
  );
}

function MetaLine({ icon, text, color, bold }: { icon: string; text: string; color?: string; bold?: boolean }) {
  const C = useAppColors();
  return (
    <View style={styles.iconRow}>
      <FontAwesome5 name={icon} size={12} color={color ?? C.textSecondary} style={{ width: 16 }} />
      <Text style={[styles.meta, { color: bold ? C.text : C.textSecondary }, bold && { fontFamily: F.semibold }]}>{text}</Text>
    </View>
  );
}

function Notice({ tone, text }: { tone: 'warning' | 'danger' | 'info'; text: string }) {
  const color = toneColor(tone);
  return (
    <View style={[styles.notice, { backgroundColor: withAlpha(color, 0.1) }]}>
      <FontAwesome5 name={tone === 'info' ? 'info-circle' : 'exclamation-circle'} solid size={15} color={color} style={{ marginTop: 2 }} />
      <Text style={[styles.small, { color, flex: 1, fontFamily: F.medium }]}>{text}</Text>
    </View>
  );
}

function Chips({ title, tags, tint }: { title: string; tags: string[]; tint?: boolean }) {
  const C = useAppColors();
  if (!tags.length) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.subhead, { color: C.text }]}>{title}</Text>
      <View style={styles.rowWrap}>
        {tags.map((x) => (
          <View key={x} style={[styles.chip, tint ? { backgroundColor: withAlpha('#7C3AED', 0.1) } : { borderWidth: 1, borderColor: C.border }]}>
            <Text style={[styles.meta, { color: tint ? '#6D28D9' : C.textSecondary }]}>{x}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function About({ c }: { c: CompetitionDetail }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const dur = durationLabel(c.videoMinSec, c.videoMaxSec, t);
  return (
    <>
      <Section title={t('comp.aboutCompetition')}>
        <MarkdownText>{c.description}</MarkdownText>
        <Chips title={t('comp.objectives')} tags={parseObjectives(c.objectives)} tint />
        <Chips title={t('comp.formatsLabel')} tags={c.contentFormats} />
        <Chips title={t('comp.skillsLabel')} tags={c.skills ?? []} />
      </Section>

      <Section title={t('comp.rulesEligibility')}>
        <MarkdownText>{c.rules}</MarkdownText>
        {!!c.eligibility && (
          <>
            <Text style={[styles.subhead, { color: C.text }]}>{t('comp.eligibility')}</Text>
            <MarkdownText>{c.eligibility}</MarkdownText>
          </>
        )}
        <View style={{ gap: 4 }}>
          <Text style={[styles.small, { color: C.textSecondary }]}>• {c.allowSubmissionEdits ? t('comp.ruleEditsAllowed') : t('comp.ruleEditsLocked')}</Text>
          {c.onePrizePerCreator && <Text style={[styles.small, { color: C.textSecondary }]}>• {t('comp.ruleOnePrize')}</Text>}
        </View>
      </Section>

      {(!!c.submissionInstructions || !!dur) && (
        <Section title={t('comp.howToSubmit')}>
          <MarkdownText>{c.submissionInstructions}</MarkdownText>
          {dur && <InfoRow label={t('comp.videoLengthLabel')} value={dur} />}
        </Section>
      )}

      {c.judgingCriteria.length > 0 && (
        <Section title={t('comp.judging')}>
          {c.judgingCriteria.map((j) => <InfoRow key={j.label} label={j.label} value={`${j.weight}%`} />)}
          <Text style={[styles.meta, { color: C.textSecondary }]}>{t('comp.judgingNote')}</Text>
        </Section>
      )}

      {c.attachments?.length > 0 && (
        <Section title={t('comp.documents')}>
          {c.attachments.map((a, i) => (
            <Pressable key={`${a.url}-${i}`} onPress={() => void Linking.openURL(a.url)} accessibilityRole="link"
              style={[styles.docRow, { borderColor: C.border }]}>
              <FontAwesome5 name={a.type === 'image' || /\.(png|jpe?g|webp)$/i.test(a.url) ? 'image' : 'file-pdf'} size={15} color={C.brinjal1} />
              <Text style={[styles.small, { color: C.text, flex: 1 }]} numberOfLines={1}>{a.name ?? a.originalFileName ?? a.url.split('/').pop()}</Text>
              <FontAwesome5 name="external-link-alt" size={12} color={C.textSecondary} />
            </Pressable>
          ))}
        </Section>
      )}

      {!!c.contactInstructions && (
        <Section title={t('comp.questions')}>
          <MarkdownText>{c.contactInstructions}</MarkdownText>
        </Section>
      )}
    </>
  );
}

function Stages({ c, p }: { c: CompetitionDetail; p: MyProgress | null }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [open, setOpen] = useState<string | null>(null);
  const single = c.submissionMode === 'SINGLE';
  const stages: TimelineStage[] = c.stages.map((s, i) => {
    const mine = p?.stages.find((x) => x.stageId === s.id);
    return {
      ...s,
      reviewRound: single && i > 0,
      ...(p ? { outcome: mine?.outcome ?? null, submitted: !!mine?.submission, locked: s.order > p.currentStageOrder } : {}),
    };
  });
  const currentId = p ? p.stages.find((s) => s.order === p.currentStageOrder)?.stageId : c.currentStageId;

  return (
    <Section title={t('comp.stages')}>
      <StageTimeline stages={stages} currentId={currentId} />
      {c.stages.filter((s) => s.brief || s.requirements).map((s) => (
        <View key={s.id} style={[styles.brief, { borderColor: C.border }]}>
          <Pressable onPress={() => setOpen(open === s.id ? null : s.id)} style={styles.briefHead} accessibilityRole="button">
            <Text style={[styles.subhead, { color: C.text, flex: 1 }]}>{t('comp.stageBrief', { name: s.name })}</Text>
            <FontAwesome5 name={open === s.id ? 'chevron-up' : 'chevron-down'} size={12} color={C.textSecondary} />
          </Pressable>
          {open === s.id && (
            <View style={{ gap: 8, paddingTop: 8 }}>
              <MarkdownText>{s.brief}</MarkdownText>
              <MarkdownText>{s.requirements}</MarkdownText>
            </View>
          )}
        </View>
      ))}
    </Section>
  );
}

/** "Your progress" — what to do next and the entry form for the current stage. */
function ProgressBlock({ c, p, onSaved }: { c: CompetitionDetail; p: MyProgress; onSaved: () => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const b = creatorStatusBadge(p.status, t);
  const current = p.stages.find((s) => s.order === p.currentStageOrder);
  const previousStage = current ? [...p.stages].filter((s) => s.order < current.order && s.submission).sort((a, z) => z.order - a.order)[0] : undefined;
  const previous = previousStage?.submission ? { stageName: previousStage.name, submission: previousStage.submission } : null;
  const pastWithEntries = p.stages.filter((s) => s.order < p.currentStageOrder && s.submission);
  const brief = current ? c.stages.find((s) => s.id === current.stageId)?.brief : null;

  return (
    <Section title={t('comp.yourProgress')}>
      <View style={[styles.statusBox, { backgroundColor: C.primaryLight }]}>
        <Badge label={b.label} tone={b.tone} dot />
        <Text style={[styles.small, { color: C.text }]}>{b.hint}</Text>
        {p.awards.length > 0 && (
          <Text style={[styles.small, { color: ORANGE, fontFamily: F.semibold }]}>🏆 {t('comp.youWon', { prizes: p.awards.map((a) => a.title).join(', ') })}</Text>
        )}
      </View>

      {current && p.participantStatus === 'ACTIVE' && !['COMPLETED', 'CANCELLED'].includes(c.status) && (
        <View style={{ gap: 10 }}>
          <Text style={[styles.subhead, { color: C.text }]}>{current.name}</Text>
          {current.status === 'UPCOMING' ? (
            <Text style={[styles.small, { color: C.textSecondary }]}>{t('comp.stageOpensAt', { when: formatNpt(current.opensAt) })}</Text>
          ) : (
            <>
              <MarkdownText>{brief}</MarkdownText>
              {current.reviewRound && (
                <View style={[styles.notice, { backgroundColor: withAlpha(toneColor('positive'), 0.1) }]}>
                  <Text style={[styles.small, { color: C.text }]}>{t('comp.reviewRoundCreator')}</Text>
                </View>
              )}
              <SubmissionPanel key={current.stageId} competitionId={c.id} stage={current} allowEdits={c.allowSubmissionEdits} onSaved={onSaved} previous={previous} />
            </>
          )}
        </View>
      )}

      {pastWithEntries.length > 0 && (
        <View style={{ gap: 4 }}>
          <Text style={[styles.subhead, { color: C.text }]}>{t('comp.previousEntries')}</Text>
          {pastWithEntries.map((s) => (
            <Text key={s.stageId} style={[styles.meta, { color: C.textSecondary }]}>
              {s.name} — {formatNpt(s.submission!.submittedAt)}
              {s.outcome ? ` · ${s.outcome === 'ADVANCE' ? t('comp.outcomeAdvanced') : t('comp.outcomeNotSelected')}` : ''}
            </Text>
          ))}
        </View>
      )}
    </Section>
  );
}

/** A creator's entry for one stage — Google Drive link only, same as web. Server re-validates everything. */
function SubmissionPanel({ competitionId, stage, allowEdits, onSaved, previous }: {
  competitionId: string;
  stage: MyProgressStage;
  allowEdits: boolean;
  onSaved: () => void;
  previous: { stageName: string; submission: MySubmission } | null;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const v = useValidators();
  const linkAllowed = stage.allowedMethods.includes('EXTERNAL_LINK');
  const reusable = previous?.submission.method === 'EXTERNAL_LINK' && previous.submission.externalUrl ? previous : null;
  const [editing, setEditing] = useState(!stage.submission);
  const [source, setSource] = useState<'reuse' | 'new' | null>(reusable ? null : 'new');
  const [link, setLink] = useState('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canReplace = stage.canSubmit && (!stage.submission || allowEdits);

  const driveRule = (value: string) => (!value.trim() || isGoogleDriveLink(value) ? undefined : t('comp.driveOnly'));
  const form = useFormValidation(
    { link: source === 'new' ? link : 'reuse' },
    { link: compose(v.required(t('comp.linkRequired')), driveRule) },
  );

  async function submit() {
    setError(null);
    if (source === 'new' && !form.validate()) return;
    setBusy(true);
    try {
      const url = source === 'reuse' && reusable ? reusable.submission.externalUrl! : link.trim();
      await creatorCompetitionService.submitLink(competitionId, stage.stageId, { url, caption: caption.trim() || undefined });
      toast.success(stage.submission ? t('comp.entryUpdated') : t('comp.entryReceived'));
      setEditing(false);
      setLink('');
      setCaption('');
      setSource(reusable ? null : 'new');
      form.reset();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.somethingWentWrong'));
    } finally {
      setBusy(false);
    }
  }

  const dur = durationLabel(stage.videoMinSec, stage.videoMaxSec, t);

  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 6 }}>
        <InfoRow label={t('comp.deadline')} value={formatNpt(stage.deadline)} />
        <InfoRow label={t('comp.submitAs')} value={stage.allowedMethods.map((m) => (m === 'VIDEO_UPLOAD' ? t('comp.methodVideo') : t('comp.methodLink'))).join(' · ')} />
        {dur && <InfoRow label={t('comp.videoLengthLabel')} value={dur} />}
      </View>

      {stage.submission && (
        <View style={[styles.entryBox, { borderColor: withAlpha(toneColor('positive'), 0.35), backgroundColor: withAlpha(toneColor('positive'), 0.06) }]}>
          <View style={styles.iconRow}>
            <FontAwesome5 name="check-circle" solid size={14} color={toneColor('positive')} />
            <Text style={[styles.small, { color: toneColor('positive'), fontFamily: F.semibold, flex: 1 }]}>
              {t('comp.yourEntry', { when: formatNpt(stage.submission.submittedAt) })}
              {stage.submission.version > 1 ? <Text style={{ color: C.textSecondary, fontFamily: F.regular }}> · {t('comp.versionN', { n: stage.submission.version })}</Text> : null}
            </Text>
          </View>
          {reusable && stage.submission.externalUrl === reusable.submission.externalUrl && (
            <Text style={[styles.meta, { color: C.textSecondary }]}>{t('comp.reusedFrom', { stage: reusable.stageName })}</Text>
          )}
          <SubmissionPreview sub={stage.submission} />
          {canReplace && !editing && <Button label={t('comp.replaceEntry')} variant="secondary" size="small" onPress={() => setEditing(true)} />}
        </View>
      )}

      {!!stage.blockedReason && !stage.canSubmit && <Notice tone="info" text={stage.blockedReason} />}
      {stage.submission && stage.canSubmit && !allowEdits && <Text style={[styles.meta, { color: C.textSecondary }]}>{t('comp.editsLocked')}</Text>}

      {canReplace && editing && linkAllowed && (
        <View style={[styles.formBox, { borderColor: C.border }]}>
          {reusable && (
            <View style={{ gap: 8 }}>
              <Text style={[styles.subhead, { color: C.text }]}>{t('comp.entrySourceTitle')}</Text>
              {([
                { value: 'reuse' as const, icon: 'redo' as const, title: t('comp.reuseTitle', { stage: reusable.stageName }), desc: t('comp.reuseDesc') },
                { value: 'new' as const, icon: 'plus' as const, title: t('comp.newVideoTitle'), desc: t('comp.newVideoDesc') },
              ]).map((o) => {
                const on = source === o.value;
                return (
                  <Pressable key={o.value} onPress={() => { setSource(o.value); setError(null); }}
                    accessibilityRole="radio" accessibilityState={{ checked: on }}
                    style={[styles.option, { borderColor: on ? C.brinjal1 : C.border, backgroundColor: on ? withAlpha(C.brinjal1, 0.06) : 'transparent' }]}>
                    <View style={[styles.optionIcon, { backgroundColor: on ? C.brinjal1 : C.primaryLight }]}>
                      <FontAwesome5 name={o.icon} size={12} color={on ? '#fff' : C.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.strong, { color: C.text }]}>{o.title}</Text>
                      <Text style={[styles.meta, { color: C.textSecondary }]}>{o.desc}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {source === 'reuse' && reusable && <SubmissionPreview sub={reusable.submission} />}

          {source === 'new' && (
            <View style={{ gap: 6 }}>
              <TextInputWithLabel
                label={t('comp.driveLink')}
                required
                placeholder="https://drive.google.com/file/d/…"
                value={link}
                onChangeText={setLink}
                error={form.error('link')}
                leftIcon="link"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Text style={[styles.meta, { color: C.textSecondary }]}>{t('comp.linkHelp')}</Text>
            </View>
          )}

          {source && (
            <TextInputWithLabel label={t('comp.captionOptional')} value={caption} onChangeText={setCaption} maxLength={500} />
          )}

          <FormErrorBanner message={error} />
          {source && (
            <Button
              label={source === 'reuse' ? t('comp.submitSameVideo') : stage.submission ? t('comp.submitReplacement') : t('comp.submitEntry')}
              onPress={() => void submit()}
              loading={busy}
            />
          )}
          {stage.submission && !busy && <Button label={t('common.cancel')} variant="ghost" onPress={() => setEditing(false)} />}
          <Text style={[styles.meta, { color: C.textSecondary }]}>{t('comp.deadlineReminder', { when: formatNpt(stage.deadline) })}</Text>
        </View>
      )}
    </View>
  );
}

/** Pinned bottom bar: Join (when open) / "You're in" status / why joining is closed. */
function JoinBar({ c, p, onJoin }: { c: CompetitionDetail; p: MyProgress | null; onJoin: () => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  if (c.viewer.joined) {
    if (!p) return null;
    const b = creatorStatusBadge(p.status, t);
    return (
      <View style={[styles.bar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
        <View style={styles.iconRow}>
          <FontAwesome5 name="check-circle" solid size={14} color={toneColor('positive')} />
          <Text style={[styles.strong, { color: toneColor('positive') }]}>{t('comp.youAreIn')}</Text>
        </View>
        <Badge label={b.label} tone={b.tone} dot />
      </View>
    );
  }
  if (c.viewer.canJoin) {
    return (
      <View style={[styles.bar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
        <View style={{ flex: 1 }}><Button label={t('comp.ctaJoin')} icon="trophy" onPress={onJoin} /></View>
      </View>
    );
  }
  if (!c.registrationClosedReason) return null;
  return (
    <View style={[styles.bar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
      <Text style={[styles.small, { color: C.textSecondary, flex: 1, textAlign: 'center' }]}>{c.registrationClosedReason}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll:    { padding: SCREEN_GUTTER, gap: 14, paddingBottom: 40 },
  center:    { alignItems: 'center', justifyContent: 'center' },
  hero:      { borderWidth: 1, borderRadius: RADIUS.lg, overflow: 'hidden' },
  heroCover: { width: '100%', aspectRatio: 16 / 9 },
  heroTitle: { fontSize: 22, fontFamily: F.bold, lineHeight: lineHeightFor(22) },
  rowWrap:   { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  iconRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta:      { fontSize: 12.5, fontFamily: F.regular, lineHeight: lineHeightFor(12.5) },
  small:     { fontSize: 13.5, fontFamily: F.regular, lineHeight: lineHeightFor(13.5) },
  strong:    { fontSize: 14, fontFamily: F.semibold, lineHeight: lineHeightFor(14) },
  subhead:   { fontSize: 13.5, fontFamily: F.semibold, lineHeight: lineHeightFor(13.5) },
  notice:    { flexDirection: 'row', gap: 10, borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 12 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  chip:      { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  docRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10 },
  brief:     { borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10 },
  briefHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBox: { borderRadius: RADIUS.md, padding: 14, gap: 8 },
  entryBox:  { borderWidth: 1, borderRadius: RADIUS.md, padding: 14, gap: 10 },
  formBox:   { borderWidth: 1, borderRadius: RADIUS.md, padding: 14, gap: 12 },
  option:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: RADIUS.md, padding: 12 },
  optionIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: SCREEN_GUTTER, paddingTop: 12, paddingBottom: 28, borderTopWidth: StyleSheet.hairlineWidth },
});
