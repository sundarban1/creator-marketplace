import { BadgeCheck, Compass, Filter, Sparkles, Star } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList } from '../components/ContentBlocks';
import { organizationSchema, webPageSchema } from '../../../lib/seo/schema';

const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'Facebook', 'Twitter / X', 'LinkedIn', 'Pinterest', 'Snapchat', 'Twitch'];
const CATEGORIES = [
  'Food & Beverage', 'Travel', 'Fashion', 'Beauty', 'Fitness & Health', 'Gaming', 'Technology', 'Education',
  'Lifestyle', 'Home & Living', 'Music', 'Art & Design', 'Finance', 'Photography', 'Sports', 'Entertainment',
];

export function InfluencersPage() {
  return (
    <ContentPageLayout
      seo={{
        title: 'Influencers in Nepal | Discover Verified Creators',
        description: 'Kolab connects Nepali brands with verified influencers across TikTok, Instagram, YouTube, and Facebook. Discover creators and collaborate on paid campaigns.',
        path: '/influencers',
        keywords: ['influencer Nepal', 'Nepal influencers', 'Nepali influencers', 'influencer platform Nepal', 'social media influencer Nepal'],
        jsonLd: [organizationSchema(), webPageSchema({ path: '/influencers', title: 'Influencers in Nepal | Kolab', description: "Discover verified influencers across Nepal on Kolab's creator marketplace." })],
      }}
      breadcrumb={[{ name: 'Home', path: '/' }, { name: 'Influencers', path: '/influencers' }]}
      icon={Star}
      eyebrow="Influencers in Nepal"
      heading="Discover Influencers in Nepal"
      intro="Looking for influencers in Nepal? Kolab is where verified influencers across TikTok, Instagram, YouTube, and Facebook are actually discoverable — filterable by category, platform, and city — instead of a manual scroll through hashtags and guesswork."
      faqs={[
        {
          question: 'How do I find influencers in Nepal on Kolab?',
          answer: 'Browse the creator marketplace and filter by category (fashion, food, tech, fitness, and more), platform (TikTok, Instagram, YouTube, Facebook, and others), and location anywhere in Nepal. You can message a creator directly or post a campaign for influencers to apply to.',
        },
        {
          question: 'What counts as an "influencer" on Kolab?',
          answer: "Any content creator with an active audience on a supported platform — from niche micro-influencers with a highly engaged following to larger creators with reach across several cities. There's no fixed follower threshold; brands match on niche fit as much as follower count.",
        },
        {
          question: 'Are the influencers on Kolab verified?',
          answer: 'Yes. Every creator profile goes through identity verification, confirmed with a citizenship document plus email and phone checks, before it appears on the marketplace.',
        },
        {
          question: 'Can I discover influencers on a specific platform, like TikTok or Facebook?',
          answer: "Yes — filter by platform to see influencers active on TikTok, Instagram, YouTube, Facebook, and more, or browse Kolab's platform-specific pages for a focused view of each one.",
        },
        {
          question: 'How do I actually collaborate with an influencer I find?',
          answer: "Send a collaboration request directly, or post a paid campaign or free open event with your requirements and let interested influencers apply with a proposal. Either way, you message and finalize details directly in-app.",
        },
        {
          question: 'Is discovering influencers on Kolab free?',
          answer: 'Yes — Kolab is a free download, and browsing and filtering the creator marketplace costs nothing. You only set a budget if and when you post a paid campaign.',
        },
      ]}
      related={[
        { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: "Kolab's full creator marketplace overview." },
        { label: 'For Brands', path: '/brands', description: 'Post a campaign and hire verified creators.' },
        { label: 'For Content Creators', path: '/content-creators', description: 'Are you a creator? Start here.' },
        { label: 'Find Campaigns', path: '/find-campaigns', description: 'See open campaigns creators can apply to.' },
      ]}
      cta={{ heading: 'Discover Influencers in Nepal', sub: 'Download Kolab to browse verified creator profiles.' }}
    >
      <ContentSection heading="Where do you actually find influencers in Nepal?">
        <p>
          The usual way brands find influencers in Nepal is manual: scroll a platform's explore tab, search a
          hashtag, ask around, and hope the person you land on actually responds — with no visibility into whether
          they've worked with brands before, what they charge, or whether they're even a real, verified account.
          It works occasionally, but it doesn't scale past one or two collaborations.
        </p>
        <p>
          Kolab turns that scroll-and-hope process into an actual discovery flow. Instead of searching one platform
          at a time, you're browsing a single marketplace of influencers across every major platform, filterable by
          exactly what your campaign needs — category, platform, and city — with verified identities and a
          transparent history behind every profile.
        </p>
      </ContentSection>

      <ContentSection heading="Discover influencers by what your campaign needs">
        <BenefitGrid
          items={[
            { icon: Filter, title: 'Filter by category', desc: `Narrow to influencers in your niche — ${CATEGORIES.slice(0, 6).join(', ')}, and more.` },
            { icon: Compass, title: 'Filter by platform', desc: `Find influencers active on ${PLATFORMS.slice(0, 4).join(', ')}, or any of the other supported platforms.` },
            { icon: Sparkles, title: 'Filter by city', desc: 'Discover influencers in Kathmandu, Pokhara, Lalitpur, Bhaktapur, Butwal, Biratnagar, Dharan, Chitwan, or Nepalgunj.' },
            { icon: BadgeCheck, title: 'Verified profiles only', desc: 'Every influencer completes identity verification before their profile is visible on the marketplace.' },
          ]}
        />
      </ContentSection>

      <ContentSection heading="Two ways to start a collaboration">
        <p>
          Once you've found influencers that fit, there are two ways to move forward. Reach out directly to a
          specific profile with a collaboration request, or post a paid campaign or free open event with your
          budget, category, and platform requirements visible, and let interested influencers come to you with
          proposals. Larger outreach efforts usually work better as a posted campaign; a specific influencer you
          already have in mind is easier to approach directly.
        </p>
        <ContentList
          items={[
            'Browse and filter the influencer marketplace by category, platform, and city.',
            'Review a profile\'s platforms, category focus, and past collaboration history.',
            'Message a specific influencer directly, or post a campaign for influencers to apply to.',
            'Agree on deliverables and timeline in-app before any budget moves.',
            'Pay through escrow, released only once you approve the completed work.',
          ]}
        />
      </ContentSection>

      <ContentSection heading="Built on trust, not just follower counts">
        <p>
          Follower count alone doesn't tell you whether an influencer will actually deliver, respond, or represent
          your brand well — which is why every part of the collaboration on Kolab is built around verifiable trust
          instead. Identity is confirmed with a citizenship document plus email and phone checks, payments on paid
          campaigns are held in escrow until you approve the work, and every collaboration ends with an honest,
          visible review from both sides — so an influencer's reputation on Kolab is something you can actually
          check before you commit a budget.
        </p>
      </ContentSection>
    </ContentPageLayout>
  );
}
