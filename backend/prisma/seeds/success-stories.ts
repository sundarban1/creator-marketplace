import { PrismaClient } from '@prisma/client';

// Mix of creators and business owners — Kolab connects both sides, so the
// landing page testimonial strip should reflect that rather than only one.
const SUCCESS_STORIES = [
  {
    id: 'seed-success-story-1',
    name: 'Priya Shrestha',
    role: 'Fashion Creator, Kathmandu',
    quote: 'I used to chase brands on Instagram DMs and get ghosted. On Kolab, businesses come to me with real budgets, and my eSewa payout lands within days of the campaign closing.',
    order: 1,
  },
  {
    id: 'seed-success-story-2',
    name: 'Sujata Rai',
    role: 'Owner, Momo Ghar, Thamel',
    quote: 'We posted one campaign for Dashain specials and had a dozen local creators apply the same day. The Reels they made brought in more walk-ins than any paid ad we’d tried before.',
    order: 2,
  },
  {
    id: 'seed-success-story-3',
    name: 'Bishal Gurung',
    role: 'TikTok Creator',
    quote: 'My first paid collab was a trekking gear brand out of Pokhara. Kolab handled the whole proposal-to-payout flow, so I could just focus on making the video good.',
    order: 3,
  },
  {
    id: 'seed-success-story-4',
    name: 'Rajan Thapa',
    role: 'Owner, Yeti Trail Adventures, Pokhara',
    quote: 'Tourism content is hard to fake — you need creators who actually show up. Kolab’s location filter meant we could find creators already based in Pokhara Lakeside instead of flying someone in.',
    order: 4,
  },
  {
    id: 'seed-success-story-5',
    name: 'Anisha Tamang',
    role: 'Food & Travel Creator',
    quote: 'Between Kathmandu and Chitwan I’ve worked with six cafes and two homestays through Kolab. Every proposal, every payment, every message — it’s all in one place.',
    order: 5,
  },
  {
    id: 'seed-success-story-6',
    name: 'Dipesh Lama',
    role: 'Owner, Himal Roastery, Boudha',
    quote: 'We’re a small roastery, not a big brand with an ad budget. Kolab let us run our first-ever creator campaign for less than what one Facebook boost used to cost us.',
    order: 6,
  },
  {
    id: 'seed-success-story-7',
    name: 'Nisha Maharjan',
    role: 'Beauty & Skincare Creator',
    quote: 'My creator score kept opening better campaigns for me — brands started shortlisting me directly instead of me applying blind. That never happened on Instagram alone.',
    order: 7,
  },
  {
    id: 'seed-success-story-8',
    name: 'Sabina Karki',
    role: 'YouTube Vlogger, Kathmandu Valley',
    quote: 'I was skeptical about a platform handling payments for me, but Khalti payout hit my account five days after the business confirmed delivery, exactly like Kolab said it would.',
    order: 8,
  },
  {
    id: 'seed-success-story-9',
    name: 'Prakash Shahi',
    role: 'Fitness Creator',
    quote: 'A gym in Baneshwor found me through Kolab’s category filter for fitness creators. Three months later they’re still one of my regular brand partners.',
    order: 9,
  },
  {
    id: 'seed-success-story-10',
    name: 'Alisha Basnet',
    role: 'Micro-influencer, Instagram Reels',
    quote: 'I only have a few thousand followers, but a boutique in Thamel picked me anyway because my audience was actually local. Kolab is the first platform that didn’t make follower count the whole story.',
    order: 10,
  },
];

export async function seedSuccessStories(prisma: PrismaClient) {
  await Promise.all(
    SUCCESS_STORIES.map(({ id, ...s }) =>
      prisma.successStory.upsert({
        where:  { id },
        update: { ...s, status: 'ACTIVE' },
        create: { id, ...s, status: 'ACTIVE' },
      }),
    ),
  );
  console.log(`  ✅ Success stories: ${SUCCESS_STORIES.length} seeded`);
}
