import PDFDocument from 'pdfkit';
import { Role, type Campaign, type BusinessProfile, type CreatorProfile, type Contract } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../middleware/error';
import { logger } from '../../config/logger';
import { uploadRawFile } from '../../utils/cloudinary';
import { CreatorRepository } from '../creator/creator.repository';

// Contracts only apply to paid campaigns — a free/open event has no price or
// deliverable-for-payment exchange to put under agreement.
const CONTRACT_CAMPAIGN_TYPE = 'PAID_CAMPAIGN' as const;

// Placeholder tokens supported inside the ContractTemplate's `body` — kept in sync
// with the legend shown in the admin editor (web/src/pages/ContractTemplateEditor.tsx).
export const TOKENS = [
  'creatorName', 'businessName', 'campaignTitle', 'effectiveDate', 'acceptanceDate', 'deadline',
  'price', 'deliverables', 'timeline', 'platforms', 'contentGuidelines',
  'approvalRequirements', 'location', 'platformCommission', 'role', 'deliveryFormat',
] as const;

// Canonical source of the default template text — also seeded into the DB by
// prisma/seeds/contracts.ts (npm run db:seed:contracts). This copy is only the
// lazy-create fallback for getOrCreateTemplate() below, so the feature still
// works end-to-end even if the seed was never run. Markdown (#/##, **bold**,
// bullet lines) — rendered by both the mobile ContractModal and the PDF export.
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

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtMoney(n: number): string {
  return `Rs. ${n.toLocaleString()}`;
}

function renderTemplate(body: string, tokens: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => tokens[key] ?? match);
}

export type ContractTerms = {
  campaignTitle: string;
  price: string;
  priceRaw: number;
  paymentType: string;
  deadline: string | null;
  timeline: string;
  deliverables: string;
  contentGuidelines: string[];
  platforms: string[];
  approvalRequirements: string | null;
  location: string | null;
  platformCommission: number | null;
  role: string | null;
  deliveryFormat: string[];
};

// The specific role-slot (§ CampaignRequirement) an application is tied to —
// its own deliverables/format/deadline take precedence over the parent
// campaign's when present, since a multi-role campaign's roles can differ.
type RequirementForContract = {
  category: { name: string };
  deliverables: string | null;
  description: string | null;
  format: string[];
  deadline: Date | null;
} | null;

function assertPaidCampaign(campaignType: string): void {
  if (campaignType !== CONTRACT_CAMPAIGN_TYPE) {
    throw new AppError('Contracts are only available for paid campaigns', 400);
  }
}

function buildTermsAndTokens(
  campaign: Campaign,
  business: BusinessProfile,
  creator: Pick<CreatorProfile, 'fullName'>,
  proposedRate: number,
  timeline: string,
  requirement: RequirementForContract = null,
): { terms: ContractTerms; tokens: Record<string, string> } {
  const priceLabel = fmtMoney(proposedRate);
  const platforms = campaign.platforms ?? [];
  const contentGuidelines = campaign.contentGuidelines ?? [];
  const now = new Date();

  const roleName = requirement?.category.name ?? null;
  const deliveryFormat = requirement?.format ?? [];
  const deadline = requirement?.deadline ?? campaign.deadline;
  const baseDeliverables = requirement?.deliverables || requirement?.description || campaign.deliverables;
  // Embeds role + delivery format directly into the deliverables text so the
  // rendered contract differs per role even on an unmodified template body —
  // {{role}}/{{deliveryFormat}} tokens below are there for template authors
  // who want them called out separately.
  const deliverablesLabel = [
    roleName ? `[Role: ${roleName}]` : null,
    baseDeliverables,
    deliveryFormat.length ? `(Format: ${deliveryFormat.join(', ')})` : null,
  ].filter(Boolean).join(' ');

  const terms: ContractTerms = {
    campaignTitle: campaign.title,
    price: priceLabel,
    priceRaw: proposedRate,
    paymentType: campaign.paymentType,
    deadline: deadline ? deadline.toISOString() : null,
    timeline,
    deliverables: deliverablesLabel,
    contentGuidelines,
    platforms,
    approvalRequirements: campaign.approvalRequirements ?? null,
    location: campaign.location ?? null,
    platformCommission: campaign.commissionRate ?? null,
    role: roleName,
    deliveryFormat,
  };

  const tokens: Record<string, string> = {
    creatorName:  creator.fullName || 'Creator',
    businessName: business.businessName || 'Business',
    campaignTitle: campaign.title,
    effectiveDate:  fmtDate(now),
    acceptanceDate: fmtDate(now),
    deadline:      fmtDate(deadline),
    price:         priceLabel,
    deliverables:  deliverablesLabel || 'As described in the campaign brief',
    timeline,
    platforms:            platforms.join(', ') || 'N/A',
    contentGuidelines:    contentGuidelines.join('; ') || 'N/A',
    approvalRequirements: campaign.approvalRequirements || 'Standard approval process applies.',
    location:      campaign.location || 'N/A',
    platformCommission: campaign.commissionRate != null ? `${campaign.commissionRate}%` : 'N/A',
    role:          roleName || 'N/A',
    deliveryFormat: deliveryFormat.join(', ') || 'N/A',
  };

  return { terms, tokens };
}

async function getOrCreateTemplate() {
  const existing = await prisma.contractTemplate.findUnique({ where: { campaignType: CONTRACT_CAMPAIGN_TYPE } });
  if (existing) return existing;
  // Idempotent: two concurrent first-reads could both miss the findUnique above —
  // fall back to re-fetching on a unique-constraint conflict rather than erroring.
  return prisma.contractTemplate.create({
    data: { campaignType: CONTRACT_CAMPAIGN_TYPE, title: DEFAULT_TEMPLATE.title, body: DEFAULT_TEMPLATE.body },
  }).catch(() => prisma.contractTemplate.findUniqueOrThrow({ where: { campaignType: CONTRACT_CAMPAIGN_TYPE } }));
}

function assertParty(contract: { creator: { userId: string }; business: { userId: string } }, userId: string, role: Role) {
  if (role === Role.ADMIN) return;
  if (contract.creator.userId !== userId && contract.business.userId !== userId) {
    throw new AppError('You are not authorized to view this contract', 403);
  }
}

export class ContractService {
  private creatorRepo = new CreatorRepository();

  // No DB write — used by the mobile creator flow to render contract text from
  // the in-progress proposal form, before an Application exists yet.
  async previewForCampaign(campaignId: string, userId: string, proposedRate: number, timeline: string, requirementId?: string) {
    const creator = await this.creatorRepo.findByUserId(userId);
    if (!creator) throw new AppError('Creator profile not found', 404);

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new AppError('Campaign not found', 404);
    assertPaidCampaign(campaign.campaignType);

    const business = await prisma.businessProfile.findUnique({ where: { id: campaign.businessId } });
    if (!business) throw new AppError('Business not found', 404);

    let requirement: RequirementForContract = null;
    if (requirementId) {
      const found = await prisma.campaignRequirement.findUnique({
        where: { id: requirementId },
        select: { campaignId: true, deliverables: true, description: true, format: true, deadline: true, category: { select: { name: true } } },
      });
      if (!found || found.campaignId !== campaignId) throw new AppError('Requirement not found on this campaign', 404);
      requirement = found;
    }

    const template = await getOrCreateTemplate();
    const { terms, tokens } = buildTermsAndTokens(campaign, business, creator, proposedRate, timeline, requirement);
    const filledBody = renderTemplate(template.body, tokens);
    return { title: template.title, filledBody, terms };
  }

  // Called from campaign.service.ts's apply(), right after the Application row
  // is created — freezes the contract terms at proposal-submission time (the
  // creator's "I agree" checkbox tap is their e-signature; there's no separate
  // signature block in the document itself). Only called for PAID_CAMPAIGN
  // applications; the caller checks campaignType first.
  async createForApplication(params: {
    applicationId: string;
    campaign: Campaign;
    business: BusinessProfile;
    creator: Pick<CreatorProfile, 'id' | 'fullName'>;
    proposedRate: number;
    timeline: string;
    requirement?: RequirementForContract;
  }): Promise<Contract> {
    assertPaidCampaign(params.campaign.campaignType);
    const template = await getOrCreateTemplate();
    const { terms, tokens } = buildTermsAndTokens(params.campaign, params.business, params.creator, params.proposedRate, params.timeline, params.requirement);
    const filledBody = renderTemplate(template.body, tokens);

    return prisma.contract.create({
      data: {
        applicationId: params.applicationId,
        campaignId:    params.campaign.id,
        businessId:    params.business.id,
        creatorId:     params.creator.id,
        title:         template.title,
        filledBody,
        terms:         terms as object,
        status:        'PENDING_BUSINESS',
      },
    });
  }

  // Called from campaign.service.ts's updateApplicationStatus() when a business
  // accepts a proposal — completes the agreement (business's "I agree" checkbox
  // tap is their e-signature) and kicks off PDF generation. Returns null for
  // OPEN_EVENT applications (no contract row) and for applications created
  // before this feature existed.
  async signAsBusiness(applicationId: string, businessId: string): Promise<Contract | null> {
    const contract = await prisma.contract.findUnique({ where: { applicationId } });
    if (!contract) return null;
    if (contract.businessId !== businessId) {
      throw new AppError('You are not authorized to sign this contract', 403);
    }
    if (contract.status === 'EXECUTED') return contract;

    const updated = await prisma.contract.update({
      where: { id: contract.id },
      data: { businessAgreedAt: new Date(), status: 'EXECUTED' },
    });

    try {
      return await this.generatePdf(updated);
    } catch (err) {
      // The agreement itself is already binding — a PDF render/upload hiccup
      // shouldn't block acceptance. getPdfUrl() retries lazily on next download.
      logger.warn({ err: err instanceof Error ? err.message : err, contractId: contract.id }, 'Contract PDF generation failed after business signed');
      return updated;
    }
  }

  async getByApplicationId(applicationId: string, userId: string, role: Role) {
    let contract = await prisma.contract.findUnique({
      where: { applicationId },
      include: { creator: { select: { userId: true } }, business: { select: { userId: true } } },
    });

    if (!contract) {
      // Applications created before the contract feature existed (or a rare
      // failure mid-submission — see campaign.service.ts's apply()) have no
      // contract row. Lazily create one now from the application's own frozen
      // proposedRate/timeline rather than leaving the business permanently
      // unable to see an agreement to accept.
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          campaign: { include: { business: true } },
          creator: true,
          requirement: { select: { deliverables: true, description: true, format: true, deadline: true, category: { select: { name: true } } } },
        },
      });
      if (!application) throw new AppError('Application not found', 404);
      assertPaidCampaign(application.campaign.campaignType);

      const created = await this.createForApplication({
        applicationId,
        campaign:     application.campaign,
        business:     application.campaign.business,
        creator:      application.creator,
        proposedRate: application.proposedRate,
        timeline:     application.timeline,
        requirement:  application.requirement,
      });
      contract = {
        ...created,
        creator:  { userId: application.creator.userId },
        business: { userId: application.campaign.business.userId },
      };
    }

    assertParty(contract, userId, role);
    return contract;
  }

  async getPdfUrl(contractId: string, userId: string, role: Role): Promise<string> {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { creator: { select: { userId: true } }, business: { select: { userId: true } } },
    });
    if (!contract) throw new AppError('Contract not found', 404);
    assertParty(contract, userId, role);
    if (contract.pdfUrl) return contract.pdfUrl;
    const updated = await this.generatePdf(contract);
    return updated.pdfUrl!;
  }

  private async generatePdf(contract: Contract): Promise<Contract> {
    const buffer = await renderContractPdf(contract);
    const url = await uploadRawFile(buffer, 'contracts/pdfs', contract.id);
    return prisma.contract.update({ where: { id: contract.id }, data: { pdfUrl: url } });
  }

  async getTemplate() {
    return getOrCreateTemplate();
  }

  async updateTemplate(data: { title?: string; body?: string }) {
    await getOrCreateTemplate();
    return prisma.contractTemplate.update({ where: { campaignType: CONTRACT_CAMPAIGN_TYPE }, data });
  }
}

// ─── PDF rendering ──────────────────────────────────────────────────────────
// contract.filledBody is lightweight Markdown (## headers, **bold**, "* " bullet
// lines) — this renders that subset directly with pdfkit rather than pulling in
// a full Markdown-to-PDF dependency for a handful of constructs.

type PDFDoc = InstanceType<typeof PDFDocument>;

function writeInline(doc: PDFDoc, text: string): void {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((p) => p.length > 0);
  if (parts.length === 0) { doc.text(''); return; }
  parts.forEach((part, i) => {
    const isBold = part.startsWith('**') && part.endsWith('**');
    doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').text(isBold ? part.slice(2, -2) : part, { continued: i < parts.length - 1 });
  });
}

function renderMarkdownBody(doc: PDFDoc, body: string): void {
  const lines = body.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') { doc.moveDown(0.5); continue; }
    if (trimmed === '---') { doc.moveDown(0.3); continue; }
    if (trimmed.startsWith('## ')) {
      doc.moveDown(0.4);
      doc.fontSize(13).font('Helvetica-Bold').text(trimmed.slice(3));
      doc.fontSize(10);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      doc.moveDown(0.4);
      doc.fontSize(15).font('Helvetica-Bold').text(trimmed.slice(2));
      doc.fontSize(10);
      continue;
    }
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      doc.font('Helvetica').text('•  ', { continued: true });
      writeInline(doc, trimmed.slice(2));
      continue;
    }
    writeInline(doc, trimmed);
  }
}

function renderContractPdf(contract: Contract): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const terms = contract.terms as unknown as ContractTerms;

      doc.fontSize(18).font('Helvetica-Bold').text(contract.title, { align: 'center' });
      doc.moveDown(1.5);

      doc.fontSize(12).font('Helvetica-Bold').text('Terms Summary');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      const rows: [string, string][] = [
        ...(terms.role ? [['Role', terms.role] as [string, string]] : []),
        ['Price', terms.price],
        ['Deadline', fmtDate(terms.deadline)],
        ['Timeline', terms.timeline],
        ['Deliverables', terms.deliverables],
        ['Platforms', terms.platforms.join(', ') || 'N/A'],
      ];
      rows.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').text(`${label}: `, { continued: true }).font('Helvetica').text(value);
      });
      doc.moveDown(1.5);

      doc.fontSize(12).font('Helvetica-Bold').text('Agreement');
      doc.moveDown(0.5);
      doc.fontSize(10);
      renderMarkdownBody(doc, contract.filledBody);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export const contractService = new ContractService();
