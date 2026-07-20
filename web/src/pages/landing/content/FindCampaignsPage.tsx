import { Filter, Gift, Search, Send, Wallet } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList } from '../components/ContentBlocks';
import { webPageSchema } from '../../../lib/seo/schema';

export function FindCampaignsPage() {
  return (
    <ContentPageLayout
      seo={{
        title: 'Find Creator Campaigns in Nepal | Paid Campaigns & Events',
        description: 'Browse paid campaigns and free open events on Kolab. Nepali content creators can find and apply to brand collaborations that fit their niche.',
        path: '/find-campaigns',
        keywords: ['creator opportunities Nepal', 'paid campaigns Nepal', 'creator jobs Nepal', 'brand campaign Nepal'],
        jsonLd: webPageSchema({ path: '/find-campaigns', title: 'Find Creator Campaigns in Nepal | Kolab', description: 'Browse paid campaigns and free open events for content creators in Nepal.' }),
      }}
      breadcrumb={[{ name: 'Home', path: '/' }, { name: 'Find Campaigns', path: '/find-campaigns' }]}
      icon={Search}
      eyebrow="Find Campaigns"
      heading="Find Creator Campaigns in Nepal"
      intro="Paid brand deals and free open events don't have to land in your DMs by chance. Kolab lists live campaigns from Nepali brands — browse by category, platform, and city, and apply with a proposal to the ones that actually fit your content."
      faqs={[
        {
          question: 'Where do I find campaigns to apply to on Kolab?',
          answer: 'Open the campaigns feed in the app, where every live paid campaign and open event from brands is listed with its budget (or exchange, for open events), category, platform, and deadline.',
        },
        {
          question: "What's the difference between a paid campaign and an open event?",
          answer: 'A paid campaign has a cash budget set by the brand for specific deliverables. An open event is free to attend or cover — you take part in exchange for content and exposure rather than a fee. Both are listed with their requirements up front.',
        },
        {
          question: 'Can I filter campaigns to just my niche?',
          answer: 'Yes — filter the campaigns feed by category (fashion, food, tech, fitness, and more), by platform (Instagram, TikTok, YouTube, Facebook, and others), and by location anywhere in Nepal, so you only see campaigns relevant to you.',
        },
        {
          question: 'How do I apply to a campaign?',
          answer: 'Open a campaign that fits your niche and submit a proposal. If the brand is interested, they\'ll respond and you can message directly in-app to align on deliverables and timeline.',
        },
        {
          question: 'Do I see the budget before I apply?',
          answer: "Yes — paid campaigns show their budget upfront, and open events describe what's offered in exchange, so you know what a collaboration is worth before you commit any time to a proposal.",
        },
        {
          question: 'How and when do I get paid after applying to a paid campaign?',
          answer: "Once your proposal is accepted and the work is delivered, payment is released from escrow after the brand approves it — the budget is held safely from the moment the campaign starts, so you're not waiting on trust alone.",
        },
      ]}
      related={[
        { label: 'For Content Creators', path: '/content-creators', description: 'Build your creator profile on Kolab.' },
        { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: "Kolab's full creator marketplace overview." },
        { label: 'TikTok Creators', path: '/tiktok-creators', description: 'Platform-specific creator opportunities.' },
        { label: 'For Brands', path: '/brands', description: 'Post a campaign for creators to discover.' },
      ]}
      cta={{ heading: 'Ready to Find Your Next Campaign?', sub: 'Download Kolab and start applying today.' }}
    >
      <ContentSection heading="Stop waiting for brands to find you">
        <p>
          Most creators in Nepal still find brand work the same passive way: a brand happens to notice their
          profile and sends a DM, or a friend forwards an opportunity secondhand. That works occasionally, but it
          puts a creator entirely at the mercy of who happens to be looking — with no way to actively go find paid
          work that fits their niche.
        </p>
        <p>
          Kolab flips that around. Instead of waiting to be discovered, creators can browse a live feed of campaigns
          and open events posted directly by brands, see the budget and requirements upfront, and apply to the ones
          that actually make sense for their content — on their own schedule, not a brand's.
        </p>
      </ContentSection>

      <ContentSection heading="What you'll find in the campaigns feed">
        <BenefitGrid
          items={[
            { icon: Wallet, title: 'Paid campaigns', desc: 'Brands set a real budget for specific deliverables — visible before you apply, so you know exactly what a collaboration pays.' },
            { icon: Gift, title: 'Free open events', desc: 'Attend or cover an event in exchange for content and exposure — useful for building your portfolio and brand relationships.' },
            { icon: Filter, title: 'Filter to your niche', desc: 'Narrow the feed by category, platform, and city so you only see campaigns actually worth your time.' },
            { icon: Send, title: 'Apply with a proposal', desc: 'Submit a proposal directly in-app, and message the brand once you\'re matched.' },
          ]}
        />
      </ContentSection>

      <ContentSection heading="How to find and land your next campaign">
        <ContentList
          items={[
            'Open the campaigns feed and filter by category, platform, and location anywhere in Nepal.',
            'Review the budget (or exchange, for open events), deliverables, and deadline for each listing.',
            'Apply with a proposal to the campaigns that genuinely fit your content and audience.',
            'Message the brand directly in-app once your proposal is accepted, and align on deliverables.',
            'Deliver the work, and get paid from escrow once the brand approves it.',
            'Leave and receive a review, building a track record that helps you land the next campaign faster.',
          ]}
        />
      </ContentSection>

      <ContentSection heading="A budget you can trust before you apply">
        <p>
          One of the biggest frustrations with informal brand deals is finding out the "opportunity" was never
          really worth your time — a vague DM with no real budget attached. Every campaign on Kolab lists its
          budget or exchange terms before you apply, and paid campaigns are backed by escrow, so the budget is
          already secured by Kolab the moment you're matched. You're never guessing whether a brand can actually
          pay for the work they're asking for.
        </p>
      </ContentSection>
    </ContentPageLayout>
  );
}
