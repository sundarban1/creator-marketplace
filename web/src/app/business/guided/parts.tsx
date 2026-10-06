import { useState, type ReactNode, type KeyboardEvent } from 'react';
import { Sparkles, Check, CloudOff, Loader2, MapPin, Plus, Pencil, Trash2, X, Info, Minus, Globe2, Flag } from 'lucide-react';
import { useT } from '../../i18n';
import { cn } from '../../ui/cn';
import { Button } from '../../ui/Button';
import { LocationAutocomplete } from '../../public/LocationAutocomplete';
import type { CampaignLocation, DeliverableItem, LocationScope, Provenance } from '../../api/business';
import type { CampaignRuleIssue } from '../campaignRules';
import type { SaveStatus } from './useAutosave';
import { DELIVERABLE_TYPES } from './briefSections';

// ── Layout ───────────────────────────────────────────────────────────────────

/** One step: clear heading, short explanation, optional example, then content.
 *  The primary action sticks to the bottom on phones (§25, §32). */
export function StepShell({
  title, subtitle, example, children, footer,
}: {
  title: string;
  subtitle?: string;
  example?: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-serif text-[24px] font-medium leading-tight tracking-tight text-ink sm:text-[28px]">{title}</h2>
      {subtitle && <p className="mt-1.5 text-[15px] text-ink-soft">{subtitle}</p>}
      {example && <p className="mt-1 text-[13px] italic text-ink-soft/80">{example}</p>}
      <div className="mt-6 space-y-6">{children}</div>
      <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-8 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        {footer}
      </div>
    </section>
  );
}

/** A labelled block inside a step. */
export function Field({ label, optional, help, children }: { label: string; optional?: boolean; help?: ReactNode; children: ReactNode }) {
  const t = useT();
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-[14px] font-semibold text-ink">{label}</p>
        {optional && <span className="text-[12px] text-ink-soft">{t('guided.optional')}</span>}
        {help}
      </div>
      {children}
    </div>
  );
}

// ── Progress (§21) ───────────────────────────────────────────────────────────

export function ProgressRail({
  steps, current, onJump,
}: {
  steps: { key: string; label: string }[];
  current: string;
  onJump?: (key: string) => void;
}) {
  const t = useT();
  const idx = Math.max(0, steps.findIndex((s) => s.key === current));
  const left = steps.length - 1 - idx;
  return (
    <div className="mb-8">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px]">
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!onJump || i > idx}
              onClick={() => onJump?.(s.key)}
              className={cn(
                'rounded-full px-2 py-0.5 font-medium transition-colors',
                i === idx ? 'bg-violet/10 text-violet-dark' : i < idx ? 'text-ink hover:text-violet-dark' : 'text-ink-soft/70',
              )}
            >
              {i < idx && <Check size={12} className="mr-1 inline -translate-y-px" />}
              {s.label}
            </button>
            {i < steps.length - 1 && <span aria-hidden className="text-ink-soft/50">→</span>}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[12px] font-medium text-ink-soft">
        {left <= 0 ? t('guided.progressLast') : left === 1 ? t('guided.progressAlmost') : t('guided.progressLeft', { count: left })}
      </p>
    </div>
  );
}

export function SaveIndicator({ status }: { status: SaveStatus }) {
  const t = useT();
  if (status === 'idle') return null;
  return (
    <span className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-[12px] font-medium text-ink-soft" aria-live="polite">
      {status === 'saving' && <><Loader2 size={12} className="animate-spin" />{t('guided.saving')}</>}
      {status === 'saved' && <><Check size={12} className="text-success" />{t('guided.saved')}</>}
      {status === 'offline' && <><CloudOff size={12} className="text-warning" />{t('guided.savedOnDevice')}</>}
    </span>
  );
}

// ── Choices ──────────────────────────────────────────────────────────────────

export function ChoiceChips<T extends string>({
  options, value, onChange, multi = false, ariaLabel,
}: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T | T[] | null;
  onChange: (v: T) => void;
  multi?: boolean;
  ariaLabel?: string;
}) {
  const isOn = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <div role={multi ? 'group' : 'radiogroup'} aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role={multi ? 'checkbox' : 'radio'}
          aria-checked={isOn(o.value)}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-[14px] font-medium transition-colors',
            isOn(o.value)
              ? 'border-violet bg-violet/10 text-violet-dark'
              : 'border-line-strong bg-surface text-ink hover:border-violet/40',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function RecommendButton({ onClick, loading, label }: { onClick: () => void; loading?: boolean; label?: string }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-violet-dark transition-colors hover:bg-violet/[0.07] disabled:opacity-60"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
      {label ?? t('guided.letKolabRecommend')}
    </button>
  );
}

/** Kolab's suggestion with a reason — assistance, never an error (§14). */
export function SuggestionNote({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-violet/20 bg-violet/[0.05] px-4 py-3">
      <p className="flex gap-2 text-[14px] text-ink">
        <Sparkles size={15} className="mt-0.5 flex-shrink-0 text-violet" />
        <span>{children}</span>
      </p>
      {actions && <div className="mt-2.5 flex flex-wrap gap-2 pl-6">{actions}</div>}
    </div>
  );
}

/** "From your description" vs "Suggested by Kolab" (§30). Nothing for USER. */
export function ProvenanceTag({ value }: { value?: Provenance }) {
  const t = useT();
  if (!value || value === 'USER') return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        value === 'AI_EXTRACTED' ? 'bg-success-soft text-success' : 'bg-violet/10 text-violet-dark',
      )}
    >
      {value === 'AI_SUGGESTED' && <Sparkles size={10} />}
      {value === 'AI_EXTRACTED' ? t('guided.fromYourWords') : t('guided.suggestedByKolab')}
    </span>
  );
}

/** Friendly inline prompt for a rule issue — a question, not an error (§26). */
export function IssueNote({ issue }: { issue?: CampaignRuleIssue }) {
  const t = useT();
  if (!issue) return null;
  const text = t(`guided.issue_${issue.code}`);
  return (
    <p className={cn('mt-2 text-[13px] font-medium', issue.severity === 'required' ? 'text-warning' : 'text-ink-soft')}>
      {text === `guided.issue_${issue.code}` ? issue.message : text}
    </p>
  );
}

/** ⓘ Why are we asking? (§15–16) — short, inline, expandable. `label` swaps
 *  the trigger text (e.g. "What's the difference?"); `onRecommend` adds the
 *  "Not sure what to choose? Let Kolab recommend." follow-up. */
export function WhyAsking({ text, label, onRecommend }: { text: string; label?: string; onRecommend?: () => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-soft hover:text-violet-dark"
      >
        <Info size={13} />
        {label ?? t('guided.whyAsking')}
      </button>
      {open && (
        <span className="mt-1 block max-w-md rounded-xl bg-surface-dim px-3 py-2 text-[13px] text-ink-soft">
          {text}
          {onRecommend && (
            <button
              type="button"
              onClick={() => { setOpen(false); onRecommend(); }}
              className="mt-1.5 flex items-center gap-1 text-left font-semibold text-violet-dark hover:underline"
            >
              <Sparkles size={12} className="flex-shrink-0" />
              {t('guided.notSureRecommend')}
            </button>
          )}
        </span>
      )}
    </span>
  );
}

// ── Inputs ───────────────────────────────────────────────────────────────────

/** Short list entry (talking points, hashtags, do's…). Enter adds. */
export function ListInput({
  values, onChange, placeholder, prefix,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  prefix?: string;
}) {
  const t = useT();
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim().replace(prefix ? new RegExp(`^\\${prefix}`) : /^$/, '');
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); add(); }
  };
  return (
    <div>
      {values.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {values.map((v) => (
            <li key={v} className="inline-flex items-center gap-1 rounded-full bg-violet/[0.07] px-3 py-1 text-[13px] font-medium text-ink">
              {prefix}{v}
              <button type="button" aria-label={t('guided.remove')} onClick={() => onChange(values.filter((x) => x !== v))} className="p-0.5 text-ink-soft hover:text-ink">
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={add}
          placeholder={placeholder}
          className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3.5 text-[14px] text-ink outline-none placeholder:text-ink-soft/60 focus:border-violet"
        />
        <Button type="button" variant="secondary" size="md" onClick={add} disabled={!draft.trim()} aria-label={t('guided.add')}>
          <Plus size={15} />
        </Button>
      </div>
    </div>
  );
}

export function Stepper({ value, onChange, min = 1, max = 50, ariaLabel }: { value: number; onChange: (n: number) => void; min?: number; max?: number; ariaLabel?: string }) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="inline-flex items-center rounded-full border border-line-strong bg-surface" role="group" aria-label={ariaLabel}>
      <button type="button" className="flex h-11 w-11 items-center justify-center text-ink disabled:opacity-40" disabled={value <= min} onClick={() => onChange(clamp(value - 1))} aria-label="−">
        <Minus size={15} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
        className="h-11 w-12 bg-transparent text-center text-[15px] font-semibold text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        aria-label={ariaLabel}
      />
      <button type="button" className="flex h-11 w-11 items-center justify-center text-ink disabled:opacity-40" disabled={value >= max} onClick={() => onChange(clamp(value + 1))} aria-label="+">
        <Plus size={15} />
      </button>
    </div>
  );
}

// ── Location (§11–12) ────────────────────────────────────────────────────────

/** Visit question + where creators should be: one or more places, anywhere in
 *  Nepal, or "location isn't important". Never blocks a remote campaign. */
export function LocationPicker({
  locationType, locationScope, locations, onChange,
}: {
  locationType: 'ONSITE' | 'REMOTE' | null;
  locationScope: LocationScope | null;
  locations: CampaignLocation[];
  onChange: (next: { locationType?: 'ONSITE' | 'REMOTE' | null; locationScope?: LocationScope | null; locations?: CampaignLocation[] }) => void;
}) {
  const t = useT();
  const [adding, setAdding] = useState(locations.length === 0);
  const [editing, setEditing] = useState<number | null>(null);
  const [text, setText] = useState('');
  const visits = locationType === 'ONSITE';
  const showPlaces = visits || locationScope === 'SPECIFIC';

  const commit = (value: string) => {
    const name = value.trim();
    if (!name) return;
    if (editing != null) {
      onChange({ locations: locations.map((l, i) => (i === editing ? { name } : l)), locationScope: 'SPECIFIC' });
    } else if (!locations.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
      onChange({ locations: [...locations, { name }], locationScope: 'SPECIFIC' });
    }
    setText('');
    setAdding(false);
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      <Field label={t('guided.visitQuestion')} help={<WhyAsking text={t('guided.whyVisit')} />}>
        <ChoiceChips<'YES' | 'NO'>
          value={locationType === 'ONSITE' ? 'YES' : locationType === 'REMOTE' ? 'NO' : null}
          onChange={(v) => onChange(v === 'YES'
            ? { locationType: 'ONSITE', locationScope: 'SPECIFIC' }
            : { locationType: 'REMOTE', locationScope: locationScope === 'SPECIFIC' && !locations.length ? 'ANYWHERE' : locationScope })}
          options={[{ value: 'YES', label: t('guided.visitYes') }, { value: 'NO', label: t('guided.visitNo') }]}
        />
      </Field>

      {locationType === 'REMOTE' && (
        <Field label={t('guided.whereBased')}>
          <ChoiceChips<LocationScope>
            value={locationScope}
            onChange={(v) => { onChange({ locationScope: v, ...(v !== 'SPECIFIC' ? { locations: [] } : {}) }); if (v === 'SPECIFIC' && !locations.length) setAdding(true); }}
            options={[
              { value: 'SPECIFIC', label: t('guided.scopeSpecific'), icon: <MapPin size={14} /> },
              { value: 'NATIONWIDE', label: t('guided.scopeNationwide'), icon: <Flag size={14} /> },
              { value: 'ANYWHERE', label: t('guided.scopeAnywhere'), icon: <Globe2 size={14} /> },
            ]}
          />
        </Field>
      )}

      {showPlaces && (
        <Field label={visits ? t('guided.whereVisit') : t('guided.whichPlaces')}>
          {locations.length > 0 && (
            <ul className="mb-3 space-y-2">
              {locations.map((l, i) => (
                <li key={`${l.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5">
                  <MapPin size={16} className="flex-shrink-0 text-violet" />
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{l.name}</span>
                  <button type="button" aria-label={t('guided.changeLocation')} onClick={() => { setEditing(i); setText(l.name); setAdding(true); }} className="rounded-full p-2 text-ink-soft hover:bg-ink/[0.04] hover:text-ink">
                    <Pencil size={14} />
                  </button>
                  <button type="button" aria-label={t('guided.removeLocation')} onClick={() => onChange({ locations: locations.filter((_, j) => j !== i) })} className="rounded-full p-2 text-ink-soft hover:bg-ink/[0.04] hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {adding ? (
            <div className="flex gap-2">
              <div className="min-w-0 flex-1" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(text); } }}>
                <LocationAutocomplete
                  value={text}
                  onChange={(v) => setText(v)}
                  placeholder={t('guided.locationPlaceholder')}
                  ariaLabel={t('guided.whereVisit')}
                />
              </div>
              <Button type="button" variant="secondary" onClick={() => commit(text)} disabled={!text.trim()}>
                {editing != null ? t('guided.save') : t('guided.add')}
              </Button>
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-semibold text-violet-dark">
              <Plus size={15} />
              {t('guided.addAnotherLocation')}
            </button>
          )}
          {!visits && (
            <button type="button" onClick={() => onChange({ locationScope: 'ANYWHERE', locations: [] })} className="mt-2 block text-[13px] font-medium text-ink-soft underline-offset-2 hover:underline">
              {t('guided.noSpecificLocation')}
            </button>
          )}
        </Field>
      )}
    </div>
  );
}

// ── Deliverables (§8) ────────────────────────────────────────────────────────

export function DeliverablesEditor({ items, onChange, platforms }: { items: DeliverableItem[]; onChange: (items: DeliverableItem[]) => void; platforms: string[] }) {
  const t = useT();
  const update = (i: number, patch: Partial<DeliverableItem>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const platformsFor = (type: string) => {
    const def = DELIVERABLE_TYPES.find((d) => d.type === type);
    const list = def?.platforms.length ? def.platforms : platforms;
    return Array.from(new Set(list.length ? list : ['Instagram', 'TikTok', 'YouTube', 'Facebook']));
  };
  const addItem = () => {
    const p = platforms[0] ?? 'Instagram';
    const type = /tiktok/i.test(p) ? 'TIKTOK_VIDEO' : /youtube/i.test(p) ? 'YOUTUBE_SHORT' : 'REEL';
    onChange([...items, { type, platform: p, quantity: 1 }]);
  };
  return (
    <div>
      {items.length > 0 && (
        <ul className="space-y-2.5">
          {items.map((it, i) => (
            <li key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-2xl border border-line bg-surface p-3 sm:grid-cols-[1.4fr_1fr_auto_auto] sm:items-center">
              <select
                aria-label={t('guided.deliverableType')}
                value={it.type}
                onChange={(e) => update(i, { type: e.target.value, platform: platformsFor(e.target.value)[0] ?? it.platform })}
                className="h-11 rounded-xl border border-line-strong bg-surface px-3 text-[14px] font-medium text-ink"
              >
                {DELIVERABLE_TYPES.map((d) => <option key={d.type} value={d.type}>{t(`guided.deliv_${d.type}`)}</option>)}
              </select>
              <button type="button" aria-label={t('guided.remove')} onClick={() => onChange(items.filter((_, j) => j !== i))} className="row-span-1 flex h-11 w-11 items-center justify-center justify-self-end rounded-full text-ink-soft hover:bg-ink/[0.04] hover:text-danger sm:order-last">
                <Trash2 size={15} />
              </button>
              <select
                aria-label={t('guided.platform')}
                value={it.platform ?? ''}
                onChange={(e) => update(i, { platform: e.target.value || null })}
                className="h-11 rounded-xl border border-line-strong bg-surface px-3 text-[14px] text-ink"
              >
                <option value="">{t('guided.anyPlatform')}</option>
                {platformsFor(it.type).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <Stepper value={it.quantity} onChange={(n) => update(i, { quantity: n })} min={1} max={50} ariaLabel={t('guided.quantityPerCreator')} />
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={addItem} className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-semibold text-violet-dark">
        <Plus size={15} />
        {t('guided.addDeliverable')}
      </button>
    </div>
  );
}
