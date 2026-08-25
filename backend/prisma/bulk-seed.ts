/**
 * Bulk data generator for local load testing — NOT part of the demo seed contract.
 * Unlike loadtest-seed.ts (which only adds campaigns to existing businesses),
 * this creates everything from scratch: creators, businesses, and events
 * (mixed paid campaigns / open events), distributed round-robin across
 * businesses so the event count can exceed the business count. Names, bios,
 * business names, and event copy are generated from word banks so the data
 * reads like real profiles rather than "Test #123" placeholders.
 *
 * Not idempotent — re-running adds a second batch of users rather than
 * upserting. Phones are always fresh (randomly generated per run), but emails
 * are name-derived (firstname.lastname@gmail.com, like a real signup) with no
 * run tag, so re-running without wiping the DB first risks email collisions
 * once name pools repeat. Pair with wipe-marketplace-data.ts when reseeding.
 *
 * Usage: npx tsx prisma/bulk-seed.ts [creators=1000] [businesses=creators] [events=businesses]
 */
import { PrismaClient, Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Twitter / X', 'LinkedIn'];
const CONTENT_TYPES = ['Reel / Short Video', 'Story', 'Static Post', 'Blog Article', 'Podcast Mention'];
const CITIES = ['Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur', 'Biratnagar', 'Butwal', 'Dharan', 'Nepalgunj', 'Hetauda', 'Itahari', 'Birgunj', 'Janakpur'];
const EVENT_BENEFITS = ['Free food & drinks', 'Free product / service', 'Event access', 'Gift hampers', 'Networking opportunities', 'Future collaboration'];
const NEPAL_MOBILE_PREFIXES = ['980', '981', '982', '984', '985', '986', '988'];

// Nepal's rough bounding box
const LAT_MIN = 26.3, LAT_MAX = 30.4;
const LNG_MIN = 80.0, LNG_MAX = 88.2;

// Real-looking placeholder photos — no Cloudinary upload needed, these are
// stable public URLs. pravatar gives real human headshots (70 available,
// cycled deterministically per row); picsum gives real stock photos keyed by
// seed so the same row always gets the same image on re-reads.
function avatarUrlFor(seedIndex: number): string {
  return `https://i.pravatar.cc/400?img=${(seedIndex % 70) + 1}`;
}
function logoUrlFor(businessId: string, name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=256&bold=true&format=png`;
}
function photoUrlFor(seed: string, w: number, h: number): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

function rand<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]!; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min: number, max: number) { return min + Math.random() * (max - min); }
function pickSubset<T>(arr: readonly T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
}

// firstname.lastname@gmail.com, the way a real signup reads. Shared across
// creators and businesses (both draw from the same User.email uniqueness),
// with a Gmail-style numeric suffix only on an actual repeat name.
function makeEmailFactory(domain: string) {
  const seen = new Map<string, number>();
  return (name: string): string => {
    const base = slugify(name);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return `${n === 1 ? base : `${base}${n}`}@${domain}`;
  };
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

// ── Names ────────────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Aarav', 'Aayush', 'Abin', 'Anish', 'Anmol', 'Arjun', 'Ashish', 'Ayan', 'Bibek', 'Bikash',
  'Dipesh', 'Gaurav', 'Kiran', 'Krishna', 'Manish', 'Nabin', 'Nischal', 'Prabin', 'Prakash', 'Rajan',
  'Rohan', 'Sagar', 'Sandip', 'Saurav', 'Sujan', 'Suman', 'Sunil', 'Yubraj', 'Aashma', 'Aastha',
  'Anjali', 'Anu', 'Bandana', 'Bibisha', 'Bipana', 'Diya', 'Ishika', 'Kabita', 'Kripa', 'Manisha',
  'Nisha', 'Prakriti', 'Priya', 'Puja', 'Riya', 'Sabina', 'Samjhana', 'Sarita', 'Shreya', 'Srijana',
  'Sujata', 'Sunita', 'Swastika', 'Alisha', 'Kritika', 'Nirjala', 'Pratikshya', 'Ritika', 'Samikshya', 'Yashaswi',
];
const LAST_NAMES = [
  'Sharma', 'Shrestha', 'Tamang', 'Gurung', 'Rai', 'Thapa', 'Magar', 'Karki', 'Adhikari', 'Bhattarai',
  'Poudel', 'Khadka', 'Basnet', 'Chhetri', 'Dahal', 'Giri', 'Joshi', 'KC', 'Lama', 'Limbu',
  'Maharjan', 'Malla', 'Neupane', 'Pandey', 'Pradhan', 'Rana', 'Regmi', 'Subedi', 'Acharya', 'Bista',
];

function fullName(): string { return `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`; }

const CREATOR_BIO_TEMPLATES = [
  (cat: string, city: string) => `${cat} content creator based in ${city}. Sharing authentic stories and reviews with a growing, engaged audience.`,
  (cat: string, city: string) => `Passionate about ${cat.toLowerCase()} — creating content from ${city} that resonates with a loyal community.`,
  (cat: string, city: string) => `${city}-based creator focused on ${cat.toLowerCase()}. Loves collaborating with brands on genuine, creative campaigns.`,
  (cat: string, city: string) => `Full-time ${cat.toLowerCase()} creator in ${city}, turning everyday moments into content people actually want to watch.`,
  (cat: string, city: string) => `Building a community around ${cat.toLowerCase()} from ${city}. Open to brand partnerships and collabs.`,
];

// ── Business names ───────────────────────────────────────────────────────────

// Keyword → business-noun bank, matched against whatever category names the
// admin has actually defined in the `categories` table (so this stays useful
// no matter how admin category names are worded), with a generic fallback.
const BUSINESS_NOUN_BANK: { keywords: string[]; nouns: string[] }[] = [
  { keywords: ['food', 'restaurant', 'cafe', 'coffee', 'drink', 'kitchen'], nouns: ['Kitchen', 'Bistro', 'Diner', 'Eatery', 'Food Co.', 'Cafe', 'Bakery'] },
  { keywords: ['travel', 'tour', 'adventure'], nouns: ['Treks', 'Travels', 'Expeditions', 'Journeys', 'Getaways', 'Tours'] },
  { keywords: ['fashion', 'apparel', 'cloth'], nouns: ['Apparel', 'Couture', 'Wardrobe', 'Threads', 'Boutique', 'Collective'] },
  { keywords: ['beauty', 'cosmetic', 'skincare'], nouns: ['Beauty Bar', 'Cosmetics', 'Salon', 'Glow Studio', 'Skincare Co.'] },
  { keywords: ['fitness', 'health', 'gym'], nouns: ['Fitness Studio', 'Gym', 'Wellness Club', 'Training Co.', 'Strength Lab'] },
  { keywords: ['gaming', 'game', 'esport'], nouns: ['Gaming House', 'Esports', 'Arcade', 'Gaming Lounge', 'Studios'] },
  { keywords: ['tech', 'gadget'], nouns: ['Technologies', 'Labs', 'Systems', 'Solutions', 'Innovations'] },
  { keywords: ['education', 'course', 'learn'], nouns: ['Academy', 'Learning Hub', 'Institute', 'Classes', 'Education Center'] },
  { keywords: ['home', 'living', 'furnish', 'estate'], nouns: ['Home Decor', 'Furnishings', 'Living Co.', 'Interiors', 'Home Studio'] },
  { keywords: ['wellness', 'mindful', 'meditat'], nouns: ['Wellness Center', 'Spa', 'Retreat', 'Healing Studio', 'Wellness Co.'] },
  { keywords: ['music'], nouns: ['Music Studio', 'Records', 'Sound House', 'Music Academy', 'Live Lounge'] },
  { keywords: ['art', 'design'], nouns: ['Design Studio', 'Art House', 'Gallery', 'Creative Studio', 'Design Co.'] },
  { keywords: ['pet'], nouns: ['Pet Care', 'Pet Store', 'Grooming Studio', 'Pet Clinic', 'Pet Co.'] },
  { keywords: ['parent', 'family', 'baby', 'kid'], nouns: ['Family Co.', 'Kids Studio', 'Parenting Hub', 'Family Center'] },
  { keywords: ['auto', 'car', 'motor'], nouns: ['Motors', 'Auto Garage', 'Auto Works', 'Car Studio', 'Auto Care'] },
  { keywords: ['finance', 'bank'], nouns: ['Finance Group', 'Capital', 'Advisory', 'Financial Services'] },
  { keywords: ['sustain', 'eco', 'green', 'recycle'], nouns: ['Eco Store', 'Sustainable Co.', 'Green Living', 'Eco Collective'] },
  { keywords: ['photo'], nouns: ['Photography Studio', 'Photo Co.', 'Studio', 'Lens House'] },
  { keywords: ['sport', 'athlet'], nouns: ['Sports Club', 'Sports Academy', 'Athletics Co.', 'Sports Arena'] },
  { keywords: ['film', 'tv', 'media', 'entertain'], nouns: ['Films', 'Studios', 'Productions', 'Media House'] },
  { keywords: ['retail', 'ecommerce', 'e-commerce', 'shop'], nouns: ['Retail Co.', 'Store', 'Marketplace', 'Shop'] },
  { keywords: ['event', 'hospitality', 'hotel'], nouns: ['Events House', 'Hospitality Group', 'Hotel', 'Resort'] },
  { keywords: ['healthcare', 'medical', 'clinic'], nouns: ['Clinic', 'Health Center', 'Medical Group'] },
];
const GENERIC_BUSINESS_NOUNS = ['Co.', 'Studio', 'Ventures', 'Group', 'Enterprises', 'Collective'];
const BUSINESS_PREFIXES = ['Himalayan', 'Everest', 'Golden', 'Royal', 'Urban', 'Namaste', 'Annapurna', 'Sagarmatha', 'Metro', 'Pashupati', 'Bagmati', 'Gandaki'];

function businessNounsFor(category: string): string[] {
  const lower = category.toLowerCase();
  const bank = BUSINESS_NOUN_BANK.find((b) => b.keywords.some((k) => lower.includes(k)));
  return bank?.nouns ?? GENERIC_BUSINESS_NOUNS;
}

function businessName(category: string): string {
  const nouns = businessNounsFor(category);
  const prefix = Math.random() < 0.5 ? rand(BUSINESS_PREFIXES) : rand(CITIES);
  return `${prefix} ${rand(nouns)}`;
}

const BUSINESS_DESC_TEMPLATES = [
  (name: string, cat: string, city: string) => `${name} is a ${cat.toLowerCase()} brand based in ${city}, partnering with creators to reach new audiences.`,
  (name: string, cat: string, city: string) => `Based in ${city}, ${name} specializes in ${cat.toLowerCase()} and loves working with local creators.`,
  (name: string, cat: string, city: string) => `${name} brings ${cat.toLowerCase()} to ${city} and beyond — always looking for creators to tell our story.`,
];

// ── Event copy ───────────────────────────────────────────────────────────────

// Generic per-category copy generator — works for any admin-defined category
// name rather than requiring an exact hardcoded lookup entry per category.
const OPEN_EVENT_TITLE_TEMPLATES = [
  (cat: string) => `Exclusive ${cat} Creator Night – Discover & Create`,
  (cat: string) => `${cat} Creator Experience – Explore & Document`,
  (cat: string) => `${cat} Creator Showcase – Exclusive Access`,
  (cat: string) => `${cat} Creator Invite – Experience & Create`,
  (cat: string) => `${cat} Creator Day – Content & Collaboration`,
];
const OPEN_EVENT_DESC_TEMPLATES = [
  (cat: string) => `An exclusive creator event centered on ${cat.toLowerCase()}, with complimentary access and a curated setting built for authentic content creation.`,
  (cat: string) => `Join us for a hands-on ${cat.toLowerCase()} experience — first access, expert support, and space designed for standout creator content.`,
  (cat: string) => `A behind-the-scenes ${cat.toLowerCase()} experience with complimentary access, built for creators who want to share something genuine with their audience.`,
];
function openEventCopy(category: string): { title: string; desc: string } {
  return {
    title: rand(OPEN_EVENT_TITLE_TEMPLATES)(category),
    desc: rand(OPEN_EVENT_DESC_TEMPLATES)(category),
  };
}

const PAID_CAMPAIGN_TITLE_TEMPLATES = [
  (brand: string, cat: string) => `${brand} ${cat} Collaboration`,
  (brand: string) => `${brand} Product Review Campaign`,
  (brand: string) => `Content Creation Partnership with ${brand}`,
  (brand: string) => `${brand} Brand Ambassador Campaign`,
  (brand: string, cat: string) => `Sponsored ${cat} Content: ${brand}`,
  (brand: string) => `${brand} Social Media Takeover`,
];
const PAID_CAMPAIGN_DESC_TEMPLATES = [
  (brand: string, cat: string) => `${brand} is looking for ${cat.toLowerCase()} creators to produce authentic content showcasing our products to their audience.`,
  (brand: string, cat: string) => `Partner with ${brand} on a ${cat.toLowerCase()} campaign — create engaging content and get paid for your reach and creativity.`,
  (brand: string) => `${brand} is running a paid collaboration for creators who want to build a genuine partnership with our brand.`,
];

async function main() {
  const creatorCount = parseInt(process.argv[2] ?? '1000', 10);
  const businessCount = parseInt(process.argv[3] ?? String(creatorCount), 10);
  const eventCount = parseInt(process.argv[4] ?? String(businessCount), 10);
  const emailFor = makeEmailFactory('gmail.com');

  // Categories are admin-owned (see backend/prisma/seeds/categories.ts and the
  // web admin's Categories page) — pull the live, active set instead of a
  // hardcoded taxonomy so seeded data always lines up with what the app shows.
  const dbCategories = await prisma.category.findMany({ where: { status: 'ACTIVE' } });
  const creatorCategories = dbCategories
    .filter((c) => c.scope === 'CREATOR' || c.scope === 'BOTH')
    .map((c) => c.name);
  const businessCategories = dbCategories
    .filter((c) => c.scope === 'BUSINESS' || c.scope === 'BOTH')
    .map((c) => c.name);
  if (creatorCategories.length === 0 || businessCategories.length === 0) {
    throw new Error('No active categories found — seed the categories table first (npx tsx prisma/seeds/categories.ts).');
  }

  console.log(`Bulk-seeding ${creatorCount} creators, ${businessCount} businesses, ${eventCount} events...`);
  console.log(`Using ${creatorCategories.length} creator-facing and ${businessCategories.length} business-facing categories from the database.`);

  const creatorPw  = await bcrypt.hash('Creator@123', 12);
  const businessPw = await bcrypt.hash('Business@123', 12);

  const usedPhones = new Set<string>();
  function uniquePhone(): string {
    let phone: string;
    do { phone = `+977${rand(NEPAL_MOBILE_PREFIXES)}${String(randInt(0, 9999999)).padStart(7, '0')}`; } while (usedPhones.has(phone));
    usedPhones.add(phone);
    return phone;
  }

  // ── Creators ──────────────────────────────────────────────────────────────
  console.log('Creating creator users...');
  const creatorNames = Array.from({ length: creatorCount }, () => fullName());
  const creatorUsers = creatorNames.map((name) => ({
    id: randomUUID(),
    email: emailFor(name),
    phone: uniquePhone(),
    password: creatorPw,
    role: Role.CREATOR,
    isEmailVerified: true,
    isOnboarded: true,
  }));
  await createManyChunked(prisma.user, creatorUsers);

  console.log('Creating creator profiles...');
  const creatorProfiles = creatorUsers.map((u, i) => {
    const hasCoords = Math.random() < 0.7;
    const city = rand(CITIES);
    const categories = pickSubset(creatorCategories, randInt(1, 3));
    return {
      id: randomUUID(),
      userId: u.id,
      fullName: creatorNames[i]!,
      bio: rand(CREATOR_BIO_TEMPLATES)(categories[0]!, city),
      avatarUrl: avatarUrlFor(i),
      coverImageUrl: photoUrlFor(`creator-cover-${u.id}`, 800, 400),
      location: hasCoords ? `${city}, Nepal` : null,
      locationLat: hasCoords ? randFloat(LAT_MIN, LAT_MAX) : null,
      locationLng: hasCoords ? randFloat(LNG_MIN, LNG_MAX) : null,
      categories,
      isVerified: Math.random() < 0.3,
      prefBudgetMin: randInt(0, 200),
      prefBudgetMax: randInt(500, 2000),
    };
  });
  await createManyChunked(prisma.creatorProfile, creatorProfiles);

  // ── Businesses ────────────────────────────────────────────────────────────
  console.log('Creating business users...');
  const businessCategoryPicks = Array.from({ length: businessCount }, () => rand(businessCategories));
  const businessNames = businessCategoryPicks.map((cat) => businessName(cat));
  const businessUsers = businessNames.map((name) => ({
    id: randomUUID(),
    email: emailFor(name),
    phone: uniquePhone(),
    password: businessPw,
    role: Role.BUSINESS,
    isEmailVerified: true,
    isOnboarded: true,
  }));
  await createManyChunked(prisma.user, businessUsers);

  console.log('Creating business profiles...');
  const businessProfiles = businessUsers.map((u, i) => {
    const hasCoords = Math.random() < 0.7;
    const city = rand(CITIES);
    const category = businessCategoryPicks[i]!;
    const name = businessNames[i]!;
    const id = randomUUID();
    return {
      id,
      userId: u.id,
      businessName: name,
      description: rand(BUSINESS_DESC_TEMPLATES)(name, category, city),
      logoUrl: logoUrlFor(id, name),
      coverImageUrl: photoUrlFor(`business-cover-${id}`, 800, 400),
      location: hasCoords ? `${city}, Nepal` : null,
      categories: pickSubset(businessCategories.filter((c) => c !== category), randInt(0, 1)).concat(category),
      isVerified: Math.random() < 0.3,
    };
  });
  await createManyChunked(prisma.businessProfile, businessProfiles);

  // ── Events — distributed round-robin across businesses (mixed paid
  //    campaign / open event), so eventCount can exceed businessCount ────────
  console.log('Creating events...');
  const campaigns = Array.from({ length: eventCount }, (_, i) => {
    const bizIdx = i % businessProfiles.length;
    const biz = businessProfiles[bizIdx]!;
    const isOpenEvent = Math.random() < 0.4;
    const category = businessCategoryPicks[bizIdx]!;
    const brand = biz.businessName!;
    const hasCoords = Math.random() < 0.7;
    const locationLat = hasCoords ? randFloat(LAT_MIN, LAT_MAX) : null;
    const locationLng = hasCoords ? randFloat(LNG_MIN, LNG_MAX) : null;
    const location = hasCoords ? `${rand(CITIES)}, Nepal` : null;
    const deadline = new Date(Date.now() + randInt(3, 60) * 86400000);

    const campaignId = randomUUID();
    const base = {
      id: campaignId,
      businessId: biz.id,
      category,
      platforms: pickSubset(PLATFORMS, randInt(1, 2)),
      deadline,
      location,
      locationLat,
      locationLng,
      status: 'ACTIVE' as const,
      isFeatured: Math.random() < 0.1,
      eventStatus: 'OPEN' as const,
      paymentStatus: 'UNPAID' as const,
      featureImageUrl: photoUrlFor(`campaign-${campaignId}`, 800, 600),
    };

    if (isOpenEvent) {
      const tpl = openEventCopy(category);
      return {
        ...base,
        title: tpl.title,
        description: tpl.desc,
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
      title: rand(PAID_CAMPAIGN_TITLE_TEMPLATES)(brand, category),
      description: rand(PAID_CAMPAIGN_DESC_TEMPLATES)(brand, category),
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
  console.log(`  Creators:   ${creatorCount}`);
  console.log(`  Businesses: ${businessCount}`);
  console.log(`  Events:     ${eventCount}  (${openCount} open events, ${eventCount - openCount} paid campaigns, across ${businessProfiles.length} businesses)`);
  console.log('  Seeded logins use password Creator@123 / Business@123 (emails are name-based, e.g. aarav.sharma@gmail.com)');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
