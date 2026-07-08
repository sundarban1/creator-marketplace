/**
 * Bulk data generator for local load testing — NOT part of the demo seed contract.
 * Unlike loadtest-seed.ts (which only adds campaigns to existing businesses),
 * this creates everything from scratch: N creators, N businesses, and N events
 * (one per business, mixed paid campaigns / open events) so every event belongs
 * to a distinct brand. Names, bios, business names, and event copy are generated
 * from word banks so the data reads like real profiles rather than "Test #123"
 * placeholders.
 *
 * Not idempotent — re-running with the same count creates a second batch of
 * users with fresh emails/phones (a per-run tag is embedded in both), so it's
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
] as const;
type Category = typeof CATEGORIES[number];

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Twitter / X', 'LinkedIn'];
const CONTENT_TYPES = ['Reel / Short Video', 'Story', 'Static Post', 'Blog Article', 'Podcast Mention'];
const CITIES = ['Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur', 'Biratnagar', 'Butwal', 'Dharan', 'Nepalgunj', 'Hetauda', 'Itahari', 'Birgunj', 'Janakpur'];
const EVENT_BENEFITS = ['Free food & drinks', 'Free product / service', 'Event access', 'Gift hampers', 'Networking opportunities', 'Future collaboration'];
const NEPAL_MOBILE_PREFIXES = ['980', '981', '982', '984', '985', '986', '988'];

// Nepal's rough bounding box
const LAT_MIN = 26.3, LAT_MAX = 30.4;
const LNG_MIN = 80.0, LNG_MAX = 88.2;

function rand<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]!; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min: number, max: number) { return min + Math.random() * (max - min); }
function pickSubset<T>(arr: readonly T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
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

const BUSINESS_NOUNS: Record<Category, string[]> = {
  Food: ['Kitchen', 'Bistro', 'Diner', 'Eatery', 'Food Co.', 'Kitchenette'],
  Travel: ['Treks', 'Travels', 'Expeditions', 'Journeys', 'Getaways', 'Tours'],
  Fashion: ['Apparel', 'Couture', 'Wardrobe', 'Threads', 'Boutique', 'Collective'],
  Beauty: ['Beauty Bar', 'Cosmetics', 'Salon', 'Glow Studio', 'Skincare Co.'],
  Fitness: ['Fitness Studio', 'Gym', 'Wellness Club', 'Training Co.', 'Strength Lab'],
  Gaming: ['Gaming House', 'Esports', 'Arcade', 'Gaming Lounge', 'Studios'],
  Tech: ['Technologies', 'Labs', 'Systems', 'Solutions', 'Innovations'],
  Education: ['Academy', 'Learning Hub', 'Institute', 'Classes', 'Education Center'],
  Lifestyle: ['Lifestyle Co.', 'Living', 'Collective', 'Studio', 'House'],
  'Home & Living': ['Home Decor', 'Furnishings', 'Living Co.', 'Interiors', 'Home Studio'],
  Wellness: ['Wellness Center', 'Spa', 'Retreat', 'Healing Studio', 'Wellness Co.'],
  Music: ['Music Studio', 'Records', 'Sound House', 'Music Academy', 'Live Lounge'],
  'Art & Design': ['Design Studio', 'Art House', 'Gallery', 'Creative Studio', 'Design Co.'],
  Pets: ['Pet Care', 'Pet Store', 'Grooming Studio', 'Pet Clinic', 'Pet Co.'],
  Parenting: ['Family Co.', 'Kids Studio', 'Parenting Hub', 'Family Center'],
  Automotive: ['Motors', 'Auto Garage', 'Auto Works', 'Car Studio', 'Auto Care'],
  Finance: ['Finance Group', 'Capital', 'Advisory', 'Financial Services'],
  Sustainability: ['Eco Store', 'Sustainable Co.', 'Green Living', 'Eco Collective'],
  Photography: ['Photography Studio', 'Photo Co.', 'Studio', 'Lens House'],
  Sports: ['Sports Club', 'Sports Academy', 'Athletics Co.', 'Sports Arena'],
  'Film & TV': ['Films', 'Studios', 'Productions', 'Media House'],
  Mindfulness: ['Meditation Studio', 'Mindfulness Co.', 'Retreat Center'],
  'Food & Drink': ['Cafe', 'Coffee House', 'Brewery', 'Juice Bar', 'Bakery'],
  Entertainment: ['Entertainment Co.', 'Events House', 'Productions', 'Live Co.'],
};
const BUSINESS_PREFIXES = ['Himalayan', 'Everest', 'Golden', 'Royal', 'Urban', 'Namaste', 'Annapurna', 'Sagarmatha', 'Metro', 'Pashupati', 'Bagmati', 'Gandaki'];

function businessName(category: Category): string {
  const nouns = BUSINESS_NOUNS[category];
  const prefix = Math.random() < 0.5 ? rand(BUSINESS_PREFIXES) : rand(CITIES);
  return `${prefix} ${rand(nouns)}`;
}

const BUSINESS_DESC_TEMPLATES = [
  (name: string, cat: string, city: string) => `${name} is a ${cat.toLowerCase()} brand based in ${city}, partnering with creators to reach new audiences.`,
  (name: string, cat: string, city: string) => `Based in ${city}, ${name} specializes in ${cat.toLowerCase()} and loves working with local creators.`,
  (name: string, cat: string, city: string) => `${name} brings ${cat.toLowerCase()} to ${city} and beyond — always looking for creators to tell our story.`,
];

// ── Event copy ───────────────────────────────────────────────────────────────

const OPEN_EVENT_TEMPLATES: Record<Category, { title: string; desc: string }> = {
  Food:            { title: 'Exclusive Food Creator Night – Dine, Discover & Create', desc: 'An exclusive creator night featuring our signature dishes, a meet-the-chef session, and a curated menu built for content creation.' },
  Travel:          { title: 'Travel Creator Experience – Explore & Document', desc: 'Join us for a curated travel experience with complimentary access and the freedom to document an authentic journey.' },
  Fashion:         { title: 'Fashion Creator Showcase – Style Night', desc: 'First access to our latest collection, professional styling support, and a curated backdrop for standout fashion content.' },
  Beauty:          { title: 'Beauty Creator Event – Glow, Create & Connect', desc: 'Complimentary treatments, live product demos, and a beautiful space to create authentic beauty content.' },
  Fitness:         { title: 'Fitness Creator Invite – Train, Create & Inspire', desc: 'A complimentary workout session, facility tour, and content day for fitness creators.' },
  Gaming:          { title: 'Gaming Creator Night – Play, Review & Create', desc: 'Early access to our latest games and setup, with space to create honest gameplay content.' },
  Tech:            { title: 'Tech Creator Showcase – Experience & Review', desc: 'Hands-on access to our newest products before public launch, with space to create in-depth review content.' },
  Education:       { title: 'Education Creator Event – Learn, Explore & Share', desc: 'A live session and behind-the-scenes access designed for creators who inspire their audience to learn.' },
  Lifestyle:       { title: 'Lifestyle Creator Invite – Experience & Create', desc: 'An exclusive lifestyle brand experience in a setting designed for beautiful, authentic content.' },
  'Home & Living': { title: 'Home Creator Experience – Style, Shoot & Share', desc: 'Explore our collection in a styled setting with expert tips for stunning home content.' },
  Wellness:        { title: 'Wellness Creator Retreat – Relax, Restore & Create', desc: 'Complimentary treatments and sessions in a serene setting perfect for well-being content.' },
  Music:           { title: 'Music Creator Event – Live, Exclusive & Immersive', desc: 'Live performances and backstage access for creators who love sharing immersive audio-visual moments.' },
  'Art & Design':  { title: 'Art Creator Experience – Create, Collaborate & Showcase', desc: 'Meet our artists and explore a space built for visual storytelling.' },
  Pets:            { title: 'Pet Creator Day – Fun, Play & Create', desc: 'Bring your furry friends for a pet-friendly creator day full of content opportunities.' },
  Parenting:       { title: 'Family Creator Event – Fun Day for Parents & Kids', desc: 'Family-friendly activities and an authentic setting for parenting content.' },
  Automotive:      { title: 'Auto Creator Drive Day – Experience & Review', desc: 'A test drive, facility tour, and content day to experience performance and design firsthand.' },
  Finance:         { title: 'Finance Creator Workshop – Learn, Experience & Share', desc: 'Expert insights and hands-on tools for creators making financial content that helps their audience.' },
  Sustainability:  { title: 'Eco Creator Event – Sustainable, Beautiful & Impactful', desc: 'Explore our sustainability initiatives and create content that inspires conscious choices.' },
  Photography:     { title: 'Photography Creator Shoot – Exclusive Access & Collaboration', desc: 'Stunning locations and expert guidance to create breathtaking visual content.' },
  Sports:          { title: 'Sports Creator Day – Play, Train & Create', desc: 'Experience our facility and equipment firsthand for high-energy sports content.' },
  'Film & TV':     { title: 'Entertainment Creator Premiere – Exclusive & Immersive', desc: 'Early access and behind-the-scenes moments to build anticipation with your audience.' },
  Mindfulness:     { title: 'Mindfulness Creator Experience – Find Peace, Create Content', desc: 'A calming retreat setting perfect for well-being focused content.' },
  'Food & Drink':  { title: 'Food & Drink Creator Night – Taste, Experience & Create', desc: 'Curated tastings and a behind-the-scenes look at the flavors, for beautiful food & drink content.' },
  Entertainment:   { title: 'Entertainment Creator Event – Live, Exclusive & Unforgettable', desc: 'An immersive live event experience designed for creators who capture energy and excitement.' },
};

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
  const N = parseInt(process.argv[2] ?? '1000', 10);
  const runTag = Date.now();
  console.log(`Bulk-seeding ${N} creators, ${N} businesses, ${N} events (run ${runTag})...`);

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
  const creatorNames = Array.from({ length: N }, () => fullName());
  const creatorUsers = creatorNames.map((name, i) => ({
    id: randomUUID(),
    email: `${slugify(name)}.${runTag}.${i}@example.com`,
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
    const categories = pickSubset(CATEGORIES, randInt(1, 3));
    return {
      id: randomUUID(),
      userId: u.id,
      fullName: creatorNames[i]!,
      bio: rand(CREATOR_BIO_TEMPLATES)(categories[0]!, city),
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
  const businessCategoryPicks = Array.from({ length: N }, () => rand(CATEGORIES));
  const businessNames = businessCategoryPicks.map((cat) => businessName(cat));
  const businessUsers = businessNames.map((name, i) => ({
    id: randomUUID(),
    email: `${slugify(name)}.${runTag}.${i}@example.com`,
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
    return {
      id: randomUUID(),
      userId: u.id,
      businessName: name,
      description: rand(BUSINESS_DESC_TEMPLATES)(name, category, city),
      location: hasCoords ? `${city}, Nepal` : null,
      categories: pickSubset(CATEGORIES.filter((c) => c !== category), randInt(0, 1)).concat(category),
      isVerified: Math.random() < 0.3,
    };
  });
  await createManyChunked(prisma.businessProfile, businessProfiles);

  // ── Events — one per business (mixed paid campaign / open event), so all N
  //    events are posted by N distinct brands ─────────────────────────────────
  console.log('Creating events...');
  const campaigns = businessProfiles.map((biz, i) => {
    const isOpenEvent = Math.random() < 0.4;
    const category = businessCategoryPicks[i]!;
    const brand = biz.businessName!;
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
      const tpl = OPEN_EVENT_TEMPLATES[category];
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
  console.log(`  Creators:   ${N}`);
  console.log(`  Businesses: ${N}`);
  console.log(`  Events:     ${N}  (${openCount} open events, ${N - openCount} paid campaigns — one per business)`);
  console.log('  Seeded logins use password Creator@123 / Business@123 (emails are name-based, e.g. aarav.sharma.<run>.<n>@example.com)');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
