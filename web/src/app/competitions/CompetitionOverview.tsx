import type { ReactNode } from 'react';
import { CalendarClock, Trophy, Award } from 'lucide-react';
import { useT } from '../i18n';
import { Avatar } from '../ui/Avatar';
import { VerifiedTick } from '../ui/VerifiedTick';
import { Alert } from '../ui/Alert';
import { EventAttachmentsView } from '../events/EventAttachments';
import type { CompetitionDetail } from '../api/competitions';
import { CompetitionTypeBadge, CompetitionStatusBadge, Prose, Section, StageTimeline, PrizeList, InfoRow, ProfileLink, type TimelineStage } from './parts';
import { useProfilePaths } from './profilePaths';
import { formatNpt, durationLabel, npr } from './format';
import { parseObjectives } from './options';

/** The subset of the public detail the overview needs — also built from form state for previews. */
export type OverviewData = Omit<CompetitionDetail, 'viewer' | 'id' | 'slug' | 'registrationOpen' | 'registrationClosedReason' | 'currentStageId' | 'participantCount' | 'results'> & {
  participantCount?: number;
  results?: CompetitionDetail['results'];
  registrationClosedReason?: string | null;
};

export function CompetitionOverview({ c, headerAction, progress, timelineStages, currentStageId }: {
  c: OverviewData;
  /** Join button / status, rendered in the hero. */
  headerAction?: ReactNode;
  /** Participant-only block ("Your progress" + submission), rendered first in the main column. */
  progress?: ReactNode;
  /** Optional per-creator timeline (with outcomes); defaults to the public one. */
  timelineStages?: TimelineStage[];
  currentStageId?: string | null;
}) {
  const t = useT();
  const paths = useProfilePaths();
  const dur = durationLabel(c.videoMinSec, c.videoMaxSec, t);
  const single = c.submissionMode === 'SINGLE';
  const stages: TimelineStage[] = (timelineStages ?? c.stages.map((s) => ({ ...s }))).map((s, i) => ({ ...s, reviewRound: single && i > 0 }));
  const objectives = parseObjectives(c.objectives);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="relative aspect-[3/1] min-h-[140px] w-full bg-gradient-to-br from-brand-orange/20 via-surface-dim to-violet/10">
          {c.coverImageUrl ? <img src={c.coverImageUrl} alt="" className="h-full w-full object-cover" /> : (
            <div className="flex h-full items-center justify-center text-brand-orange/70"><Trophy size={48} aria-hidden /></div>
          )}
        </div>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CompetitionTypeBadge />
              <CompetitionStatusBadge status={c.status} />
            </div>
            <h1 className="mt-2 text-[22px] font-semibold leading-tight text-ink sm:text-[26px]">{c.title}</h1>
            <ProfileLink to={paths.business(c.organizer.slug)} className="mt-2 gap-2 self-start text-[13px] text-ink-soft">
              <Avatar name={c.organizer.name ?? ''} src={c.organizer.logoUrl} size="xs" />
              <span className="group-hover/creator:text-ink group-hover/creator:underline">{t('comp.byOrganizer', { name: c.organizer.name ?? '' })}</span>
              <VerifiedTick entity={{ isVerified: c.organizer.isVerified }} />
            </ProfileLink>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-ink-soft">
              <span className="inline-flex items-center gap-1"><CalendarClock size={13} aria-hidden />{t('comp.registrationUntil', { when: formatNpt(c.registrationDeadline) })}</span>
              {c.prizePool && <span className="inline-flex items-center gap-1 font-semibold text-ink"><Trophy size={13} aria-hidden className="text-brand-orange" />{t('comp.prizePool', { amount: npr(c.prizePool.amount) })}</span>}
            </div>
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      </div>

      {c.status === 'PAUSED' && <Alert tone="warning">{t('comp.pausedBanner')}{c.pauseReason ? ` ${c.pauseReason}` : ''}</Alert>}
      {c.status === 'CANCELLED' && <Alert tone="error">{t('comp.cancelledBanner')}{c.cancelReason ? ` ${t('comp.reasonLabel')}: ${c.cancelReason}` : ''}</Alert>}
      {c.status === 'AWAITING_RESULTS' && <Alert tone="info">{t('comp.awaitingResultsBanner')}</Alert>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {progress}

          {c.results && c.results.length > 0 && (
            <Section title={t('comp.finalResults')}>
              <ul className="divide-y divide-line">
                {c.results.map((r, i) => (
                  <li key={`${r.prize.id}-${i}`} className="flex items-center gap-3 py-2.5">
                    <Award size={18} aria-hidden className={r.prize.kind === 'PLACEMENT' ? 'text-brand-orange' : 'text-violet'} />
                    <ProfileLink to={paths.creator(r.creator)} className="flex-1">
                      <Avatar name={r.creator.fullName ?? r.creator.username ?? ''} src={r.creator.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-ink group-hover/creator:text-violet-dark group-hover/creator:underline">{r.creator.fullName ?? r.creator.username}{r.creator.fullName && r.creator.username ? <span className="font-normal text-ink-soft"> @{r.creator.username}</span> : null}</p>
                        <p className="text-[12.5px] text-ink-soft">{r.prize.title}</p>
                      </div>
                    </ProfileLink>
                    {r.prize.amount != null && <span className="text-[13px] font-semibold text-ink">{npr(r.prize.amount)}</span>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title={t('comp.aboutCompetition')}>
            <Prose>{c.description}</Prose>
            {objectives.length > 0 && (
              <>
                <h3 className="mb-1.5 mt-4 text-[13px] font-semibold text-ink">{t('comp.objectives')}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {objectives.map((o) => <span key={o} className="rounded-full bg-violet/10 px-2.5 py-1 text-[12.5px] font-medium text-violet-dark">{o}</span>)}
                </div>
              </>
            )}
            <TagRow title={t('comp.formatsLabel')} tags={c.contentFormats} />
            <TagRow title={t('comp.skillsLabel')} tags={c.skills ?? []} />
          </Section>

          <Section title={t('comp.rulesEligibility')}>
            <Prose>{c.rules}</Prose>
            {c.eligibility && (<><h3 className="mb-1 mt-4 text-[13px] font-semibold text-ink">{t('comp.eligibility')}</h3><Prose>{c.eligibility}</Prose></>)}
            <ul className="mt-4 space-y-1 text-[13px] text-ink-soft">
              <li>• {c.allowSubmissionEdits ? t('comp.ruleEditsAllowed') : t('comp.ruleEditsLocked')}</li>
              {c.onePrizePerCreator && <li>• {t('comp.ruleOnePrize')}</li>}
            </ul>
          </Section>

          {(c.submissionInstructions || dur) && (
            <Section title={t('comp.howToSubmit')}>
              <Prose>{c.submissionInstructions}</Prose>
              {dur && <p className="mt-2 text-[13px] text-ink"><span className="text-ink-soft">{t('comp.videoLengthLabel')}:</span> {dur}</p>}
            </Section>
          )}

          {c.judgingCriteria.length > 0 && (
            <Section title={t('comp.judging')}>
              <ul className="space-y-1.5">
                {c.judgingCriteria.map((j) => (
                  <li key={j.label} className="flex items-center justify-between gap-3 text-[13.5px]">
                    <span className="text-ink">{j.label}</span>
                    <span className="font-semibold text-ink-soft">{j.weight}%</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[12px] text-ink-soft">{t('comp.judgingNote')}</p>
            </Section>
          )}

          {c.attachments?.length > 0 && (
            <Section title={t('comp.documents')}>
              <EventAttachmentsView attachments={c.attachments} />
            </Section>
          )}

          {c.contactInstructions && (
            <Section title={t('comp.questions')}>
              <Prose>{c.contactInstructions}</Prose>
            </Section>
          )}
        </div>

        <aside className="min-w-0 space-y-5">
          <Section title={t('comp.keyDates')}>
            <dl className="space-y-1.5 text-[13px]">
              <InfoRow label={t('comp.registrationOpens')} value={formatNpt(c.registrationOpensAt)} />
              <InfoRow label={t('comp.registrationCloses2')} value={formatNpt(c.registrationDeadline)} />
              <InfoRow label={t('comp.runs')} value={`${formatNpt(c.startsAt, { time: false })} – ${formatNpt(c.endsAt, { time: false })}`} />
              {single && c.stages[0] && <InfoRow label={t('comp.entryDeadline')} value={formatNpt(c.stages[0].deadline)} />}
            </dl>
          </Section>
          <Section title={t('comp.stages')}>
            <StageTimeline stages={stages} currentId={currentStageId} />
            <div className="mt-3 space-y-3">
              {c.stages.filter((s) => s.brief || s.requirements).map((s) => (
                <details key={s.id} className="rounded-xl border border-line px-3 py-2">
                  <summary className="cursor-pointer text-[13px] font-semibold text-ink">{t('comp.stageBrief', { name: s.name })}</summary>
                  <Prose className="mt-2">{s.brief}</Prose>
                  <Prose className="mt-2">{s.requirements}</Prose>
                </details>
              ))}
            </div>
          </Section>
          <Section title={t('comp.prizes')}>
            <PrizeList prizes={c.prizes} pool={c.prizePool} />
          </Section>
        </aside>
      </div>
    </div>
  );
}

function TagRow({ title, tags }: { title: string; tags: string[] }) {
  if (!tags.length) return null;
  return (
    <>
      <h3 className="mb-1.5 mt-4 text-[13px] font-semibold text-ink">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((f) => <span key={f} className="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-ink-soft">{f}</span>)}
      </div>
    </>
  );
}
