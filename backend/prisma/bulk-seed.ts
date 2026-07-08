/**
 * Bulk data generator for local load testing — NOT part of the demo seed contract.
 * Unlike loadtest-seed.ts (which only adds campaigns to existing businesses),
 * this creates everything from scratch: N creators, N businesses, and N events
 * (one per business, mixed paid campaigns / open events) so every event belongs
 * to a distinct brand.
 *
 * Not idempotent — re-running with the same count creates a second batch of
 * users with fresh emails/phones (the loop index is embedded in both), so it's
 * safe to re-run, it just adds more rows rather than upserting.
 *
 * Usage: npx tsx prisma/bulk-seed.ts [count=1000]
 */
import { PrismaClient, Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Matches CREATOR_CATEGORIES in mobile/src/features/creator/data/filterOptions.ts —
// the taxonomy the app actually falls back to while the `categories` table is empty.
const CATEGORIES = [
  'Food', 'Travel', 'Fashion', 'Beauty', 'Fitness', 'Gaming', 'Tech', 'Education', 'Lifestyle',
  'Home & Living', 'Wellness', 'Music', 'Art & Design', 'Pets', 'Parenting', 'Automotive',
  'Finance', 'Sustainability', 'Photography', 'Sports', 'Film & TV', 'Mindfulness', 'Food & Drink', 'Entertainment',
];
const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Twitter / X', 'LinkedIn'];
const CONTENT_TYPES = ['Reel / Short Video', 'Story', 'Static Post', 'Blog Article', 'Podcast Mention'];
const CITIES = ['Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur', 'Biratnagar', 'Butwal', 'Dharan', 'Nepalgunj', 'Hetauda', 'Itahari', 'Birgunj', 'Janakpur'];
const EVENT_BENEFITS = ['Free food & drinks', 'Free product / service', 'Event access', 'Gift hampers', 'Networking opportunities', 'Future collaboration'];

// Nepal's rough bounding box
const LAT_MIN = 26.3, LAT_MAX = 30.4;
const LNG_MIN = 80.0, LNG_MAX = 88.2;

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]!; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min: number, max: number) { return min + Math.random() * (max - min); }
function pickSubset<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

async function createManyChunked<T extends Record<string, unknown>>(
  model: { createMany: (args: { data: T[] }) => Promise<unknown> },
  rows: T[],
  chunkSize = 500,
) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    await model.createMany({ data: rows.slice(i, i + chunkSize) });
  }
}

async function main() {
  const N = parseInt(process.argv[2] ?? '1000', 10);
  const runTag = Date.now(); // keeps emails/phones unique across repeated runs
  console.log(`Bulk-seeding ${N} creators, ${N} businesses, ${N} events (run ${runTag})...`);

  const creatorPw  = await bcrypt.hash('Creator@123', 12);
  const businessPw = await bcrypt.hash('Business@123', 12);

  // ── Creators ──────────────────────────────────────────────────────────────
  console.log('Creating creator users...');
  const creatorUsers = Array.from({ length: N }, (_, i) => ({
    id: randomUUID(),
    email: `loadtest.creator${runTag}.${i}@example.com`,
    phone: `+97798${runTag % 100000}1${String(i).padStart(6, '0')}`,
    password: creatorPw,
    role: Role.CREATOR,
    isEmailVerified: true,
    isOnboarded: true,
  }));
  await createManyChunked(prisma.user, creatorUsers);

  console.log('Creating creator profiles...');
  const creatorProfiles = creatorUsers.map((u, i) => {
    const hasCoords = Math.random() < 0.7;
    return {
      id: randomUUID(),
      userId: u.id,
      fullName: `Load Test Creator ${i}`,
      bio: `Seeded creator profile #${i} for load testing.`,
      location: hasCoords ? `${rand(CITIES)}, Nepal` : null,
      locationLat: hasCoords ? randFloat(LAT_MIN, LAT_MAX) : null,
      locationLng: hasCoords ? randFloat(LNG_MIN, LNG_MAX) : null,
      categories: pickSubset(CATEGORIES, randInt(1, 3)),
      isVerified: Math.random() < 0.3,
      prefBudgetMin: randInt(0, 200),
      prefBudgetMax: randInt(500, 2000),
    };
  });
  await createManyChunked(prisma.creatorProfile, creatorProfiles);

  // ── Businesses ────────────────────────────────────────────────────────────
  console.log('Creating business users...');
  const businessUsers = Array.from({ length: N }, (_, i) => ({
    id: randomUUID(),
    email: `loadtest.business${runTag}.${i}@example.com`,
    phone: `+97798${runTag % 100000}2${String(i).padStart(6, '0')}`,
    password: businessPw,
    role: Role.BUSINESS,
    isEmailVerified: true,
    isOnboarded: true,
  }));
  await createManyChunked(prisma.user, businessUsers);

  console.log('Creating business profiles...');
  const businessProfiles = businessUsers.map((u, i) => {
    const hasCoords = Math.random() < 0.7;
    return {
      id: randomUUID(),
      userId: u.id,
      businessName: `Load Test Business ${i}`,
      description: `Seeded business profile #${i} for load testing.`,
      location: hasCoords ? `${rand(CITIES)}, Nepal` : null,
      categories: pickSubset(CATEGORIES, randInt(1, 2)),
      isVerified: Math.random() < 0.3,
    };
  });
  await createManyChunked(prisma.businessProfile, businessProfiles);

  // ── Events — one per business (mixed paid campaign / open event), so all N
  //    events are posted by N distinct brands ─────────────────────────────────
  console.log('Creating events...');
  const campaigns = businessProfiles.map((biz, i) => {
    const isOpenEvent = Math.random() < 0.4;
    const category = rand(CATEGORIES);
    const hasCoords = Math.random() < 0.7;
    const locationLat = hasCoords ? randFloat(LAT_MIN, LAT_MAX) : null;
    const locationLng = hasCoords ? randFloat(LNG_MIN, LNG_MAX) : null;
    const location = hasCoords ? `${rand(CITIES)}, Nepal` : null;
    const deadline = new Date(Date.now() + randInt(3, 60) * 86400000);

    const base = {
      id: randomUUID(),
      businessId: biz.id,
      category,
      platform: rand(PLATFORMS),
      deadline,
      location,
      locationLat,
      locationLng,
      status: 'ACTIVE' as const,
      isFeatured: Math.random() < 0.1,
      eventStatus: 'OPEN' as const,
      paymentStatus: 'UNPAID' as const,
    };

    if (isOpenEvent) {
      return {
        ...base,
        title: `Load Test Open Event ${i}`,
        description: `Seeded open event #${i} for load testing.`,
        goals: ['Event Promotion', 'Brand Awareness'],
        minFollowers: 0,
        contentType: 'Event Coverage',
        deliverables: rand(EVENT_BENEFITS),
        budgetMin: 0,
        budgetMax: 0,
        paymentType: 'Non-monetary',
        campaignType: 'OPEN_EVENT' as const,
        capacity: randInt(10, 200),
        eventDate: new Date(deadline.getTime() + randInt(2, 14) * 86400000),
        venue: location ?? 'Venue TBD',
        benefits: pickSubset(EVENT_BENEFITS, randInt(1, 3)),
        creatorsNeeded: randInt(5, 50),
      };
    }

    return {
      ...base,
      title: `Load Test Paid Campaign ${i}`,
      description: `Seeded paid campaign #${i} for load testing.`,
      goals: ['Brand Awareness'],
      minFollowers: randInt(1000, 50000),
      contentType: rand(CONTENT_TYPES),
      deliverables: '2 Reel, 3 Story',
      budgetMin: randInt(2000, 10000),
      budgetMax: randInt(10000, 50000),
      paymentType: 'Fixed Fee',
      campaignType: 'PAID_CAMPAIGN' as const,
      creatorsNeeded: randInt(1, 5),
      benefits: [],
    };
  });
  await createManyChunked(prisma.campaign, campaigns);

  const openCount = campaigns.filter((c) => c.campaignType === 'OPEN_EVENT').length;
  console.log('\nDone.');
  console.log(`  Creators:   ${N}`);
  console.log(`  Businesses: ${N}`);
  console.log(`  Events:     ${N}  (${openCount} open events, ${N - openCount} paid campaigns — one per business)`);
  console.log('  Seeded creator logins:  loadtest.creator<run>.<n>@example.com  /  Creator@123');
  console.log('  Seeded business logins: loadtest.business<run>.<n>@example.com /  Business@123');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
