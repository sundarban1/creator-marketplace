import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function seedUsers(prisma: PrismaClient) {
  const creatorPw = await bcrypt.hash('Creator@123', 12);
  const bizPw     = await bcrypt.hash('Business@123', 12);
  const adminPw   = await bcrypt.hash('Admin@123456', 12);

  // ── Admin ─────────────────────────────────────────────────────────────────
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
  console.log(`  ✅ Admin:    ${admin.email}  /  Admin@123456`);

  // ── Creators ──────────────────────────────────────────────────────────────
  const creators = await Promise.all([
    prisma.user.create({
      data: {
        email: 'aarav@example.com', phone: '+9779811111101',
        password: creatorPw, role: Role.CREATOR,
        isEmailVerified: true, isOnboarded: true,
        creatorProfile: {
          create: {
            fullName: 'Aarav Sharma',
            bio: 'Food and lifestyle creator based in Kathmandu. Sharing authentic reviews of local restaurants, cafes, and street food. 80K+ followers across platforms.',
            location: 'Kathmandu, Nepal',
            categories: ['Food', 'Lifestyle'],
            socialLinks: { instagram: '@aaraveatskth', tiktok: '@aaravktm', youtube: 'Aarav Eats', facebook: 'Aarav Sharma' },
            portfolioLinks: [
              { id: '1', label: 'Restaurant Reel', url: 'https://instagram.com/reel/sample1' },
              { id: '2', label: 'Cafe Review',     url: 'https://youtube.com/watch?v=sample2' },
            ],
            isVerified: true,
          },
        },
      },
    }),

    prisma.user.create({
      data: {
        email: 'srijana@example.com', phone: '+9779811111102',
        password: creatorPw, role: Role.CREATOR,
        isEmailVerified: true, isOnboarded: true,
        creatorProfile: {
          create: {
            fullName: 'Srijana Tamang',
            bio: 'Fashion and lifestyle creator from Pokhara. Aesthetic content around fashion, beauty, and Nepali culture. 45K Instagram followers.',
            location: 'Pokhara, Nepal',
            categories: ['Fashion', 'Lifestyle', 'Beauty'],
            socialLinks: { instagram: '@srijanastyle', tiktok: '@srijanatamang' },
            portfolioLinks: [{ id: '1', label: 'Outfit Reel', url: 'https://instagram.com/reel/sample3' }],
            isVerified: true,
          },
        },
      },
    }),

    prisma.user.create({
      data: {
        email: 'bikash@example.com', phone: '+9779811111103',
        password: creatorPw, role: Role.CREATOR,
        isEmailVerified: true, isOnboarded: true,
        creatorProfile: {
          create: {
            fullName: 'Bikash Thapa',
            bio: 'Travel vlogger exploring hidden gems of Nepal. Trekking, adventure sports, and cultural experiences. 120K YouTube subscribers.',
            location: 'Kathmandu, Nepal',
            categories: ['Travel', 'Adventure', 'Lifestyle'],
            socialLinks: { youtube: 'Bikash Explores Nepal', instagram: '@bikashexplores', tiktok: '@bikashtravel' },
            portfolioLinks: [
              { id: '1', label: 'Annapurna Vlog', url: 'https://youtube.com/watch?v=sample4' },
              { id: '2', label: 'Pokhara Reel',   url: 'https://instagram.com/reel/sample5' },
            ],
            isVerified: true,
          },
        },
      },
    }),

    prisma.user.create({
      data: {
        email: 'nisha@example.com', phone: '+9779811111104',
        password: creatorPw, role: Role.CREATOR,
        isEmailVerified: true, isOnboarded: true,
        creatorProfile: {
          create: {
            fullName: 'Nisha Rai',
            bio: 'Fitness and wellness creator sharing workout routines, healthy recipes, and mindful living tips. Certified personal trainer. 30K followers.',
            location: 'Kathmandu, Nepal',
            categories: ['Fitness', 'Wellness', 'Food'],
            socialLinks: { instagram: '@nishafitsnepal', tiktok: '@nisharai.fit' },
            portfolioLinks: [],
            isVerified: false,
          },
        },
      },
    }),

    prisma.user.create({
      data: {
        email: 'rohan@example.com', phone: '+9779811111105',
        password: creatorPw, role: Role.CREATOR,
        isEmailVerified: true, isOnboarded: true,
        creatorProfile: {
          create: {
            fullName: 'Rohan Gurung',
            bio: 'Tech reviewer covering smartphones, gadgets, and apps for the Nepali market. Honest, detailed, and beginner-friendly reviews. 55K YouTube subscribers.',
            location: 'Kathmandu, Nepal',
            categories: ['Technology', 'Gaming'],
            socialLinks: { youtube: 'Rohan Tech Nepal', instagram: '@rohantech.np', tiktok: '@rohantechktm' },
            portfolioLinks: [{ id: '1', label: 'Phone Review', url: 'https://youtube.com/watch?v=sample6' }],
            isVerified: true,
          },
        },
      },
    }),
  ]);
  console.log(`  ✅ Creators: ${creators.length} created`);

  // ── Businesses ────────────────────────────────────────────────────────────
  const businesses = await Promise.all([
    prisma.user.create({
      data: {
        email: 'hello@momohouse.com.np', phone: '+9779822221101',
        password: bizPw, role: Role.BUSINESS,
        isEmailVerified: true, isOnboarded: true,
        businessProfile: { create: { businessName: 'Momo House Kathmandu', description: "Kathmandu's most-loved momo restaurant since 2010. Serving authentic Nepali and Tibetan dumplings with 12 varieties. Multiple branches across the valley.", website: 'https://momohouse.com.np', categories: ['Food', 'Restaurant'], isVerified: true } },
      },
      include: { businessProfile: true },
    }),

    prisma.user.create({
      data: {
        email: 'info@himalayabrew.com.np', phone: '+9779822221102',
        password: bizPw, role: Role.BUSINESS,
        isEmailVerified: true, isOnboarded: true,
        businessProfile: { create: { businessName: 'Himalaya Brew Cafe', description: 'Specialty coffee cafe in Thamel sourcing beans directly from Nepali highland farms. Cozy ambiance with mountain views.', website: 'https://himalayabrew.com.np', categories: ['Cafe', 'Coffee'], isVerified: true } },
      },
      include: { businessProfile: true },
    }),

    prisma.user.create({
      data: {
        email: 'brand@dhakathreads.com.np', phone: '+9779822221103',
        password: bizPw, role: Role.BUSINESS,
        isEmailVerified: true, isOnboarded: true,
        businessProfile: { create: { businessName: 'Dhaka Threads', description: 'Contemporary Nepali clothing brand blending traditional Dhaka weave with modern fashion. Sustainable, handcrafted, and proudly made in Nepal.', website: 'https://dhakathreads.com.np', categories: ['Fashion', 'Clothing'], isVerified: true } },
      },
      include: { businessProfile: true },
    }),

    prisma.user.create({
      data: {
        email: 'hello@newari.kitchen', phone: '+9779822221104',
        password: bizPw, role: Role.BUSINESS,
        isEmailVerified: true, isOnboarded: true,
        businessProfile: { create: { businessName: 'Newari Kitchen', description: 'Authentic Newari cuisine in Bhaktapur. Traditional recipes passed down through generations. Known for Yomari, Chatamari, and Samay Baji sets.', website: 'https://newari.kitchen', categories: ['Food', 'Restaurant'], isVerified: true } },
      },
      include: { businessProfile: true },
    }),

    prisma.user.create({
      data: {
        email: 'stay@pokharaparadise.com.np', phone: '+9779822221105',
        password: bizPw, role: Role.BUSINESS,
        isEmailVerified: true, isOnboarded: true,
        businessProfile: { create: { businessName: 'Pokhara Paradise Hotel', description: 'Luxury lakeside hotel in Pokhara with panoramic Annapurna views. Infinity pool, spa, and award-winning restaurant.', website: 'https://pokharaparadise.com.np', categories: ['Hotel', 'Hospitality'], isVerified: true } },
      },
      include: { businessProfile: true },
    }),

    prisma.user.create({
      data: {
        email: 'hello@himalayanglow.com.np', phone: '+9779822221106',
        password: bizPw, role: Role.BUSINESS,
        isEmailVerified: true, isOnboarded: true,
        businessProfile: { create: { businessName: 'Himalayan Glow', description: 'Natural skincare brand using Himalayan herbs and ingredients. Turmeric serum, saffron moisturizer, and yak butter lip balm. Cruelty-free.', website: 'https://himalayanglow.com.np', categories: ['Beauty', 'Skincare'], isVerified: true } },
      },
      include: { businessProfile: true },
    }),

    prisma.user.create({
      data: {
        email: 'events@ktmmusicfest.com.np', phone: '+9779822221107',
        password: bizPw, role: Role.BUSINESS,
        isEmailVerified: true, isOnboarded: true,
        businessProfile: { create: { businessName: 'KTM Music Fest', description: "Nepal's biggest independent music festival — 50+ artists across rock, hip-hop, jazz, and folk. Annual event at Tundikhel, Kathmandu.", website: 'https://ktmmusicfest.com.np', categories: ['Events', 'Entertainment'], isVerified: true } },
      },
      include: { businessProfile: true },
    }),

    prisma.user.create({
      data: {
        email: 'hello@technova.com.np', phone: '+9779822221108',
        password: bizPw, role: Role.BUSINESS,
        isEmailVerified: true, isOnboarded: true,
        businessProfile: { create: { businessName: 'TechNova Nepal', description: "Nepal's leading consumer electronics retailer with 20+ stores nationwide. Laptops, smartphones, smart home devices, and accessories.", website: 'https://technova.com.np', categories: ['Technology', 'Electronics'], isVerified: true } },
      },
      include: { businessProfile: true },
    }),
  ]);
  console.log(`  ✅ Businesses: ${businesses.length} created`);

  return { businesses };
}
