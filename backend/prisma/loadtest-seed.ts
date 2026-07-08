/**
 * Bulk data generator for local load testing — NOT part of the demo seed contract.
 * Adds a large volume of campaigns spread across existing businesses so we can
 * measure query performance at a realistic scale before it hits production.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = ['Food', 'Travel', 'Fashion', 'Beauty', 'Fitness', 'Tech', 'Lifestyle', 'Music', 'Education', 'Gaming'];
const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Facebook'];
const STATUSES: ('ACTIVE' | 'CLOSED' | 'PAUSED')[] = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'CLOSED', 'PAUSED'];

// Nepal's rough bounding box
const LAT_MIN = 26.3, LAT_MAX = 30.4;
const LNG_MIN = 80.0, LNG_MAX = 88.2;

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]!; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min: number, max: number) { return min + Math.random() * (max - min); }

async function main() {
  const count = parseInt(process.argv[2] ?? '2000', 10);
  const businesses = await prisma.businessProfile.findMany({ select: { id: true } });
  if (businesses.length === 0) {
    console.error('No businesses found — run the main seed first.');
    process.exit(1);
  }

  console.log(`Generating ${count} campaigns across ${businesses.length} businesses...`);
  const BATCH = 500;
  let created = 0;

  for (let batchStart = 0; batchStart < count; batchStart += BATCH) {
    const batchSize = Math.min(BATCH, count - batchStart);
    const data = Array.from({ length: batchSize }, (_, i) => {
      const idx = batchStart + i;
      const hasCoords = Math.random() < 0.7; // ~70% have coordinates, matching real-world mix
      return {
        businessId: rand(businesses).id,
        title: `Load Test Campaign #${idx}`,
        description: `Generated campaign ${idx} for load testing purposes.`,
        category: rand(CATEGORIES),
        goals: ['Brand Awareness'],
        platform: rand(PLATFORMS),
        minFollowers: randInt(1000, 50000),
        contentType: 'Reel / Short Video',
        deliverables: '2 Reel, 3 Story',
        deadline: new Date(Date.now() + randInt(1, 60) * 86400000),
        location: hasCoords ? 'Load Test Location' : null,
        locationLat: hasCoords ? randFloat(LAT_MIN, LAT_MAX) : null,
        locationLng: hasCoords ? randFloat(LNG_MIN, LNG_MAX) : null,
        budgetMin: randInt(2000, 10000),
        budgetMax: randInt(10000, 50000),
        paymentType: 'Fixed Fee',
        status: rand(STATUSES),
        isFeatured: Math.random() < 0.1,
        creatorsNeeded: randInt(1, 5),
        campaignType: 'PAID_CAMPAIGN' as const,
        benefits: [],
        eventStatus: 'OPEN' as const,
        paymentStatus: 'UNPAID' as const,
        contentGuidelines: [],
        targetAudience: [],
        hashtags: [],
        aiGenerated: false,
        aiSuggestedCategories: [],
        aiSuggestedPlatforms: [],
        aiNeedsInputFields: [],
      };
    });

    await prisma.campaign.createMany({ data });
    created += batchSize;
    console.log(`  ${created}/${count}`);
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
