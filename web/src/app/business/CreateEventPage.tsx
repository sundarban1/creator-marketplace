import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchCategories, fetchCampaignPlatforms } from '../api/catalog';
import { createCampaign, generateAiDraft } from '../api/business';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Alert } from '../ui/Alert';
import { SegmentedControl } from '../ui/SegmentedControl';
import { cn } from '../ui/cn';

type CType = 'PAID_CAMPAIGN' | 'OPEN_EVENT';

function isoInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function CreateEventPage() {
  const t = useT();
  const navigate = useNavigate();
  const categories = useAsync((s) => fetchCategories(s), []);
  const platforms = useAsync((s) => fetchCampaignPlatforms(s), []);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);

  const [cType, setCType] = useState<CType>('PAID_CAMPAIGN');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [selPlatforms, setSelPlatforms] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [creatorsNeeded, setCreatorsNeeded] = useState('1');
  const [deadline, setDeadline] = useState(isoInDays(14));
  const [deliverables, setDeliverables] = useState('');
  const [minFollowers, setMinFollowers] = useState('0');
  const [location, setLocation] = useState('');
  const [locationType, setLocationType] = useState<'ONSITE' | 'REMOTE'>('REMOTE');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const togglePlatform = (p: string) =>
    setSelPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : prev.length < 3 ? [...prev, p] : prev));

  async function runAi() {
    if (aiPrompt.trim().length < 3) return;
    setAiBusy(true);
    setError('');
    try {
      const d = await generateAiDraft(aiPrompt.trim());
      setTitle(d.title);
      setDescription(d.description);
      setCategory(d.category);
      if (d.platform) setSelPlatforms([d.platform]);
      setCreatorsNeeded(String(d.creatorsNeeded));
      if (d.budgetMin > 0) setBudgetMin(String(d.budgetMin));
      if (d.budgetMax > 0) setBudgetMax(String(d.budgetMax));
      setDeadline(isoInDays(d.suggestedDurationDays || 14));
      const delivText = Object.entries(d.deliverables || {})
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${n} ${k}`)
        .join(', ');
      if (delivText) setDeliverables(delivText);
      if (d.location) {
        setLocation(d.location);
        setLocationType('ONSITE');
      }
      setAiUsed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setAiBusy(false);
    }
  }

  async function submit(e: FormEvent, status: 'DRAFT' | 'ACTIVE') {
    e.preventDefault();
    setError('');
    const isFree = cType === 'OPEN_EVENT';
    const min = isFree ? 0 : Number(budgetMin) || 0;
    const max = isFree ? 0 : Number(budgetMax) || min;

    if (title.trim().length < 3) return setError('Add a title.');
    if (!category) return setError('Pick a category.');
    if (!isFree && (min <= 0 || max < min)) return setError('Enter a valid per-creator budget.');

    setSubmitting(true);
    try {
      const { id } = await createCampaign({
        title: title.trim(),
        description: description.trim(),
        category,
        platforms: selPlatforms,
        campaignType: cType,
        budgetMin: min,
        budgetMax: max,
        budgetInputType: 'PER_CREATOR',
        budgetRateType: min === max ? 'FIXED' : 'RANGE',
        creatorsNeeded: Math.max(1, Number(creatorsNeeded) || 1),
        deadline: new Date(deadline).toISOString(),
        deliverables: deliverables.trim(),
        minFollowers: Number(minFollowers) || 0,
        location: locationType === 'ONSITE' ? location.trim() || undefined : undefined,
        locationType,
        goals: [],
        status,
        aiGenerated: aiUsed,
        aiPrompt: aiUsed ? aiPrompt.trim() : undefined,
      });
      navigate(`/business/events/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  const isFree = cType === 'OPEN_EVENT';

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={t('biz.eyebrowEvents')} title={t('biz.newEvent')} />

      {error && <Alert tone="error" className="mb-5">{error}</Alert>}

      {/* AI assist */}
      <Card className="mb-6 border-violet/25 bg-violet/[0.05]">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-violet" />
          <h2 className="font-serif text-[15px] font-medium tracking-tight text-ink">{t('biz.aiHeading')}</h2>
        </div>
        <Textarea
          label=""
          rows={2}
          className="mt-2"
          placeholder={t('biz.aiPlaceholder')}
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
        />
        <Button variant="secondary" size="sm" loading={aiBusy} disabled={aiPrompt.trim().length < 3} onClick={runAi}>
          <Sparkles size={14} />
          {t('biz.aiGenerate')}
        </Button>
      </Card>

      <form onSubmit={(e) => submit(e, 'ACTIVE')} className="space-y-4">
        <SegmentedControl<CType>
          ariaLabel="Type"
          variant="pill"
          value={cType}
          onChange={setCType}
          options={[
            { value: 'PAID_CAMPAIGN', label: t('public.typePaid') },
            { value: 'OPEN_EVENT', label: t('public.typeOpenEvent') },
          ]}
        />

        <TextField label={t('biz.fieldTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label={t('public.eventAboutHeading')} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />

        <Select
          label={t('public.category')}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="—"
          options={(categories.data ?? []).map((c) => ({ value: c.name, label: c.name }))}
        />

        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink">{t('public.platformsLabel')}</p>
          <div className="flex flex-wrap gap-2">
            {(platforms.data ?? []).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-[13px] font-medium',
                  selPlatforms.includes(p) ? 'border-violet/40 bg-violet/[0.06] text-violet-dark' : 'border-line-strong text-ink-soft',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {!isFree && (
          <div className="grid grid-cols-2 gap-3">
            <TextField label={t('biz.budgetMinField')} type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
            <TextField label={t('biz.budgetMaxField')} type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
          </div>
        )}

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
          <TextField label={t('public.location')} value={location} onChange={(e) => setLocation(e.target.value)} />
        )}

        <div className="flex gap-2 pt-2">
          <Button type="submit" size="lg" loading={submitting}>
            {t('biz.publish')}
          </Button>
          <Button type="button" size="lg" variant="secondary" disabled={submitting} onClick={(e) => submit(e as unknown as FormEvent, 'DRAFT')}>
            {t('biz.saveDraft')}
          </Button>
        </div>
      </form>
    </div>
  );
}
