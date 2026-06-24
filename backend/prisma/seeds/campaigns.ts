import { PrismaClient, CampaignStatus } from '@prisma/client';

type BusinessUser = { businessProfile: { id: string } | null };

const w = (n = 1) => new Date(Date.now() + n * 7 * 24 * 60 * 60 * 1000);

type CampaignDef = Parameters<PrismaClient['campaign']['create']>[0]['data'];

export async function seedCampaigns(
  prisma: PrismaClient,
  businesses: BusinessUser[],
) {
  const [momoHouse, himalayaBrew, dhakaThreads, newariKitchen,
         pokharaParadise, himalayanGlow, ktmMusicFest, technova] = businesses;

  const rows: CampaignDef[] = [];

  // ── Momo House ─────────────────────────────────────────────────────────────
  if (momoHouse.businessProfile) {
    const id = momoHouse.businessProfile.id;
    rows.push(
      { businessId: id, template: 'Food', title: 'Momo House — Authentic Taste, Real Stories', description: "Looking for passionate food creators to visit Momo House Kathmandu and share their authentic dining experience. Enjoy our 12 varieties of dumplings and create content that inspires your audience.", category: 'Food', goals: ['More Customers', 'Social Media Content'], platform: 'Instagram', minFollowers: 5000, contentType: 'Reel / Short Video', deliverables: '2 Reel, 3 Story, 2 Photo Post, 1 Mention in Caption, 1 Tag Business', deadline: w(3), location: 'Kathmandu, Nepal', budgetMin: 5000, budgetMax: 15000, paymentType: 'Fixed Fee', creatorsNeeded: 3, status: CampaignStatus.ACTIVE, isFeatured: true },
      { businessId: id, template: 'Food', title: 'Momo House New Branch — Lalitpur Grand Opening', description: "Opening our 4th branch in Lalitpur! Visit us on opening day, experience our full menu, and share your genuine experience with your audience.", category: 'Food', goals: ['Brand Awareness', 'Event Promotion'], platform: 'TikTok', minFollowers: 3000, contentType: 'Reel / Short Video', deliverables: '2 Reel, 5 Story, 1 Event Coverage Video, 1 Tag Business', deadline: w(2), location: 'Lalitpur, Nepal', budgetMin: 5000, budgetMax: 15000, paymentType: 'Fixed Fee', creatorsNeeded: 5, status: CampaignStatus.ACTIVE, isFeatured: false },
    );
  }

  // ── Himalaya Brew ──────────────────────────────────────────────────────────
  if (himalayaBrew.businessProfile) {
    const id = himalayaBrew.businessProfile.id;
    rows.push(
      { businessId: id, template: 'Food', title: 'Himalaya Brew — Where Coffee Meets the Mountains', description: "Inviting lifestyle and food creators to experience our single-origin Nepali coffee, cozy ambiance, and Himalayan-inspired menu.", category: 'Food', goals: ['Brand Awareness', 'Social Media Content'], platform: 'Instagram', minFollowers: 4000, contentType: 'Reel / Short Video', deliverables: '2 Reel, 2 Story, 3 Photo Post, 1 Carousel Post, 1 Mention in Caption', deadline: w(4), location: 'Thamel, Kathmandu', budgetMin: 5000, budgetMax: 15000, paymentType: 'Fixed Fee', creatorsNeeded: 2, status: CampaignStatus.ACTIVE, isFeatured: true },
      { businessId: id, template: 'Food', title: 'Himalaya Brew — Free Coffee for a Facebook Review', description: "Love coffee? Visit Himalaya Brew in Thamel, enjoy a complimentary drink, and share your honest experience on Facebook.", category: 'Food', goals: ['More Customers', 'User Generated Content'], platform: 'Facebook', minFollowers: 1000, contentType: 'Static Post', deliverables: '1 Facebook Post, 1 Story, 1 Google Review, 1 Tag Business', deadline: w(6), location: 'Thamel, Kathmandu', budgetMin: 0, budgetMax: 0, paymentType: 'Product Exchange', creatorsNeeded: 10, status: CampaignStatus.ACTIVE, isFeatured: false },
    );
  }

  // ── Dhaka Threads ──────────────────────────────────────────────────────────
  if (dhakaThreads.businessProfile) {
    const id = dhakaThreads.businessProfile.id;
    rows.push(
      { businessId: id, template: 'Fashion', title: 'Dhaka Threads — Wear Nepal, Share Nepal', description: "Looking for fashion creators to model our latest Dashain collection — traditional Dhaka weave reimagined for modern wardrobes.", category: 'Fashion', goals: ['Brand Awareness', 'Product Launch', 'Social Media Content'], platform: 'Instagram', minFollowers: 8000, contentType: 'Reel / Short Video', deliverables: '2 Reel, 3 Story, 2 Photo Post, 1 Carousel Post, 1 Mention in Caption, 1 Tag Business', deadline: w(5), location: 'Remote', budgetMin: 15000, budgetMax: 50000, paymentType: 'Fixed Fee', creatorsNeeded: 4, status: CampaignStatus.ACTIVE, isFeatured: true },
      { businessId: id, template: 'Fashion', title: 'Dhaka Threads — Student Style Challenge', description: "Show us how you style our Dhaka tote bag and kurta for campus life! Partnering with student creators to reach college audiences across Nepal.", category: 'Fashion', goals: ['More Customers', 'User Generated Content'], platform: 'TikTok', minFollowers: 2000, contentType: 'Reel / Short Video', deliverables: '1 Reel, 2 Story, 1 Photo Post, 1 Tag Business', deadline: w(3), location: 'Remote', budgetMin: 5000, budgetMax: 15000, paymentType: 'Fixed Fee', creatorsNeeded: 8, status: CampaignStatus.ACTIVE, isFeatured: false },
    );
  }

  // ── Newari Kitchen ─────────────────────────────────────────────────────────
  if (newariKitchen.businessProfile) {
    const id = newariKitchen.businessProfile.id;
    rows.push(
      { businessId: id, template: 'Food', title: 'Newari Kitchen — A Feast of Tradition', description: "Experience authentic Newari cuisine at our Bhaktapur restaurant. Looking for food creators to document the full Samay Baji experience.", category: 'Food', goals: ['Brand Awareness', 'More Customers'], platform: 'Instagram', minFollowers: 3000, contentType: 'Reel / Short Video', deliverables: '2 Reel, 3 Story, 1 Photo Post, 1 Visit Store, 1 Tag Business, 1 Google Review', deadline: w(4), location: 'Bhaktapur, Nepal', budgetMin: 5000, budgetMax: 15000, paymentType: 'Fixed Fee', creatorsNeeded: 3, status: CampaignStatus.ACTIVE, isFeatured: false },
    );
  }

  // ── Pokhara Paradise ───────────────────────────────────────────────────────
  if (pokharaParadise.businessProfile) {
    const id = pokharaParadise.businessProfile.id;
    rows.push(
      { businessId: id, template: 'Travel', title: 'Pokhara Paradise — Luxury Stay & Annapurna Views', description: "Partnering with travel creators for a complimentary 2-night stay. Capture your journey, showcase our infinity pool and mountain views.", category: 'Travel', goals: ['Brand Awareness', 'More Customers'], platform: 'Instagram', minFollowers: 15000, contentType: 'Reel / Short Video', deliverables: '2 Reel, 5 Story, 3 Photo Post, 1 Carousel Post, 1 Mention in Caption', deadline: w(6), location: 'Pokhara, Nepal', budgetMin: 15000, budgetMax: 50000, paymentType: 'Fixed Fee', creatorsNeeded: 2, status: CampaignStatus.ACTIVE, isFeatured: true },
      { businessId: id, template: 'Travel', title: 'Pokhara Paradise — Weekend Couples Retreat Vlog', description: "Promote our romantic weekend package — sunset paragliding, candlelit dinner, and spa. Looking for YouTube travel vloggers.", category: 'Travel', goals: ['Brand Awareness', 'Social Media Content'], platform: 'YouTube', minFollowers: 10000, contentType: 'Blog Article', deliverables: '1 Full Vlog, 2 YouTube Shorts, 1 Community Post', deadline: w(5), location: 'Pokhara, Nepal', budgetMin: 15000, budgetMax: 50000, paymentType: 'Fixed Fee', creatorsNeeded: 2, status: CampaignStatus.ACTIVE, isFeatured: false },
      { businessId: id, template: 'Travel', title: 'Pokhara Paradise — Facebook Community Campaign', description: "Reach our core audience on Facebook! Share photos and experiences targeting families and couples aged 30–50.", category: 'Travel', goals: ['More Customers', 'Brand Awareness'], platform: 'Facebook', minFollowers: 5000, contentType: 'Static Post', deliverables: '2 Facebook Posts, 3 Stories, 1 Photo Album, 1 Tag Business', deadline: w(4), location: 'Pokhara, Nepal', budgetMin: 5000, budgetMax: 15000, paymentType: 'Fixed Fee', creatorsNeeded: 3, status: CampaignStatus.ACTIVE, isFeatured: false },
    );
  }

  // ── Himalayan Glow ─────────────────────────────────────────────────────────
  if (himalayanGlow.businessProfile) {
    const id = himalayanGlow.businessProfile.id;
    rows.push(
      { businessId: id, template: 'Beauty', title: 'Himalayan Glow — 30-Day Turmeric Serum Challenge', description: "Document your skin transformation using our Himalayan Turmeric Glow Serum for 30 days. Authentic before/after content for South Asian skin tones.", category: 'Beauty', goals: ['Product Launch', 'User Generated Content', 'Brand Awareness'], platform: 'Instagram', minFollowers: 6000, contentType: 'Reel / Short Video', deliverables: '2 Reel, 4 Story, 2 Photo Post, 1 Product Review Video, 1 Mention in Caption', deadline: w(8), location: 'Remote', budgetMin: 15000, budgetMax: 50000, paymentType: 'Fixed Fee', creatorsNeeded: 5, status: CampaignStatus.ACTIVE, isFeatured: true },
      { businessId: id, template: 'Beauty', title: 'Himalayan Glow — Yak Butter Lip Balm Launch', description: "Our new Yak Butter Lip Balm is here — 100% natural, deeply nourishing, perfect for Nepal's dry climate. Gifting the product for honest reviews.", category: 'Beauty', goals: ['Product Launch', 'Social Media Content'], platform: 'TikTok', minFollowers: 2000, contentType: 'Reel / Short Video', deliverables: '1 Reel, 2 Story, 1 Product Review Video, 1 Tag Business', deadline: w(4), location: 'Remote', budgetMin: 0, budgetMax: 0, paymentType: 'Product Exchange', creatorsNeeded: 15, status: CampaignStatus.ACTIVE, isFeatured: false },
    );
  }

  // ── KTM Music Fest ─────────────────────────────────────────────────────────
  if (ktmMusicFest.businessProfile) {
    const id = ktmMusicFest.businessProfile.id;
    rows.push(
      { businessId: id, template: 'Entertainment', title: 'KTM Music Fest 2026 — Coverage Creators Wanted', description: "Nepal's biggest music festival is back! Capture performances, backstage moments, and the festival vibe. Complimentary VIP passes provided.", category: 'Entertainment', goals: ['Event Promotion', 'Brand Awareness', 'Social Media Content'], platform: 'Instagram', minFollowers: 10000, contentType: 'Reel / Short Video', deliverables: '3 Reel, 8 Story, 2 Photo Post, 1 Event Coverage Video, 1 Carousel Post', deadline: w(3), location: 'Tundikhel, Kathmandu', budgetMin: 15000, budgetMax: 50000, paymentType: 'Fixed Fee', creatorsNeeded: 6, status: CampaignStatus.ACTIVE, isFeatured: true },
      { businessId: id, template: 'Entertainment', title: 'KTM Music Fest — Pre-Event Hype Campaign', description: "Help us build hype for KTM Music Fest 2026! Share the lineup, create countdown content. Free entry tickets for selected creators.", category: 'Entertainment', goals: ['Event Promotion', 'More Customers'], platform: 'TikTok', minFollowers: 5000, contentType: 'Reel / Short Video', deliverables: '2 Reel, 5 Story, 1 Mention in Caption, 1 Tag Business', deadline: w(2), location: 'Remote', budgetMin: 5000, budgetMax: 15000, paymentType: 'Fixed Fee', creatorsNeeded: 10, status: CampaignStatus.ACTIVE, isFeatured: false },
      { businessId: id, template: 'Entertainment', title: 'KTM Music Fest — YouTube Documentary Series', description: "Produce a mini-documentary series around KTM Music Fest 2026 — artist interviews, behind-the-scenes, and crowd stories. Full access provided.", category: 'Entertainment', goals: ['Brand Awareness', 'Social Media Content'], platform: 'YouTube', minFollowers: 20000, contentType: 'Blog Article', deliverables: '3 YouTube Videos (10+ min each), 5 YouTube Shorts, 1 Community Post', deadline: w(4), location: 'Tundikhel, Kathmandu', budgetMin: 15000, budgetMax: 50000, paymentType: 'Fixed Fee', creatorsNeeded: 2, status: CampaignStatus.ACTIVE, isFeatured: false },
      { businessId: id, template: 'Entertainment', title: 'KTM Music Fest — Facebook Event Promotion', description: "Help spread the word on Facebook! Create buzz by sharing posts and engaging with Nepal's biggest Facebook music community.", category: 'Entertainment', goals: ['Event Promotion', 'More Customers'], platform: 'Facebook', minFollowers: 3000, contentType: 'Static Post', deliverables: '3 Facebook Posts, 2 Event Shares, 1 Facebook Live (optional)', deadline: w(2), location: 'Remote', budgetMin: 5000, budgetMax: 15000, paymentType: 'Fixed Fee', creatorsNeeded: 8, status: CampaignStatus.ACTIVE, isFeatured: false },
    );
  }

  // ── TechNova ───────────────────────────────────────────────────────────────
  if (technova.businessProfile) {
    const id = technova.businessProfile.id;
    rows.push(
      { businessId: id, template: 'Tech', title: 'TechNova X15 Pro — Honest Unboxing & Review', description: "Launching TechNova X15 Pro — Nepal's most powerful mid-range smartphone at Rs. 45,000. Need tech creators for an honest unboxing and in-depth review.", category: 'Tech', goals: ['Product Launch', 'Brand Awareness'], platform: 'YouTube', minFollowers: 10000, contentType: 'Blog Article', deliverables: '1 Full Review Video, 2 YouTube Shorts, 1 Community Post', deadline: w(4), location: 'Kathmandu, Nepal', budgetMin: 15000, budgetMax: 50000, paymentType: 'Fixed Fee', creatorsNeeded: 3, status: CampaignStatus.ACTIVE, isFeatured: true },
      { businessId: id, template: 'Tech', title: 'TechNova — Instagram Tech Tips Series', description: "Create engaging Instagram tech tip content featuring TechNova products. Short reels showing features that matter to everyday Nepali users.", category: 'Tech', goals: ['Brand Awareness', 'Social Media Content'], platform: 'Instagram', minFollowers: 8000, contentType: 'Reel / Short Video', deliverables: '3 Reels, 5 Stories, 2 Carousel Posts, 1 Tag Business', deadline: w(3), location: 'Remote', budgetMin: 10000, budgetMax: 30000, paymentType: 'Fixed Fee', creatorsNeeded: 4, status: CampaignStatus.ACTIVE, isFeatured: false },
      { businessId: id, template: 'Tech', title: 'TechNova — Facebook Tech Community Reviews', description: "Reach Nepal's massive Facebook audience with detailed product reviews. We want Facebook creators to share genuine TechNova product experiences.", category: 'Tech', goals: ['More Customers', 'Brand Awareness'], platform: 'Facebook', minFollowers: 5000, contentType: 'Static Post', deliverables: '2 Facebook Posts, 1 Video Review, 1 Product Comparison Post', deadline: w(5), location: 'Kathmandu, Nepal', budgetMin: 8000, budgetMax: 20000, paymentType: 'Fixed Fee', creatorsNeeded: 5, status: CampaignStatus.ACTIVE, isFeatured: false },
    );
  }

  await Promise.all(rows.map((data) => prisma.campaign.create({ data })));
  const count = await prisma.campaign.count();
  console.log(`  ✅ Campaigns: ${count} created`);
}
