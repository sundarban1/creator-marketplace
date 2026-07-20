import { BarChart3, Compass, MessageSquare, Target, TrendingUp, Wallet } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList } from '../components/ContentBlocks';
import { webPageSchema } from '../../../lib/seo/schema';

export function InfluencerMarketingNepalPage() {
  return (
    <ContentPageLayout
      seo={{
        title: 'Influencer Marketing in Nepal | A Guide for Brands',
        description: 'How influencer marketing works in Nepal — and how brands use Kolab to find, hire, and collaborate with verified TikTok, Instagram, and YouTube creators.',
        path: '/influencer-marketing-nepal',
        keywords: ['influencer marketing Nepal', 'creator marketing Nepal', 'digital creator Nepal', 'brand campaign Nepal'],
        jsonLd: webPageSchema({ path: '/influencer-marketing-nepal', title: 'Influencer Marketing in Nepal | Kolab', description: "How influencer marketing works in Nepal and how brands use Kolab to run creator campaigns." }),
      }}
      breadcrumb={[{ name: 'Home', path: '/' }, { name: 'Influencer Marketing Nepal', path: '/influencer-marketing-nepal' }]}
      icon={TrendingUp}
      eyebrow="Influencer Marketing in Nepal"
      heading="Influencer Marketing in Nepal: A Guide for Brands"
      intro="Nepal's social media audience has moved to TikTok, Instagram, YouTube, and Facebook, and creators there now reach people traditional advertising can't. Here's how influencer marketing actually works in Nepal, and how to run a campaign without the guesswork."
      faqs={[
        {
          question: 'What is influencer marketing?',
          answer: 'Influencer marketing is a form of brand collaboration where a business partners with a content creator — someone with an established audience on a platform like Instagram, TikTok, YouTube, or Facebook — to promote a product, service, or event to that audience, usually through sponsored content or a paid campaign.',
        },
        {
          question: 'Why does influencer marketing matter for brands in Nepal?',
          answer: "Nepali audiences increasingly discover products and services through creators they already follow on TikTok, Instagram, YouTube, and Facebook, rather than through traditional ads. A well-matched creator collaboration reaches that audience with more trust than a generic ad would.",
        },
        {
          question: 'How do I choose the right creator for my campaign?',
          answer: 'Match the creator to your campaign by category (fashion, food, tech, fitness, and more), the platform your audience actually uses, and location if your business serves a specific city. Kolab lets you filter creators by all three when posting or browsing.',
        },
        {
          question: 'How is a structured campaign different from just messaging an influencer directly?',
          answer: 'A structured campaign — like posting on Kolab — sets a clear budget, deliverables, and timeline that every applying creator responds to, and payment is escrow-protected until you approve the work. Messaging an influencer directly usually means negotiating rates from scratch with no verification and no protection for either side.',
        },
        {
          question: 'How much should I budget for an influencer campaign in Nepal?',
          answer: "There's no fixed industry rate — budgets vary by creator, platform, and deliverables. On Kolab, you set your own campaign budget, and creators only apply if it works for them, so you stay in control of spend from the start.",
        },
        {
          question: 'Can I run influencer marketing campaigns outside Kathmandu?',
          answer: 'Yes. Creator discovery works by location across Nepal, including Pokhara, Lalitpur, Bhaktapur, Butwal, Biratnagar, Dharan, Chitwan, and Nepalgunj, so campaigns can target creators and audiences beyond the capital.',
        },
      ]}
      related={[
        { label: 'For Brands', path: '/brands', description: 'Post a campaign and hire verified creators.' },
        { label: 'Brand Collaboration Nepal', path: '/brand-collaboration-nepal', description: 'The step-by-step collaboration process.' },
        { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: "Kolab's full creator marketplace overview." },
        { label: 'Browse Influencers', path: '/influencers', description: 'See the range of creators available.' },
      ]}
      cta={{ heading: 'Start Your Influencer Marketing Campaign', sub: 'Download Kolab and connect with Nepali creators today.' }}
    >
      <ContentSection heading="Why influencer marketing matters in Nepal">
        <p>
          Social media use in Nepal has shifted heavily toward video-first platforms — TikTok, Instagram Reels, and
          YouTube — alongside long-established Facebook communities. Audiences there follow creators, not brands,
          which means a product recommendation from a creator someone already trusts tends to land differently than
          a banner ad or a boosted post ever could. That's the core reason influencer marketing has grown into a
          real channel for Nepali businesses, not just a trend to dabble in.
        </p>
        <p>
          But the channel is only as good as the process behind it. A lot of influencer marketing in Nepal still
          happens informally — a business owner scrolls Instagram, DMs a few accounts with decent follower counts,
          and negotiates rates one conversation at a time, with no consistent way to compare creators, verify
          they're legitimate, or protect payment. That informality is exactly what makes influencer marketing feel
          risky or unpredictable to brands trying it for the first time.
        </p>
      </ContentSection>

      <ContentSection heading="Choosing the right creator, category, and platform">
        <p>
          The first real decision in any influencer marketing campaign isn't budget — it's fit. A creator with a
          large following in the wrong category won't move the needle for your business, while a smaller creator
          whose audience matches your product exactly often performs better. Three variables matter most:
        </p>
        <BenefitGrid
          items={[
            { icon: Target, title: 'Category fit', desc: 'Match your product to a relevant niche — Food & Beverage, Fashion, Beauty, Fitness & Health, Technology, Travel, and more.' },
            { icon: Compass, title: 'Platform fit', desc: 'Go where your audience already is — TikTok and Instagram for younger, visual-first audiences; YouTube for longer-form content; Facebook for broader reach.' },
            { icon: BarChart3, title: 'Location fit', desc: 'If your business serves a specific city or region, filter for creators based there rather than defaulting to Kathmandu.' },
          ]}
        />
      </ContentSection>

      <ContentSection heading="What a structured collaboration process looks like">
        <p>
          Instead of negotiating from scratch in someone's DMs, a structured process runs through the same steps
          every time, so both sides know what to expect:
        </p>
        <ContentList
          items={[
            'A brand posts a campaign with a category, platform, budget, and deliverables spelled out upfront.',
            'Creators who fit the campaign browse and apply with a proposal, instead of the brand cold-messaging one account at a time.',
            'The brand reviews proposals and messages the creator directly in-app to confirm details.',
            'Work happens against a clear, agreed deliverable and timeline.',
            'Payment is escrow-protected — held until the brand approves the completed work, then released to the creator.',
            'Both sides leave a review afterward, building a track record for future campaigns.',
          ]}
        />
        <p>
          This is the model Kolab runs on: brands post paid campaigns or free open events, and creator discovery,
          proposals, messaging, and payment all happen in one place instead of across Instagram, WhatsApp, and bank
          transfers.
        </p>
      </ContentSection>

      <ContentSection heading="Setting a realistic budget">
        <p>
          There's no single standard rate for influencer marketing in Nepal — cost depends on the creator, the
          platform, the deliverables, and the campaign's scope. Rather than guessing at a rate before reaching out,
          a more reliable approach is to set the budget your business can realistically commit to a campaign, state
          it upfront, and let interested creators apply within that range. That keeps spend under your control from
          the start, instead of escalating through back-and-forth negotiation.
        </p>
        <p>
          For businesses testing influencer marketing for the first time, a free open event — where a creator
          attends or covers a launch in exchange for content and exposure rather than a fee — can be a lower-risk
          way to learn what a good collaboration looks like before committing budget to a paid campaign.
        </p>
      </ContentSection>

      <ContentSection heading="Moving from informal outreach to a repeatable channel">
        <BenefitGrid
          items={[
            { icon: MessageSquare, title: 'Direct, in-app collaboration', desc: 'Message matched creators directly instead of juggling Instagram DMs and separate payment apps.' },
            { icon: Wallet, title: 'Budget you control', desc: 'Set your own campaign budget every time — no fixed pricing tiers to negotiate around.' },
          ]}
        />
        <p>
          Treating influencer marketing as a repeatable channel — with consistent discovery, proposals, and
          payment — is what turns a one-off DM into a marketing process you can run again for the next campaign,
          the next product, or the next city.
        </p>
      </ContentSection>
    </ContentPageLayout>
  );
}
