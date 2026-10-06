import { useState, type ComponentType, type ReactNode } from 'react';
import {
  UtensilsCrossed, Rocket, Store, CalendarCheck, Video, Hotel, GraduationCap, Star, Megaphone,
  ChevronDown, Bookmark, History, Trash2, Loader2, LayoutTemplate,
} from 'lucide-react';
import { useT } from '../../i18n';
import { useAsync } from '../../lib/useAsync';
import { cn } from '../../ui/cn';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { TextField } from '../../ui/TextField';
import { Alert } from '../../ui/Alert';
import {
  fetchTemplates, fetchMyCampaigns, deleteCampaignTemplate, saveCampaignTemplate,
} from '../../api/business';

// Templates & "start from a previous campaign" (UX spec §23) for the guided
// creator's start screen, plus the "Save as template" dialog.

const ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  utensils: UtensilsCrossed, rocket: Rocket, store: Store, 'calendar-check': CalendarCheck, video: Video,
  hotel: Hotel, 'graduation-cap': GraduationCap, star: Star, bullhorn: Megaphone,
};

export type StartSource = { source: 'system' | 'template' | 'campaign'; id: string };

function TemplateCard({ id, icon, title, sub, onClick, busyId }: { id: string; icon: ReactNode; title: string; sub?: string | null; onClick: () => void; busyId: string | null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!busyId}
      className="flex min-h-[64px] w-full items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 text-left transition-colors hover:border-violet/40 hover:bg-violet/[0.03] disabled:opacity-60"
    >
      <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet/[0.08] text-violet">
        {busyId === id ? <Loader2 size={16} className="animate-spin" /> : icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold text-ink">{title}</span>
        {sub && <span className="mt-0.5 block line-clamp-2 text-[12.5px] text-ink-soft">{sub}</span>}
      </span>
    </button>
  );
}

/** Collapsed by default so the first screen stays one simple question (§3). */
export function StartFromTemplates({ onPick, busyId }: { onPick: (s: StartSource) => void; busyId: string | null }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const templates = useAsync((s) => (open ? fetchTemplates(s) : Promise.resolve(null)), [open]);
  const past = useAsync((s) => (open ? fetchMyCampaigns({ limit: 20 }, s) : Promise.resolve(null)), [open]);
  const [removed, setRemoved] = useState<string[]>([]);
  const previous = (past.data?.items ?? [])
    .filter((c) => c.campaignType !== 'OPEN_EVENT' && c.status !== 'DRAFT')
    .slice(0, 5);
  const mine = (templates.data?.mine ?? []).filter((m) => !removed.includes(m.id));

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-[44px] items-center gap-2 text-[14px] font-semibold text-ink hover:text-violet-dark"
      >
        <LayoutTemplate size={16} />
        {t('guided.tplBrowse')}
        <ChevronDown size={15} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-3 space-y-6">
          {mine.length > 0 && (
            <section>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-soft">{t('guided.tplMine')}</p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {mine.map((m) => (
                  <div key={m.id} className="relative">
                    <TemplateCard busyId={busyId} id={m.id} icon={<Bookmark size={16} />} title={m.name} sub={m.summary} onClick={() => onPick({ source: 'template', id: m.id })} />
                    <button
                      type="button"
                      aria-label={t('guided.tplDelete')}
                      onClick={async () => {
                        if (!window.confirm(t('guided.tplDeleteConfirm'))) return;
                        await deleteCampaignTemplate(m.id).catch(() => undefined);
                        setRemoved((r) => [...r, m.id]);
                      }}
                      className="absolute right-2 top-2 rounded-full p-2 text-ink-soft hover:bg-ink/[0.05] hover:text-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {previous.length > 0 && (
            <section>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-soft">{t('guided.tplPrevious')}</p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {previous.map((c) => (
                  <TemplateCard busyId={busyId} key={c.id} id={c.id} icon={<History size={16} />} title={c.title} sub={c.deliverables || null} onClick={() => onPick({ source: 'campaign', id: c.id })} />
                ))}
              </div>
            </section>
          )}

          <section>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-soft">{t('guided.tplKolab')}</p>
            {templates.loading ? (
              <p className="text-[13px] text-ink-soft">{t('guided.thinking')}</p>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {(templates.data?.system ?? []).map((s) => {
                  const Icon = ICONS[s.icon] ?? LayoutTemplate;
                  return <TemplateCard busyId={busyId} key={s.key} id={s.key} icon={<Icon size={16} />} title={s.name} sub={s.summary} onClick={() => onPick({ source: 'system', id: s.key })} />;
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

/** "Save as template" — name it, keep everything but the dates (§23). */
export function SaveTemplateButton({ campaignId, defaultName, variant = 'ghost', beforeSave }: {
  campaignId: string | null;
  defaultName: string;
  variant?: 'ghost' | 'secondary';
  // e.g. flush autosave so the template captures what's on screen
  beforeSave?: () => Promise<void>;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  if (!campaignId) return null;
  return (
    <>
      <Button type="button" variant={variant} size="sm" onClick={() => { setName(defaultName); setError(''); setSaved(false); setOpen(true); }}>
        <Bookmark size={14} />
        {t('guided.tplSaveAs')}
      </Button>
      <Modal open={open} onClose={() => (busy ? null : setOpen(false))} title={t('guided.tplSaveTitle')}>
        {saved ? (
          <div className="space-y-4">
            <Alert tone="success">{t('guided.tplSaved')}</Alert>
            <Button onClick={() => setOpen(false)}>{t('guided.done')}</Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true); setError('');
              try { await beforeSave?.(); await saveCampaignTemplate(campaignId, name.trim()); setSaved(true); }
              catch (err) { setError(err instanceof Error ? err.message : t('common.somethingWrong')); }
              finally { setBusy(false); }
            }}
          >
            <p className="text-[14px] text-ink-soft">{t('guided.tplSaveHint')}</p>
            <TextField label={t('guided.tplName')} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
            {error && <Alert tone="error">{error}</Alert>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>{t('guided.cancel')}</Button>
              <Button type="submit" loading={busy} disabled={!name.trim()}>{t('guided.tplSave')}</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
