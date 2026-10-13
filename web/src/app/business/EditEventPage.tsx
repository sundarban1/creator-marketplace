import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { SuggestDescriptionButton } from './SuggestDescriptionButton';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchCategories, fetchActivePlatforms } from '../api/catalog';
import { fetchCampaign, updateCampaign, type MyCampaign } from '../api/business';
import { EventReviewBanner } from './EventReviewBanner';
import { canResubmitEvent, eventStatusLabel } from './eventReviewStatus';
import { LocationAutocomplete } from '../public/LocationAutocomplete';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Alert } from '../ui/Alert';
import { FeaturedEventToggle } from './FeaturedEventToggle';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ApiError } from '../lib/apiClient';
import { EventCoverPicker } from './EventCoverPicker';
import { OFFERING_OPTIONS, ROLE_TYPE_OPTIONS } from './eventFormConstants';
import { ChipGroup } from './eventFormShared';
import { GuidedCampaignCreator } from './guided/GuidedCampaignCreator';
import { EventAttachmentsEditor } from '../events/EventAttachments';

type Status = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'CANCELLED';

export function EditEventPage() {
  const t = useT();
  const { id = '' } = useParams();
  const campaign = useAsync((s) => fetchCampaign(id, s), [id]);

  if (campaign.loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <Skeleton className="h-8 w-2/3" />
        <SkeletonText lines={3} className="mt-4" />
      </div>
    );
  }
  if (campaign.error || !campaign.data) {
    const nf = campaign.error instanceof ApiError && campaign.error.status === 404;
    return (
      <div className="mx-auto max-w-2xl py-10">
        <EmptyState
          variant={nf ? 'not-found' : 'error'}
          title={t('public.eventNotFoundTitle')}
          action={{ label: t('biz.eventsTitle'), href: '/business/events' }}
        />
      </div>
    );
  }

  // Keyed on the campaign id so a *different* campaign (a fresh navigation,
  // not a background refetch of the same one) remounts with fresh initial
  // state — the form's local state is otherwise seeded once via lazy
  // initializers below, never copied in from an effect.
  // Paid campaigns edit in the same guided flow they were created in (opened
  // on the review summary); an unpublished draft resumes in the creator.
  if (campaign.data.campaignType !== 'OPEN_EVENT') {
    if (campaign.data.status === 'DRAFT') return <Navigate to={`/business/events/create?draft=${campaign.data.id}`} replace />;
    return <GuidedCampaignCreator key={campaign.data.id} mode="edit" campaign={campaign.data} />;
  }

  return <EditEventForm key={campaign.data.id} id={id} initial={campaign.data} />;
}

function EditEventForm({ id, initial: c }: { id: string; initial: MyCampaign }) {
  const t = useT();
  const navigate = useNavigate();
  const categories = useAsync((s) => fetchCategories(s), []);
  const platformList = useAsync((s) => fetchActivePlatforms(s), []);

  const [featureImageUrl, setFeatureImageUrl] = useState(c.featureImageUrl ?? '');

  const [title, setTitle] = useState(c.title);
  const [description, setDescription] = useState(c.description);
  const [category, setCategory] = useState(c.category);
  const [status, setStatus] = useState<Status>((c.status as Status) ?? 'ACTIVE');
  // Review statuses aren't business-settable: an event in review shows no
  // status picker, and saving a changes-requested event resubmits it.
  const inReview = c.status === 'PENDING_APPROVAL' || c.status === 'CHANGES_REQUESTED' || c.status === 'REJECTED';
  const approved = ['ACTIVE', 'PAUSED', 'CLOSED', 'EXPIRED'].includes(c.status);
  const [budgetMin, setBudgetMin] = useState(c.budgetMin ? String(c.budgetMin) : '');
  const [budgetMax, setBudgetMax] = useState(c.budgetMax ? String(c.budgetMax) : '');
  const [creatorsNeeded, setCreatorsNeeded] = useState(String(c.creatorsNeeded ?? 1));
  const [deadline, setDeadline] = useState(c.deadline ? c.deadline.slice(0, 10) : '');
  const [deliverables, setDeliverables] = useState(c.deliverables ?? '');
  const [minFollowers, setMinFollowers] = useState(String(c.minFollowers ?? 0));
  const [location, setLocation] = useState((c.campaignType === 'OPEN_EVENT' ? c.venue : c.location) ?? '');
  const [locationType, setLocationType] = useState<'ONSITE' | 'REMOTE'>((c.locationType as 'ONSITE' | 'REMOTE') ?? 'REMOTE');
  const [hashtags, setHashtags] = useState<string[]>(c.hashtags ?? []);
  const [hashtagInput, setHashtagInput] = useState('');
  const [isFeatured, setIsFeatured] = useState(!!c.isFeatured);
  // Locked server-side once anyone has applied, like the other proposal terms.
  const [platforms, setPlatforms] = useState<string[]>(c.platforms ?? []);
  const platformsLocked = (c._count?.applications ?? 0) > 0;

  // Open-event-only fields.
  const [benefits, setBenefits] = useState<string[]>(c.benefits ?? []);
  const [roleTypes, setRoleTypes] = useState<string[]>(c.targetAudience?.length ? c.targetAudience : ['Content Creators']);
  const [eventDate, setEventDate] = useState(c.eventDate ? c.eventDate.slice(0, 10) : '');
  const [eventTime, setEventTime] = useState(c.eventTime ?? '');

  const [attachments, setAttachments] = useState(c.brief?.attachments ?? []);
  const [attachmentsBusy, setAttachmentsBusy] = useState(false);

  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isFree = c.campaignType === 'OPEN_EVENT';

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

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setFlash('');

    if (attachmentsBusy) return setError(t('biz.attachmentsWaitUpload'));
    if (title.trim().length < 3) return setError('Add a title.');
    if (!category) return setError('Pick a category.');

    const min = isFree ? 0 : Number(budgetMin) || 0;
    const max = isFree ? 0 : Number(budgetMax) || min;
    if (!isFree && (min <= 0 || max < min)) return setError('Enter a valid per-creator budget.');
    if (isFree) {
      if (!eventDate) return setError('Pick an event date.');
      if (new Date(deadline) >= new Date(eventDate)) return setError(t('biz.eventDateBeforeDeadline'));
    }

    setSubmitting(true);
    try {
      const saved = await updateCampaign(id, {
        title: title.trim(),
        description: description.trim(),
        category,
        // Only send a status the business actually changed — the server owns
        // every review transition.
        status: !inReview && status !== c.status ? status : undefined,
        featureImageUrl: featureImageUrl || null,
        budgetMin: isFree ? undefined : min,
        budgetMax: isFree ? undefined : max,
        budgetRateType: isFree ? undefined : min === max ? 'FIXED' : 'RANGE',
        creatorsNeeded: Math.max(1, Number(creatorsNeeded) || 1),
        deadline: new Date(deadline).toISOString(),
        deliverables: deliverables.trim(),
        minFollowers: isFree ? 0 : Number(minFollowers) || 0,
        location: locationType === 'ONSITE' ? location.trim() || undefined : null,
        locationType,
        hashtags: isFree ? undefined : hashtags,
        isFeatured,
        capacity: isFree ? Math.max(1, Number(creatorsNeeded) || 1) : undefined,
        eventDate: isFree ? new Date(eventDate).toISOString() : undefined,
        eventTime: isFree ? eventTime || null : undefined,
        venue: isFree ? location.trim() || undefined : undefined,
        benefits: isFree ? benefits : undefined,
        // Only send when changed — the server rejects any platforms key once applications exist.
        platforms: !platformsLocked && platforms.join('|') !== (c.platforms ?? []).join('|') ? platforms : undefined,
        // Whole-brief replace on the server — keep every other section.
        brief: { ...(c.brief ?? {}), attachments },
      });
      const submitted = saved.status === 'PENDING_APPROVAL' && c.status !== 'PENDING_APPROVAL';
      navigate(`/business/events/${id}`, submitted ? { state: { flash: t('eventReview.submittedFlash') } } : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={`/business/events/${id}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft size={14} />
        {c.title}
      </Link>

      <PageHeader title={t('biz.editEvent')} className="mt-3" />

      {error && <Alert tone="error" className="mb-5">{error}</Alert>}
      {flash && <Alert tone="success" className="mb-5">{flash}</Alert>}

      {canResubmitEvent(c) && <EventReviewBanner campaign={c} compact />}
      {approved && <Alert tone="info" className="mb-5">{t('eventReview.materialEditNote')}</Alert>}

      <form onSubmit={submit} className="space-y-4">
        <EventCoverPicker value={featureImageUrl} onChange={setFeatureImageUrl} onError={setError} />

        <TextField label={t('biz.fieldTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea
          label={t('public.eventAboutHeading')}
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          labelAccessory={
            <SuggestDescriptionButton
              input={{ title, category, platform: platforms.join(', '), deliverables }}
              onSuggested={setDescription}
              onError={setError}
            />
          }
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t('public.category')}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="—"
            options={(categories.data ?? []).map((cat) => ({ value: cat.name, label: cat.name }))}
          />
          {inReview ? (
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-ink">{t('eventReview.reviewStatusLabel')}</p>
              <p className="rounded-xl border border-line bg-surface-dim px-3 py-2.5 text-[14px] text-ink">{eventStatusLabel(t, c.status)}</p>
            </div>
          ) : (
            <Select
              label={t('biz.statusLabel')}
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              options={[
                { value: 'ACTIVE', label: t('biz.eventTabActive') },
                { value: 'PAUSED', label: t('biz.statusPaused') },
                { value: 'CLOSED', label: t('biz.eventTabClosed') },
                { value: 'CANCELLED', label: t('biz.statusCancelled') },
              ]}
            />
          )}
        </div>

        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink">{t('biz.eventPlatformsHeading')}</p>
          {platformsLocked ? (
            <p className="rounded-xl border border-line bg-surface-dim px-3 py-2.5 text-[14px] text-ink">{platforms.join(', ') || '—'}</p>
          ) : (
            <>
              <ChipGroup
                options={Array.from(new Set([...(platformList.data?.length ? platformList.data : ['Instagram', 'TikTok', 'YouTube', 'Facebook']), ...platforms]))}
                values={platforms}
                onChange={(v) => setPlatforms(v.slice(-3))}
              />
              <p className="mt-1.5 text-[12px] text-ink-soft">{t('biz.eventPlatformsEditHint')}</p>
            </>
          )}
          {platformsLocked ? <p className="mt-1.5 text-[12px] text-ink-soft">{t('biz.eventPlatformsLocked')}</p> : null}
        </div>

        {isFree ? (
          <>
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-ink">{t('biz.offeringHeading')}</p>
              <ChipGroup options={OFFERING_OPTIONS} values={benefits} onChange={setBenefits} />
            </div>

            <Textarea
              label={t('biz.expectedContentLabel')}
              rows={2}
              placeholder={t('biz.expectedContentPlaceholder')}
              value={deliverables}
              onChange={(e) => setDeliverables(e.target.value)}
            />

            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-ink">{t('biz.invitingHeading')}</p>
              <ChipGroup options={ROLE_TYPE_OPTIONS} values={roleTypes} onChange={setRoleTypes} />
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
            <div className="grid grid-cols-2 gap-3">
              <TextField label={t('biz.budgetMinField')} type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
              <TextField label={t('biz.budgetMaxField')} type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
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

        <EventAttachmentsEditor value={attachments} onChange={setAttachments} onBusyChange={setAttachmentsBusy} />

        <div className="flex gap-2 pt-2">
          <Button type="submit" size="lg" loading={submitting} disabled={attachmentsBusy}>
            {t('biz.saveChanges')}
          </Button>
          <Button type="button" size="lg" variant="secondary" disabled={submitting} onClick={() => navigate(`/business/events/${id}`)}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>

    </div>
  );
}
