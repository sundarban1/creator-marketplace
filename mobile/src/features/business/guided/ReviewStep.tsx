import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/Button';
import { F, SPACING } from '@/utilities/constants';
import type { CampaignRuleIssue, CampaignStep } from '../utils/campaignRules';
import { locationSummary, type GuidedForm, type GuidedStep } from './guidedModel';
import { BRIEF_SECTIONS, sectionFilled } from './briefSections';
import { StepShell, ProvenanceTag, SuggestionNote, deliverableLine, st } from './parts';
import { SaveTemplateButton } from './templates';
import { EventAttachmentsField } from '@/components/EventAttachmentsField';
import type { CampaignAttachment } from '@/services/guidedCampaign';

const rupees = (n: number) => `Rs. ${Math.round(n).toLocaleString('en-IN')}`;
const fmtDate = (d: string) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function Row({ icon, label, value, provenance, onEdit, attention }: {
  icon: keyof typeof FontAwesome5.glyphMap;
  label: string;
  value: ReactNode;
  provenance?: GuidedForm['aiProvenance'][string];
  onEdit: () => void;
  attention?: boolean;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  return (
    <View style={{ flexDirection: 'row', gap: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
        <FontAwesome5 name={icon} size={13} color={C.brinjal1} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <Text style={[st.small, { color: C.textSecondary, fontFamily: F.semibold }]}>{label}</Text>
          <ProvenanceTag value={provenance} />
        </View>
        {typeof value === 'string'
          ? <Text style={[st.body, { color: attention ? C.draft : C.text, fontFamily: attention ? F.medium : F.regular }]}>{value}</Text>
          : value}
      </View>
      <Pressable onPress={onEdit} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel={`${t('guided.edit')} ${label}`}>
        <Text style={[st.linkTxt, { color: C.brinjal1 }]}>{t('guided.edit')}</Text>
      </Pressable>
    </View>
  );
}

export function ReviewStep({ form, issues, mode, onEdit, onPublish, onSaveExit, publishing, serverError, onAnswerVisit, header, campaignId, beforeSaveTemplate, onAttachmentsChange }: {
  form: GuidedForm;
  issues: CampaignRuleIssue[];
  mode: 'create' | 'edit';
  onEdit: (s: GuidedStep) => void;
  onPublish: () => void;
  onSaveExit: () => void;
  publishing: boolean;
  serverError?: string;
  onAnswerVisit: (visit: boolean) => void;
  header?: ReactNode;
  // Saved campaign/draft id — enables "Save as template" (§23).
  campaignId?: string | null;
  beforeSaveTemplate?: () => Promise<void>;
  onAttachmentsChange: (next: CampaignAttachment[]) => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [attachmentsBusy, setAttachmentsBusy] = useState(false);
  const blocking = issues.filter((i) => i.severity === 'required');
  const suggestions = issues.filter((i) => i.severity === 'recommended');
  const creators = form.creatorsNeeded ?? 0;
  const visitUnknown = form.locationType == null;
  const exchange = form.paymentType === 'Product Exchange';
  const advanced = BRIEF_SECTIONS.filter((s) => sectionFilled(form.brief, s.key));
  const text = (i: CampaignRuleIssue) => { const k = `guided.issue_${i.code}`; const v = t(k); return v === k ? i.message : v; };
  const step = (s: CampaignStep): GuidedStep => s;

  const budget = exchange
    ? t('guided.payExchange')
    : form.budgetMax > 0
      ? `${form.budgetRateType === 'RANGE' && form.budgetMin !== form.budgetMax ? `${rupees(form.budgetMin)}–${rupees(form.budgetMax)}` : rupees(form.budgetMax)} ${t('guided.perCreator')}${creators > 1 ? ` · ${t('guided.totalAbout', { total: rupees(form.budgetMax * creators) })}` : ''}`
      : t('guided.budgetNotSet');

  return (
    <StepShell
      header={header}
      title={form.title || t('guided.untitled')}
      subtitle={mode === 'edit' ? t('guided.reviewEditKicker') : t('guided.reviewKicker')}
      footer={
        <View style={{ gap: SPACING.sm }}>
          {serverError ? <Text style={[st.small, { color: C.error }]}>{serverError}</Text> : null}
          <Button label={mode === 'edit' ? t('guided.saveChanges') : t('guided.publish')} onPress={onPublish} loading={publishing} disabled={blocking.length > 0 || visitUnknown || attachmentsBusy} fullWidth />
          <Button label={mode === 'edit' ? t('guided.cancel') : t('guided.saveExit')} variant="ghost" onPress={onSaveExit} disabled={publishing} fullWidth />
        </View>
      }>
      {form.description ? <Text style={[st.body, { color: C.textSecondary }]}>{form.description}</Text> : null}

      {visitUnknown ? (
        <SuggestionNote actions={<>
          <Button label={t('guided.visitYes')} size="small" variant="secondary" onPress={() => onAnswerVisit(true)} />
          <Button label={t('guided.visitNo')} size="small" variant="secondary" onPress={() => onAnswerVisit(false)} />
        </>}>
          {t('guided.reviewVisitQuestion')}
        </SuggestionNote>
      ) : null}
      {suggestions.map((i) => (
        <SuggestionNote key={i.code} actions={<Button label={t('guided.addIt')} size="small" variant="ghost" onPress={() => onEdit(step(i.step))} />}>
          {text(i)}
        </SuggestionNote>
      ))}

      <View style={{ borderTopWidth: 1, borderTopColor: C.border }}>
        <Row icon="bullseye" label={t('guided.rGoal')} value={form.goal ? t(`guided.goal_${form.goal}`) : t('guided.notSure')} provenance={form.aiProvenance.goal} onEdit={() => onEdit('basics')} />
        <Row
          icon="map-marker-alt"
          label={t('guided.rLocation')}
          value={<>
            <Text style={[st.body, { color: blocking.some((i) => i.field === 'locations') ? C.draft : C.text }]}>{locationSummary(form, t)}</Text>
            {form.locationType === 'ONSITE' ? <Text style={[st.small, { color: C.textSecondary }]}>{t('guided.creatorsVisitYou')}</Text> : null}
          </>}
          provenance={form.aiProvenance.locations}
          onEdit={() => onEdit('basics')}
        />
        <Row icon="users" label={t('guided.rCreators')} value={creators ? t('guided.creatorsOfType', { count: creators, type: form.category || '—' }) : t('guided.notSet')} provenance={form.aiProvenance.creatorsNeeded} onEdit={() => onEdit('creators')} attention={blocking.some((i) => i.step === 'creators')} />
        <Row icon="mobile-alt" label={t('guided.rPlatforms')} value={form.platforms.length ? form.platforms.join(' + ') : t('guided.notSet')} provenance={form.aiProvenance.platforms} onEdit={() => onEdit('creators')} />
        <Row
          icon="film"
          label={t('guided.rDeliverables')}
          value={form.deliverableItems.length
            ? <View>{form.deliverableItems.map((d, i) => <Text key={i} style={[st.body, { color: C.text }]}>{deliverableLine(d, t)} <Text style={{ color: C.textSecondary }}>{t('guided.eachCreator')}</Text></Text>)}</View>
            : t('guided.notSet')}
          provenance={form.aiProvenance.deliverableItems}
          onEdit={() => onEdit('content')}
        />
        <Row icon="wallet" label={t('guided.rBudget')} value={budget} provenance={form.aiProvenance.budget} onEdit={() => onEdit('budget')} attention={blocking.some((i) => i.field === 'budgetMax')} />
        <Row
          icon="calendar-alt"
          label={t('guided.rTimeline')}
          value={<>
            <Text style={[st.body, { color: C.text }]}>{form.startDate ? `${fmtDate(form.startDate)} – ${fmtDate(form.deadline)}` : t('guided.finishByDate', { date: fmtDate(form.deadline) })}</Text>
            {form.applicationDeadline ? <Text style={[st.small, { color: C.textSecondary }]}>{t('guided.applyByDate', { date: fmtDate(form.applicationDeadline) })}</Text> : null}
          </>}
          provenance={form.aiProvenance.deadline}
          onEdit={() => onEdit('budget')}
        />
        <Row icon="tasks" label={t('guided.rRequirements')} value={advanced.length ? advanced.map((s) => t(s.title)).join(' · ') : t('guided.noAdvanced')} onEdit={() => onEdit('requirements')} />
      </View>

      {/* Reference images / PDFs — last thing before publishing. */}
      <View style={{ paddingTop: SPACING.lg, borderTopWidth: 1, borderTopColor: C.border }}>
        <EventAttachmentsField mode="edit" value={form.brief.attachments ?? []} onChange={onAttachmentsChange} onBusyChange={setAttachmentsBusy} />
      </View>

      {blocking.length ? (
        <View style={[st.note, { borderColor: C.draft, backgroundColor: C.accentLight }]}>
          <Text style={[st.fieldLabel, { color: C.text, marginBottom: 6 }]}>{t('guided.beforePublish')}</Text>
          {blocking.map((i) => (
            <View key={i.code} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <Text style={[st.body, { color: C.text, flex: 1 }]}>{text(i)}</Text>
              <Pressable onPress={() => onEdit(step(i.step))} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }} accessibilityRole="button">
                <Text style={[st.linkTxt, { color: C.brinjal1 }]}>{t('guided.fix')}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <SaveTemplateButton campaignId={campaignId ?? null} defaultName={form.title} beforeSave={beforeSaveTemplate} />
    </StepShell>
  );
}
