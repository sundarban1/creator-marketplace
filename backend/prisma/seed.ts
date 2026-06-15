import { PrismaClient, Role, CampaignStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  const adminPw   = await bcrypt.hash('Admin@123456', 12);
  const creatorPw = await bcrypt.hash('Creator@123', 12);
  const bizPw     = await bcrypt.hash('Business@123', 12);

  // ── Admin users ─────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@creatorhub.com' },
    update: {},
    create: {
      email: 'admin@creatorhub.com',
      phone: '+9779800000001',
      password: adminPw,
      role: Role.ADMIN,
      isEmailVerified: true,
      isOnboarded: true,
    },
  });
  console.log(`✅ Admin:       ${admin.email}  /  Admin@123456`);

  const moderator = await prisma.user.upsert({
    where:  { email: 'moderator@creatorhub.com' },
    update: {},
    create: {
      email: 'moderator@creatorhub.com',
      phone: '+9779800000002',
      password: adminPw,
      role: Role.ADMIN,
      isEmailVerified: true,
      isOnboarded: true,
    },
  });
  console.log(`✅ Moderator:   ${moderator.email}  /  Admin@123456`);

  // ── Creators ─────────────────────────────────────────────────────────────────
  const sarah = await prisma.user.upsert({
    where:  { email: 'sarah@example.com' },
    update: {},
    create: {
      email: 'sarah@example.com',
      phone: '+9779800000003',
      password: creatorPw,
      role: Role.CREATOR,
      isEmailVerified: true,
      isOnboarded: true,
      creatorProfile: {
        create: {
          fullName: 'Sarah Johnson',
          bio: 'Lifestyle and fashion creator with 5 years of experience. Passionate about sustainable fashion.',
          location: 'New York, USA',
          categories: ['Fashion', 'Lifestyle', 'Beauty'],
          socialLinks: {
            instagram: '@sarahcreates',
            tiktok: '@sarahj.creates',
            youtube: 'Sarah Creates',
            facebook: 'Sarah Johnson',
          },
          portfolioLinks: [
            { id: '1', label: 'Instagram Reel', url: 'https://instagram.com/reel/abc123' },
            { id: '2', label: 'YouTube Video', url: 'https://youtube.com/watch?v=xyz789' },
          ],
          isVerified: true,
        },
      },
    },
  });
  console.log(`✅ Creator:     ${sarah.email}`);

  const james = await prisma.user.upsert({
    where:  { email: 'james@example.com' },
    update: {},
    create: {
      email: 'james@example.com',
      phone: '+9779800000004',
      password: creatorPw,
      role: Role.CREATOR,
      isEmailVerified: true,
      isOnboarded: true,
      creatorProfile: {
        create: {
          fullName: 'James Chen',
          bio: 'Tech reviewer and gaming content creator. Unboxing videos and honest reviews.',
          location: 'San Francisco, USA',
          categories: ['Technology', 'Gaming'],
          socialLinks: {
            youtube: 'James Tech Reviews',
            tiktok: '@jamestech',
          },
          portfolioLinks: [
            { id: '1', label: 'Tech Review', url: 'https://youtube.com/watch?v=tech123' },
          ],
          isVerified: false,
        },
      },
    },
  });
  console.log(`✅ Creator:     ${james.email}`);

  const priya = await prisma.user.upsert({
    where:  { email: 'priya@example.com' },
    update: {},
    create: {
      email: 'priya@example.com',
      phone: '+9779800000005',
      password: creatorPw,
      role: Role.CREATOR,
      isEmailVerified: true,
      isOnboarded: true,
      creatorProfile: {
        create: {
          fullName: 'Priya Sharma',
          bio: 'Food and travel blogger sharing authentic recipes and travel stories.',
          location: 'Mumbai, India',
          categories: ['Food', 'Travel', 'Wellness'],
          socialLinks: { instagram: '@priyacooks', youtube: 'Priya Eats' },
          portfolioLinks: [],
          isVerified: true,
        },
      },
    },
  });
  console.log(`✅ Creator:     ${priya.email}`);

  // ── Businesses ────────────────────────────────────────────────────────────────
  const stylecoUser = await prisma.user.upsert({
    where:  { email: 'hello@styleco.com' },
    update: {},
    create: {
      email: 'hello@styleco.com',
      phone: '+9779800000006',
      password: bizPw,
      role: Role.BUSINESS,
      isEmailVerified: true,
      isOnboarded: true,
      businessProfile: {
        create: {
          businessName: 'StyleCo Brand',
          description: 'Modern fashion brand for young professionals. Sustainable, stylish, and affordable.',
          website: 'https://styleco.com',
          categories: ['Fashion', 'Lifestyle'],
          isVerified: true,
        },
      },
    },
    include: { businessProfile: true },
  });
  console.log(`✅ Business:    ${stylecoUser.email}`);

  const gymgearUser = await prisma.user.upsert({
    where:  { email: 'contact@gymgear.com' },
    update: {},
    create: {
      email: 'contact@gymgear.com',
      phone: '+9779800000007',
      password: bizPw,
      role: Role.BUSINESS,
      isEmailVerified: true,
      isOnboarded: true,
      businessProfile: {
        create: {
          businessName: 'GymGear Co',
          description: 'Premium fitness equipment and activewear for serious athletes.',
          website: 'https://gymgear.com',
          categories: ['Fitness', 'Sports'],
          isVerified: true,
        },
      },
    },
    include: { businessProfile: true },
  });
  console.log(`✅ Business:    ${gymgearUser.email}`);

  const greenCafeUser = await prisma.user.upsert({
    where:  { email: 'info@greencafe.com' },
    update: {},
    create: {
      email: 'info@greencafe.com',
      phone: '+9779800000008',
      password: bizPw,
      role: Role.BUSINESS,
      isEmailVerified: false,
      businessProfile: {
        create: {
          businessName: 'Green Cafe',
          description: 'Organic cafe chain promoting healthy eating and sustainable living.',
          website: 'https://greencafe.com',
          categories: ['Food', 'Wellness'],
          isVerified: false,
        },
      },
    },
    include: { businessProfile: true },
  });
  console.log(`✅ Business:    ${greenCafeUser.email}`);

  const technovaUser = await prisma.user.upsert({
    where:  { email: 'hello@technova.com.np' },
    update: {},
    create: {
      email: 'hello@technova.com.np',
      phone: '+9779800000009',
      password: bizPw,
      role: Role.BUSINESS,
      isEmailVerified: true,
      isOnboarded: true,
      businessProfile: {
        create: {
          businessName: 'TechNova Nepal',
          description: 'Nepal\'s leading consumer electronics retailer. Laptops, smartphones, and smart home devices.',
          website: 'https://technova.com.np',
          categories: ['Technology', 'Electronics'],
          isVerified: true,
        },
      },
    },
    include: { businessProfile: true },
  });
  console.log(`✅ Business:    ${technovaUser.email}`);

  const glowupUser = await prisma.user.upsert({
    where:  { email: 'brand@glowupbeauty.com' },
    update: {},
    create: {
      email: 'brand@glowupbeauty.com',
      phone: '+9779800000010',
      password: bizPw,
      role: Role.BUSINESS,
      isEmailVerified: true,
      isOnboarded: true,
      businessProfile: {
        create: {
          businessName: 'GlowUp Beauty',
          description: 'Premium skincare and beauty brand made for South Asian skin tones. Cruelty-free and dermatologist tested.',
          website: 'https://glowupbeauty.com',
          categories: ['Beauty', 'Skincare'],
          isVerified: true,
        },
      },
    },
    include: { businessProfile: true },
  });
  console.log(`✅ Business:    ${glowupUser.email}`);

  const exploreNepalUser = await prisma.user.upsert({
    where:  { email: 'partner@explorenepal.travel' },
    update: {},
    create: {
      email: 'partner@explorenepal.travel',
      phone: '+9779800000011',
      password: bizPw,
      role: Role.BUSINESS,
      isEmailVerified: true,
      isOnboarded: true,
      businessProfile: {
        create: {
          businessName: 'Explore Nepal Tourism',
          description: 'Award-winning travel agency offering trekking, tours, and cultural experiences across Nepal.',
          website: 'https://explorenepal.travel',
          categories: ['Travel', 'Adventure'],
          isVerified: true,
        },
      },
    },
    include: { businessProfile: true },
  });
  console.log(`✅ Business:    ${exploreNepalUser.email}`);

  // ── Campaigns ─────────────────────────────────────────────────────────────────
  if (stylecoUser.businessProfile) {
    const bizId = stylecoUser.businessProfile.id;

    await prisma.campaign.upsert({
      where:  { id: 'seed-camp-1' },
      update: { isFeatured: true },
      create: {
        id: 'seed-camp-1',
        businessId: bizId,
        title: 'Summer Fashion Collection 2026',
        description: 'Showcase our new summer collection through authentic lifestyle content. We want creators who embody our brand values of elegance, sustainability and modern minimalism.',
        category: 'Fashion',
        platform: 'Instagram',
        minFollowers: 10000,
        contentType: 'Reels + Stories',
        deliverables: '2 Reels + 5 Stories with brand hashtag and link in bio',
        deadline: new Date('2026-08-30'),
        location: 'Remote',
        budgetMin: 500,
        budgetMax: 1500,
        paymentType: 'Fixed',
        status: CampaignStatus.ACTIVE,
        isFeatured: true,
      },
    });

    await prisma.campaign.upsert({
      where:  { id: 'seed-camp-2' },
      update: {},
      create: {
        id: 'seed-camp-2',
        businessId: bizId,
        title: 'Winter Accessories Launch',
        description: 'Introduce our winter accessories line to a style-conscious audience.',
        category: 'Fashion',
        platform: 'TikTok',
        minFollowers: 5000,
        contentType: 'Short Video',
        deliverables: '3 TikTok videos featuring the accessories',
        deadline: new Date('2026-11-15'),
        location: 'Remote',
        budgetMin: 300,
        budgetMax: 800,
        paymentType: 'Fixed',
        status: CampaignStatus.ACTIVE,
        isFeatured: false,
      },
    });
  }

  if (gymgearUser.businessProfile) {
    await prisma.campaign.upsert({
      where:  { id: 'seed-camp-3' },
      update: { isFeatured: true },
      create: {
        id: 'seed-camp-3',
        businessId: gymgearUser.businessProfile.id,
        title: '30-Day Fitness Challenge',
        description: 'Document a 30-day fitness challenge using GymGear equipment. We will provide all gear and a professional photographer for milestone shoots.',
        category: 'Fitness',
        platform: 'YouTube',
        minFollowers: 20000,
        contentType: 'Video Series',
        deliverables: '4 YouTube videos documenting the fitness journey',
        deadline: new Date('2026-09-01'),
        location: 'Remote',
        budgetMin: 1000,
        budgetMax: 3000,
        paymentType: 'Fixed',
        status: CampaignStatus.ACTIVE,
        isFeatured: true,
      },
    });

    await prisma.campaign.upsert({
      where:  { id: 'seed-camp-5' },
      update: { isFeatured: true },
      create: {
        id: 'seed-camp-5',
        businessId: gymgearUser.businessProfile.id,
        title: 'Home Workout Series — GymGear Pro',
        description: 'Promote our new home workout equipment line. Show your audience how to get a full-body workout from their living room.',
        category: 'Fitness',
        platform: 'TikTok',
        minFollowers: 8000,
        contentType: 'Short Video',
        deliverables: '5 TikTok videos + 3 Instagram Reels',
        deadline: new Date('2026-10-01'),
        location: 'Remote',
        budgetMin: 400,
        budgetMax: 900,
        paymentType: 'Fixed',
        status: CampaignStatus.ACTIVE,
        isFeatured: true,
      },
    });
  }

  if (greenCafeUser.businessProfile) {
    await prisma.campaign.upsert({
      where:  { id: 'seed-camp-4' },
      update: {},
      create: {
        id: 'seed-camp-4',
        businessId: greenCafeUser.businessProfile.id,
        title: 'Healthy Eating Campaign',
        description: 'Promote our organic menu to food enthusiasts.',
        category: 'Food',
        platform: 'Instagram',
        minFollowers: 3000,
        contentType: 'Posts + Stories',
        deliverables: '3 feed posts + 5 stories featuring menu items',
        deadline: new Date('2026-07-31'),
        location: 'Kathmandu',
        budgetMin: 150,
        budgetMax: 400,
        paymentType: 'Fixed',
        status: CampaignStatus.ACTIVE,
        isFeatured: false,
      },
    });

    await prisma.campaign.upsert({
      where:  { id: 'seed-camp-6' },
      update: { isFeatured: true },
      create: {
        id: 'seed-camp-6',
        businessId: greenCafeUser.businessProfile.id,
        title: 'Green Cafe Grand Opening — Pokhara',
        description: 'We are opening our second branch in Pokhara! We want food creators to document the grand opening event and showcase our signature dishes to a local audience.',
        category: 'Food',
        platform: 'Instagram',
        minFollowers: 5000,
        contentType: 'Reels + Stories',
        deliverables: '1 event Reel + 8 Stories + 2 feed posts',
        deadline: new Date('2026-07-20'),
        location: 'Pokhara',
        budgetMin: 300,
        budgetMax: 700,
        paymentType: 'Fixed',
        status: CampaignStatus.ACTIVE,
        isFeatured: true,
      },
    });
  }

  // ── Additional non-featured campaigns (appear in Recommended row) ─────────────
  if (stylecoUser.businessProfile) {
    await prisma.campaign.upsert({
      where:  { id: 'seed-camp-13' },
      update: {},
      create: {
        id: 'seed-camp-13',
        businessId: stylecoUser.businessProfile.id,
        title: 'Back-to-School Lookbook 2026',
        description: 'Show your audience how to put together stylish back-to-school outfits using our new collection. Creative, fun, and targeted at Gen Z.',
        category: 'Fashion',
        platform: 'TikTok',
        minFollowers: 3000,
        contentType: 'Short Video',
        deliverables: '2 TikTok outfit videos + 3 Instagram Stories',
        deadline: new Date('2026-08-10'),
        location: 'Remote',
        budgetMin: 200,
        budgetMax: 450,
        paymentType: 'Fixed',
        status: CampaignStatus.ACTIVE,
        isFeatured: false,
      },
    });
  }

  if (gymgearUser.businessProfile) {
    await prisma.campaign.upsert({
      where:  { id: 'seed-camp-14' },
      update: {},
      create: {
        id: 'seed-camp-14',
        businessId: gymgearUser.businessProfile.id,
        title: 'Morning Workout Routine Challenge',
        description: 'Show your morning workout routine using GymGear resistance bands. Tag three friends to try the challenge.',
        category: 'Fitness',
        platform: 'Instagram',
        minFollowers: 2000,
        contentType: 'Reels + Stories',
        deliverables: '1 Reel + 5 Stories + challenge tag',
        deadline: new Date('2026-07-25'),
        location: 'Remote',
        budgetMin: 120,
        budgetMax: 300,
        paymentType: 'Product Exchange',
        status: CampaignStatus.ACTIVE,
        isFeatured: false,
      },
    });
  }

  if (greenCafeUser.businessProfile) {
    await prisma.campaign.upsert({
      where:  { id: 'seed-camp-15' },
      update: {},
      create: {
        id: 'seed-camp-15',
        businessId: greenCafeUser.businessProfile.id,
        title: 'Matcha Latte Art Competition',
        description: 'We are hosting a latte art competition at our Kathmandu branch. Document the event and share it with your foodie audience.',
        category: 'Food',
        platform: 'Instagram',
        minFollowers: 1500,
        contentType: 'Posts + Stories',
        deliverables: '2 feed posts + 6 stories',
        deadline: new Date('2026-07-18'),
        location: 'Kathmandu',
        budgetMin: 80,
        budgetMax: 200,
        paymentType: 'Product Exchange',
        status: CampaignStatus.ACTIVE,
        isFeatured: false,
      },
    });
  }

  if (technovaUser.businessProfile) {
    await prisma.campaign.upsert({
      where:  { id: 'seed-camp-7' },
      update: { isFeatured: true },
      create: {
        id: 'seed-camp-7',
        businessId: technovaUser.businessProfile.id,
        title: 'Latest Smartphone Unboxing & Review',
        description: 'We are launching the TechNova X12 Pro — Nepal\'s most powerful mid-range smartphone. We need tech creators to do an honest unboxing and in-depth review reaching Nepal\'s youth audience.',
        category: 'Technology',
        platform: 'YouTube',
        minFollowers: 15000,
        contentType: 'Review Video',
        deliverables: '1 full unboxing + review video (10–15 min) + 1 Instagram Reel highlight',
        deadline: new Date('2026-09-15'),
        location: 'Kathmandu',
        budgetMin: 600,
        budgetMax: 1200,
        paymentType: 'Fixed',
        status: CampaignStatus.ACTIVE,
        isFeatured: true,
      },
    });

    await prisma.campaign.upsert({
      where:  { id: 'seed-camp-8-tech' },
      update: {},
      create: {
        id: 'seed-camp-8-tech',
        businessId: technovaUser.businessProfile.id,
        title: 'Smart Home Setup — TechNova Hub',
        description: 'Showcase how to set up a smart home using our TechNova Hub ecosystem. Target audience: young professionals moving into new apartments.',
        category: 'Technology',
        platform: 'TikTok',
        minFollowers: 5000,
        contentType: 'Short Video',
        deliverables: '3 TikTok videos (setup, tips, lifestyle)',
        deadline: new Date('2026-11-01'),
        location: 'Remote',
        budgetMin: 250,
        budgetMax: 500,
        paymentType: 'Fixed',
        status: CampaignStatus.ACTIVE,
        isFeatured: false,
      },
    });
  }

  if (glowupUser.businessProfile) {
    await prisma.campaign.upsert({
      where:  { id: 'seed-camp-9' },
      update: { isFeatured: true },
      create: {
        id: 'seed-camp-9',
        businessId: glowupUser.businessProfile.id,
        title: 'Glow Serum 30-Day Skin Transformation',
        description: 'Document your skin journey using our new Vitamin C + Niacinamide serum for 30 days. We want authentic before/after content that resonates with South Asian audiences.',
        category: 'Beauty',
        platform: 'Instagram',
        minFollowers: 8000,
        contentType: 'Reels + Stories',
        deliverables: 'Daily stories (30 days) + 3 feed posts + 1 transformation Reel',
        deadline: new Date('2026-10-15'),
        location: 'Remote',
        budgetMin: 700,
        budgetMax: 1500,
        paymentType: 'Fixed',
        status: CampaignStatus.ACTIVE,
        isFeatured: true,
      },
    });

    await prisma.campaign.upsert({
      where:  { id: 'seed-camp-10' },
      update: { isFeatured: true },
      create: {
        id: 'seed-camp-10',
        businessId: glowupUser.businessProfile.id,
        title: 'Everyday Makeup Look — GlowUp Collection',
        description: 'Create a casual everyday makeup tutorial using our new GlowUp matte lipstick and highlighter collection. Fun, vibrant, and beginner-friendly.',
        category: 'Beauty',
        platform: 'TikTok',
        minFollowers: 4000,
        contentType: 'Tutorial Video',
        deliverables: '2 TikTok tutorials + 1 Instagram Reel',
        deadline: new Date('2026-08-20'),
        location: 'Remote',
        budgetMin: 350,
        budgetMax: 750,
        paymentType: 'Fixed',
        status: CampaignStatus.ACTIVE,
        isFeatured: true,
      },
    });
  }

  if (exploreNepalUser.businessProfile) {
    await prisma.campaign.upsert({
      where:  { id: 'seed-camp-11' },
      update: { isFeatured: true },
      create: {
        id: 'seed-camp-11',
        businessId: exploreNepalUser.businessProfile.id,
        title: 'Hidden Gems of Nepal — Travel Series',
        description: 'Join our guided trek to Mustang, Upper Dolpo, or the Annapurna Circuit. Document the experience for your audience and inspire a new generation of Nepal travelers.',
        category: 'Travel',
        platform: 'TikTok',
        minFollowers: 10000,
        contentType: 'Travel Vlog',
        deliverables: '5 TikTok travel vlogs + 10 Instagram Stories + 1 YouTube short',
        deadline: new Date('2026-12-01'),
        location: 'Kathmandu',
        budgetMin: 800,
        budgetMax: 2000,
        paymentType: 'Hybrid',
        status: CampaignStatus.ACTIVE,
        isFeatured: true,
      },
    });

    await prisma.campaign.upsert({
      where:  { id: 'seed-camp-12' },
      update: { isFeatured: true },
      create: {
        id: 'seed-camp-12',
        businessId: exploreNepalUser.businessProfile.id,
        title: 'Pokhara Lakeside Weekend Getaway',
        description: 'Promote our new Pokhara weekend package — paragliding, kayaking, and lakeside dining. Looking for lifestyle creators who love adventure.',
        category: 'Travel',
        platform: 'Instagram',
        minFollowers: 6000,
        contentType: 'Reels + Posts',
        deliverables: '2 Reels + 4 feed posts + 8 Stories',
        deadline: new Date('2026-09-30'),
        location: 'Pokhara',
        budgetMin: 500,
        budgetMax: 1000,
        paymentType: 'Hybrid',
        status: CampaignStatus.ACTIVE,
        isFeatured: true,
      },
    });
  }

  // ── Help Center Articles ────────────────────────────────────────────────────
  const helpArticles = [
    { id: 'seed-help-1', question: 'How do campaigns work?', answer: 'Businesses post campaigns describing their goals, budget, and requirements. Creators browse and apply by submitting a proposal. If accepted, you deliver the content and get paid within 5 business days.', category: 'Campaigns', order: 1 },
    { id: 'seed-help-2', question: 'How do I apply for a campaign?', answer: 'Go to the Home tab, browse available campaigns, and tap Apply. Fill in your cover letter, proposed rate, and timeline. The business will review your proposal and respond within 24–48 hours.', category: 'Campaigns', order: 2 },
    { id: 'seed-help-3', question: 'Can I withdraw a proposal?', answer: 'Yes, you can withdraw a pending proposal before it is accepted. Once accepted, contact support before declining to avoid penalties to your creator score.', category: 'Campaigns', order: 3 },
    { id: 'seed-help-4', question: 'How do I get paid?', answer: 'Payments are released within 5 business days after the business confirms content delivery. Funds are transferred to your linked payment method (eSewa, Khalti, or FonePay).', category: 'Payments', order: 1 },
    { id: 'seed-help-5', question: 'What payment methods are supported?', answer: 'We currently support eSewa, Khalti, and FonePay for Nepal-based creators. Add your preferred methods in Settings → Earnings & Payments.', category: 'Payments', order: 2 },
    { id: 'seed-help-6', question: 'What is the platform fee?', answer: 'CreatorMarket charges a 10% platform fee on each completed campaign. This covers payment processing, dispute resolution, and platform maintenance.', category: 'Payments', order: 3 },
    { id: 'seed-help-7', question: 'How is my creator score calculated?', answer: 'Your score considers profile completeness, campaign completion rate, content quality ratings, and on-time delivery. A higher score improves your visibility and selection chances.', category: 'Account', order: 1 },
    { id: 'seed-help-8', question: 'How do I get verified?', answer: 'Verified status is granted after your account is reviewed by our team. Complete your profile, link your social accounts, and submit at least 3 successful campaigns to qualify.', category: 'Account', order: 2 },
    { id: 'seed-help-9', question: 'What are the minimum follower requirements?', answer: 'There is no strict platform minimum. However, each campaign sets its own criteria. Building a strong, engaged audience improves your chances of being selected.', category: 'Account', order: 3 },
  ];
  for (const article of helpArticles) {
    await prisma.helpArticle.upsert({ where: { id: article.id }, update: {}, create: { ...article, published: true } });
  }
  console.log(`✅ Help Center: ${helpArticles.length} articles seeded`);

  // ── FAQ Articles ─────────────────────────────────────────────────────────────
  const faqArticles = [
    { id: 'seed-faq-1', question: 'What is CreatorMarket?', answer: 'CreatorMarket is a platform connecting content creators with local businesses for paid collaborations, sponsored content, and brand campaigns.', category: 'General', order: 1 },
    { id: 'seed-faq-2', question: 'Is CreatorMarket free to use?', answer: 'Yes — creating a creator account and browsing campaigns is completely free. A 10% service fee applies only on successfully completed campaigns.', category: 'General', order: 2 },
    { id: 'seed-faq-3', question: 'How do I improve my campaign acceptance rate?', answer: 'Complete your profile, link all your social accounts, add past work samples, and write personalized proposals that directly address each campaign\'s goals.', category: 'General', order: 3 },
    { id: 'seed-faq-4', question: 'What types of content can I create?', answer: 'Instagram posts/reels/stories, TikTok videos, YouTube reviews and vlogs, Facebook content, blog posts, and photography — depending on what the business requests.', category: 'Campaigns', order: 1 },
    { id: 'seed-faq-5', question: 'Can businesses see my profile before contacting me?', answer: 'Yes. Your public profile shows your bio, social stats, categories, and past work samples. Make sure it accurately represents your content style.', category: 'Campaigns', order: 2 },
    { id: 'seed-faq-6', question: 'What happens if a business does not pay?', answer: 'We hold campaign budgets in escrow before any work begins. If a dispute arises, our team mediates and ensures fair resolution based on agreed deliverables.', category: 'Payments', order: 1 },
    { id: 'seed-faq-7', question: 'How long does it take to receive payment?', answer: 'Payments are processed within 5 business days after the business confirms content delivery. Funds go to your linked eSewa, Khalti, or FonePay account.', category: 'Payments', order: 2 },
    { id: 'seed-faq-8', question: 'How do I delete my account?', answer: 'Go to Settings → Security → Delete Account. This permanently removes all your data, proposals, and payment history. This action cannot be undone.', category: 'Account', order: 1 },
    { id: 'seed-faq-9', question: 'How do I report a problem?', answer: 'Go to Settings → Support → Report an Issue. Select the issue type, describe the problem in detail, and submit. Our team reviews all reports within 48 hours.', category: 'Account', order: 2 },
  ];
  for (const faq of faqArticles) {
    await prisma.faqArticle.upsert({ where: { id: faq.id }, update: {}, create: { ...faq, published: true } });
  }
  console.log(`✅ FAQs:        ${faqArticles.length} articles seeded`);

  // ── Legal Sections ──────────────────────────────────────────────────────────
  const privacySections = [
    { id: 'seed-legal-pp-1', type: 'PRIVACY_POLICY', title: '1. Information We Collect', body: 'We collect information you provide directly, such as your name, email address, social media handles, follower counts, and payment details. We also collect usage data including campaign interactions, device information, and log data when you use our services.', order: 1 },
    { id: 'seed-legal-pp-2', type: 'PRIVACY_POLICY', title: '2. How We Use Your Information', body: 'Your information is used to match you with relevant campaigns, process payments, send notifications, improve our platform, and comply with legal obligations. We do not use your data to train AI models without explicit consent.', order: 2 },
    { id: 'seed-legal-pp-3', type: 'PRIVACY_POLICY', title: '3. Information Sharing', body: 'We share your profile information with businesses when you apply for their campaigns. We do not sell your personal data to third parties. We may share data with service providers who help us operate the platform under strict confidentiality agreements.', order: 3 },
    { id: 'seed-legal-pp-4', type: 'PRIVACY_POLICY', title: '4. Data Security', body: 'We use industry-standard encryption and security practices to protect your data. However, no method of transmission over the internet is 100% secure. We encourage you to use a strong, unique password.', order: 4 },
    { id: 'seed-legal-pp-5', type: 'PRIVACY_POLICY', title: '5. Data Retention', body: 'We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time through Settings → Account → Delete Account.', order: 5 },
    { id: 'seed-legal-pp-6', type: 'PRIVACY_POLICY', title: '6. Your Rights', body: 'You have the right to access, correct, or delete your personal data. You may also object to or restrict certain processing. To exercise these rights, contact us at privacy@creatormarket.com.', order: 6 },
    { id: 'seed-legal-pp-7', type: 'PRIVACY_POLICY', title: '7. Contact Us', body: 'If you have questions about this policy, contact us at privacy@creatormarket.com or write to CreatorMarket Pvt. Ltd., Kathmandu, Nepal.', order: 7 },
  ];
  const termsSections = [
    { id: 'seed-legal-tc-1', type: 'TERMS', title: '1. Acceptance of Terms', body: 'By using CreatorMarket you agree to these Terms. If you do not agree, please do not use the platform. We may update these Terms from time to time; continued use after changes constitutes acceptance.', order: 1 },
    { id: 'seed-legal-tc-2', type: 'TERMS', title: '2. Creator Eligibility', body: 'You must be at least 18 years old to use this platform. By registering, you confirm that the information you provide is accurate and that you have the right to create content for the campaigns you apply to.', order: 2 },
    { id: 'seed-legal-tc-3', type: 'TERMS', title: '3. Campaign Participation', body: 'When you apply for a campaign and are accepted, you agree to deliver the content as described by the deadline specified. Failure to deliver may result in payment disputes or account suspension.', order: 3 },
    { id: 'seed-legal-tc-4', type: 'TERMS', title: '4. Content Ownership', body: 'You retain ownership of the content you create. By participating in a campaign, you grant the business a license to use the content as outlined in the campaign brief. Ensure you have rights to all elements in your content.', order: 4 },
    { id: 'seed-legal-tc-5', type: 'TERMS', title: '5. Payments & Fees', body: 'Campaign payments are processed through our escrow system. CreatorMarket charges a 10% platform fee on each completed campaign. Payments are released within 5 business days of confirmed delivery.', order: 5 },
    { id: 'seed-legal-tc-6', type: 'TERMS', title: '6. Prohibited Conduct', body: 'You may not create fake accounts, manipulate engagement metrics, post misleading or harmful content, or engage in any activity that violates applicable laws or our Community Guidelines.', order: 6 },
    { id: 'seed-legal-tc-7', type: 'TERMS', title: '7. Termination', body: 'We may suspend or terminate your account for violations of these Terms. You may delete your account at any time. Termination does not affect obligations from completed campaigns.', order: 7 },
    { id: 'seed-legal-tc-8', type: 'TERMS', title: '8. Governing Law', body: 'These Terms are governed by the laws of Nepal. Any disputes shall be resolved through arbitration in Kathmandu, Nepal, except where prohibited by local law.', order: 8 },
  ];
  const guidelineSections = [
    { id: 'seed-legal-cg-1', type: 'GUIDELINES', icon: '✅', title: 'Be Authentic', body: 'Only promote products or services you genuinely believe in. Disclose all sponsored relationships clearly as required by advertising standards. Fake reviews or misleading endorsements are not allowed.', order: 1 },
    { id: 'seed-legal-cg-2', type: 'GUIDELINES', icon: '🤝', title: 'Respect Everyone', body: 'Treat businesses, fellow creators, and platform staff with respect. Harassment, discrimination, or hate speech based on race, gender, religion, nationality, or any other characteristic will result in immediate account suspension.', order: 2 },
    { id: 'seed-legal-cg-3', type: 'GUIDELINES', icon: '⭐', title: 'Maintain Quality', body: "Deliver content that meets the brief's requirements. Low-quality or irrelevant submissions damage everyone's experience. We encourage you to put your genuine creative skill into every collaboration.", order: 3 },
    { id: 'seed-legal-cg-4', type: 'GUIDELINES', icon: '💡', title: 'Be Transparent', body: 'Clearly communicate with businesses. If you face challenges meeting a deadline, reach out early. Ghosting a campaign will negatively impact your creator score and may result in account restrictions.', order: 4 },
    { id: 'seed-legal-cg-5', type: 'GUIDELINES', icon: '🚫', title: 'Prohibited Content', body: 'Do not create or submit content that contains: explicit adult material, violent or graphic imagery, misinformation, political propaganda, content targeting minors inappropriately, or any material that violates applicable laws.', order: 5 },
    { id: 'seed-legal-cg-6', type: 'GUIDELINES', icon: '⚖️', title: 'Enforcement', body: 'Violations are reviewed by our trust and safety team. Consequences range from content removal to account suspension depending on severity. Serious violations are reported to relevant authorities.', order: 6 },
  ];
  for (const s of [...privacySections, ...termsSections, ...guidelineSections]) {
    await prisma.legalSection.upsert({ where: { id: s.id }, update: {}, create: { ...s, published: true } });
  }
  console.log(`✅ Legal:       ${privacySections.length + termsSections.length + guidelineSections.length} sections seeded`);

  console.log('\n🎉 Seeding complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin Panel Login:');
  console.log('  URL:      http://localhost:5173');
  console.log('  Email:    admin@creatorhub.com');
  console.log('  Password: Admin@123456');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
