import { Camera, Compass, Handshake, Heart, MessageSquare, ShieldCheck } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList } from '../components/ContentBlocks';
import { webPageSchema } from '../../../lib/seo/schema';

const INSTAGRAM_CATEGORIES = ['Fashion', 'Beauty', 'Travel', 'Lifestyle', 'Home & Living', 'Food & Beverage', 'Photography', 'Fitness & Health'];

export function InstagramCreatorsPage() {
  return (
    <ContentPageLayout
      seo={{
        title: 'Instagram Creators & Influencers in Nepal',
        description: 'Find and hire Instagram creators and influencers in Nepal on Kolab. Browse verified profiles by category and collaborate on paid campaigns.',
        path: '/instagram-creators',
        keywords: ['Instagram influencer Nepal', 'Instagram Nepal', 'hire Instagram influencer Nepal'],
        jsonLd: webPageSchema({ path: '/instagram-creators', title: 'Instagram Creators & Influencers in Nepal | Kolab', description: 'Find and hire Instagram creators and influencers in Nepal on Kolab.' }),
      }}
      breadcrumb={[{ name: 'Home', path: '/' }, { name: 'Instagram Creators', path: '/instagram-creators' }]}
      icon={Camera}
      eyebrow="Instagram Creators"
      heading="Instagram Creators & Influencers in Nepal"
      intro="From fashion lookbooks in Kathmandu to travel reels shot around Pokhara's lakeside, Instagram is where Nepal's creator economy is most visual. Kolab connects brands with Instagram creators and influencers across the country, and gives creators a straightforward way to turn a strong feed and engaged following into paid collaborations."
      faqs={[
        {
          question: 'How do I find Instagram influencers in Nepal on Kolab?',
          answer: 'Browse creator profiles and filter by platform (Instagram), category, and location anywhere in Nepal. Profiles show the creator’s niche and connected platforms, so you can shortlist influencers whose feed and audience already match your brand.',
        },
        {
          question: 'Can I hire an Instagram creator for a paid campaign?',
          answer: 'Yes. Post a paid campaign with your budget, category, and deliverables — feed posts, Reels, or Stories — and Instagram creators who fit can apply with a proposal. Free open events are also an option if you’re offering product or exposure instead of a budget.',
        },
        {
          question: 'Are Instagram influencers on Kolab verified?',
          answer: 'Creator profiles go through identity verification, including citizenship-document checks along with email and phone verification, so businesses can confirm they’re working with a real, verifiable creator.',
        },
        {
          question: 'How does payment work for an Instagram collaboration?',
          answer: 'Paid campaigns use escrow-protected payments — your budget is held securely and released to the creator once you approve the delivered content, protecting both sides of the collaboration.',
        },
        {
          question: 'What Instagram content categories are available on Kolab?',
          answer: `Instagram creators on Kolab cover categories like ${INSTAGRAM_CATEGORIES.slice(0, 5).join(', ')}, and more, so you can match a campaign to a creator whose usual content style fits your brand.`,
        },
        {
          question: 'Do I need a large following to be hired as an Instagram creator?',
          answer: 'No strict follower minimum applies. Brands evaluate creators by niche, content quality, and audience fit for a specific campaign, so micro-influencers with an engaged, relevant following can be hired too.',
        },
      ]}
      related={[
        { label: 'For Content Creators', path: '/content-creators', description: 'Build your creator profile on Kolab.' },
        { label: 'TikTok Creators', path: '/tiktok-creators', description: 'Browse TikTok creators in Nepal.' },
        { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: "Kolab's full creator marketplace overview." },
        { label: 'For Brands', path: '/brands', description: 'Hire creators for your next campaign.' },
      ]}
      cta={{ heading: 'Connect with Instagram Creators in Nepal', sub: 'Download Kolab to browse profiles and post campaigns.' }}
    >
      <ContentSection heading="Why Instagram matters for brands in Nepal">
        <p>
          Instagram is still where a lot of purchase decisions in Nepal start — a fashion feed that sets a look, a
          travel reel that sells a destination, a beauty tutorial that makes a product feel worth trying. It's a
          platform built around image and consistency, which means the creators who do well on it tend to have a
          clear visual identity: a defined aesthetic, a niche, and an audience that trusts their taste.
        </p>
        <p>
          Finding that fit from outside the platform is hard — a high follower count doesn't tell you whether a
          creator's feed actually matches your brand's look. Kolab makes that matching process direct: browse
          Instagram creator profiles filtered by category and location, see their niche up front, and post a
          campaign that the right creators can apply to.
        </p>
      </ContentSection>

      <ContentSection heading="What brands get from Instagram creators on Kolab">
        <BenefitGrid
          items={[
            { icon: Compass, title: 'Browse by category', desc: 'Filter Instagram creator profiles by niche, platform, and location to shortlist a look and audience that fits.' },
            { icon: Handshake, title: 'Post a campaign or event', desc: 'Set a budget and deliverables — Reels, feed posts, Stories — for a paid campaign, or offer a free open event.' },
            { icon: MessageSquare, title: 'Message directly', desc: 'Coordinate creative direction, shot list, and timeline in-app once a creator applies to your campaign.' },
            { icon: ShieldCheck, title: 'Pay with escrow protection', desc: 'Budgets are held in escrow and released once you approve the finished Instagram content.' },
          ]}
        />
      </ContentSection>

      <ContentSection heading="Instagram content categories on Kolab">
        <p>
          Instagram creators on Kolab list categories including {INSTAGRAM_CATEGORIES.join(', ')}, and more —
          from a Lalitpur fashion creator building outfit content around local boutiques, to a Bhaktapur photographer
          shooting product flat-lays, to a travel creator covering Chitwan and beyond for Reels. Filtering by
          category means a brand looking for, say, a beauty-focused Instagram creator in Kathmandu doesn't have to
          sift through unrelated profiles to find one.
        </p>
        <p className="flex items-start gap-2.5">
          <Heart size={18} className="mt-0.5 flex-shrink-0 text-brand-orange" />
          <span>
            Because Instagram spans feed posts, Reels, and Stories, it's worth specifying which format matters most
            for your campaign when you post it — a creator strong in Reels isn't automatically the right fit for a
            polished feed post, and vice versa.
          </span>
        </p>
      </ContentSection>

      <ContentSection heading="How to hire an Instagram creator in Nepal">
        <ContentList
          items={[
            'Create a business account on Kolab and post a paid campaign or a free open event.',
            'Set your category, platform (Instagram), budget or offer, and location targeting anywhere in Nepal.',
            'Browse Instagram creator profiles directly, or review proposals submitted to your campaign.',
            'Message shortlisted creators in-app to align on the brief, format, and deadline.',
            'Approve the delivered content and release payment through Kolab’s escrow-protected system.',
            'Leave a review once the collaboration wraps, building a record for future campaigns.',
          ]}
        />
      </ContentSection>

      <ContentSection heading="Verified creators, protected payments">
        <p>
          A brand's Instagram budget is only well spent if the creator behind the profile is real and the payment
          actually reaches them for the work delivered. Kolab verifies creator identity with citizenship-document
          checks alongside email and phone verification, holds paid-campaign budgets in escrow until you approve the
          content, and closes every collaboration with a transparent review — so choosing an Instagram creator on
          Kolab comes with more certainty than a cold DM ever could.
        </p>
      </ContentSection>
    </ContentPageLayout>
  );
}
