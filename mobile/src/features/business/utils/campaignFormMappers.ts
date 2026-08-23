import type { AiCampaignDraft, AiEventDraft } from '@/services/campaign';
import { DEFAULT_DELIVERABLES } from '@/features/business/constants/campaignForm';
import { resolveFeatureImage } from '@/features/creator/data/templateImages';
import type { FormData, RequirementFormItem } from '@/features/business/types/campaignForm.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
export function getFirstWeekday(y: number, m: number) { return new Date(y, m, 1).getDay(); }
export function dayStart(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
export function fmtDate(d: Date) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Maps a generated draft into FormData fields — shared by both the text and
// audio prompt modes (handleGenerateWithAi/handleGenerateEventWithAi), so the
// two input paths can never drift out of sync on how a draft gets applied.
export function mapAiRequirementsToForm(
  requirements: AiCampaignDraft['requirements'],
  providerCategoryOptions: { id: string; label: string; icon: string; color: string }[],
): RequirementFormItem[] {
  return requirements.map((r, i) => {
    const cat = providerCategoryOptions.find((c) => c.id === r.categoryId);
    return {
      key: `ai-${i}-${r.categoryId}`,
      categoryId:    r.categoryId,
      categoryName:  cat?.label ?? r.category,
      categoryIcon:  cat?.icon ?? 'user',
      categoryColor: cat?.color ?? '#7c3aed',
      quantity:    r.quantity,
      budgetType:  r.budgetType,
      budgetFixed: r.budgetFixed ?? null,
      budgetMin:   r.budgetMin ?? null,
      budgetMax:   r.budgetMax ?? null,
      format:      [],
      deliverables: { ...DEFAULT_DELIVERABLES, ...r.deliverables },
      description: r.description ?? '',
      completionType:   r.completionType,
      completionReason: r.completionReason,
    };
  });
}

export function mapAiCampaignDraftToForm(draft: AiCampaignDraft, aiPrompt: string, prev: FormData, providerCategoryOptions: { id: string; label: string; icon: string; color: string }[]): Partial<FormData> {
  return {
    template:    draft.category,
    platforms:   draft.platforms.slice(0, 3),
    title:       draft.title,
    description: draft.description,
    goals:       [draft.goal],
    budget:      '',
    creatorsNeeded: draft.creatorsNeeded,
    deadline:    dayStart(new Date(Date.now() + draft.suggestedDurationDays * 24 * 60 * 60 * 1000)),
    objective:            draft.objective,
    contentGuidelines:    draft.contentGuidelines,
    targetAudience:       draft.targetAudience,
    deliverables:         { ...DEFAULT_DELIVERABLES, ...draft.deliverables },
    hashtags:             draft.hashtags,
    sampleCaption:        draft.sampleCaption,
    approvalRequirements: draft.approvalRequirements,
    // Three tiers, most-specific first: an image the brand already uploaded, the
    // stock photo the backend found for this draft's actual subject, then the
    // local category/keyword map for when the backend had no search key.
    featureImageUrl:      prev.featureImageUrl ?? draft.featureImageUrl
      ?? resolveFeatureImage({ category: draft.category, title: draft.title, description: draft.description }),
    aiGenerated:           true,
    aiPrompt,
    aiSuggestedCategories: draft.aiSuggestedCategories,
    aiSuggestedPlatforms:  draft.aiSuggestedPlatforms,
    needsInput:            draft.needsInput,
    aiBudgetMin: draft.budgetMin,
    aiBudgetMax: draft.budgetMax,
    completionType:   draft.completionType,
    completionReason: draft.completionReason,
    requirements: mapAiRequirementsToForm(draft.requirements, providerCategoryOptions),
  };
}

// Turns the AI's "YYYY-MM-DD" (+ optional "HH:MM") into a local Date. Built
// component-by-component rather than via `new Date(iso)`, which would parse a
// bare date string as UTC midnight and land on the previous calendar day for
// every user east of Greenwich — Nepal included.
function parseAiEventDate(date: string | null, time: string | null): Date | null {
  if (!date) return null;
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return null;
  const [hh, mm] = (time ?? '').split(':').map(Number);
  const parsed = new Date(y, m - 1, d, Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0);
  // A model that misreads the year (or resolves "the 14th" into a month that
  // has already gone by) would otherwise silently publish an event in the past.
  if (Number.isNaN(parsed.getTime()) || dayStart(parsed) < dayStart(new Date())) return null;
  return parsed;
}

export function mapAiEventDraftToForm(draft: AiEventDraft, aiPrompt: string, prev: FormData): Partial<FormData> {
  // The date the brand actually stated wins over both the form's current value
  // and the seven-days-out default — before this, everything they said about
  // timing was discarded and every AI-generated event landed a week out.
  const spokenDate = parseAiEventDate(draft.eventDate ?? null, draft.eventTime ?? null);
  const eventDate = spokenDate ?? prev.eventDate ?? dayStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  // Registration normally closes two days before the event, but an event the
  // brand said is happening tomorrow would put that in the past — clamp it into
  // [today, event day] instead of shipping a deadline that already expired.
  const today = dayStart(new Date());
  const twoDaysBefore = dayStart(new Date(eventDate.getTime() - 2 * 24 * 60 * 60 * 1000));
  const regDeadline = new Date(Math.min(
    Math.max(twoDaysBefore.getTime(), today.getTime()),
    dayStart(eventDate).getTime(),
  ));
  return {
    template:    draft.category,
    platforms:   draft.platforms.slice(0, 1),
    title:       draft.title,
    description: draft.description,
    benefits:    draft.benefits ?? [],
    // Defensive fallback — a backend that hasn't picked up these newer
    // schema fields yet would otherwise return them as undefined, which
    // crashes every `.join(...)` call on them downstream.
    exchangeType:    draft.exchangeType ?? [],
    expectedContent: draft.expectedContent ?? '',
    capacity:    draft.capacity,
    eventDate,
    deadline:    regDeadline,
    // Only overwrite a venue the brand hasn't already typed on the setup
    // screen — their own entry is more reliable than an inferred one.
    venue:       prev.venue.trim() || draft.venue?.trim() || draft.location?.trim() || prev.venue,
    location:    draft.location?.trim() || prev.location,
    // See mapAiCampaignDraftToForm.
    featureImageUrl:       prev.featureImageUrl ?? draft.featureImageUrl
      ?? resolveFeatureImage({ category: draft.category, title: draft.title, description: draft.description }),
    aiGenerated:           true,
    aiPrompt,
    aiSuggestedCategories: draft.aiSuggestedCategories,
    aiSuggestedPlatforms:  draft.aiSuggestedPlatforms,
    completionType:   draft.completionType,
    completionReason: draft.completionReason,
    needsInput:            draft.needsInput,
  };
}
