import { Compass, Handshake, MessageSquare, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid } from '../components/ContentBlocks';
import { organizationSchema, webPageSchema } from '../../../lib/seo/schema';

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Twitter / X', 'LinkedIn', 'Pinterest', 'Snapchat', 'Twitch'];
const CATEGORIES = [
  'Food & Beverage', 'Travel', 'Fashion', 'Beauty', 'Fitness & Health', 'Gaming', 'Technology', 'Education',
  'Lifestyle', 'Home & Living', 'Music', 'Art & Design', 'Finance', 'Photography', 'Sports', 'Entertainment',
];

export function CreatorMarketplaceNepalPage() {
  return (
    <ContentPageLayout
      seo={{
        title: "Creator Marketplace Nepal | Connect Brands & Content Creators",
        description: "Kolab is Nepal's creator marketplace — where brands find verified TikTok, Instagram, YouTube and Facebook creators for paid campaigns and collaborations.",
        path: '/creator-marketplace-nepal',
        keywords: ['creator marketplace Nepal', 'creator platform Nepal', 'Nepal influencer platform', 'hire creator Nepal', 'creator economy Nepal'],
        jsonLd: [organizationSchema(), webPageSchema({ path: '/creator-marketplace-nepal', title: "Creator Marketplace Nepal | Kolab", description: "Nepal's creator marketplace connecting brands and content creators." })],
      }}
      breadcrumb={[{ name: 'Home', path: '/' }, { name: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal' }]}
      icon={Sparkles}
      eyebrow="Creator Marketplace Nepal"
      heading="Nepal's Creator Marketplace for Brand Collaborations"
      intro="Kolab is the marketplace built specifically for Nepal's creator economy — the place where brands in Kathmandu, Pokhara, Lalitpur, and beyond discover verified content creators, and where creators turn their following into paid work."
      faqs={[
        {
          question: 'What is Kolab?',
          answer: "Kolab is Nepal's creator marketplace — a mobile app that connects businesses with content creators and influencers for paid campaigns and brand collaborations. Brands post campaigns, creators apply with proposals, and both sides communicate and collaborate directly in the app.",
        },
        {
          question: 'How do I find creators in Nepal on Kolab?',
          answer: 'Businesses can browse creator profiles filtered by category (fashion, food, tech, fitness, and more), platform (Instagram, TikTok, YouTube, Facebook), and location anywhere in Nepal, then send a collaboration request or post an open campaign for creators to apply to.',
        },
        {
          question: 'Is Kolab free to use?',
          answer: 'Kolab is a free download on iOS and Android. Creators build a profile and apply to campaigns at no cost. Businesses create an account and set their own campaign budgets when posting a paid campaign or open event.',
        },
        {
          question: 'Which social media platforms does Kolab support?',
          answer: `Creator profiles on Kolab can showcase ${PLATFORMS.slice(0, 4).join(', ')}, and other platforms including ${PLATFORMS.slice(4).join(', ')}.`,
        },
        {
          question: 'How does payment work between brands and creators?',
          answer: 'Paid campaigns use escrow-protected payments — funds are held safely and released once the collaboration is approved, so both the brand and the creator are protected.',
        },
        {
          question: 'Is Kolab only for creators in Kathmandu?',
          answer: 'No — Kolab is built for creators and brands across Nepal, including Kathmandu, Pokhara, Lalitpur, Bhaktapur, Butwal, Biratnagar, Dharan, Chitwan, and Nepalgunj. Campaign discovery works by location, so creators anywhere in the country can find relevant opportunities.',
        },
      ]}
      related={[
        { label: 'For Content Creators', path: '/content-creators', description: 'Build a profile, get discovered, and apply to paid campaigns.' },
        { label: 'For Brands', path: '/brands', description: 'Post campaigns and hire verified creators across Nepal.' },
        { label: 'Browse Influencers', path: '/influencers', description: 'See how Kolab connects businesses with Nepali influencers.' },
        { label: 'Find Campaigns', path: '/find-campaigns', description: 'Open events and paid campaigns creators can apply to right now.' },
      ]}
      cta={{ heading: "Join Nepal's Creator Marketplace", sub: 'Download Kolab and start collaborating today.' }}
    >
      <ContentSection heading="What is a creator marketplace?">
        <p>
          A creator marketplace is a platform that structures the process of finding, hiring, and paying content
          creators — rather than brands cold-messaging influencers on Instagram and hoping for a reply, or creators
          fielding one-off DMs with no guarantee they'll actually get paid. In Nepal, the creator economy has grown
          fast on TikTok, Instagram, YouTube, and Facebook, but the tooling around it — discovery, proposals,
          budgets, payment — has mostly stayed informal.
        </p>
        <p>
          Kolab exists to close that gap. It's a dedicated creator marketplace for Nepal: businesses post campaigns
          or open events, creators discover and apply to the ones that fit their niche and following, and the whole
          collaboration — messaging, proposal, payment, review — happens in one place instead of scattered across
          DMs and bank transfers.
        </p>
      </ContentSection>

      <ContentSection heading="How Kolab's creator marketplace works">
        <BenefitGrid
          items={[
            { icon: Handshake, title: 'Brands post campaigns', desc: 'Businesses create a paid campaign or a free open event with a budget, category, and platform requirements.' },
            { icon: Compass, title: 'Creators discover & apply', desc: 'Creators browse campaigns by category, platform, and location, then submit a proposal to the ones that fit.' },
            { icon: MessageSquare, title: 'Collaborate directly', desc: 'Once matched, brands and creators message directly in-app to align on deliverables and timelines.' },
            { icon: ShieldCheck, title: 'Get paid securely', desc: 'Paid campaigns use escrow — funds are held until the work is approved, then released to the creator.' },
          ]}
        />
      </ContentSection>

      <ContentSection heading="Every niche and platform, covered">
        <p>
          Kolab supports creator profiles across {PLATFORMS.join(', ')}, spanning categories like{' '}
          {CATEGORIES.join(', ')}, and more. Whether a brand needs a Kathmandu-based fashion creator on Instagram or
          a Pokhara food vlogger on YouTube, campaigns can be filtered and matched by exactly what the collaboration
          needs. See platform-specific creators on the{' '}
          <a href="/tiktok-creators" className="font-medium text-violet hover:underline">TikTok creators</a>,{' '}
          <a href="/instagram-creators" className="font-medium text-violet hover:underline">Instagram creators</a>,{' '}
          <a href="/youtube-creators" className="font-medium text-violet hover:underline">YouTube creators</a>, and{' '}
          <a href="/facebook-creators" className="font-medium text-violet hover:underline">Facebook creators</a> pages.
        </p>
      </ContentSection>

      <ContentSection heading="Built for both sides of the collaboration">
        <BenefitGrid
          items={[
            { icon: Users, title: 'For creators', desc: 'Turn your following into income — build a profile, get discovered, and apply to paid campaigns across Nepal. See the creator page for details.', accent: 'violet' },
            { icon: Handshake, title: 'For brands', desc: 'Find and hire the right creators fast, with verified profiles and budgets you control. See the brand page for details.', accent: 'orange' },
          ]}
        />
      </ContentSection>

      <ContentSection heading="Why Nepali brands and creators choose Kolab">
        <p>
          Trust is the hardest part of any informal creator-brand relationship to get right, so it's built into the
          platform: creator identity is confirmed with citizenship document verification, every account goes through
          email, phone, and document checks, payments on paid campaigns are escrow-protected until work is approved,
          and every collaboration ends with a transparent, honest rating — so reputation on Kolab actually means
          something.
        </p>
      </ContentSection>
    </ContentPageLayout>
  );
}
