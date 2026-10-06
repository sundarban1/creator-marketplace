import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Eye, Loader2 } from 'lucide-react';
import {
  api,
  type CommunityEventAdmin,
  type CommunityEventInput,
  type CommunityEventStatus,
} from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { EVENT_TYPES, communityEventPath } from '../../app/community-events/format';
import { GalleryManager } from './GalleryManager';
import { AddRowButton, Field, ImageField, RowControls, Section } from './formParts';
import { EVENT_TYPE_LABELS, inputCls, move } from './formUtils';

const STATUS_LABELS: Record<CommunityEventStatus, string> = {
  UPCOMING: 'Upcoming',
  ONGOING: 'Ongoing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const TIMEZONES = ['Asia/Kathmandu', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Tokyo', 'Europe/London', 'America/New_York', 'Australia/Sydney', 'UTC'];

// Number inputs are edited as strings and converted on submit.
type FormState = Omit<CommunityEventInput, 'latitude' | 'longitude' | 'maxAttendees'> & {
  latitude: string;
  longitude: string;
  maxAttendees: string;
};

const EMPTY: FormState = {
  title: '', slug: null, shortDescription: '', description: '', eventType: 'MEETUP', statusOverride: null,
  coverImageUrl: null, startDate: '', startTime: '13:00', endDate: null, endTime: null, timezone: 'Asia/Kathmandu',
  venueName: '', address: '', city: '', country: 'Nepal', latitude: '', longitude: '', mapsUrl: '', videoUrl: '',
  registrationEnabled: false, registrationUrl: '', registrationDeadline: null, maxAttendees: '',
  metaTitle: '', metaDescription: '', ogImageUrl: null, featured: false, published: false,
  images: [], speakers: [], highlights: [], agenda: [], partners: [],
};

function fromAdmin(e: CommunityEventAdmin): FormState {
  return {
    ...EMPTY,
    ...e,
    latitude: e.latitude?.toString() ?? '',
    longitude: e.longitude?.toString() ?? '',
    maxAttendees: e.maxAttendees?.toString() ?? '',
  };
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

const num = (s: string) => (s.trim() === '' ? null : Number(s));

export function CommunityEventEditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [saved, setSaved] = useState<CommunityEventAdmin | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<null | 'draft' | 'publish' | 'save' | 'unpublish'>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Seeded from the flash message carried across the new → edit redirect
  // (the edit route remounts this component, so initial state is enough).
  const [banner, setBanner] = useState<{ ok: boolean; msg: string } | null>(() => {
    const flash = (location.state as { flash?: string } | null)?.flash;
    return flash ? { ok: true, msg: flash } : null;
  });
  const [slugTouched, setSlugTouched] = useState(!isNew);

  useEffect(() => {
    if (isNew) return;
    api.admin
      .communityEvent(id)
      .then((r) => {
        setSaved(r.data);
        setForm(fromAdmin(r.data));
      })
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key as string] ? { ...e, [key as string]: '' } : e));
  };

  const slugPreview = slugTouched ? form.slug ?? '' : slugify(form.title);
  const defaultMetaTitle = `${form.title || 'Event title'} | Kolab`;
  const defaultMetaDescription = useMemo(
    () => [form.shortDescription, form.description].filter(Boolean).join(' — ').replace(/\s+/g, ' ').slice(0, 158),
    [form.shortDescription, form.description],
  );

  function validate(publish: boolean) {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required.';
    if (!form.shortDescription.trim()) e.shortDescription = 'Short description is required.';
    if (!form.startDate) e.startDate = 'Start date is required.';
    if (!form.startTime) e.startTime = 'Start time is required.';
    if (form.endDate && !form.endTime) e.endTime = 'Add an end time, or clear the end date.';
    if (form.registrationEnabled && !form.registrationUrl?.trim()) e.registrationUrl = 'Registration URL is required when registration is on.';
    if (publish && !form.coverImageUrl) e.coverImageUrl = 'A cover image is required to publish.';
    if (form.speakers.some((s) => !s.name.trim())) e.speakers = 'Every speaker needs a name.';
    if (form.highlights.some((h) => !h.title.trim())) e.highlights = 'Every highlight needs a title.';
    if (form.agenda.some((a) => !a.title.trim())) e.agenda = 'Every agenda item needs a title.';
    if (form.partners.some((p) => !p.name.trim())) e.partners = 'Every partner needs a name.';
    return e;
  }

  async function submit(mode: 'draft' | 'publish' | 'save' | 'unpublish') {
    const published = mode === 'publish' || (mode === 'save' && !!saved?.published);
    const v = validate(published);
    if (Object.values(v).some(Boolean)) {
      setErrors(v);
      setBanner({ ok: false, msg: 'Please fix the highlighted fields.' });
      document.getElementById(`f-${Object.keys(v)[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const body: CommunityEventInput = {
      ...form,
      slug: slugTouched ? form.slug : null,
      latitude: num(form.latitude),
      longitude: num(form.longitude),
      maxAttendees: num(form.maxAttendees),
      published,
    };
    setSaving(mode);
    setBanner(null);
    try {
      const res = isNew ? await api.admin.createCommunityEvent(body) : await api.admin.updateCommunityEvent(id, body);
      setSaved(res.data);
      setForm(fromAdmin(res.data));
      setSlugTouched(true);
      const msg = { draft: 'Draft saved.', publish: 'Event published.', save: 'Changes saved.', unpublish: 'Event unpublished — it is now hidden from the public site.' }[mode];
      if (isNew) navigate(`/admin/events/${res.data.id}/edit`, { replace: true, state: { flash: msg } });
      else setBanner({ ok: true, msg });
    } catch (ex) {
      const err = ex as Error & { errors?: Array<{ field: string; message: string }> };
      if (err.errors?.length) {
        setErrors(Object.fromEntries(err.errors.map((x) => [x.field.split('.')[0], x.message])));
        setBanner({ ok: false, msg: err.errors.map((x) => x.message).join(' · ') });
      } else {
        setBanner({ ok: false, msg: err.message || 'Could not save the event.' });
      }
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-gray-400" /></div>;
  }
  if (loadError) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-red-500">{loadError}</p>
        <Link to="/admin/events" className="mt-3 inline-block text-sm font-medium text-indigo-600">Back to events</Link>
      </div>
    );
  }

  const busy = saving !== null;
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit(saved?.published ? 'save' : 'draft');
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <Link to="/admin/events" className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={15} /> Community Events
      </Link>
      <PageHeader
        title={isNew ? 'Create Event' : 'Edit Event'}
        subtitle={isNew ? 'Fill in the basics — everything else is optional and can be added later.' : form.title}
      />

      {banner && (
        <div className={`mb-5 rounded-xl px-4 py-3 text-sm font-medium ${banner.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          {banner.msg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* ── Basic information ─────────────────────────────────────────── */}
          <Section title="Basic Information">
            <Field label="Event title" htmlFor="f-title" required error={errors.title}>
              <input id="f-title" className={inputCls(errors.title)} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Kolab Creators Meetup — Itahari" />
            </Field>
            <Field
              label="URL slug"
              htmlFor="f-slug"
              error={errors.slug}
              hint={<>Public URL: <span className="font-mono">{communityEventPath(slugPreview || '…')}</span>{!slugTouched && ' · generated from the title'}</>}
            >
              <input
                id="f-slug"
                className={`${inputCls(errors.slug)} font-mono`}
                value={slugPreview}
                onChange={(e) => {
                  setSlugTouched(true);
                  set('slug', slugify(e.target.value) || null);
                }}
                placeholder="kolab-creators-meetup-itahari"
              />
            </Field>
            <Field label="Short description" htmlFor="f-shortDescription" required error={errors.shortDescription} hint={`Shown on event cards and under the title · ${form.shortDescription.length}/280`}>
              <input id="f-shortDescription" maxLength={280} className={inputCls(errors.shortDescription)} value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} placeholder="Creators. Connections. Opportunities." />
            </Field>
            <Field label="Full description" htmlFor="f-description" hint="Shown under “About the Event”. Blank lines start new paragraphs.">
              <textarea id="f-description" rows={7} className={`${inputCls()} resize-y`} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
            </Field>
            <Field label="Event type" htmlFor="f-eventType">
              <select id="f-eventType" className={inputCls()} value={form.eventType} onChange={(e) => set('eventType', e.target.value as FormState['eventType'])}>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
              </select>
            </Field>
          </Section>

          {/* ── Date & time ───────────────────────────────────────────────── */}
          <Section title="Date & Time" description="Entered in the event's local time.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date" htmlFor="f-startDate" required error={errors.startDate}>
                <input id="f-startDate" type="date" className={inputCls(errors.startDate)} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
              </Field>
              <Field label="Start time" htmlFor="f-startTime" required error={errors.startTime}>
                <input id="f-startTime" type="time" className={inputCls(errors.startTime)} value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
              </Field>
              <Field label="End date" htmlFor="f-endDate">
                <input id="f-endDate" type="date" className={inputCls()} value={form.endDate ?? ''} min={form.startDate} onChange={(e) => set('endDate', e.target.value || null)} />
              </Field>
              <Field label="End time" htmlFor="f-endTime" error={errors.endTime}>
                <input id="f-endTime" type="time" className={inputCls(errors.endTime)} value={form.endTime ?? ''} onChange={(e) => set('endTime', e.target.value || null)} />
              </Field>
            </div>
            <p className="-mt-1 text-xs text-gray-400">No end time? The event shows “onwards” and is treated as running until the end of that day.</p>
            <Field label="Timezone" htmlFor="f-timezone">
              <select id="f-timezone" className={inputCls()} value={form.timezone} onChange={(e) => set('timezone', e.target.value)}>
                {(TIMEZONES.includes(form.timezone) ? TIMEZONES : [form.timezone, ...TIMEZONES]).map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </Field>
          </Section>

          {/* ── Location ──────────────────────────────────────────────────── */}
          <Section title="Location">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Venue name" htmlFor="f-venueName">
                <input id="f-venueName" className={inputCls()} value={form.venueName ?? ''} onChange={(e) => set('venueName', e.target.value)} placeholder="Aroma By Ocean" />
              </Field>
              <Field label="Address" htmlFor="f-address">
                <input id="f-address" className={inputCls()} value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} placeholder="Aaitabare, Itahari" />
              </Field>
              <Field label="City" htmlFor="f-city">
                <input id="f-city" className={inputCls()} value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} placeholder="Itahari" />
              </Field>
              <Field label="Country" htmlFor="f-country">
                <input id="f-country" className={inputCls()} value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} />
              </Field>
            </div>
            <details className="rounded-xl bg-gray-50 px-4 py-3" open={!!(form.latitude || form.longitude || form.mapsUrl)}>
              <summary className="cursor-pointer text-xs font-medium text-gray-600">Map pin (optional) — otherwise “Open in Maps” searches the venue name</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field label="Latitude" htmlFor="f-latitude" error={errors.latitude}>
                  <input id="f-latitude" inputMode="decimal" className={inputCls(errors.latitude)} value={form.latitude} onChange={(e) => set('latitude', e.target.value)} placeholder="26.6646" />
                </Field>
                <Field label="Longitude" htmlFor="f-longitude" error={errors.longitude}>
                  <input id="f-longitude" inputMode="decimal" className={inputCls(errors.longitude)} value={form.longitude} onChange={(e) => set('longitude', e.target.value)} placeholder="87.2718" />
                </Field>
                <Field label="Google Maps URL" htmlFor="f-mapsUrl" error={errors.mapsUrl}>
                  <input id="f-mapsUrl" className={inputCls(errors.mapsUrl)} value={form.mapsUrl ?? ''} onChange={(e) => set('mapsUrl', e.target.value)} placeholder="https://maps.app.goo.gl/…" />
                </Field>
              </div>
            </details>
          </Section>

          {/* ── Media ─────────────────────────────────────────────────────── */}
          <Section title="Cover Image" description="Required to publish. 16:9 works best.">
            <div id="f-coverImageUrl">
              <ImageField value={form.coverImageUrl} onChange={(url) => set('coverImageUrl', url)} kind="cover" label="16:9 cover" error={errors.coverImageUrl} />
            </div>
          </Section>

          <Section title="Gallery" optional count={form.images.length} defaultOpen description="Photos for “Moments from the Event”. Not shown on listing cards.">
            <GalleryManager
              images={form.images}
              onChange={(images) => set('images', images)}
              coverUrl={form.coverImageUrl}
              onSetCover={(url) => set('coverImageUrl', url)}
            />
            <Field label="Video URL" htmlFor="f-videoUrl" error={errors.videoUrl} hint="YouTube, Vimeo, Facebook or a direct video link — shown as “Watch the Event”.">
              <input id="f-videoUrl" className={inputCls(errors.videoUrl)} value={form.videoUrl ?? ''} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://youtube.com/watch?v=…" />
            </Field>
          </Section>

          {/* ── Speakers ──────────────────────────────────────────────────── */}
          <Section id="f-speakers" title="Speakers" optional count={form.speakers.length} defaultOpen={form.speakers.length > 0}>
            {form.speakers.map((s, i) => {
              const upd = (patch: Partial<typeof s>) => set('speakers', form.speakers.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={i} className="rounded-xl border border-gray-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Speaker {i + 1}</span>
                    <RowControls index={i} total={form.speakers.length} onMove={(a, b) => set('speakers', move(form.speakers, a, b))} onRemove={() => set('speakers', form.speakers.filter((_, j) => j !== i))} />
                  </div>
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <ImageField value={s.imageUrl ?? null} onChange={(url) => upd({ imageUrl: url })} kind="speaker" aspect="aspect-square" shape="rounded-full" previewWidth="w-20" />
                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                      <input aria-label="Name" className={inputCls(!s.name.trim() ? errors.speakers : undefined)} value={s.name} onChange={(e) => upd({ name: e.target.value })} placeholder="Name *" />
                      <input aria-label="Role / title" className={inputCls()} value={s.role ?? ''} onChange={(e) => upd({ role: e.target.value })} placeholder="Role / title" />
                      <input aria-label="Organization" className={inputCls()} value={s.organization ?? ''} onChange={(e) => upd({ organization: e.target.value })} placeholder="Organization" />
                      <input aria-label="Profile URL" className={inputCls()} value={s.profileUrl ?? ''} onChange={(e) => upd({ profileUrl: e.target.value })} placeholder="Profile / social URL" />
                      <textarea aria-label="Short bio" rows={2} className={`${inputCls()} resize-none sm:col-span-2`} value={s.bio ?? ''} onChange={(e) => upd({ bio: e.target.value })} placeholder="Short bio" />
                    </div>
                  </div>
                </div>
              );
            })}
            {errors.speakers && <p className="text-xs text-red-500">{errors.speakers}</p>}
            <AddRowButton label="Add speaker" onClick={() => set('speakers', [...form.speakers, { name: '' }])} />
          </Section>

          {/* ── Highlights ────────────────────────────────────────────────── */}
          <Section id="f-highlights" title="Highlights" optional count={form.highlights.length} defaultOpen={form.highlights.length > 0} description="“What happened” on past events, “What to expect” on upcoming ones.">
            {form.highlights.map((h, i) => {
              const upd = (patch: Partial<typeof h>) => set('highlights', form.highlights.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={i} className="flex gap-3 rounded-xl border border-gray-200 p-3">
                  <ImageField value={h.imageUrl ?? null} onChange={(url) => upd({ imageUrl: url })} kind="highlight" aspect="aspect-square" previewWidth="w-16" />
                  <div className="flex-1 space-y-2">
                    <input aria-label="Highlight title" className={inputCls(!h.title.trim() ? errors.highlights : undefined)} value={h.title} onChange={(e) => upd({ title: e.target.value })} placeholder="Title *" />
                    <textarea aria-label="Highlight description" rows={2} className={`${inputCls()} resize-none`} value={h.description ?? ''} onChange={(e) => upd({ description: e.target.value })} placeholder="Short description" />
                  </div>
                  <RowControls index={i} total={form.highlights.length} onMove={(a, b) => set('highlights', move(form.highlights, a, b))} onRemove={() => set('highlights', form.highlights.filter((_, j) => j !== i))} />
                </div>
              );
            })}
            {errors.highlights && <p className="text-xs text-red-500">{errors.highlights}</p>}
            <AddRowButton label="Add highlight" onClick={() => set('highlights', [...form.highlights, { title: '' }])} />
          </Section>

          {/* ── Agenda ────────────────────────────────────────────────────── */}
          <Section id="f-agenda" title="Agenda / Schedule" optional count={form.agenda.length} defaultOpen={form.agenda.length > 0}>
            {form.agenda.map((a, i) => {
              const upd = (patch: Partial<typeof a>) => set('agenda', form.agenda.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-gray-200 p-3">
                  <input aria-label="Time" className={`${inputCls()} w-28 shrink-0`} value={a.time ?? ''} onChange={(e) => upd({ time: e.target.value })} placeholder="1:00 PM" />
                  <div className="flex-1 space-y-2">
                    <input aria-label="Agenda title" className={inputCls(!a.title.trim() ? errors.agenda : undefined)} value={a.title} onChange={(e) => upd({ title: e.target.value })} placeholder="Title *" />
                    <input aria-label="Agenda description" className={inputCls()} value={a.description ?? ''} onChange={(e) => upd({ description: e.target.value })} placeholder="Description (optional)" />
                  </div>
                  <RowControls index={i} total={form.agenda.length} onMove={(x, y) => set('agenda', move(form.agenda, x, y))} onRemove={() => set('agenda', form.agenda.filter((_, j) => j !== i))} />
                </div>
              );
            })}
            {errors.agenda && <p className="text-xs text-red-500">{errors.agenda}</p>}
            <AddRowButton label="Add agenda item" onClick={() => set('agenda', [...form.agenda, { time: '', title: '' }])} />
          </Section>

          {/* ── Partners ──────────────────────────────────────────────────── */}
          <Section id="f-partners" title="Partners & Sponsors" optional count={form.partners.length} defaultOpen={form.partners.length > 0} description="Shown as “Supported By” only when at least one is added.">
            {form.partners.map((p, i) => {
              const upd = (patch: Partial<typeof p>) => set('partners', form.partners.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={i} className="flex gap-3 rounded-xl border border-gray-200 p-3">
                  <ImageField value={p.logoUrl ?? null} onChange={(url) => upd({ logoUrl: url })} kind="partner" aspect="aspect-[2/1]" previewWidth="w-24" />
                  <div className="flex-1 space-y-2">
                    <input aria-label="Partner name" className={inputCls(!p.name.trim() ? errors.partners : undefined)} value={p.name} onChange={(e) => upd({ name: e.target.value })} placeholder="Name *" />
                    <input aria-label="Website URL" className={inputCls()} value={p.websiteUrl ?? ''} onChange={(e) => upd({ websiteUrl: e.target.value })} placeholder="https://…" />
                  </div>
                  <RowControls index={i} total={form.partners.length} onMove={(a, b) => set('partners', move(form.partners, a, b))} onRemove={() => set('partners', form.partners.filter((_, j) => j !== i))} />
                </div>
              );
            })}
            {errors.partners && <p className="text-xs text-red-500">{errors.partners}</p>}
            <AddRowButton label="Add partner" onClick={() => set('partners', [...form.partners, { name: '' }])} />
          </Section>

          {/* ── Registration ──────────────────────────────────────────────── */}
          <Section title="Registration" optional defaultOpen={form.registrationEnabled} description="Never shown on past or cancelled events.">
            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600" checked={form.registrationEnabled} onChange={(e) => set('registrationEnabled', e.target.checked)} />
              Show a “Register Now” button
            </label>
            {form.registrationEnabled && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Registration URL" htmlFor="f-registrationUrl" required error={errors.registrationUrl}>
                    <input id="f-registrationUrl" className={inputCls(errors.registrationUrl)} value={form.registrationUrl ?? ''} onChange={(e) => set('registrationUrl', e.target.value)} placeholder="https://forms.gle/…" />
                  </Field>
                </div>
                <Field label="Registration deadline" htmlFor="f-registrationDeadline" hint="The button disappears after this day.">
                  <input id="f-registrationDeadline" type="date" className={inputCls()} value={form.registrationDeadline ?? ''} onChange={(e) => set('registrationDeadline', e.target.value || null)} />
                </Field>
                <Field label="Maximum attendees" htmlFor="f-maxAttendees" error={errors.maxAttendees}>
                  <input id="f-maxAttendees" type="number" min={1} className={inputCls(errors.maxAttendees)} value={form.maxAttendees} onChange={(e) => set('maxAttendees', e.target.value)} />
                </Field>
              </div>
            )}
          </Section>

          {/* ── SEO ───────────────────────────────────────────────────────── */}
          <Section title="SEO" optional defaultOpen={!!(form.metaTitle || form.metaDescription || form.ogImageUrl)} description="Leave blank to use sensible defaults from the title and description.">
            <Field label="Meta title" htmlFor="f-metaTitle" error={errors.metaTitle}>
              <input id="f-metaTitle" className={inputCls(errors.metaTitle)} value={form.metaTitle ?? ''} onChange={(e) => set('metaTitle', e.target.value)} placeholder={defaultMetaTitle} />
            </Field>
            <Field label="Meta description" htmlFor="f-metaDescription" error={errors.metaDescription}>
              <textarea id="f-metaDescription" rows={2} className={`${inputCls(errors.metaDescription)} resize-none`} value={form.metaDescription ?? ''} onChange={(e) => set('metaDescription', e.target.value)} placeholder={defaultMetaDescription || 'Defaults to the short + full description'} />
            </Field>
            <Field label="Social share image (OG)" hint="Defaults to the cover image.">
              <ImageField value={form.ogImageUrl} onChange={(url) => set('ogImageUrl', url)} kind="cover" previewWidth="w-full max-w-xs" />
            </Field>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Search preview</p>
              <p className="mt-1.5 truncate text-[15px] text-indigo-700">{form.metaTitle ? `${form.metaTitle} | Kolab` : defaultMetaTitle}</p>
              <p className="truncate text-xs text-emerald-700">ourkolab.com{communityEventPath(slugPreview || '…')}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{form.metaDescription || defaultMetaDescription}</p>
            </div>
          </Section>
        </div>

        {/* ── Sidebar: publishing ─────────────────────────────────────────── */}
        <div className="space-y-5">
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 adm-card lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Publishing</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${saved?.published ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                {saved?.published ? 'Published' : 'Draft'}
              </span>
            </div>
            {saved && (
              <p className="text-xs text-gray-500">
                Public status: <span className="font-semibold text-gray-700">{STATUS_LABELS[saved.status]}</span>
                {' · '}listed under <span className="font-semibold text-gray-700">{saved.section === 'past' ? 'Past Events' : saved.section === 'upcoming' ? 'Upcoming Events' : 'neither list'}</span>
              </p>
            )}

            <Field label="Status" htmlFor="f-statusOverride" hint="Automatic moves the event from Upcoming → Ongoing → Completed by its dates.">
              <select
                id="f-statusOverride"
                className={inputCls()}
                value={form.statusOverride ?? ''}
                onChange={(e) => set('statusOverride', (e.target.value || null) as CommunityEventStatus | null)}
              >
                <option value="">Automatic (from dates)</option>
                {(Object.keys(STATUS_LABELS) as CommunityEventStatus[]).map((s) => <option key={s} value={s}>Force: {STATUS_LABELS[s]}</option>)}
              </select>
            </Field>

            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
              Featured event
            </label>

            <div className="space-y-2 border-t border-gray-100 pt-4">
              {saved?.published ? (
                <>
                  <button type="button" disabled={busy} onClick={() => submit('save')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                    {saving === 'save' && <Loader2 size={15} className="animate-spin" />} Save changes
                  </button>
                  <button type="button" disabled={busy} onClick={() => submit('unpublish')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
                    {saving === 'unpublish' && <Loader2 size={15} className="animate-spin" />} Unpublish
                  </button>
                </>
              ) : (
                <>
                  <button type="button" disabled={busy} onClick={() => submit('publish')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                    {saving === 'publish' && <Loader2 size={15} className="animate-spin" />} Publish
                  </button>
                  <button type="button" disabled={busy} onClick={() => submit('draft')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
                    {saving === 'draft' && <Loader2 size={15} className="animate-spin" />} Save draft
                  </button>
                </>
              )}
              {saved && (
                <a
                  href={saved.published ? communityEventPath(saved.slug) : `${communityEventPath(saved.slug)}?preview=${saved.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {saved.published ? <ExternalLink size={15} /> : <Eye size={15} />} {saved.published ? 'View live page' : 'Preview'}
                </a>
              )}
              <p className="text-center text-xs text-gray-400">Drafts never appear on the public site.</p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
