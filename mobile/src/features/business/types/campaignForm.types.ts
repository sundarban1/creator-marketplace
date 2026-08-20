// Shared form-state types for the create/edit campaign flow — split out of
// create-campaign.tsx so pure helpers/components that operate on this shape
// (campaignFormMappers.ts, CampaignSummary.tsx) can import it without a
// backward app/ → features/ dependency.

export type FormData = {
  template: string;
  goals: string[];
  budget: string;
  creatorType: string[];
  platforms: string[];
  location: string;
  locationType: 'ONSITE' | 'REMOTE';
  creatorsNeeded: number;
  deliverables: Record<string, number>;
  title: string;
  description: string;
  featureImageUrl: string | null;
  deadline: Date | null;
  isFeatured: boolean;
  // Open Event / Free Invitation fields
  eventType:    'PAID_CAMPAIGN' | 'OPEN_EVENT';
  eventDate:    Date | null;
  venue:        string;
  capacity:     number;
  // What the business is offering attendees (OFFERING_OPTIONS chips).
  benefits:     string[];
  // What the business wants back in exchange (EXCHANGE_OPTIONS chips) —
  // ['Just attend & share organically'] alone means no content is expected.
  exchangeType: string[];
  // Free-text elaboration on exchangeType (e.g. "1 Reel + 2 Stories within
  // 3 days") — blank when exchangeType is organic-only.
  expectedContent: string;
  // Who the business wants to invite (role-type chips) — sent as targetAudience.
  roleTypes: string[];
  // AI-generated fields (PAID_CAMPAIGN only)
  objective: string;
  contentGuidelines: string[];
  targetAudience: string[];
  hashtags: string[];
  sampleCaption: string;
  approvalRequirements: string;
  aiGenerated: boolean;
  aiPrompt: string;
  aiSuggestedCategories: string[];
  aiSuggestedPlatforms: string[];
  needsInput: string[];
  aiBudgetMin: number;
  aiBudgetMax: number;
  // AI-determined (or business-corrected) completion type — see
  // CompletionTypePicker. Null only before the AI draft has ever populated
  // it (e.g. a brand-new, not-yet-generated form).
  completionType: 'SERVICE' | 'DELIVERABLE' | null;
  // The AI's explanation for its pick — shown as a caption, cleared once the
  // business manually overrides the type (no auto-generated reason for a
  // human's own choice).
  completionReason: string;
  // Multi-role campaigns (§ CampaignRequirement) — empty for the default
  // single-role flow every existing campaign uses. See requirementMode state.
  requirements: RequirementFormItem[];
};

export type RequirementFormItem = {
  // Client-local id for list rendering/editing only — never sent to the backend.
  key: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  quantity: number;
  budgetType: 'FIXED' | 'RANGE' | 'NEGOTIABLE';
  budgetFixed: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  format: string[];
  // This role's own content ask (Reel/Story/Photo Post counts...) — same
  // Record<key, count> shape as FormData.deliverables above, but scoped to
  // what THIS role should produce rather than the whole campaign. Only
  // meaningful when categoryName is 'Content Creator' — other roles use
  // `description` instead.
  deliverables: Record<string, number>;
  // Free-text brief of what this role should do — shown/edited in place of
  // `deliverables` for every category except 'Content Creator'.
  description: string;
  // Per-role completion type — a multi-role campaign can mix e.g. a DJ
  // (SERVICE) and a Photographer (DELIVERABLE) requirement. Read-only here
  // for V1 (see CompletionTypePicker — only the top-level/single-role case
  // has an override UI so far).
  completionType: 'SERVICE' | 'DELIVERABLE' | null;
  completionReason: string;
};
