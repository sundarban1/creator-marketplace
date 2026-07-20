import { BookOpen, Compass, Handshake, MessageSquare, PlayCircle, ShieldCheck } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList } from '../components/ContentBlocks';
import { webPageSchema } from '../../../lib/seo/schema';

const YOUTUBE_CATEGORIES = ['Technology', 'Education', 'Gaming', 'Finance', 'Travel', 'Food & Beverage', 'Fitness & Health', 'Entertainment'];

export function YouTubeCreatorsPage() {
  return (
    <ContentPageLayout
      seo={{
        title: 'YouTube Creators in Nepal | Hire YouTube Influencers',
        description: 'Discover YouTube creators in Nepal on Kolab. Connect with verified YouTubers for paid campaigns, product reviews, and brand collaborations.',
        path: '/youtube-creators',
        keywords: ['YouTube creator Nepal', 'YouTube Nepal', 'find YouTube creators Nepal'],
        jsonLd: webPageSchema({ path: '/youtube-creators', title: 'YouTube Creators in Nepal | Kolab', description: 'Discover YouTube creators in Nepal on Kolab.' }),
      }}
      breadcrumb={[{ name: 'Home', path: '/' }, { name: 'YouTube Creators', path: '/youtube-creators' }]}
      icon={PlayCircle}
      eyebrow="YouTube Creators"
      heading="YouTube Creators in Nepal"
      intro="YouTube is where Nepali creators go deep — a 15-minute product review, a step-by-step tutorial, a travel vlog through Pokhara or Chitwan that actually shows the journey. Kolab connects brands with YouTube creators across Nepal for the kind of longer-form, considered content that short-form platforms don't have room for."
      faqs={[
        {
          question: 'How do I find YouTube creators in Nepal on Kolab?',
          answer: 'Browse creator profiles and filter by platform (YouTube), category, and location anywhere in Nepal. Each profile lists the creator’s niche and connected platforms, so you can find a YouTuber whose content style fits your product or campaign.',
        },
        {
          question: 'Can I hire a YouTuber for a product review or tutorial?',
          answer: 'Yes. Post a paid campaign specifying the format — a review, tutorial, unboxing, or vlog mention — along with your budget and deliverables, and YouTube creators who fit can apply with a proposal.',
        },
        {
          question: 'Are YouTube creators on Kolab verified?',
          answer: 'Creator accounts go through identity verification, including citizenship-document checks alongside email and phone verification, so businesses know they’re working with a real, accountable creator.',
        },
        {
          question: 'How does payment work for a YouTube campaign?',
          answer: 'Paid campaigns use escrow-protected payments — your budget is held securely and released to the creator once you approve the published video, so both sides are protected through a longer production timeline.',
        },
        {
          question: 'What kind of YouTube content can creators make on Kolab?',
          answer: `Creators on Kolab list categories including ${YOUTUBE_CATEGORIES.slice(0, 5).join(', ')}, and more — from in-depth tech reviews to recipe tutorials to travel vlogs, so you can match a campaign to a creator's established format.`,
        },
        {
          question: 'Do YouTube creators need a large subscriber count to join?',
          answer: 'No strict subscriber minimum applies. Brands look at a creator’s niche, video quality, and audience fit for a specific campaign rather than subscriber count alone, so smaller, focused channels can still land paid work.',
        },
      ]}
      related={[
        { label: 'For Content Creators', path: '/content-creators', description: 'Build your creator profile on Kolab.' },
        { label: 'Instagram Creators', path: '/instagram-creators', description: 'Browse Instagram creators in Nepal.' },
        { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: "Kolab's full creator marketplace overview." },
        { label: 'For Brands', path: '/brands', description: 'Hire creators for your next campaign.' },
      ]}
      cta={{ heading: 'Connect with YouTube Creators in Nepal', sub: 'Download Kolab to browse profiles and post campaigns.' }}
    >
      <ContentSection heading="Why YouTube matters for brands in Nepal">
        <p>
          YouTube rewards depth in a way other platforms don't — a viewer who clicks into a 10-minute review or
          tutorial is already leaning in, which makes YouTube creators especially effective for products or services
          that need explaining, demonstrating, or comparing rather than just showing. A skincare routine, a phone
          review, a home-cooking recipe, a personal-finance breakdown — these all land better as a considered video
          than a six-second clip.
        </p>
        <p>
          That format also means production takes longer, so matching with the right creator up front matters more.
          Kolab lets businesses browse YouTube creator profiles filtered by category and location, review a
          creator's usual format before reaching out, and post a campaign that YouTubers with the right niche can
          apply to directly.
        </p>
      </ContentSection>

      <ContentSection heading="What brands get from YouTube creators on Kolab">
        <BenefitGrid
          items={[
            { icon: Compass, title: 'Find the right format', desc: 'Filter YouTube creator profiles by category and location to find reviewers, tutorial-makers, or vloggers who fit.' },
            { icon: Handshake, title: 'Post a campaign or event', desc: 'Set a budget and deliverables — a dedicated review, an integration, a vlog mention — for a paid campaign or open event.' },
            { icon: MessageSquare, title: 'Message directly', desc: 'Coordinate the brief, talking points, and publish timeline in-app once a creator applies to your campaign.' },
            { icon: ShieldCheck, title: 'Pay with escrow protection', desc: 'Campaign budgets are held in escrow and released once you approve the published video.' },
          ]}
        />
      </ContentSection>

      <ContentSection heading="YouTube content categories on Kolab">
        <p>
          YouTube creators on Kolab cover categories including {YOUTUBE_CATEGORIES.join(', ')}, and more — a
          Kathmandu-based tech channel doing hands-on phone and gadget reviews, an education creator breaking down
          exam prep, a Butwal or Biratnagar food channel filming full recipe walkthroughs, or a finance creator
          explaining budgeting basics for a Nepali audience. Filtering by category means a brand with a tutorial-
          or review-style product can find a creator already fluent in that format instead of starting from zero.
        </p>
        <p className="flex items-start gap-2.5">
          <BookOpen size={18} className="mt-0.5 flex-shrink-0 text-brand-orange" />
          <span>
            Because YouTube videos take longer to plan, film, and edit than short-form content, campaign timelines
            and talking points are worth agreeing on clearly up front — Kolab's in-app messaging keeps that brief in
            one place instead of scattered across email and chat threads.
          </span>
        </p>
      </ContentSection>

      <ContentSection heading="How to hire a YouTube creator in Nepal">
        <ContentList
          items={[
            'Create a business account on Kolab and post a paid campaign or a free open event.',
            'Set your category, platform (YouTube), budget or offer, and location targeting anywhere in Nepal.',
            'Browse YouTube creator profiles directly, or review proposals submitted to your campaign.',
            'Message shortlisted creators in-app to agree on format, talking points, and publish date.',
            'Approve the published video and release payment through Kolab’s escrow-protected system.',
            'Leave a review once the collaboration wraps, building a record for future campaigns.',
          ]}
        />
      </ContentSection>

      <ContentSection heading="Verified creators, protected payments">
        <p>
          A YouTube collaboration is a bigger commitment than a single post, so trust matters more, not less.
          Kolab verifies creator identity with citizenship-document checks alongside email and phone verification,
          holds paid-campaign budgets in escrow until you approve the finished video, and closes every collaboration
          with a transparent, honest review — so a longer-form YouTube partnership on Kolab still comes with the
          same protection as a quick one.
        </p>
      </ContentSection>
    </ContentPageLayout>
  );
}
