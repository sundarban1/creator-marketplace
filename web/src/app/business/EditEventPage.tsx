import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, X } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchCategories } from '../api/catalog';
import { fetchCampaign, updateCampaign, uploadCampaignFeatureImage, type MyCampaign } from '../api/business';
import { LocationAutocomplete } from '../public/LocationAutocomplete';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Alert } from '../ui/Alert';
import { FeaturedEventToggle } from './FeaturedEventToggle';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ApiError } from '../lib/apiClient';
import { cn } from '../ui/cn';
import { OFFERING_OPTIONS, ROLE_TYPE_OPTIONS } from './eventFormConstants';
import { ChipGroup } from './eventFormShared';

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
  return <EditEventForm key={campaign.data.id} id={id} initial={campaign.data} />;
}

function EditEventForm({ id, initial: c }: { id: string; initial: MyCampaign }) {
  const t = useT();
  const navigate = useNavigate();
  const categories = useAsync((s) => fetchCategories(s), []);

  const [featureImageUrl, setFeatureImageUrl] = useState(c.featureImageUrl ?? '');
  const [imageUploading, setImageUploading] = useState(false);

  const [title, setTitle] = useState(c.title);
  const [description, setDescription] = useState(c.description);
  const [category, setCategory] = useState(c.category);
  const [status, setStatus] = useState<Status>((c.status as Status) ?? 'ACTIVE');
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

  // Open-event-only fields.
  const [benefits, setBenefits] = useState<string[]>(c.benefits ?? []);
  const [roleTypes, setRoleTypes] = useState<string[]>(c.targetAudience?.length ? c.targetAudience : ['Content Creators']);
  const [eventDate, setEventDate] = useState(c.eventDate ? c.eventDate.slice(0, 10) : '');
  const [eventTime, setEventTime] = useState(c.eventTime ?? '');

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

  async function onPickImage(file: File) {
    setImageUploading(true);
    try {
      const { imageUrl } = await uploadCampaignFeatureImage(file);
      setFeatureImageUrl(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setImageUploading(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setFlash('');

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
      await updateCampaign(id, {
        title: title.trim(),
        description: description.trim(),
        category,
        status,
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
      });
      navigate(`/business/events/${id}`);
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

      <form onSubmit={submit} className="space-y-4">
        {/* Cover image — always editable in edit mode, empty state included. */}
        <Card padded={false}>
          <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-2xl bg-surface-dim sm:h-48">
            {featureImageUrl ? (
              <img src={featureImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-violet via-violet-dark to-dash-pink-dark">
                <span aria-hidden className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-brand-orange/25 blur-3xl" />
                <span aria-hidden className="pointer-events-none absolute -bottom-10 left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              </div>
            )}

            {featureImageUrl && (
              <button
                type="button"
                aria-label={t('biz.removeCoverImage')}
                onClick={() => setFeatureImageUrl('')}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/50"
              >
                <X size={15} />
              </button>
            )}

            <label
              className={cn(
                'absolute flex cursor-pointer items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-[13px] font-medium text-white backdrop-blur transition-colors hover:bg-black/50',
                featureImageUrl ? 'bottom-4 right-4' : 'inset-x-0 bottom-4 mx-auto w-fit',
                imageUploading ? 'pointer-events-none opacity-70' : '',
              )}
            >
              {imageUploading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
              ) : (
                <Camera size={14} />
              )}
              {featureImageUrl ? t('biz.changeCoverImage') : t('biz.addCoverImage')}
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
        </Card>

        <TextField label={t('biz.fieldTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label={t('public.eventAboutHeading')} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t('public.category')}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="—"
            options={(categories.data ?? []).map((cat) => ({ value: cat.name, label: cat.name }))}
          />
          <Select
            label={t('biz.statusLabel')}
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            options={[
              { value: 'DRAFT', label: t('biz.eventTabDraft') },
              { value: 'ACTIVE', label: t('biz.eventTabActive') },
              { value: 'PAUSED', label: t('biz.statusPaused') },
              { value: 'CLOSED', label: t('biz.eventTabClosed') },
              { value: 'CANCELLED', label: t('biz.statusCancelled') },
            ]}
          />
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

        <div className="flex gap-2 pt-2">
          <Button type="submit" size="lg" loading={submitting}>
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
