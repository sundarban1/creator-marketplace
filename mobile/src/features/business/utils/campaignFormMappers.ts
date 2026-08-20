import type { AiCampaignDraft, AiEventDraft } from '@/services/campaign';
import { DEFAULT_DELIVERABLES } from '@/features/business/constants/campaignForm';
import { getTemplateImage } from '@/features/creator/data/templateImages';
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
    featureImageUrl:      prev.featureImageUrl ?? getTemplateImage(draft.category, draft.category) ?? null,
    aiGenerated:           true,
    aiPrompt,
    aiSuggestedCategories: draft.aiSuggestedCategories,
    aiSuggestedPlatforms:  draft.aiSuggestedPlatforms,
    needsInput:            draft.needsInput,
    aiBudgetMin: draft.budgetMin,
    aiBudgetMax: draft.budgetMax,
    requirements: mapAiRequirementsToForm(draft.requirements, providerCategoryOptions),
  };
}

export function mapAiEventDraftToForm(draft: AiEventDraft, aiPrompt: string, prev: FormData): Partial<FormData> {
  const eventDate = prev.eventDate ?? dayStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const regDeadline = dayStart(new Date(eventDate.getTime() - 2 * 24 * 60 * 60 * 1000));
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
    featureImageUrl:       prev.featureImageUrl ?? getTemplateImage(draft.category, draft.category) ?? null,
    aiGenerated:           true,
    aiPrompt,
    aiSuggestedCategories: draft.aiSuggestedCategories,
    aiSuggestedPlatforms:  draft.aiSuggestedPlatforms,
    needsInput:            draft.needsInput,
  };
}
