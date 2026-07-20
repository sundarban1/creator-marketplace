import { BadgeCheck, Compass, Gift, Send, ShieldCheck, Wallet } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList } from '../components/ContentBlocks';
import { webPageSchema } from '../../../lib/seo/schema';

export function ContentCreatorsPage() {
  return (
    <ContentPageLayout
      seo={{
        title: 'Content Creator Jobs in Nepal | Join as a Creator',
        description: 'Join Kolab as a content creator in Nepal. Build your profile, get discovered by brands, and apply to paid campaigns on Instagram, TikTok, YouTube, and Facebook.',
        path: '/content-creators',
        keywords: ['content creator Nepal', 'creator jobs Nepal', 'digital creator Nepal', 'social media creator Nepal', 'creator app Nepal'],
        jsonLd: webPageSchema({ path: '/content-creators', title: 'Content Creator Jobs in Nepal | Kolab', description: 'Join Kolab as a content creator in Nepal.' }),
      }}
      breadcrumb={[{ name: 'Home', path: '/' }, { name: 'Content Creators', path: '/content-creators' }]}
      icon={BadgeCheck}
      eyebrow="For Content Creators"
      heading="Become a Content Creator on Kolab"
      intro="Turn your following into income. Kolab connects Nepali content creators — on Instagram, TikTok, YouTube, and Facebook — with brands looking to run paid campaigns and collaborations."
      faqs={[
        {
          question: 'How do I become a content creator on Kolab?',
          answer: 'Download the Kolab app, create a creator profile with your categories and connected social platforms, and complete identity verification. Once your profile is live, you can browse and apply to open campaigns.',
        },
        {
          question: 'Do I need a large following to join?',
          answer: "There's no strict follower minimum. Brands look for creators whose niche, content style, and audience fit a specific campaign — not just follower count — so micro-influencers can find opportunities too.",
        },
        {
          question: 'How much can I earn as a creator in Nepal?',
          answer: 'Earnings depend on the budget each brand sets for their campaign. Budgets are visible before you apply, so you always know what a collaboration pays before committing to it.',
        },
        {
          question: 'Which platforms can I connect to my profile?',
          answer: 'Instagram, TikTok, YouTube, Facebook, Twitter/X, LinkedIn, Pinterest, Snapchat, and Twitch are all supported — connect as many as apply to you.',
        },
        {
          question: 'How do I get paid for a campaign?',
          answer: 'Paid campaigns use escrow-protected payments — the budget is held safely and released to you once the brand approves the completed work.',
        },
        {
          question: 'Is there a fee to join as a creator?',
          answer: "Kolab is a free download, and creating a creator profile and applying to campaigns doesn't cost anything.",
        },
      ]}
      related={[
        { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: 'How Kolab connects Nepali brands and creators.' },
        { label: 'Find Campaigns', path: '/find-campaigns', description: 'Browse open paid campaigns and free events to apply to.' },
        { label: 'TikTok Creators', path: '/tiktok-creators', description: "TikTok creator opportunities on Kolab." },
        { label: 'For Brands', path: '/brands', description: 'See how brands discover and hire creators like you.' },
      ]}
      cta={{ heading: 'Ready to Start Creating for Brands?', sub: 'Download Kolab and build your creator profile in minutes.' }}
    >
      <ContentSection heading="Why creators join Kolab">
        <BenefitGrid
          items={[
            { icon: Compass, title: 'Get discovered', desc: 'Brands browse creator profiles by category, platform, and location — your profile puts you in front of relevant campaigns.' },
            { icon: Send, title: 'Apply with proposals', desc: 'Browse paid campaigns and free open events, and submit a proposal to the ones that fit your niche.' },
            { icon: ShieldCheck, title: 'Secure, escrow-protected pay', desc: 'Campaign budgets are held in escrow and released once your work is approved — no chasing payment after the fact.' },
            { icon: Wallet, title: 'Track everything in one place', desc: "Manage proposals, messages, and earnings from a single creator dashboard instead of scattered DMs." },
          ]}
        />
      </ContentSection>

      <ContentSection heading="How to get started as a creator in Nepal">
        <ContentList
          items={[
            'Download the Kolab app and sign up as a creator.',
            'Build your profile — add your categories, connect your social platforms, and complete identity verification.',
            'Browse open campaigns and events filtered by category, platform, and location anywhere in Nepal.',
            'Apply with a proposal to the campaigns that fit your content and audience.',
            'Message the brand directly in-app once matched, and align on deliverables.',
            'Get paid through escrow-protected payments once your work is approved, and build your reputation with reviews.',
          ]}
        />
      </ContentSection>

      <ContentSection heading="Paid campaigns and free open events">
        <p>
          Kolab supports two kinds of collaborations: paid campaigns, where a brand sets a budget for specific
          deliverables, and open events, which are free to attend or cover in exchange for content and exposure.
          Both are visible with their budget, deadline, and requirements up front, so you can decide what's worth
          your time before applying.
        </p>
      </ContentSection>

      <ContentSection heading="Grow beyond your own profile">
        <p className="flex items-start gap-2.5">
          <Gift size={18} className="mt-0.5 flex-shrink-0 text-brand-orange" />
          <span>
            Kolab also includes a referral program — invite other creators to join, and grow the community you're
            part of while you're at it.
          </span>
        </p>
      </ContentSection>
    </ContentPageLayout>
  );
}
