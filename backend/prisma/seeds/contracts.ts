import { PrismaClient } from '@prisma/client';
import { DEFAULT_TEMPLATE } from '../../src/modules/contract/contract.service';

// Contracts only apply to paid campaigns — a free/open event has no
// price/deliverable-for-payment exchange to put under agreement.
const CAMPAIGN_TYPE = 'PAID_CAMPAIGN' as const;

// Seeds the default Creator Collaboration Agreement text (with {{token}}
// placeholders — see contract.service.ts's TOKENS) so the contract feature
// works out of the box. `update: {}` deliberately never overwrites an
// existing row — once an admin has customized the template via the web
// dashboard (/contracts), re-running this seed must not clobber their edits.
export async function seedContracts(prisma: PrismaClient) {
  await prisma.contractTemplate.upsert({
    where:  { campaignType: CAMPAIGN_TYPE },
    update: {},
    create: {
      campaignType: CAMPAIGN_TYPE,
      title: DEFAULT_TEMPLATE.title,
      body:  DEFAULT_TEMPLATE.body,
    },
  });
  console.log('  ✅ Contract templates: Paid Campaign default seeded');
}
