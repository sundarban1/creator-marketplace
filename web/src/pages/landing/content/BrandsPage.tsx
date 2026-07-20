import { CheckCircle2, Filter, Megaphone, ShieldCheck, Users, XCircle } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList } from '../components/ContentBlocks';
import { organizationSchema, webPageSchema } from '../../../lib/seo/schema';

export function BrandsPage() {
  return (
    <ContentPageLayout
      seo={{
        title: 'Hire Influencers & Creators in Nepal | For Brands',
        description: 'Kolab helps Nepali brands and businesses discover and hire verified content creators for paid campaigns. Post a campaign and collaborate with the right creators, fast.',
        path: '/brands',
        keywords: ['hire creator Nepal', 'hire influencer Nepal', 'brand collaboration Nepal', 'creator marketing Nepal', 'influencer marketing Nepal'],
        jsonLd: [organizationSchema(), webPageSchema({ path: '/brands', title: 'Hire Influencers & Creators in Nepal | Kolab', description: 'Kolab helps Nepali brands discover and hire verified content creators for paid campaigns.' })],
      }}
      breadcrumb={[{ name: 'Home', path: '/' }, { name: 'Brands', path: '/brands' }]}
      icon={Megaphone}
      eyebrow="For Brands"
      heading="Hire Verified Creators in Nepal"
      faqs={[
        {
          question: 'How do I hire a creator on Kolab?',
          answer: 'Create a business account, post a paid campaign or a free open event with your budget, category, and platform requirements, then review the proposals creators submit and message the ones you want to work with directly in-app.',
        },
        {
          question: 'How does Kolab protect my campaign budget?',
          answer: "Paid campaigns use escrow-protected payments — your budget is held safely by Kolab and only released to the creator once you've reviewed and approved the completed work, so you never pay upfront for work that isn't delivered.",
        },
        {
          question: 'How do I find the right creator for my brand?',
          answer: 'Browse and filter creator profiles by category (fashion, food, tech, fitness, and more), platform (Instagram, TikTok, YouTube, Facebook, and others), and location anywhere in Nepal — from Kathmandu and Pokhara to Butwal and Biratnagar — so you can match a campaign to the right audience.',
        },
        {
          question: 'Are creators on Kolab verified?',
          answer: "Yes. Creator identity is confirmed through citizenship-document verification, and every account goes through email, phone, and document checks before it's active on the marketplace.",
        },
        {
          question: 'What does it cost to post a campaign?',
          answer: 'Kolab is a free download, and creating a business account is free. When you post a paid campaign, you set your own budget for the collaboration.',
        },
        {
          question: 'Can I run a free collaboration instead of a paid one?',
          answer: "Yes — alongside paid campaigns, you can post a free open event, where creators cover or attend in exchange for content and exposure rather than a fee.",
        },
      ]}
      related={[
        { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: "How Kolab connects Nepali brands and creators." },
        { label: 'Influencer Marketing in Nepal', path: '/influencer-marketing-nepal', description: 'A guide to running influencer campaigns in Nepal.' },
        { label: 'Brand Collaboration Nepal', path: '/brand-collaboration-nepal', description: 'How the collaboration process works end to end.' },
        { label: 'For Content Creators', path: '/content-creators', description: 'See the creator side of the marketplace.' },
      ]}
      cta={{ heading: 'Ready to Hire Creators in Nepal?', sub: 'Download Kolab and post your first campaign.' }}
    >
      <ContentSection heading="Post a campaign in minutes">
        <p>
          Hiring a creator in Nepal usually starts the same informal way: scroll Instagram, find someone with the
          right follower count, and send a DM asking if they'd be interested — with no real sense of their rates,
          availability, or whether they'll reply at all. Kolab replaces that guesswork with a structured posting
          flow built for brand collaboration in Nepal.
        </p>
        <p>
          As a brand, you post either a paid campaign or a free open event. A paid campaign sets a budget and
          deliverables up front — what platform, what kind of content, what timeline — and creators who fit apply
          with a proposal. An open event works the same way but without a cash budget, useful for product launches,
          store openings, or experiences where creators attend or cover in exchange for content and exposure. Either
          way, the requirements are visible to every creator who might apply, so the proposals you receive are
          already pre-filtered by relevance instead of arriving as random cold outreach.
        </p>
      </ContentSection>

      <ContentSection heading="Find creators by category, platform, and city">
        <p>
          Once a campaign is live, discovery works both ways. Creators browse and apply to campaigns that match
          their niche, but you can also search the creator marketplace directly — filtering by category (Food &
          Beverage, Travel, Fashion, Beauty, Fitness & Health, Gaming, Technology, Lifestyle, and more), by platform
          (Instagram, TikTok, YouTube, Facebook, Twitter/X, LinkedIn, Pinterest, Snapchat, Twitch), and by location
          anywhere in Nepal — Kathmandu, Pokhara, Lalitpur, Bhaktapur, Butwal, Biratnagar, Dharan, Chitwan, and
          Nepalgunj included.
        </p>
        <BenefitGrid
          items={[
            { icon: Filter, title: 'Filter by category', desc: 'Narrow the marketplace to creators in the niche your campaign actually needs, from fashion to fitness to tech.' },
            { icon: Users, title: 'Filter by platform', desc: 'Target Instagram, TikTok, YouTube, Facebook, or any of the other platforms creator profiles support.' },
            { icon: Megaphone, title: 'Filter by location', desc: 'Find creators in a specific Nepali city, or open a campaign to creators anywhere in the country.' },
          ]}
        />
      </ContentSection>

      <ContentSection heading="Your budget is protected until the work is approved">
        <p>
          The biggest risk in informal creator hiring isn't finding someone — it's the payment itself. Pay upfront
          and the creator might disappear after posting nothing; pay after the fact and there's no guarantee they'll
          follow through either way. Kolab removes that risk with escrow-protected payments: when you post a paid
          campaign, your budget is held securely by Kolab, not sent directly to the creator, and only released once
          you've reviewed the completed deliverables and approved the work.
        </p>
        <p>
          The same trust layer applies before a collaboration even starts. Every creator profile on Kolab goes
          through identity verification — confirmed with a citizenship document, plus email and phone checks — so
          you're hiring a real, accountable person, not an anonymous handle. And after the campaign wraps, both
          sides leave a transparent review, so a creator's track record on Kolab is something you can actually
          check before you commit your budget.
        </p>
      </ContentSection>

      <ContentSection heading="Kolab vs. hiring creators over DMs">
        <BenefitGrid
          items={[
            { icon: CheckCircle2, title: 'Structured proposals', desc: 'Every applicant responds to your actual budget and deliverables, not a vague "what are your rates?" back-and-forth.', accent: 'violet' },
            { icon: XCircle, title: 'No cold-DM guesswork', desc: 'Skip the scroll-and-message routine with no reply, no verified identity, and no visibility into whether the creator is even active.', accent: 'orange' },
            { icon: ShieldCheck, title: 'Escrow, not bank transfer', desc: 'Your budget stays protected until you approve the work, instead of hoping a wire transfer gets you a finished deliverable.', accent: 'violet' },
            { icon: Megaphone, title: 'One place for everything', desc: 'Proposals, messaging, deliverables, payment, and reviews live in one thread instead of scattered across Instagram, WhatsApp, and eSewa.', accent: 'orange' },
          ]}
        />
      </ContentSection>

      <ContentSection heading="Built for how Nepali brands actually work">
        <ContentList
          items={[
            'Set your own budget for every campaign — there is no fixed pricing tier to work around.',
            'Post as many paid campaigns or free open events as your marketing calendar needs.',
            'Message matched creators directly in the app to align on deliverables and timelines.',
            'Review proposals before committing, so you know exactly who you are hiring and why.',
            'Reach creators across Nepal, not just the handful you already follow.',
          ]}
        />
      </ContentSection>
    </ContentPageLayout>
  );
}
