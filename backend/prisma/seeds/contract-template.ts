// Duplicate of src/modules/contract/contract.service.ts's TOKENS/DEFAULT_TEMPLATE,
// kept in sync by hand. It can't just import from there: the production Docker
// image only ships dist/ + prisma/, not src/, and this seed script runs via tsx
// straight from prisma/ in that image — reaching into src/ 404s at runtime. tsc's
// rootDir (`src`) also blocks the reverse import, so the two copies must stay
// separate files. If you change the template text, update both.

// Placeholder tokens supported inside the ContractTemplate's `body` — kept in sync
// with the legend shown in the admin editor (web/src/pages/ContractTemplateEditor.tsx).
export const TOKENS = [
  'creatorName', 'businessName', 'campaignTitle', 'effectiveDate', 'acceptanceDate', 'deadline',
  'price', 'deliverables', 'timeline', 'platforms', 'contentGuidelines',
  'approvalRequirements', 'location', 'platformCommission', 'role', 'deliveryFormat',
] as const;

// Also seeded into the DB by prisma/seeds/contracts.ts (npm run db:seed:essentials).
// This copy is only the lazy-create fallback for contract.service.ts's
// getOrCreateTemplate(), so the feature still works end-to-end even if the seed
// was never run. Markdown (#/##, **bold**, bullet lines) — rendered by both the
// mobile ContractModal and the PDF export.
export const DEFAULT_TEMPLATE = {
  title: 'Kolab Agreement',
  body: `This Creator Collaboration Agreement ("Agreement") is entered into on **{{effectiveDate}}** between **{{businessName}}** ("Business") and **{{creatorName}}** ("Creator") for the campaign **"{{campaignTitle}}"** facilitated through the Kolab platform.

## 1. Campaign Details

The Creator agrees to create and deliver the following content:

**Deliverables:** {{deliverables}}

The content must follow these campaign requirements:

**Content Guidelines:** {{contentGuidelines}}

The content will be published on:

**Platforms:** {{platforms}}

## 2. Compensation

The Business agrees to pay the Creator **{{price}}** for successfully completing the agreed deliverables.

Payment will be securely held by Kolab and released to the Creator after the Business approves the submitted work or in accordance with Kolab's payment and dispute policies.

## 3. Timeline

* Acceptance Date: {{acceptanceDate}}
* Completion Period: {{timeline}}
* Final Submission Deadline: {{deadline}}

The Creator agrees to submit all deliverables by the deadline unless both parties agree otherwise through Kolab.

## 4. Content Review

{{approvalRequirements}}

The Business agrees to review submitted content within the timeframe specified by Kolab. If revisions are requested, they must be reasonable and relate to the original campaign brief.

## 5. Campaign Location

{{location}}

If no location is specified, the Creator may complete the campaign from any suitable location unless otherwise agreed.

## 6. Content Rights

Unless otherwise stated, the Creator retains ownership of the original content. Upon successful payment, the Business receives the right to use the content for the purposes described in this campaign. Any additional commercial use requires the Creator's consent unless otherwise agreed.

## 7. Platform Fee

A platform commission of **{{platformCommission}}** applies to this campaign and is payable by the Business in accordance with Kolab's pricing policy.

## 8. Cancellation

If either party wishes to cancel after accepting the campaign, the cancellation and any applicable refunds will be handled according to Kolab's Terms & Conditions.

## 9. Disputes

If a dispute arises, both parties agree to first attempt to resolve the matter through Kolab's dispute resolution process. If the dispute cannot be resolved, it will be governed by the applicable laws of Nepal.

## 10. Acceptance

By digitally accepting this Agreement (checking "I agree" below), both the Business and the Creator confirm that they:

* Have read and understood this Agreement.
* Agree to comply with the campaign requirements.
* Agree to Kolab's Terms & Conditions and Privacy Policy.
* Understand that this Agreement becomes legally binding upon acceptance by both parties.`,
};
