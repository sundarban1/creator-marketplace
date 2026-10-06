import { useState, type ReactNode } from 'react';
import { Pencil, Target, MapPin, Users, Smartphone, Clapperboard, Wallet, CalendarDays, ListChecks, Sparkles, CircleAlert } from 'lucide-react';
import { useT } from '../../i18n';
import { rupees } from '../../lib/format';
import { Button } from '../../ui/Button';
import { Alert } from '../../ui/Alert';
import type { CampaignRuleIssue, CampaignStep } from '../campaignRules';
import type { GuidedForm, GuidedStep } from './guidedModel';
import { BRIEF_SECTIONS, sectionFilled, shownPlatform } from './briefSections';
import { locationSummary } from './guidedModel';
import { SaveTemplateButton } from './templates';
import { ProvenanceTag, SuggestionNote } from './parts';
import { EventAttachmentsEditor } from '../../events/EventAttachments';
import type { CampaignAttachment } from '../../api/business';

function fmtDate(d: string) {
  return d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}


function Row({ icon, label, value, provenance, onEdit, attention }: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  provenance?: GuidedForm['aiProvenance'][string];
  onEdit: () => void;
  attention?: boolean;
}) {
  const t = useT();
  return (
    <div className="flex items-start gap-3 border-b border-line py-4 last:border-0">
      <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet/[0.08] text-violet">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
          <ProvenanceTag value={provenance} />
        </div>
        <div className={attention ? 'mt-0.5 text-[15px] font-medium text-warning' : 'mt-0.5 text-[15px] text-ink'}>{value}</div>
      </div>
      <button type="button" onClick={onEdit} className="inline-flex min-h-[40px] items-center gap-1 rounded-full px-3 text-[13px] font-semibold text-violet-dark hover:bg-violet/[0.07]">
        <Pencil size={13} />
        {t('guided.edit')}
      </button>
    </div>
  );
}

export function ReviewStep({
  form, issues, onEdit, onPublish, onSaveExit, publishing, mode, serverError, onAnswerVisit, campaignId, beforeSaveTemplate, onAttachmentsChange,
}: {
  form: GuidedForm;
  issues: CampaignRuleIssue[];
  onEdit: (step: GuidedStep) => void;
  onPublish: () => void;
  onSaveExit: () => void;
  publishing: boolean;
  mode: 'create' | 'edit';
  serverError?: string;
  onAnswerVisit: (visit: boolean) => void;
  // Saved campaign/draft id — enables "Save as template" (§23).
  campaignId?: string | null;
  beforeSaveTemplate?: () => Promise<void>;
  onAttachmentsChange: (next: CampaignAttachment[]) => void;
}) {
  const t = useT();
  const [attachmentsBusy, setAttachmentsBusy] = useState(false);
  const blocking = issues.filter((i) => i.severity === 'required');
  const suggestions = issues.filter((i) => i.severity === 'recommended');
  const creators = form.creatorsNeeded ?? 0;
  const visitUnknown = form.locationType == null;
  const exchange = form.paymentType === 'Product Exchange';
  const advanced = BRIEF_SECTIONS.filter((s) => sectionFilled(form.brief, s.key));
  const stepFor = (s: CampaignStep): GuidedStep => s;
  const issueText = (i: CampaignRuleIssue) => {
    const k = `guided.issue_${i.code}`;
    const v = t(k);
    return v === k ? i.message : v;
  };

  const budgetText = exchange
    ? t('guided.payExchange')
    : form.budgetMax > 0
      ? `${form.budgetRateType === 'RANGE' && form.budgetMin !== form.budgetMax ? `${rupees(form.budgetMin)}–${rupees(form.budgetMax)}` : rupees(form.budgetMax)} ${t('guided.perCreator')}${creators > 1 ? ` · ${t('guided.totalAbout', { total: rupees(form.budgetMax * creators) })}` : ''}`
      : t('guided.budgetNotSet');

  return (
    <section>
      <p className="flex items-center gap-2 text-[13px] font-semibold text-violet-dark">
        <Sparkles size={15} />
        {mode === 'edit' ? t('guided.reviewEditKicker') : t('guided.reviewKicker')}
      </p>
      <h2 className="mt-1 font-serif text-[26px] font-medium leading-tight tracking-tight text-ink sm:text-[30px]">{form.title || t('guided.untitled')}</h2>
      {form.description && <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{form.description}</p>}

      {/* Questions still open — assistance, not errors (§20) */}
      {visitUnknown && (
        <div className="mt-6">
          <SuggestionNote
            actions={<>
              <Button size="sm" variant="secondary" onClick={() => onAnswerVisit(true)}>{t('guided.visitYes')}</Button>
              <Button size="sm" variant="secondary" onClick={() => onAnswerVisit(false)}>{t('guided.visitNo')}</Button>
            </>}
          >
            {t('guided.reviewVisitQuestion')}
          </SuggestionNote>
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="mt-4 space-y-2">
          {suggestions.map((i) => (
            <SuggestionNote key={i.code} actions={<Button size="sm" variant="ghost" onClick={() => onEdit(stepFor(i.step))}>{t('guided.addIt')}</Button>}>
              {issueText(i)}
            </SuggestionNote>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-line bg-surface px-4 sm:px-5">
        <Row icon={<Target size={16} />} label={t('guided.rGoal')} value={form.goal ? t(`guided.goal_${form.goal}`) : t('guided.notSure')} provenance={form.aiProvenance.goal} onEdit={() => onEdit('basics')} />
        <Row icon={<MapPin size={16} />} label={t('guided.rLocation')} value={<>{locationSummary(form, t)}{form.locationType === 'ONSITE' && <span className="block text-[13px] text-ink-soft">{t('guided.creatorsVisitYou')}</span>}</>} provenance={form.aiProvenance.locations} onEdit={() => onEdit('basics')} attention={blocking.some((i) => i.field === 'locations')} />
        <Row icon={<Users size={16} />} label={t('guided.rCreators')} value={creators ? t('guided.creatorsOfType', { count: creators, type: form.category || '—' }) : t('guided.notSet')} provenance={form.aiProvenance.creatorsNeeded} onEdit={() => onEdit('creators')} attention={blocking.some((i) => i.step === 'creators')} />
        <Row icon={<Smartphone size={16} />} label={t('guided.rPlatforms')} value={form.platforms.length ? form.platforms.join(' + ') : t('guided.notSet')} provenance={form.aiProvenance.platforms} onEdit={() => onEdit('creators')} />
        <Row
          icon={<Clapperboard size={16} />}
          label={t('guided.rDeliverables')}
          value={form.deliverableItems.length
            ? <ul>{form.deliverableItems.map((d, i) => <li key={i}>{d.quantity}× {t(`guided.deliv_${d.type}`)}{shownPlatform(d.type, d.platform) ? ` · ${shownPlatform(d.type, d.platform)}` : ''} <span className="text-ink-soft">{t('guided.eachCreator')}</span></li>)}</ul>
            : t('guided.notSet')}
          provenance={form.aiProvenance.deliverableItems}
          onEdit={() => onEdit('content')}
        />
        <Row icon={<Wallet size={16} />} label={t('guided.rBudget')} value={budgetText} provenance={form.aiProvenance.budget} onEdit={() => onEdit('budget')} attention={blocking.some((i) => i.field === 'budgetMax')} />
        <Row
          icon={<CalendarDays size={16} />}
          label={t('guided.rTimeline')}
          value={<>
            {form.startDate ? `${fmtDate(form.startDate)} – ${fmtDate(form.deadline)}` : t('guided.finishByDate', { date: fmtDate(form.deadline) })}
            {form.applicationDeadline && <span className="block text-[13px] text-ink-soft">{t('guided.applyByDate', { date: fmtDate(form.applicationDeadline) })}</span>}
          </>}
          provenance={form.aiProvenance.deadline}
          onEdit={() => onEdit('budget')}
          attention={blocking.some((i) => i.step === 'budget' && i.field !== 'budgetMax')}
        />
        <Row
          icon={<ListChecks size={16} />}
          label={t('guided.rRequirements')}
          value={advanced.length ? advanced.map((s) => t(s.title)).join(' · ') : <span className="text-ink-soft">{t('guided.noAdvanced')}</span>}
          onEdit={() => onEdit('requirements')}
        />
      </div>

      {/* Reference images / PDF briefs — last thing before publishing. */}
      <div className="mt-6 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <EventAttachmentsEditor value={form.brief.attachments ?? []} onChange={onAttachmentsChange} onBusyChange={setAttachmentsBusy} />
      </div>

      {blocking.length > 0 && (
        <div className="mt-6 rounded-2xl border border-warning/30 bg-warning-soft/40 p-4">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ink"><CircleAlert size={16} className="text-warning" />{t('guided.beforePublish')}</p>
          <ul className="mt-2 space-y-1.5">
            {blocking.map((i) => (
              <li key={i.code} className="flex flex-wrap items-center justify-between gap-2 text-[14px] text-ink">
                <span>{issueText(i)}</span>
                <button type="button" onClick={() => onEdit(stepFor(i.step))} className="text-[13px] font-semibold text-violet-dark">{t('guided.fix')}</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {serverError && <Alert tone="error" className="mt-4">{serverError}</Alert>}

      <div className="mt-6 flex justify-start">
        <SaveTemplateButton campaignId={campaignId ?? null} defaultName={form.title} beforeSave={beforeSaveTemplate} />
      </div>

      <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-8 flex flex-col-reverse gap-2 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="button" variant="ghost" onClick={onSaveExit} disabled={publishing}>
          {mode === 'edit' ? t('guided.cancel') : t('guided.saveExit')}
        </Button>
        <Button type="button" size="lg" onClick={onPublish} loading={publishing} disabled={blocking.length > 0 || visitUnknown || attachmentsBusy} title={attachmentsBusy ? t('biz.attachmentsWaitUpload') : undefined}>
          {mode === 'edit' ? t('guided.saveChanges') : t('guided.publish')}
        </Button>
      </div>
    </section>
  );
}
