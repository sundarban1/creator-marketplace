import { Compass, Handshake, MessageSquare, Music2, ShieldCheck, TrendingUp } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList } from '../components/ContentBlocks';
import { webPageSchema } from '../../../lib/seo/schema';

const TIKTOK_CATEGORIES = ['Entertainment', 'Music', 'Food & Beverage', 'Fashion', 'Beauty', 'Lifestyle', 'Gaming', 'Fitness & Health'];

export function TikTokCreatorsPage() {
  return (
    <ContentPageLayout
      seo={{
        title: 'TikTok Creators in Nepal | Hire TikTok Influencers',
        description: 'Discover and hire TikTok creators in Nepal on Kolab. Connect with verified TikTok influencers for paid campaigns and brand collaborations.',
        path: '/tiktok-creators',
        keywords: ['TikTok creator Nepal', 'TikTok Nepal', 'hire TikTok creator Nepal'],
        jsonLd: webPageSchema({ path: '/tiktok-creators', title: 'TikTok Creators in Nepal | Kolab', description: 'Discover and hire TikTok creators in Nepal on Kolab.' }),
      }}
      breadcrumb={[{ name: 'Home', path: '/' }, { name: 'TikTok Creators', path: '/tiktok-creators' }]}
      icon={Music2}
      eyebrow="TikTok Creators"
      heading="TikTok Creators in Nepal"
      intro="Nepal's TikTok scene moves fast — trends, sounds, and formats turn over in days. Kolab connects brands with TikTok creators across the country who know how to make short-form content that actually gets watched, and gives creators a direct path from a scroll-stopping video to a paid brand deal."
      faqs={[
        {
          question: 'How do I find TikTok creators in Nepal on Kolab?',
          answer: 'Browse creator profiles on Kolab and filter by platform (TikTok), category, and location anywhere in Nepal. Each profile shows the creator’s niche and connected platforms so you can find a fit before reaching out or posting a campaign.',
        },
        {
          question: 'Can I run a paid TikTok campaign through Kolab?',
          answer: 'Yes. Post a paid campaign with your budget, category, and deliverables, and TikTok creators who match can apply with a proposal. You can also post a free open event if you’re offering exposure or product instead of a fixed budget.',
        },
        {
          question: 'Are TikTok creators on Kolab verified?',
          answer: 'Creator accounts go through identity verification, including citizenship-document checks alongside email and phone verification, so businesses know they’re dealing with a real, verifiable creator before collaborating.',
        },
        {
          question: 'How does payment work for a TikTok campaign?',
          answer: 'Paid campaigns use escrow-protected payments — the budget you set is held securely and released to the creator once you approve the completed work, so neither side is left waiting or exposed.',
        },
        {
          question: 'What kind of TikTok content can creators make on Kolab?',
          answer: `Creators on Kolab list categories like ${TIKTOK_CATEGORIES.slice(0, 5).join(', ')}, and more, so you can match a campaign to a creator whose usual content already fits your brand.`,
        },
        {
          question: 'Do TikTok creators need a minimum follower count to join?',
          answer: 'No strict minimum applies. Brands on Kolab evaluate creators by niche, content style, and audience fit for a specific campaign, which means smaller and growing TikTok accounts can still land paid work.',
        },
      ]}
      related={[
        { label: 'For Content Creators', path: '/content-creators', description: 'Build your creator profile on Kolab.' },
        { label: 'Instagram Creators', path: '/instagram-creators', description: 'Browse Instagram creators in Nepal.' },
        { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: "Kolab's full creator marketplace overview." },
        { label: 'For Brands', path: '/brands', description: 'Hire creators for your next campaign.' },
      ]}
      cta={{ heading: 'Connect with TikTok Creators in Nepal', sub: 'Download Kolab to browse profiles and post campaigns.' }}
    >
      <ContentSection heading="Why TikTok matters for brands in Nepal">
        <p>
          TikTok has become one of the fastest ways for a brand to reach a young, highly engaged audience in Nepal —
          not through polished ads, but through short, native-feeling videos: trend sounds, quick tutorials, comedic
          skits, and product moments that don't feel like product moments. That format rewards creators who post
          often and understand the platform's pacing, which is exactly the skill set that's hard to evaluate from
          outside and easy to misjudge by follower count alone.
        </p>
        <p>
          Kolab exists to close that gap between a brand that wants TikTok reach and a creator who already has it.
          Instead of cold-DMing accounts and guessing at rates, businesses can browse verified TikTok creator
          profiles by category, location, and niche, and post a campaign that creators discover and apply to
          directly.
        </p>
      </ContentSection>

      <ContentSection heading="What brands get from TikTok creators on Kolab">
        <BenefitGrid
          items={[
            { icon: Compass, title: 'Discover by niche', desc: 'Filter TikTok creator profiles by category, location, and platform to find a fit for your campaign, not just a big number.' },
            { icon: Handshake, title: 'Post a campaign or event', desc: 'Set a budget and deliverables for a paid campaign, or offer a free open event in exchange for content and exposure.' },
            { icon: MessageSquare, title: 'Message directly', desc: 'Once a creator applies, coordinate the brief, timeline, and creative direction in-app — no scattered DMs.' },
            { icon: ShieldCheck, title: 'Pay with escrow protection', desc: 'Campaign budgets are held in escrow and released once you approve the finished TikTok content.' },
          ]}
        />
      </ContentSection>

      <ContentSection heading="TikTok content categories on Kolab">
        <p>
          TikTok creators on Kolab span categories including {TIKTOK_CATEGORIES.join(', ')}, and more — from a
          Kathmandu comedy creator doing trend-based skits to a Pokhara fitness creator posting quick workout clips
          to a food creator in Chitwan reviewing local eats in a 30-second clip. Whatever short-form niche your
          campaign needs, you can filter for creators already making that kind of content instead of briefing
          someone into a format they've never tried.
        </p>
        <p className="flex items-start gap-2.5">
          <TrendingUp size={18} className="mt-0.5 flex-shrink-0 text-brand-orange" />
          <span>
            Because TikTok trends move quickly, campaigns that give creators room to adapt a brief to the current
            trend format tend to fit the platform better than a rigid, ad-style script.
          </span>
        </p>
      </ContentSection>

      <ContentSection heading="How to hire a TikTok creator in Nepal">
        <ContentList
          items={[
            'Create a business account on Kolab and post a paid campaign or a free open event.',
            'Set your category, platform (TikTok), budget or offer, and location targeting anywhere in Nepal.',
            'Browse creator profiles directly, or review the proposals TikTok creators submit to your campaign.',
            'Message shortlisted creators in-app to align on the brief, deliverables, and timeline.',
            'Approve the finished content and release payment through Kolab’s escrow-protected system.',
            'Leave a review once the collaboration wraps up, building a track record for future campaigns.',
          ]}
        />
      </ContentSection>

      <ContentSection heading="Built on trust, for a platform built on speed">
        <p>
          TikTok collaborations often move fast, which is exactly where informal creator-brand deals tend to break
          down — vague briefs, no proof of identity, payment that shows up late or not at all. Kolab keeps that risk
          in check with identity-verified creator accounts, escrow-protected payments that only release on approval,
          and honest post-collaboration reviews, so a fast-moving TikTok deal doesn't have to be a risky one.
        </p>
      </ContentSection>
    </ContentPageLayout>
  );
}
