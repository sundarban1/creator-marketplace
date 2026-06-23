import { PrismaClient, Role, CampaignStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Clearing existing data...\n');

  // Delete in dependency order
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.application.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.favoriteBusiness.deleteMany();
  await prisma.creatorProfile.deleteMany();
  await prisma.businessProfile.deleteMany();
  await prisma.otpVerification.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database cleared\n');
  console.log('🌱 Seeding with fresh data...\n');

  const adminPw   = await bcrypt.hash('Admin@123456', 12);
  const creatorPw = await bcrypt.hash('Creator@123', 12);
  const bizPw     = await bcrypt.hash('Business@123', 12);

  // ── Admins ───────────────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email: 'admin@creatormarket.com.np',
      phone: '+9779800000001',
      password: adminPw,
      role: Role.ADMIN,
      isEmailVerified: true,
      isOnboarded: true,
    },
  });
  console.log(`✅ Admin:       ${admin.email}  /  Admin@123456`);

  // ── Creators ─────────────────────────────────────────────────────────────────
  const aarav = await prisma.user.create({
    data: {
      email: 'aarav@example.com',
      phone: '+9779811111101',
      password: creatorPw,
      role: Role.CREATOR,
      isEmailVerified: true,
      isOnboarded: true,
      creatorProfile: {
        create: {
          fullName: 'Aarav Sharma',
          bio: 'Food and lifestyle creator based in Kathmandu. I share authentic reviews of local restaurants, cafes, and street food. 80K+ followers across platforms.',
          location: 'Kathmandu, Nepal',
          categories: ['Food', 'Lifestyle'],
          socialLinks: {
            instagram: '@aaraveatskth',
            tiktok: '@aaravktm',
            youtube: 'Aarav Eats',
            facebook: 'Aarav Sharma',
          },
          portfolioLinks: [
            { id: '1', label: 'Restaurant Reel', url: 'https://instagram.com/reel/sample1' },
            { id: '2', label: 'Cafe Review', url: 'https://youtube.com/watch?v=sample2' },
          ],
          isVerified: true,
        },
      },
    },
  });
  console.log(`✅ Creator:     ${aarav.email}`);

  const srijana = await prisma.user.create({
    data: {
      email: 'srijana@example.com',
      phone: '+9779811111102',
      password: creatorPw,
      role: Role.CREATOR,
      isEmailVerified: true,
      isOnboarded: true,
      creatorProfile: {
        create: {
          fullName: 'Srijana Tamang',
          bio: 'Fashion and lifestyle creator from Pokhara. I create aesthetic content around fashion, beauty, and Nepali culture. 45K Instagram followers.',
          location: 'Pokhara, Nepal',
          categories: ['Fashion', 'Lifestyle', 'Beauty'],
          socialLinks: {
            instagram: '@srijanastyle',
            tiktok: '@srijanatamang',
          },
          portfolioLinks: [
            { id: '1', label: 'Outfit Reel', url: 'https://instagram.com/reel/sample3' },
          ],
          isVerified: true,
        },
      },
    },
  });
  console.log(`✅ Creator:     ${srijana.email}`);

  const bikash = await prisma.user.create({
    data: {
      email: 'bikash@example.com',
      phone: '+9779811111103',
      password: creatorPw,
      role: Role.CREATOR,
      isEmailVerified: true,
      isOnboarded: true,
      creatorProfile: {
        create: {
          fullName: 'Bikash Thapa',
          bio: 'Travel vlogger exploring hidden gems of Nepal. Trekking, adventure sports, and cultural experiences. 120K YouTube subscribers.',
          location: 'Kathmandu, Nepal',
          categories: ['Travel', 'Adventure', 'Lifestyle'],
          socialLinks: {
            youtube: 'Bikash Explores Nepal',
            instagram: '@bikashexplores',
            tiktok: '@bikashtravel',
          },
          portfolioLinks: [
            { id: '1', label: 'Annapurna Vlog', url: 'https://youtube.com/watch?v=sample4' },
            { id: '2', label: 'Pokhara Reel', url: 'https://instagram.com/reel/sample5' },
          ],
          isVerified: true,
        },
      },
    },
  });
  console.log(`✅ Creator:     ${bikash.email}`);

  const nisha = await prisma.user.create({
    data: {
      email: 'nisha@example.com',
      phone: '+9779811111104',
      password: creatorPw,
      role: Role.CREATOR,
      isEmailVerified: true,
      isOnboarded: true,
      creatorProfile: {
        create: {
          fullName: 'Nisha Rai',
          bio: 'Fitness and wellness creator sharing workout routines, healthy recipes, and mindful living tips. Certified personal trainer. 30K followers.',
          location: 'Kathmandu, Nepal',
          categories: ['Fitness', 'Wellness', 'Food'],
          socialLinks: {
            instagram: '@nishafitsnepal',
            tiktok: '@nisharai.fit',
          },
          portfolioLinks: [],
          isVerified: false,
        },
      },
    },
  });
  console.log(`✅ Creator:     ${nisha.email}`);

  const rohan = await prisma.user.create({
    data: {
      email: 'rohan@example.com',
      phone: '+9779811111105',
      password: creatorPw,
      role: Role.CREATOR,
      isEmailVerified: true,
      isOnboarded: true,
      creatorProfile: {
        create: {
          fullName: 'Rohan Gurung',
          bio: 'Tech reviewer covering smartphones, gadgets, and apps for the Nepali market. Honest, detailed, and beginner-friendly reviews. 55K YouTube subscribers.',
          location: 'Kathmandu, Nepal',
          categories: ['Technology', 'Gaming'],
          socialLinks: {
            youtube: 'Rohan Tech Nepal',
            instagram: '@rohantech.np',
            tiktok: '@rohantechktm',
          },
          portfolioLinks: [
            { id: '1', label: 'Phone Review', url: 'https://youtube.com/watch?v=sample6' },
          ],
          isVerified: true,
        },
      },
    },
  });
  console.log(`✅ Creator:     ${rohan.email}`);

  // ── Businesses ────────────────────────────────────────────────────────────────
  const momoHouseUser = await prisma.user.create({
    data: {
      email: 'hello@momohouse.com.np',
      phone: '+9779822221101',
      password: bizPw,
      role: Role.BUSINESS,
      isEmailVerified: true,
      isOnboarded: true,
      businessProfile: {
        create: {
          businessName: 'Momo House Kathmandu',
          description: 'Kathmandu\'s most-loved momo restaurant since 2010. Serving authentic Nepali and Tibetan dumplings with 12 varieties. Multiple branches across Kathmandu valley.',
          website: 'https://momohouse.com.np',
          categories: ['Food', 'Restaurant'],
          isVerified: true,
        },
      },
    },
    include: { businessProfile: true },
  });
  console.log(`✅ Business:    ${momoHouseUser.email}`);

  const himalayaBrewUser = await prisma.user.create({
    data: {
      email: 'info@himalayabrew.com.np',
      phone: '+9779822221102',
      password: bizPw,
      role: Role.BUSINESS,
      isEmailVerified: true,
      isOnboarded: true,
      businessProfile: {
        create: {
          businessName: 'Himalaya Brew Cafe',
          description: 'Specialty coffee cafe in Thamel, Kathmandu. Sourcing beans directly from Nepali highland farms. Cozy ambiance with mountain views.',
          website: 'https://himalayabrew.com.np',
          categories: ['Cafe', 'Coffee'],
          isVerified: true,
        },
      },
    },
    include: { businessProfile: true },
  });
  console.log(`✅ Business:    ${himalayaBrewUser.email}`);

  const dhakaThreadsUser = await prisma.user.create({
    data: {
      email: 'brand@dhakathreads.com.np',
      phone: '+9779822221103',
      password: bizPw,
      role: Role.BUSINESS,
      isEmailVerified: true,
      isOnboarded: true,
      businessProfile: {
        create: {
          businessName: 'Dhaka Threads',
          description: 'Contemporary Nepali clothing brand blending traditional Dhaka weave with modern fashion. Sustainable, handcrafted, and proudly made in Nepal.',
          website: 'https://dhakathreads.com.np',
          categories: ['Fashion', 'Clothing'],
          isVerified: true,
        },
      },
    },
    include: { businessProfile: true },
  });
  console.log(`✅ Business:    ${dhakaThreadsUser.email}`);

  const newariKitchenUser = await prisma.user.create({
    data: {
      email: 'hello@newari.kitchen',
      phone: '+9779822221104',
      password: bizPw,
      role: Role.BUSINESS,
      isEmailVerified: true,
      isOnboarded: true,
      businessProfile: {
        create: {
          businessName: 'Newari Kitchen',
          description: 'Authentic Newari cuisine restaurant in Bhaktapur. Traditional recipes passed down through generations. Known for Yomari, Chatamari, and Samay Baji sets.',
          website: 'https://newari.kitchen',
          categories: ['Food', 'Restaurant'],
          isVerified: true,
        },
      },
    },
    include: { businessProfile: true },
  });
  console.log(`✅ Business:    ${newariKitchenUser.email}`);

  const pokharaParadiseUser = await prisma.user.create({
    data: {
      email: 'stay@pokharaparadise.com.np',
      phone: '+9779822221105',
      password: bizPw,
      role: Role.BUSINESS,
      isEmailVerified: true,
      isOnboarded: true,
      businessProfile: {
        create: {
          businessName: 'Pokhara Paradise Hotel',
          description: 'Luxury lakeside hotel in Pokhara with panoramic Annapurna views. Infinity pool, spa, and award-winning restaurant. Perfect for honeymoons and corporate retreats.',
          website: 'https://pokharaparadise.com.np',
          categories: ['Hotel', 'Hospitality'],
          isVerified: true,
        },
      },
    },
    include: { businessProfile: true },
  });
  console.log(`✅ Business:    ${pokharaParadiseUser.email}`);

  const himalayanGlowUser = await prisma.user.create({
    data: {
      email: 'hello@himalayanglow.com.np',
      phone: '+9779822221106',
      password: bizPw,
      role: Role.BUSINESS,
      isEmailVerified: true,
      isOnboarded: true,
      businessProfile: {
        create: {
          businessName: 'Himalayan Glow',
          description: 'Natural skincare brand using Himalayan herbs and ingredients. Turmeric glow serum, saffron moisturizer, and yak butter lip balm. Cruelty-free and dermatologist tested.',
          website: 'https://himalayanglow.com.np',
          categories: ['Beauty', 'Skincare'],
          isVerified: true,
        },
      },
    },
    include: { businessProfile: true },
  });
  console.log(`✅ Business:    ${himalayanGlowUser.email}`);

  const ktmMusicFestUser = await prisma.user.create({
    data: {
      email: 'events@ktmmusicfest.com.np',
      phone: '+9779822221107',
      password: bizPw,
      role: Role.BUSINESS,
      isEmailVerified: true,
      isOnboarded: true,
      businessProfile: {
        create: {
          businessName: 'KTM Music Fest',
          description: 'Nepal\'s biggest independent music festival bringing together 50+ artists across rock, hip-hop, jazz, and folk genres. Annual event held at Tundikhel, Kathmandu.',
          website: 'https://ktmmusicfest.com.np',
          categories: ['Events', 'Entertainment'],
          isVerified: true,
        },
      },
    },
    include: { businessProfile: true },
  });
  console.log(`✅ Business:    ${ktmMusicFestUser.email}`);

  const technovaUser = await prisma.user.create({
    data: {
      email: 'hello@technova.com.np',
      phone: '+9779822221108',
      password: bizPw,
      role: Role.BUSINESS,
      isEmailVerified: true,
      isOnboarded: true,
      businessProfile: {
        create: {
          businessName: 'TechNova Nepal',
          description: 'Nepal\'s leading consumer electronics retailer with 20+ stores nationwide. Laptops, smartphones, smart home devices, and accessories at competitive prices.',
          website: 'https://technova.com.np',
          categories: ['Technology', 'Electronics'],
          isVerified: true,
        },
      },
    },
    include: { businessProfile: true },
  });
  console.log(`✅ Business:    ${technovaUser.email}`);

  // ── Campaigns ─────────────────────────────────────────────────────────────────
  console.log('\n🎯 Creating campaigns...\n');

  const oneWeek  = (n = 1) => new Date(Date.now() + n * 7 * 24 * 60 * 60 * 1000);

  if (momoHouseUser.businessProfile) {
    const bizId = momoHouseUser.businessProfile.id;

    await prisma.campaign.create({
      data: {
        businessId:    bizId,
        template:      'Food',
        title:         'Momo House — Authentic Taste, Real Stories',
        description:   "We're looking for passionate food creators to visit Momo House Kathmandu and share their authentic dining experience. Enjoy our 12 varieties of dumplings and create content that inspires your audience to visit us.\n\nCampaign Goals: More Customers, Social Media Content\nLocation: Kathmandu",
        category:      'Food',
        goals:         ['More Customers', 'Social Media Content'],
        platform:      'Instagram',
        minFollowers:  5000,
        contentType:   'More Customers',
        deliverables:  '2 Reel, 3 Story, 2 Photo Post, 1 Mention in Caption, 1 Tag Business',
        deadline:      oneWeek(3),
        location:      'Kathmandu, Nepal',
        budgetMin:     5000,
        budgetMax:     15000,
        paymentType:   'Fixed Fee',
        creatorsNeeded: 3,
        status:        CampaignStatus.ACTIVE,
        isFeatured:    true,
      },
    });

    await prisma.campaign.create({
      data: {
        businessId:    bizId,
        template:      'Food',
        title:         'Momo House New Branch — Lalitpur Grand Opening',
        description:   "We're opening our 4th branch in Lalitpur and want creators to help spread the word! Visit us on opening day, experience our full menu, and share your genuine experience with your audience.\n\nCampaign Goals: Brand Awareness, Event Promotion\nLocation: Lalitpur",
        category:      'Food',
        goals:         ['Brand Awareness', 'Event Promotion'],
        platform:      'TikTok',
        minFollowers:  3000,
        contentType:   'Brand Awareness',
        deliverables:  '2 Reel, 5 Story, 1 Event Coverage Video, 1 Tag Business',
        deadline:      oneWeek(2),
        location:      'Lalitpur, Nepal',
        budgetMin:     5000,
        budgetMax:     15000,
        paymentType:   'Fixed Fee',
        creatorsNeeded: 5,
        status:        CampaignStatus.ACTIVE,
        isFeatured:    false,
      },
    });
  }

  if (himalayaBrewUser.businessProfile) {
    const bizId = himalayaBrewUser.businessProfile.id;

    await prisma.campaign.create({
      data: {
        businessId:    bizId,
        template:      'Food',
        title:         'Himalaya Brew — Where Coffee Meets the Mountains',
        description:   "We're inviting lifestyle and food creators to experience our cafe's single-origin Nepali coffee, cozy ambiance, and Himalayan-inspired menu. Create beautiful content that brings our brand to life on social media.\n\nCampaign Goals: Brand Awareness, Social Media Content\nLocation: Kathmandu",
        category:      'Food',
        goals:         ['Brand Awareness', 'Social Media Content'],
        platform:      'Instagram',
        minFollowers:  4000,
        contentType:   'Brand Awareness',
        deliverables:  '2 Reel, 2 Story, 3 Photo Post, 1 Carousel Post, 1 Mention in Caption',
        deadline:      oneWeek(4),
        location:      'Thamel, Kathmandu',
        budgetMin:     5000,
        budgetMax:     15000,
        paymentType:   'Fixed Fee',
        creatorsNeeded: 2,
        status:        CampaignStatus.ACTIVE,
        isFeatured:    true,
      },
    });

    await prisma.campaign.create({
      data: {
        businessId:    bizId,
        template:      'Food',
        title:         'Himalaya Brew — Free Coffee for a Facebook Review',
        description:   "Love coffee? Visit Himalaya Brew Cafe in Thamel, enjoy a complimentary drink, and share your honest experience on Facebook.\n\nCampaign Goals: More Customers, User Generated Content",
        category:      'Food',
        goals:         ['More Customers', 'User Generated Content'],
        platform:      'Facebook',
        minFollowers:  1000,
        contentType:   'More Customers',
        deliverables:  '1 Facebook Post, 1 Story, 1 Google Review, 1 Tag Business',
        deadline:      oneWeek(6),
        location:      'Thamel, Kathmandu',
        budgetMin:     0,
        budgetMax:     0,
        paymentType:   'Product Exchange',
        creatorsNeeded: 10,
        status:        CampaignStatus.ACTIVE,
        isFeatured:    false,
      },
    });
  }

  if (dhakaThreadsUser.businessProfile) {
    const bizId = dhakaThreadsUser.businessProfile.id;

    await prisma.campaign.create({
      data: {
        businessId:    bizId,
        template:      'Fashion',
        title:         'Dhaka Threads — Wear Nepal, Share Nepal',
        description:   "We're looking for fashion creators to model and promote our latest Dashain collection — traditional Dhaka weave reimagined for modern wardrobes. Showcase our pieces in your signature style and help us reach fashion-forward audiences across Nepal.\n\nCampaign Goals: Brand Awareness, Product Launch, Social Media Content",
        category:      'Fashion',
        goals:         ['Brand Awareness', 'Product Launch', 'Social Media Content'],
        platform:      'Instagram',
        minFollowers:  8000,
        contentType:   'Brand Awareness',
        deliverables:  '2 Reel, 3 Story, 2 Photo Post, 1 Carousel Post, 1 Mention in Caption, 1 Tag Business',
        deadline:      oneWeek(5),
        location:      'Remote',
        budgetMin:     15000,
        budgetMax:     50000,
        paymentType:   'Fixed Fee',
        creatorsNeeded: 4,
        status:        CampaignStatus.ACTIVE,
        isFeatured:    true,
      },
    });

    await prisma.campaign.create({
      data: {
        businessId:    bizId,
        template:      'Fashion',
        title:         'Dhaka Threads — Student Style Challenge',
        description:   "Show us how you style our Dhaka tote bag and kurta for campus life! We're partnering with student creators to reach college audiences across Nepal.\n\nCampaign Goals: More Customers, User Generated Content",
        category:      'Fashion',
        goals:         ['More Customers', 'User Generated Content'],
        platform:      'TikTok',
        minFollowers:  2000,
        contentType:   'More Customers',
        deliverables:  '1 Reel, 2 Story, 1 Photo Post, 1 Tag Business',
        deadline:      oneWeek(3),
        location:      'Remote',
        budgetMin:     5000,
        budgetMax:     15000,
        paymentType:   'Fixed Fee',
        creatorsNeeded: 8,
        status:        CampaignStatus.ACTIVE,
        isFeatured:    false,
      },
    });
  }

  if (newariKitchenUser.businessProfile) {
    const bizId = newariKitchenUser.businessProfile.id;

    await prisma.campaign.create({
      data: {
        businessId:    bizId,
        template:      'Food',
        title:         'Newari Kitchen — A Feast of Tradition',
        description:   "Experience the rich flavors of authentic Newari cuisine at our Bhaktapur restaurant. We're looking for food creators to document the full Samay Baji experience and share it with their audience.\n\nCampaign Goals: Brand Awareness, More Customers\nLocation: Bhaktapur",
        category:      'Food',
        goals:         ['Brand Awareness', 'More Customers'],
        platform:      'Instagram',
        minFollowers:  3000,
        contentType:   'Brand Awareness',
        deliverables:  '2 Reel, 3 Story, 1 Photo Post, 1 Visit Store, 1 Tag Business, 1 Google Review',
        deadline:      oneWeek(4),
        location:      'Bhaktapur, Nepal',
        budgetMin:     5000,
        budgetMax:     15000,
        paymentType:   'Fixed Fee',
        creatorsNeeded: 3,
        status:        CampaignStatus.ACTIVE,
        isFeatured:    false,
      },
    });
  }

  if (pokharaParadiseUser.businessProfile) {
    const bizId = pokharaParadiseUser.businessProfile.id;

    await prisma.campaign.create({
      data: {
        businessId:    bizId,
        template:      'Travel',
        title:         'Pokhara Paradise — Luxury Stay & Annapurna Views',
        description:   "We're partnering with travel creators for a complimentary 2-night stay at our lakeside hotel. Capture your journey, showcase our infinity pool and mountain views, and inspire your audience to book their perfect Pokhara getaway.\n\nCampaign Goals: Brand Awareness, More Customers\nLocation: Pokhara",
        category:      'Travel',
        goals:         ['Brand Awareness', 'More Customers'],
        platform:      'Instagram',
        minFollowers:  15000,
        contentType:   'Brand Awareness',
        deliverables:  '2 Reel, 5 Story, 3 Photo Post, 1 Carousel Post, 1 Mention in Caption',
        deadline:      oneWeek(6),
        location:      'Pokhara, Nepal',
        budgetMin:     15000,
        budgetMax:     50000,
        paymentType:   'Fixed Fee',
        creatorsNeeded: 2,
        status:        CampaignStatus.ACTIVE,
        isFeatured:    true,
      },
    });

    await prisma.campaign.create({
      data: {
        businessId:    bizId,
        template:      'Travel',
        title:         'Pokhara Paradise — Weekend Couples Retreat Vlog',
        description:   "Promote our romantic weekend package for couples — sunset paragliding, candlelit dinner, and spa session. Looking for YouTube travel vloggers who capture love and travel beautifully.\n\nCampaign Goals: Brand Awareness, Social Media Content",
        category:      'Travel',
        goals:         ['Brand Awareness', 'Social Media Content'],
        platform:      'YouTube',
        minFollowers:  10000,
        contentType:   'Brand Awareness',
        deliverables:  '1 Full Vlog, 2 YouTube Shorts, 1 Community Post',
        deadline:      oneWeek(5),
        location:      'Pokhara, Nepal',
        budgetMin:     15000,
        budgetMax:     50000,
        paymentType:   'Fixed Fee',
        creatorsNeeded: 2,
        status:        CampaignStatus.ACTIVE,
        isFeatured:    false,
      },
    });

    await prisma.campaign.create({
      data: {
        businessId:    bizId,
        template:      'Travel',
        title:         'Pokhara Paradise — Facebook Community Campaign',
        description:   "Reach our core audience on Facebook! Share photos and experiences from your stay at Pokhara Paradise Hotel. We're targeting families and couples aged 30-50 who plan group travel.\n\nCampaign Goals: More Customers, Brand Awareness",
        category:      'Travel',
        goals:         ['More Customers', 'Brand Awareness'],
        platform:      'Facebook',
        minFollowers:  5000,
        contentType:   'More Customers',
        deliverables:  '2 Facebook Posts, 3 Stories, 1 Photo Album, 1 Tag Business',
        deadline:      oneWeek(4),
        location:      'Pokhara, Nepal',
        budgetMin:     5000,
        budgetMax:     15000,
        paymentType:   'Fixed Fee',
        creatorsNeeded: 3,
        status:        CampaignStatus.ACTIVE,
        isFeatured:    false,
      },
    });
  }

  if (himalayanGlowUser.businessProfile) {
    const bizId = himalayanGlowUser.businessProfile.id;

    await prisma.campaign.create({
      data: {
        businessId:    bizId,
        template:      'Beauty',
        title:         'Himalayan Glow — 30-Day Turmeric Serum Challenge',
        description:   "Document your skin transformation using our Himalayan Turmeric Glow Serum for 30 days. We want authentic before/after content that resonates with South Asian skin tones.\n\nCampaign Goals: Product Launch, User Generated Content, Brand Awareness",
        category:      'Beauty',
        goals:         ['Product Launch', 'User Generated Content', 'Brand Awareness'],
        platform:      'Instagram',
        minFollowers:  6000,
        contentType:   'Product Launch',
        deliverables:  '2 Reel, 4 Story, 2 Photo Post, 1 Product Review Video, 1 Mention in Caption',
        deadline:      oneWeek(8),
        location:      'Remote',
        budgetMin:     15000,
        budgetMax:     50000,
        paymentType:   'Fixed Fee',
        creatorsNeeded: 5,
        status:        CampaignStatus.ACTIVE,
        isFeatured:    true,
      },
    });

    await prisma.campaign.create({
      data: {
        businessId:    bizId,
        template:      'Beauty',
        title:         'Himalayan Glow — Yak Butter Lip Balm Launch',
        description:   "Our new Yak Butter Lip Balm is here — 100% natural, deeply nourishing, and perfect for Nepal's dry climate. We're gifting the product in exchange for honest reviews.\n\nCampaign Goals: Product Launch, Social Media Content",
        category:      'Beauty',
        goals:         ['Product Launch', 'Social Media Content'],
        platform:      'TikTok',
        minFollowers:  2000,
        contentType:   'Product Launch',
        deliverables:  '1 Reel, 2 Story, 1 Product Review Video, 1 Tag Business',
        deadline:      oneWeek(4),
        location:      'Remote',
        budgetMin:     0,
        budgetMax:     0,
        paymentType:   'Product Exchange',
        creatorsNeeded: 15,
        status:        CampaignStatus.ACTIVE,
        isFeatured:    false,
      },
    });
  }

  if (ktmMusicFestUser.businessProfile) {
    const bizId = ktmMusicFestUser.businessProfile.id;

    await prisma.campaign.create({
      data: {
        businessId:    bizId,
        template:      'Entertainment',
        title:         'KTM Music Fest 2026 — Coverage Creators Wanted',
        description:   "Nepal's biggest music festival is back! We're looking for creators to cover KTM Music Fest 2026 — capture performances, backstage moments, crowd energy, and the festival vibe. Complimentary VIP passes provided.\n\nCampaign Goals: Event Promotion, Brand Awareness, Social Media Content",
        category:      'Entertainment',
        goals:         ['Event Promotion', 'Brand Awareness', 'Social Media Content'],
        platform:      'Instagram',
        minFollowers:  10000,
        contentType:   'Event Promotion',
        deliverables:  '3 Reel, 8 Story, 2 Photo Post, 1 Event Coverage Video, 1 Carousel Post',
        deadline:      oneWeek(3),
        location:      'Tundikhel, Kathmandu',
        budgetMin:     15000,
        budgetMax:     50000,
        paymentType:   'Fixed Fee',
        creatorsNeeded: 6,
        status:        CampaignStatus.ACTIVE,
        isFeatured:    true,
      },
    });

    await prisma.campaign.create({
      data: {
        businessId:    bizId,
        template:      'Entertainment',
        title:         'KTM Music Fest — Pre-Event Hype Campaign',
        description:   "Help us build hype for KTM Music Fest 2026! Share the lineup, create countdown content, and get your audience excited. Free entry tickets for selected creators.\n\nCampaign Goals: Event Promotion, More Customers",
        category:      'Entertainment',
        goals:         ['Event Promotion', 'More Customers'],
        platform:      'TikTok',
        minFollowers:  5000,
        contentType:   'Event Promotion',
        deliverables:  '2 Reel, 5 Story, 1 Mention in Caption, 1 Tag Business',
        deadline:      oneWeek(2),
        location:      'Remote',
        budgetMin:     5000,
        budgetMax:     15000,
        paymentType:   'Fixed Fee',
        creatorsNeeded: 10,
        status:        CampaignStatus.ACTIVE,
        isFeatured:    false,
      },
    });

    await prisma.campaign.create({
      data: {
        businessId:    bizId,
        template:      'Entertainment',
        title:         'KTM Music Fest — YouTube Documentary Series',
        description:   "We want YouTube creators to produce a mini-documentary series around KTM Music Fest 2026 — artist interviews, behind-the-scenes, and crowd stories. This is your chance to produce long-form festival content with full access.\n\nCampaign Goals: Brand Awareness, Social Media Content",
        category:      'Entertainment',
        goals:         ['Brand Awareness', 'Social Media Content'],
        platform:      'YouTube',
        minFollowers:  20000,
        contentType:   'Brand Awareness',
        deliverables:  '3 YouTube Videos (10+ min each), 5 YouTube Shorts, 1 Community Post',
        deadline:      oneWeek(4),
        location:      'Tundikhel, Kathmandu',
        budgetMin:     15000,
        budgetMax:     50000,
        paymentType:   'Fixed Fee',
        creatorsNeeded: 2,
        status:        CampaignStatus.ACTIVE,
        isFeatured:    false,
      },
    });

    await prisma.campaign.create({
      data: {
        businessId:    bizId,
        template:      'Entertainment',
        title:         'KTM Music Fest — Facebook Event Promotion',
        description:   "Help us spread the word on Facebook! Create buzz for KTM Music Fest 2026 by sharing posts, creating event coverage, and engaging with Nepal's biggest Facebook music community.\n\nCampaign Goals: Event Promotion, More Customers",
        category:      'Entertainment',
        goals:         ['Event Promotion', 'More Customers'],
        platform:      'Facebook',
        minFollowers:  3000,
        contentType:   'Event Promotion',
        deliverables:  '3 Facebook Posts, 2 Event Shares, 1 Facebook Live (optional)',
        deadline:      oneWeek(2),
        location:      'Remote',
        budgetMin:     5000,
        budgetMax:     15000,
        paymentType:   'Fixed Fee',
        creatorsNeeded: 8,
        status:        CampaignStatus.ACTIVE,
        isFeatured:    false,
      },
    });
  }

  if (technovaUser.businessProfile) {
    const bizId = technovaUser.businessProfile.id;

    await prisma.campaign.create({
      data: {
        businessId:    bizId,
        template:      'Tech',
        title:         'TechNova X15 Pro — Honest Unboxing & Review',
        description:   "We're launching TechNova X15 Pro — Nepal's most powerful mid-range smartphone at Rs. 45,000. We need tech creators to do an honest unboxing and in-depth review for Nepal's youth audience.\n\nCampaign Goals: Product Launch, Brand Awareness\nLocation: Kathmandu",
        category:      'Tech',
        goals:         ['Product Launch', 'Brand Awareness'],
        platform:      'YouTube',
        minFollowers:  10000,
        contentType:   'Product Launch',
        deliverables:  '1 Full Review Video, 2 YouTube Shorts, 1 Community Post',
        deadline:      oneWeek(4),
        location:      'Kathmandu, Nepal',
        budgetMin:     15000,
        budgetMax:     50000,
        paymentType:   'Fixed Fee',
        creatorsNeeded: 3,
        status:        CampaignStatus.ACTIVE,
        isFeatured:    true,
      },
    });

    await prisma.campaign.create({
      data: {
        businessId:    bizId,
        template:      'Tech',
        title:         'TechNova — Instagram Tech Tips Series',
        description:   "Create engaging Instagram tech tip content featuring TechNova products. Short, punchy reels showing features that matter to everyday Nepali users — camera, battery, gaming performance.\n\nCampaign Goals: Brand Awareness, Social Media Content",
        category:      'Tech',
        goals:         ['Brand Awareness', 'Social Media Content'],
        platform:      'Instagram',
        minFollowers:  8000,
        contentType:   'Brand Awareness',
        deliverables:  '3 Reels, 5 Stories, 2 Carousel Posts, 1 Tag Business',
        deadline:      oneWeek(3),
        location:      'Remote',
        budgetMin:     10000,
        budgetMax:     30000,
        paymentType:   'Fixed Fee',
        creatorsNeeded: 4,
        status:        CampaignStatus.ACTIVE,
        isFeatured:    false,
      },
    });

    await prisma.campaign.create({
      data: {
        businessId:    bizId,
        template:      'Tech',
        title:         'TechNova — Facebook Tech Community Reviews',
        description:   "Reach Nepal's massive Facebook audience with detailed product reviews and comparisons. We want Facebook creators and group admins to share genuine TechNova product experiences with their communities.\n\nCampaign Goals: More Customers, Brand Awareness",
        category:      'Tech',
        goals:         ['More Customers', 'Brand Awareness'],
        platform:      'Facebook',
        minFollowers:  5000,
        contentType:   'More Customers',
        deliverables:  '2 Facebook Posts, 1 Video Review, 1 Product Comparison Post',
        deadline:      oneWeek(5),
        location:      'Kathmandu, Nepal',
        budgetMin:     8000,
        budgetMax:     20000,
        paymentType:   'Fixed Fee',
        creatorsNeeded: 5,
        status:        CampaignStatus.ACTIVE,
        isFeatured:    false,
      },
    });
  }

  const campaignCount = await prisma.campaign.count();
  console.log(`✅ Campaigns:   ${campaignCount} campaigns created`);

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
    { id: 'seed-faq-4', question: 'What types of content can I create?', answer: 'Instagram Reels/Stories/Posts, TikTok videos, YouTube reviews and vlogs, Facebook content, and photography — depending on what the business requests.', category: 'Campaigns', order: 1 },
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
    { id: 'seed-legal-pp-3', type: 'PRIVACY_POLICY', title: '3. Information Sharing', body: 'We share your profile information with businesses when you apply for their campaigns. We do not sell your personal data to third parties.', order: 3 },
    { id: 'seed-legal-pp-4', type: 'PRIVACY_POLICY', title: '4. Data Security', body: 'We use industry-standard encryption and security practices to protect your data. However, no method of transmission over the internet is 100% secure. We encourage you to use a strong, unique password.', order: 4 },
    { id: 'seed-legal-pp-5', type: 'PRIVACY_POLICY', title: '5. Your Rights', body: 'You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at privacy@creatormarket.com.np.', order: 5 },
  ];
  const termsSections = [
    { id: 'seed-legal-tc-1', type: 'TERMS', title: '1. Acceptance of Terms', body: 'By using CreatorMarket you agree to these Terms. If you do not agree, please do not use the platform.', order: 1 },
    { id: 'seed-legal-tc-2', type: 'TERMS', title: '2. Creator Eligibility', body: 'You must be at least 18 years old to use this platform. By registering, you confirm that the information you provide is accurate.', order: 2 },
    { id: 'seed-legal-tc-3', type: 'TERMS', title: '3. Campaign Participation', body: 'When you apply for a campaign and are accepted, you agree to deliver the content as described by the deadline specified.', order: 3 },
    { id: 'seed-legal-tc-4', type: 'TERMS', title: '4. Payments & Fees', body: 'Campaign payments are processed through our escrow system. CreatorMarket charges a 10% platform fee on each completed campaign.', order: 4 },
    { id: 'seed-legal-tc-5', type: 'TERMS', title: '5. Governing Law', body: 'These Terms are governed by the laws of Nepal. Any disputes shall be resolved through arbitration in Kathmandu, Nepal.', order: 5 },
  ];
  const guidelineSections = [
    { id: 'seed-legal-cg-1', type: 'GUIDELINES', icon: '✅', title: 'Be Authentic', body: 'Only promote products or services you genuinely believe in. Disclose all sponsored relationships clearly.', order: 1 },
    { id: 'seed-legal-cg-2', type: 'GUIDELINES', icon: '🤝', title: 'Respect Everyone', body: 'Treat businesses, fellow creators, and platform staff with respect. Harassment or hate speech will result in immediate account suspension.', order: 2 },
    { id: 'seed-legal-cg-3', type: 'GUIDELINES', icon: '⭐', title: 'Maintain Quality', body: "Deliver content that meets the brief's requirements. Low-quality submissions damage everyone's experience.", order: 3 },
    { id: 'seed-legal-cg-4', type: 'GUIDELINES', icon: '🚫', title: 'Prohibited Content', body: 'Do not create content with explicit material, misinformation, or anything that violates applicable laws.', order: 4 },
  ];
  for (const sec of [...privacySections, ...termsSections, ...guidelineSections]) {
    await prisma.legalSection.upsert({ where: { id: sec.id }, update: {}, create: { ...sec, published: true } });
  }
  console.log(`✅ Legal:       ${privacySections.length + termsSections.length + guidelineSections.length} sections seeded`);

  console.log('\n🎉 Seeding complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Admin:    admin@creatormarket.com.np  /  Admin@123456');
  console.log('  Creator:  aarav@example.com           /  Creator@123');
  console.log('  Creator:  srijana@example.com         /  Creator@123');
  console.log('  Creator:  bikash@example.com          /  Creator@123');
  console.log('  Business: hello@momohouse.com.np      /  Business@123');
  console.log('  Business: brand@dhakathreads.com.np   /  Business@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
